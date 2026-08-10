type D1 = D1Database

/**
 * 판매 전표 → PENDING 출고지시 생성 (이미 매핑이면 기존 반환)
 * stockMode:
 *  - pre_deducted: 판매 시 이미 재고 차감됨 → ship 시 차감 안 함
 *  - deduct_on_ship: 출고 확정 시 차감
 */
export async function createOutboundFromSale(
  DB: D1,
  args: {
    tenantId: number
    userId: number
    saleId: number
    stockMode?: 'pre_deducted' | 'deduct_on_ship'
  }
): Promise<{ outboundId: number; orderNumber: string; created: boolean }> {
  const { tenantId, userId, saleId } = args
  const stockMode = args.stockMode || 'pre_deducted'

  const existing = await DB.prepare(`
    SELECT oo.id, oo.order_number
    FROM outbound_order_mappings oom
    JOIN outbound_orders oo ON oo.id = oom.outbound_order_id
    WHERE oom.sale_id = ? AND oo.tenant_id = ?
    LIMIT 1
  `).bind(saleId, tenantId).first<{ id: number; order_number: string }>()

  if (existing) {
    return { outboundId: existing.id, orderNumber: existing.order_number, created: false }
  }

  const sale = await DB.prepare(`
    SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.id = ? AND s.tenant_id = ?
  `).bind(saleId, tenantId).first<any>()

  if (!sale) throw new Error('판매 내역을 찾을 수 없습니다.')
  if (sale.status === 'cancelled') throw new Error('취소된 판매는 출고지시를 만들 수 없습니다.')

  const { results: items } = await DB.prepare(`
    SELECT product_id, SUM(quantity) as quantity
    FROM sale_items WHERE sale_id = ?
    GROUP BY product_id
  `).bind(saleId).all<{ product_id: number; quantity: number }>()

  if (!items?.length) throw new Error('판매 품목이 없습니다.')

  const orderDate = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  const orderNumber = `SO-${orderDate}-${randomSuffix}`

  const destName = sale.customer_name || '판매출고'
  const destPhone = sale.customer_phone || ''
  const destAddress = sale.shipping_address || sale.customer_address || ''

  let orderResult
  try {
    orderResult = await DB.prepare(`
      INSERT INTO outbound_orders (
        tenant_id, order_number, destination_name, destination_address, destination_phone,
        status, created_by, notes, warehouse_id, stock_mode
      ) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)
    `).bind(
      tenantId,
      orderNumber,
      destName,
      destAddress,
      destPhone,
      userId,
      `판매 #${saleId} 출고지시`,
      sale.warehouse_id || null,
      stockMode
    ).run()
  } catch {
    // stock_mode 컬럼 없을 때 폴백
    orderResult = await DB.prepare(`
      INSERT INTO outbound_orders (
        tenant_id, order_number, destination_name, destination_address, destination_phone,
        status, created_by, notes, warehouse_id
      ) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
    `).bind(
      tenantId,
      orderNumber,
      destName,
      destAddress,
      destPhone,
      userId,
      `판매 #${saleId} 출고지시`,
      sale.warehouse_id || null
    ).run()
  }

  const outboundId = Number(orderResult.meta.last_row_id)

  for (const item of items) {
    await DB.prepare(`
      INSERT INTO outbound_items (
        outbound_order_id, product_id, quantity_ordered, quantity_picked, quantity_packed, status
      ) VALUES (?, ?, ?, 0, 0, 'PENDING')
    `).bind(outboundId, item.product_id, item.quantity).run()
  }

  await DB.prepare(`
    INSERT INTO outbound_order_mappings (outbound_order_id, sale_id) VALUES (?, ?)
  `).bind(outboundId, saleId).run()

  if (sale.status === 'completed' || !sale.status) {
    await DB.prepare(`
      UPDATE sales SET status = 'pending_shipment', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `).bind(saleId, tenantId).run()
  }

  return { outboundId, orderNumber, created: true }
}
