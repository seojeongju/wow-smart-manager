import { Hono } from 'hono'
import type { Bindings, Variables, Sale, CreateSaleRequest } from '../types'
import { resolveLineUnitPrice } from '../utils/sale-price'
import { linkSaleItemLot } from '../utils/mes-distribution'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

type WarehouseAllocation = { warehouse_id: number; quantity: number }

/** 창고 재고가 가장 많은 곳(또는 지정 창고 우선)에서 수량만큼 출고 배분 */
async function allocateWarehouseDeductions(
  DB: D1Database,
  tenantId: number,
  productId: number,
  quantity: number,
  preferredWarehouseId?: number | null
): Promise<WarehouseAllocation[]> {
  const sumRow = await DB.prepare(`
    SELECT COALESCE(SUM(quantity), 0) as t
    FROM product_warehouse_stocks
    WHERE tenant_id = ? AND product_id = ?
  `).bind(tenantId, productId).first<{ t: number }>()

  const totalWh = sumRow?.t ?? 0
  if (totalWh < quantity) {
    throw new Error(
      `창고 재고 합계(${totalWh})가 판매 수량(${quantity})보다 부족합니다. ` +
        `재고 관리에서 「초기 재고 마이그레이션」 또는 입고/조정으로 창고 재고를 맞춘 뒤 다시 시도해 주세요.`
    )
  }

  const { results } = await DB.prepare(`
    SELECT warehouse_id, quantity FROM product_warehouse_stocks
    WHERE tenant_id = ? AND product_id = ? AND quantity > 0
    ORDER BY quantity DESC
  `).bind(tenantId, productId).all<{ warehouse_id: number; quantity: number }>()

  const rows = (results || []).slice()
  if (preferredWarehouseId) {
    rows.sort((a, b) => {
      if (a.warehouse_id === preferredWarehouseId) return -1
      if (b.warehouse_id === preferredWarehouseId) return 1
      return b.quantity - a.quantity
    })
  }

  const allocations: WarehouseAllocation[] = []
  let remaining = quantity
  for (const r of rows) {
    if (remaining <= 0) break
    const take = Math.min(r.quantity, remaining)
    allocations.push({ warehouse_id: r.warehouse_id, quantity: take })
    remaining -= take
  }

  if (remaining > 0) {
    throw new Error(`창고별 출고 배분 실패(잔여 ${remaining}개).`)
  }

  return allocations
}

async function syncMasterStockIfVariant(
  DB: D1Database,
  tenantId: number,
  productId: number
) {
  const prodRow = await DB.prepare('SELECT parent_id FROM products WHERE id = ? AND tenant_id = ?')
    .bind(productId, tenantId)
    .first<{ parent_id: number | null }>()

  if (!prodRow?.parent_id) return

  const totalStockResult = await DB.prepare(`
    SELECT COALESCE(SUM(current_stock), 0) as total FROM products
    WHERE parent_id = ? AND is_active = 1 AND tenant_id = ?
  `)
    .bind(prodRow.parent_id, tenantId)
    .first<{ total: number }>()

  await DB.prepare(`
    UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND tenant_id = ?
  `)
    .bind(totalStockResult?.total ?? 0, prodRow.parent_id, tenantId)
    .run()
}

// 판매 목록 조회
app.get('/', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const startDate = c.req.query('startDate') || ''
  const endDate = c.req.query('endDate') || ''
  const customerId = c.req.query('customerId') || ''
  const paymentMethod = c.req.query('paymentMethod') || ''
  const status = c.req.query('status') || 'completed'

  let query = `
    SELECT DISTINCT s.*, 
           c.name as customer_name, 
           c.phone as customer_phone, 
           u.name as created_by_name,
           COALESCE(s.courier, op.courier) as courier,
           COALESCE(s.tracking_number, op.tracking_number) as tracking_number,
           (SELECT GROUP_CONCAT(p.name, ', ') 
            FROM sale_items si 
            JOIN products p ON si.product_id = p.id 
            WHERE si.sale_id = s.id) as items_summary
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.created_by = u.id
    LEFT JOIN outbound_order_mappings oom ON s.id = oom.sale_id
    LEFT JOIN outbound_packages op ON oom.outbound_order_id = op.outbound_order_id
    WHERE s.tenant_id = ?
  `
  const params: any[] = [tenantId]

  if (status && status !== 'all') {
    query += ' AND s.status = ?'
    params.push(status)
  }

  if (startDate) {
    query += ' AND DATE(s.created_at) >= ?'
    params.push(startDate)
  }

  if (endDate) {
    query += ' AND DATE(s.created_at) <= ?'
    params.push(endDate)
  }

  if (customerId) {
    query += ' AND s.customer_id = ?'
    params.push(customerId)
  }

  if (paymentMethod) {
    query += ' AND s.payment_method = ?'
    params.push(paymentMethod)
  }

  query += ' ORDER BY s.created_at DESC'

  // Pagination
  const limit = parseInt(c.req.query('limit') || '0')
  const offset = parseInt(c.req.query('offset') || '0')
  if (limit > 0) {
    query += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)
  }

  const { results } = await DB.prepare(query).bind(...params).all()

  return c.json({ success: true, data: results })
})

// 판매 상세 조회
app.get('/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const sale = await DB.prepare(`
    SELECT s.*, 
           c.name as customer_name, c.phone as customer_phone, 
           u.name as created_by_name,
           op.courier as outbound_courier,
           op.tracking_number as outbound_tracking_number,
           oo.warehouse_id as outbound_warehouse_id
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.created_by = u.id
    LEFT JOIN outbound_order_mappings oom ON s.id = oom.sale_id
    LEFT JOIN outbound_orders oo ON oom.outbound_order_id = oo.id
    LEFT JOIN outbound_packages op ON oo.id = op.outbound_order_id
    WHERE s.id = ? AND s.tenant_id = ?
  `).bind(id, tenantId).first()

  if (!sale) {
    return c.json({ success: false, error: '판매 내역을 찾을 수 없습니다.' }, 404)
  }

  // Merge outbound info if present
  if (sale.outbound_courier) sale.courier = sale.outbound_courier;
  if (sale.outbound_tracking_number) sale.tracking_number = sale.outbound_tracking_number;
  if (sale.outbound_warehouse_id) sale.warehouse_id = sale.outbound_warehouse_id;

  // 판매 상품 조회
  const { results: items } = await DB.prepare(`
    SELECT si.*, p.name as product_name, p.sku
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = ?
  `).bind(id).all()

  return c.json({ success: true, data: { ...sale, items } })
})

// 판매 등록
app.post('/', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const body = await c.req.json<CreateSaleRequest>()

  // 동일 상품이 여러 줄로 올 수 있으므로, 재고 검증·차감은 상품별 합산 수량 기준
  const qtyByProduct = new Map<number, number>()
  for (const item of body.items) {
    qtyByProduct.set(item.product_id, (qtyByProduct.get(item.product_id) || 0) + item.quantity)
  }

  const productCache = new Map<number, { id: number; name: string; selling_price: number; current_stock: number }>()

  for (const [productId, qty] of qtyByProduct) {
    const product = await DB.prepare(`
      SELECT id, name, selling_price, current_stock 
      FROM products 
      WHERE id = ? AND is_active = 1 AND tenant_id = ?
    `).bind(productId, tenantId).first<{
      id: number
      name: string
      selling_price: number
      current_stock: number
    }>()

    if (!product) {
      return c.json({
        success: false,
        error: `상품 ID ${productId}을(를) 찾을 수 없습니다.`
      }, 400)
    }

    if (product.current_stock < qty) {
      return c.json({
        success: false,
        error: `${product.name}의 재고가 부족합니다. (요청 합계: ${qty}개, 현재 재고: ${product.current_stock})`
      }, 400)
    }

    const whSum = await DB.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as t
      FROM product_warehouse_stocks
      WHERE tenant_id = ? AND product_id = ?
    `).bind(tenantId, productId).first<{ t: number }>()

    if ((whSum?.t ?? 0) < qty) {
      return c.json({
        success: false,
        error: `${product.name}: 창고 재고 합계(${(whSum?.t ?? 0)})가 부족합니다. (판매 합계: ${qty}개) ` +
          `총재고(${product.current_stock})와 창고별 재고가 어긋난 경우 재고 관리에서 동기화·입고 후 다시 시도해 주세요.`
      }, 400)
    }

    productCache.set(productId, product)
  }

  let totalAmount = 0
  const productDetails: any[] = []
  const customerId = body.customer_id ? Number(body.customer_id) : null

  for (const item of body.items) {
    const product = productCache.get(item.product_id)
    if (!product) {
      return c.json({ success: false, error: `상품 ID ${item.product_id} 오류` }, 400)
    }
    const { unitPrice, priceSource } = await resolveLineUnitPrice(
      DB,
      tenantId,
      product.id,
      product.selling_price,
      customerId,
      item.unit_price
    )
    const subtotal = unitPrice * item.quantity
    totalAmount += subtotal
    productDetails.push({
      product_id: product.id,
      quantity: item.quantity,
      unit_price: unitPrice,
      subtotal,
      price_source: priceSource
    })
  }

  const discountAmount = body.discount_amount || 0
  const finalAmount = totalAmount - discountAmount

  if (finalAmount < 0) {
    return c.json({ success: false, error: '할인 금액이 총액보다 클 수 없습니다.' }, 400)
  }

  const preferredWarehouseId =
    body.warehouse_id != null && !Number.isNaN(Number(body.warehouse_id))
      ? Number(body.warehouse_id)
      : null

  type StockPlan = { productId: number; qty: number; allocations: WarehouseAllocation[] }
  const stockPlan: StockPlan[] = []

  for (const [productId, qty] of qtyByProduct) {
    try {
      const allocations = await allocateWarehouseDeductions(
        DB,
        tenantId,
        productId,
        qty,
        preferredWarehouseId
      )
      stockPlan.push({ productId, qty, allocations })
    } catch (e: any) {
      console.error('allocateWarehouseDeductions:', e)
      return c.json(
        {
          success: false,
          error: e?.message || '창고 출고 배분에 실패했습니다.'
        },
        400
      )
    }
  }

  const saleResult = await DB.prepare(`
    INSERT INTO sales (tenant_id, customer_id, total_amount, discount_amount, final_amount, payment_method, notes, created_by, warehouse_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    tenantId,
    body.customer_id || null,
    totalAmount,
    discountAmount,
    finalAmount,
    body.payment_method,
    body.notes || null,
    userId,
    preferredWarehouseId
  ).run()

  const saleId = saleResult.meta.last_row_id as number

  const batchStmts: D1PreparedStatement[] = []

  for (const detail of productDetails) {
    batchStmts.push(
      DB.prepare(`
        INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `).bind(saleId, detail.product_id, detail.quantity, detail.unit_price, detail.subtotal)
    )
  }

  for (const p of stockPlan) {
    for (const a of p.allocations) {
      batchStmts.push(
        DB.prepare(`
          UPDATE product_warehouse_stocks
          SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
          WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?
        `).bind(a.quantity, tenantId, p.productId, a.warehouse_id)
      )
      batchStmts.push(
        DB.prepare(`
          INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason, reference_id, created_by)
          VALUES (?, ?, ?, '출고', ?, '판매', ?, ?)
        `).bind(tenantId, p.productId, a.warehouse_id, -a.quantity, saleId, userId)
      )
    }
    batchStmts.push(
      DB.prepare(`
        UPDATE products 
        SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND tenant_id = ?
      `).bind(p.qty, p.productId, tenantId)
    )
  }

  try {
    await DB.batch(batchStmts)
  } catch (e: any) {
    console.error('Sale batch failed:', e)
    await DB.prepare(`DELETE FROM sales WHERE id = ? AND tenant_id = ?`).bind(saleId, tenantId).run()
    return c.json(
      {
        success: false,
        error: '판매 저장 중 오류가 발생했습니다. 다시 시도해 주세요.'
      },
      500
    )
  }

  for (const p of stockPlan) {
    await syncMasterStockIfVariant(DB, tenantId, p.productId)
  }

  // Phase 8: 판매 라인 ↔ Lot/QR 연결
  try {
    const { results: saleItems } = await DB.prepare(
      'SELECT id, product_id, quantity FROM sale_items WHERE sale_id = ? ORDER BY id ASC'
    ).bind(saleId).all<{ id: number; product_id: number; quantity: number }>()

    const usedSaleItemIds = new Set<number>()
    for (const item of body.items) {
      if (!item.qr_code && !item.lot_number) continue
      const match = (saleItems || []).find(
        (si) => Number(si.product_id) === Number(item.product_id)
          && !usedSaleItemIds.has(Number(si.id))
      )
      if (!match) continue
      usedSaleItemIds.add(Number(match.id))
      await linkSaleItemLot(DB, tenantId, userId, {
        sale_item_id: Number(match.id),
        sale_id: saleId,
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
        warehouse_id: preferredWarehouseId,
        qr_code: item.qr_code,
        lot_number: item.lot_number
      })
    }
  } catch (linkErr: any) {
    console.error('sale lot link error:', linkErr)
    // 판매 자체는 유지, Lot 연결 실패만 메시지에 포함 가능
  }

  // 고객 구매 금액 및 횟수 업데이트
  if (body.customer_id) {
    await DB.prepare(`
      UPDATE customers 
      SET total_purchase_amount = total_purchase_amount + ?,
          purchase_count = purchase_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `).bind(finalAmount, body.customer_id, tenantId).run()
  }

  return c.json({
    success: true,
    data: { id: saleId, final_amount: finalAmount },
    message: '판매가 완료되었습니다.'
  })
})

// 판매 취소
app.put('/:id/cancel', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const id = c.req.param('id')

  const sale = await DB.prepare('SELECT * FROM sales WHERE id = ? AND status = ? AND tenant_id = ?')
    .bind(id, 'completed', tenantId)
    .first<Sale>()

  if (!sale) {
    return c.json({ success: false, error: '판매 내역을 찾을 수 없거나 이미 취소되었습니다.' }, 404)
  }

  // 판매 상품 조회
  const { results: items } = await DB.prepare(`
    SELECT * FROM sale_items WHERE sale_id = ?
  `).bind(id).all<any>()

  // 판매 시 차감했던 창고별 재고 복구 (출고 이동 내역과 동일한 창고에 입고 반영)
  const { results: saleOutMovements } = await DB.prepare(`
    SELECT product_id, warehouse_id, quantity FROM stock_movements
    WHERE tenant_id = ? AND reference_id = ? AND reason = '판매' AND movement_type = '출고'
  `).bind(tenantId, id).all<{ product_id: number; warehouse_id: number | null; quantity: number }>()

  for (const m of saleOutMovements || []) {
    if (!m.warehouse_id) continue
    const addBack = -m.quantity
    await DB.prepare(`
      UPDATE product_warehouse_stocks
      SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?
    `).bind(addBack, tenantId, m.product_id, m.warehouse_id).run()
  }

  // 총재고 복구 및 이력
  for (const item of items) {
    await DB.prepare(`
      UPDATE products 
      SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `).bind(item.quantity, item.product_id, tenantId).run()

    await DB.prepare(`
      INSERT INTO stock_movements (tenant_id, product_id, movement_type, quantity, reason, reference_id, created_by)
      VALUES (?, ?, '입고', ?, '판매 취소', ?, ?)
    `).bind(tenantId, item.product_id, item.quantity, id, userId).run()

    await syncMasterStockIfVariant(DB, tenantId, item.product_id)
  }

  // 고객 구매 금액 및 횟수 복구
  if (sale.customer_id) {
    await DB.prepare(`
      UPDATE customers 
      SET total_purchase_amount = total_purchase_amount - ?,
          purchase_count = purchase_count - 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `).bind(sale.final_amount, sale.customer_id, tenantId).run()
  }

  // 판매 상태 변경
  await DB.prepare(`
    UPDATE sales SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?
  `).bind(id, tenantId).run()

  return c.json({ success: true, message: '판매가 취소되었습니다.' })
})

// 배송 정보 업데이트
app.put('/:id/shipping', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<{
    shipping_address?: string;
    tracking_number?: string;
    courier?: string;
    status?: string;
    warehouse_id?: number;
  }>()

  const updates: string[] = []
  const params: any[] = []

  if (body.shipping_address !== undefined) {
    updates.push('shipping_address = ?')
    params.push(body.shipping_address)
  }
  if (body.tracking_number !== undefined) {
    updates.push('tracking_number = ?')
    params.push(body.tracking_number)
  }
  if (body.courier !== undefined) {
    updates.push('courier = ?')
    params.push(body.courier)
  }
  if (body.status !== undefined) {
    updates.push('status = ?')
    params.push(body.status)
  }
  if (body.warehouse_id !== undefined) {
    updates.push('warehouse_id = ?')
    params.push(body.warehouse_id)
  }

  if (updates.length === 0) {
    return c.json({ success: false, error: '수정할 내용이 없습니다.' }, 400)
  }

  updates.push('updated_at = CURRENT_TIMESTAMP')
  params.push(id)

  await DB.prepare(`
    UPDATE sales SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?
  `).bind(...params, tenantId).run()

  return c.json({ success: true, message: '배송 정보가 업데이트되었습니다.' })
})

// 판매 통계
app.get('/stats/summary', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const period = c.req.query('period') || 'today' // today, week, month

  let dateCondition = ''
  switch (period) {
    case 'today':
      dateCondition = "DATE(created_at) = DATE('now', 'localtime')"
      break
    case 'week':
      dateCondition = "DATE(created_at) >= DATE('now', 'localtime', '-7 days')"
      break
    case 'month':
      dateCondition = "DATE(created_at) >= DATE('now', 'localtime', '-30 days')"
      break
    default:
      dateCondition = '1=1'
  }

  const summary = await DB.prepare(`
    SELECT 
      COUNT(*) as total_sales,
      SUM(final_amount) as total_revenue,
      AVG(final_amount) as avg_sale_amount
    FROM sales
    WHERE status = 'completed' AND tenant_id = ? AND ${dateCondition}
  `).bind(tenantId).first()

  return c.json({ success: true, data: summary })
})

// 베스트셀러 상품
app.get('/stats/bestsellers', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const limit = parseInt(c.req.query('limit') || '5')

  const { results } = await DB.prepare(`
    SELECT 
      p.id, p.name, p.sku, p.category,
      SUM(si.quantity) as total_sold,
      SUM(si.subtotal) as total_revenue
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status = 'completed' AND s.tenant_id = ?
    GROUP BY p.id
    ORDER BY total_sold DESC
    LIMIT ?
  `).bind(tenantId, limit).all()

  return c.json({ success: true, data: results })
})

// 배송 정보 업데이트
app.put('/:id/shipping', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const { courier, tracking_number, shipping_address, status, warehouse_id } = await c.req.json()

  try {
    await DB.prepare(`
      UPDATE sales 
      SET courier = ?, tracking_number = ?, shipping_address = ?, status = ?, warehouse_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `).bind(courier, tracking_number, shipping_address, status, warehouse_id, id, tenantId).run()

    return c.json({ success: true, message: '배송 정보가 업데이트되었습니다.' })
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500)
  }
})

export default app

