import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const qr = new Hono<{ Bindings: Bindings; Variables: Variables }>()

type ScanPayload = {
  qr_id: number
  qr_code: string
  type: string
  status: string
  batch_number: string | null
  product_id: number
  product_name: string
  sku: string
  barcode: string | null
  product_price: number
  current_stock: number
  category: string | null
  scan_source: 'qr' | 'barcode' | 'sku'
}

async function ensureScanCode(
  DB: D1Database,
  productId: number,
  code: string,
  userId: number | null,
  codeType: 'barcode' | 'sku'
): Promise<{ id: number; code: string; type: string; status: string; batch_number: string | null }> {
  const existing = await DB.prepare(`
    SELECT id, code, type, status, batch_number, product_id
    FROM qr_codes
    WHERE code = ?
  `).bind(code).first<{ id: number; code: string; type: string; status: string; batch_number: string | null; product_id: number }>()

  if (existing) {
    if (existing.product_id !== productId) {
      throw new Error('동일 코드가 다른 제품에 이미 연결되어 있습니다')
    }
    return existing
  }

  const inserted = await DB.prepare(`
    INSERT INTO qr_codes (code, product_id, type, status, batch_number, created_by)
    VALUES (?, ?, ?, 'active', ?, ?)
  `).bind(code, productId, codeType, `AUTO-${codeType.toUpperCase()}`, userId).run()

  return {
    id: Number(inserted.meta.last_row_id),
    code,
    type: codeType,
    status: 'active',
    batch_number: `AUTO-${codeType.toUpperCase()}`
  }
}

async function resolveScanCode(
  DB: D1Database,
  tenantId: number,
  rawCode: string,
  userId: number | null
): Promise<ScanPayload | null> {
  const code = String(rawCode || '').trim()
  if (!code) return null

  // 1) 기존 QR 코드
  const qrHit = await DB.prepare(`
    SELECT
      qc.id AS qr_id,
      qc.code AS qr_code,
      qc.type,
      qc.status,
      qc.batch_number,
      p.id AS product_id,
      p.name AS product_name,
      p.sku,
      p.barcode,
      p.selling_price AS product_price,
      COALESCE(p.current_stock, 0) AS current_stock,
      p.category
    FROM qr_codes qc
    INNER JOIN products p ON qc.product_id = p.id
    WHERE qc.code = ? AND p.tenant_id = ? AND p.is_active = 1
  `).bind(code, tenantId).first<any>()

  if (qrHit) {
    return { ...qrHit, scan_source: 'qr' as const }
  }

  // 2) 제품 바코드
  const byBarcode = await DB.prepare(`
    SELECT id, name, sku, barcode, selling_price, COALESCE(current_stock, 0) AS current_stock, category
    FROM products
    WHERE tenant_id = ? AND is_active = 1 AND barcode = ?
    LIMIT 1
  `).bind(tenantId, code).first<any>()

  if (byBarcode) {
    const ensured = await ensureScanCode(DB, byBarcode.id, code, userId, 'barcode')
    return {
      qr_id: ensured.id,
      qr_code: ensured.code,
      type: ensured.type,
      status: ensured.status,
      batch_number: ensured.batch_number,
      product_id: byBarcode.id,
      product_name: byBarcode.name,
      sku: byBarcode.sku,
      barcode: byBarcode.barcode,
      product_price: byBarcode.selling_price,
      current_stock: byBarcode.current_stock,
      category: byBarcode.category,
      scan_source: 'barcode'
    }
  }

  // 3) SKU (바코드건이 SKU를 찍는 경우)
  const bySku = await DB.prepare(`
    SELECT id, name, sku, barcode, selling_price, COALESCE(current_stock, 0) AS current_stock, category
    FROM products
    WHERE tenant_id = ? AND is_active = 1 AND sku = ?
    LIMIT 1
  `).bind(tenantId, code).first<any>()

  if (bySku) {
    const ensured = await ensureScanCode(DB, bySku.id, code, userId, 'sku')
    return {
      qr_id: ensured.id,
      qr_code: ensured.code,
      type: ensured.type,
      status: ensured.status,
      batch_number: ensured.batch_number,
      product_id: bySku.id,
      product_name: bySku.name,
      sku: bySku.sku,
      barcode: bySku.barcode,
      product_price: bySku.selling_price,
      current_stock: bySku.current_stock,
      category: bySku.category,
      scan_source: 'sku'
    }
  }

  return null
}

async function getWarehouseStock(
  DB: D1Database,
  tenantId: number,
  productId: number,
  warehouseId: number
): Promise<number> {
  const row = await DB.prepare(`
    SELECT COALESCE(quantity, 0) AS quantity
    FROM product_warehouse_stocks
    WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?
  `).bind(tenantId, productId, warehouseId).first<{ quantity: number }>()
  return row?.quantity || 0
}

async function deductWarehouseStock(
  DB: D1Database,
  tenantId: number,
  productId: number,
  quantity: number,
  preferredWarehouseId?: number | null
): Promise<{ warehouse_id: number | null; quantity: number }[]> {
  const allocations: { warehouse_id: number | null; quantity: number }[] = []
  let remaining = quantity

  const rowCount = await DB.prepare(`
    SELECT COUNT(*) AS c FROM product_warehouse_stocks
    WHERE tenant_id = ? AND product_id = ?
  `).bind(tenantId, productId).first<{ c: number }>()

  // 창고 재고 행이 없으면 제품 총재고만 관리하는 케이스로 간주
  if (!rowCount?.c) {
    return [{ warehouse_id: preferredWarehouseId || null, quantity }]
  }

  if (preferredWarehouseId) {
    const stock = await getWarehouseStock(DB, tenantId, productId, preferredWarehouseId)
    if (stock > 0) {
      const take = Math.min(stock, remaining)
      await DB.prepare(`
        UPDATE product_warehouse_stocks
        SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?
      `).bind(take, tenantId, productId, preferredWarehouseId).run()
      allocations.push({ warehouse_id: preferredWarehouseId, quantity: take })
      remaining -= take
    }
  }

  if (remaining > 0) {
    const { results } = await DB.prepare(`
      SELECT warehouse_id, quantity
      FROM product_warehouse_stocks
      WHERE tenant_id = ? AND product_id = ? AND quantity > 0
      ORDER BY quantity DESC
    `).bind(tenantId, productId).all<{ warehouse_id: number; quantity: number }>()

    for (const row of results || []) {
      if (remaining <= 0) break
      if (preferredWarehouseId && row.warehouse_id === preferredWarehouseId) continue
      const take = Math.min(row.quantity, remaining)
      await DB.prepare(`
        UPDATE product_warehouse_stocks
        SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?
      `).bind(take, tenantId, productId, row.warehouse_id).run()
      allocations.push({ warehouse_id: row.warehouse_id, quantity: take })
      remaining -= take
    }
  }

  if (remaining > 0) {
    throw new Error('창고 재고가 부족합니다')
  }

  return allocations
}

// ================================================
// 1. QR 코드 생성
// ================================================
qr.post('/generate', async (c) => {
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const { product_id, quantity = 1, batch_number, type = 'product' } = await c.req.json()

  if (!product_id) {
    return c.json({ error: '제품 ID가 필요합니다' }, 400)
  }

  if (quantity < 1 || quantity > 100) {
    return c.json({ error: '수량은 1-100 사이여야 합니다' }, 400)
  }

  try {
    const generatedCodes = []
    const product = await c.env.DB.prepare(`
      SELECT id, name, sku, barcode FROM products
      WHERE id = ? AND tenant_id = ?
    `).bind(product_id, tenantId).first<any>()

    if (!product) {
      return c.json({ error: '제품을 찾을 수 없습니다' }, 404)
    }

    const generateUUID = () =>
      'QR-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9).toUpperCase()

    const batch = []
    for (let i = 0; i < quantity; i++) {
      const qrCode = generateUUID()
      const batchNum =
        batch_number || `BATCH-${new Date().toISOString().split('T')[0]}-${String(i + 1).padStart(3, '0')}`

      batch.push(
        c.env.DB.prepare(`
          INSERT INTO qr_codes (code, product_id, type, status, batch_number, created_by)
          VALUES (?, ?, ?, 'active', ?, ?)
        `).bind(qrCode, product_id, type, batchNum, userId)
      )

      generatedCodes.push({
        code: qrCode,
        product_id,
        batch_number: batchNum
      })
    }

    await c.env.DB.batch(batch)

    return c.json({
      success: true,
      message: `${quantity}개의 QR 코드가 생성되었습니다`,
      codes: generatedCodes,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode
      }
    })
  } catch (error: any) {
    console.error('QR 코드 생성 오류:', error)
    return c.json({ error: 'QR 코드 생성 중 오류가 발생했습니다', details: error.message }, 500)
  }
})

// ================================================
// 2. QR 코드 목록 조회
// ================================================
qr.get('/codes', async (c) => {
  const tenantId = c.get('tenantId')
  const productId = c.req.query('product_id')
  const status = c.req.query('status') || 'active'
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = parseInt(c.req.query('offset') || '0')

  try {
    let query = `
      SELECT
        qc.id,
        qc.code,
        qc.product_id,
        qc.type,
        qc.status,
        qc.batch_number,
        qc.manufacture_date,
        qc.expiry_date,
        qc.created_at,
        p.name AS product_name,
        p.sku AS product_sku,
        p.barcode AS product_barcode,
        COALESCE(p.current_stock, 0) AS product_stock,
        u.name AS created_by_name
      FROM qr_codes qc
      LEFT JOIN products p ON qc.product_id = p.id
      LEFT JOIN users u ON qc.created_by = u.id
      WHERE p.tenant_id = ?
    `
    const params: any[] = [tenantId]

    if (productId) {
      query += ' AND qc.product_id = ?'
      params.push(productId)
    }

    if (status) {
      query += ' AND qc.status = ?'
      params.push(status)
    }

    query += ' ORDER BY qc.created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const { results } = await c.env.DB.prepare(query).bind(...params).all()

    let countQuery =
      'SELECT COUNT(*) as total FROM qr_codes qc LEFT JOIN products p ON qc.product_id = p.id WHERE p.tenant_id = ?'
    const countParams: any[] = [tenantId]

    if (productId) {
      countQuery += ' AND qc.product_id = ?'
      countParams.push(productId)
    }
    if (status) {
      countQuery += ' AND qc.status = ?'
      countParams.push(status)
    }

    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<any>()

    return c.json({
      success: true,
      codes: results,
      pagination: {
        total: countResult?.total || 0,
        limit,
        offset,
        hasMore: (countResult?.total || 0) > offset + limit
      }
    })
  } catch (error: any) {
    console.error('QR 코드 목록 조회 오류:', error)
    return c.json({ error: 'QR 코드 목록 조회 중 오류가 발생했습니다', details: error.message }, 500)
  }
})

// ================================================
// 3. 특정 QR 코드 상세 조회
// ================================================
qr.get('/codes/:code', async (c) => {
  const tenantId = c.get('tenantId')
  const qrCode = decodeURIComponent(c.req.param('code'))

  try {
    const qrInfo = await c.env.DB.prepare(`
      SELECT
        qc.*,
        p.name AS product_name,
        p.sku AS product_sku,
        p.barcode AS product_barcode,
        COALESCE(p.current_stock, 0) AS product_stock,
        p.selling_price AS price,
        u.name AS created_by_name
      FROM qr_codes qc
      LEFT JOIN products p ON qc.product_id = p.id
      LEFT JOIN users u ON qc.created_by = u.id
      WHERE qc.code = ? AND p.tenant_id = ?
    `).bind(qrCode, tenantId).first()

    if (!qrInfo) {
      return c.json({ error: 'QR 코드를 찾을 수 없습니다' }, 404)
    }

    const { results: transactions } = await c.env.DB.prepare(`
      SELECT
        qt.id,
        qt.transaction_type,
        qt.quantity,
        qt.created_at,
        w.name AS warehouse_name,
        u.name AS user_name,
        qt.notes
      FROM qr_transactions qt
      LEFT JOIN warehouses w ON qt.warehouse_id = w.id
      LEFT JOIN users u ON qt.created_by = u.id
      WHERE qt.qr_code_id = ?
      ORDER BY qt.created_at DESC
      LIMIT 20
    `).bind((qrInfo as any).id).all()

    return c.json({
      success: true,
      qr_code: qrInfo,
      transactions
    })
  } catch (error: any) {
    console.error('QR 코드 상세 조회 오류:', error)
    return c.json({ error: 'QR 코드 조회 중 오류가 발생했습니다', details: error.message }, 500)
  }
})

// ================================================
// 4. QR 코드 상태 변경
// ================================================
qr.patch('/codes/:id/status', async (c) => {
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const qrId = c.req.param('id')
  const { status } = await c.req.json()

  if (!['active', 'inactive', 'damaged', 'lost'].includes(status)) {
    return c.json({ error: '유효하지 않은 상태입니다' }, 400)
  }

  try {
    const qrRow = await c.env.DB.prepare(`
      SELECT qc.id
      FROM qr_codes qc
      LEFT JOIN products p ON qc.product_id = p.id
      WHERE qc.id = ? AND p.tenant_id = ?
    `).bind(qrId, tenantId).first()

    if (!qrRow) {
      return c.json({ error: 'QR 코드를 찾을 수 없습니다' }, 404)
    }

    await c.env.DB.prepare(`
      UPDATE qr_codes
      SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, userId, qrId).run()

    return c.json({
      success: true,
      message: 'QR 코드 상태가 변경되었습니다'
    })
  } catch (error: any) {
    console.error('QR 코드 상태 변경 오류:', error)
    return c.json({ error: 'QR 코드 상태 변경 중 오류가 발생했습니다', details: error.message }, 500)
  }
})

// ================================================
// 5. QR/바코드/SKU 스캔 조회
// ================================================
qr.get('/scan/:code', async (c) => {
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const scanCode = decodeURIComponent(c.req.param('code'))

  try {
    const startTime = Date.now()
    const resolved = await resolveScanCode(c.env.DB, tenantId, scanCode, userId)
    const scanDuration = Date.now() - startTime

    if (!resolved) {
      await c.env.DB.prepare(`
        INSERT INTO qr_scan_logs (qr_code, scan_result, user_id, scan_duration_ms, error_message)
        VALUES (?, 'not_found', ?, ?, '제품을 찾을 수 없음')
      `).bind(scanCode, userId, scanDuration).run()

      return c.json({ error: '등록된 QR/바코드/SKU를 찾을 수 없습니다' }, 404)
    }

    if (resolved.status !== 'active') {
      await c.env.DB.prepare(`
        INSERT INTO qr_scan_logs (qr_code, scan_result, product_id, user_id, scan_duration_ms, error_message)
        VALUES (?, 'inactive', ?, ?, ?, ?)
      `).bind(scanCode, resolved.product_id, userId, scanDuration, `상태: ${resolved.status}`).run()

      return c.json({
        error: '비활성화된 코드입니다',
        status: resolved.status
      }, 400)
    }

    await c.env.DB.prepare(`
      INSERT INTO qr_scan_logs (qr_code, scan_result, product_id, user_id, scan_duration_ms)
      VALUES (?, 'success', ?, ?, ?)
    `).bind(scanCode, resolved.product_id, userId, scanDuration).run()

    return c.json({
      success: true,
      qr_code: resolved
    })
  } catch (error: any) {
    console.error('스캔 오류:', error)
    return c.json({ error: '스캔 중 오류가 발생했습니다', details: error.message }, 500)
  }
})

// ================================================
// 6. QR 통계 조회
// ================================================
qr.get('/stats', async (c) => {
  const tenantId = c.get('tenantId')

  try {
    const qrStats = await c.env.DB.prepare(`
      SELECT
        COUNT(*) AS total_qr_codes,
        COUNT(CASE WHEN qc.status = 'active' THEN 1 END) AS active_codes,
        COUNT(CASE WHEN qc.status = 'inactive' THEN 1 END) AS inactive_codes,
        COUNT(CASE WHEN qc.status = 'damaged' THEN 1 END) AS damaged_codes
      FROM qr_codes qc
      LEFT JOIN products p ON qc.product_id = p.id
      WHERE p.tenant_id = ?
    `).bind(tenantId).first()

    const today = new Date().toISOString().split('T')[0]
    const todayStats = await c.env.DB.prepare(`
      SELECT
        COUNT(CASE WHEN qt.transaction_type = 'inbound' THEN 1 END) AS today_inbound_count,
        COALESCE(SUM(CASE WHEN qt.transaction_type = 'inbound' THEN qt.quantity END), 0) AS today_inbound_qty,
        COUNT(CASE WHEN qt.transaction_type = 'outbound' THEN 1 END) AS today_outbound_count,
        COALESCE(SUM(CASE WHEN qt.transaction_type = 'outbound' THEN qt.quantity END), 0) AS today_outbound_qty,
        COUNT(CASE WHEN qt.transaction_type = 'sale' THEN 1 END) AS today_sale_count,
        COALESCE(SUM(CASE WHEN qt.transaction_type = 'sale' THEN qt.quantity END), 0) AS today_sale_qty
      FROM qr_transactions qt
      LEFT JOIN qr_codes qc ON qt.qr_code_id = qc.id
      LEFT JOIN products p ON qc.product_id = p.id
      WHERE p.tenant_id = ? AND DATE(qt.created_at) = ?
    `).bind(tenantId, today).first()

    return c.json({
      success: true,
      qr_stats: qrStats,
      today_stats: todayStats
    })
  } catch (error: any) {
    console.error('QR 통계 조회 오류:', error)
    return c.json({ error: '통계 조회 중 오류가 발생했습니다', details: error.message }, 500)
  }
})

// ================================================
// 7. 입고 처리 (QR/바코드)
// ================================================
qr.post('/inbound', async (c) => {
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const { qr_code, quantity, warehouse_id, notes } = await c.req.json()

  if (!qr_code) return c.json({ error: '스캔 코드가 필요합니다' }, 400)
  if (!quantity || quantity < 1) return c.json({ error: '올바른 수량을 입력하세요' }, 400)
  if (!warehouse_id) return c.json({ error: '창고를 선택하세요' }, 400)

  try {
    const resolved = await resolveScanCode(c.env.DB, tenantId, qr_code, userId)
    if (!resolved) return c.json({ error: 'QR/바코드/SKU를 찾을 수 없습니다' }, 404)
    if (resolved.status !== 'active') {
      return c.json({ error: `비활성화된 코드입니다 (상태: ${resolved.status})` }, 400)
    }

    const previousStock = resolved.current_stock

    await c.env.DB.prepare(`
      UPDATE products
      SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `).bind(quantity, resolved.product_id, tenantId).run()

    await c.env.DB.prepare(`
      INSERT INTO product_warehouse_stocks (tenant_id, product_id, warehouse_id, quantity)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(product_id, warehouse_id)
      DO UPDATE SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
    `).bind(tenantId, resolved.product_id, warehouse_id, quantity, quantity).run()

    await c.env.DB.prepare(`
      INSERT INTO qr_transactions (qr_code_id, transaction_type, product_id, quantity, warehouse_id, created_by, notes)
      VALUES (?, 'inbound', ?, ?, ?, ?, ?)
    `).bind(resolved.qr_id, resolved.product_id, quantity, warehouse_id, userId, notes || null).run()

    await c.env.DB.prepare(`
      INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason, notes, created_by)
      VALUES (?, ?, ?, '입고', ?, ?, ?, ?)
    `).bind(
      tenantId,
      resolved.product_id,
      warehouse_id,
      quantity,
      `스캔 입고 (${resolved.scan_source}): ${resolved.qr_code}`,
      notes || null,
      userId
    ).run()

    const updated = await c.env.DB.prepare(`
      SELECT COALESCE(current_stock, 0) AS current_stock FROM products WHERE id = ?
    `).bind(resolved.product_id).first<{ current_stock: number }>()

    return c.json({
      success: true,
      message: '입고가 완료되었습니다',
      transaction: {
        product_name: resolved.product_name,
        quantity,
        previous_stock: previousStock,
        new_stock: updated?.current_stock || 0,
        warehouse_id,
        scan_source: resolved.scan_source
      }
    })
  } catch (error: any) {
    console.error('입고 처리 오류:', error)
    return c.json({ error: '입고 처리 중 오류가 발생했습니다', details: error.message }, 500)
  }
})

// ================================================
// 8. 출고 처리 (QR/바코드)
// ================================================
qr.post('/outbound', async (c) => {
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const { qr_code, quantity, warehouse_id, notes } = await c.req.json()

  if (!qr_code || !quantity || !warehouse_id) {
    return c.json({ error: '필수 항목을 모두 입력하세요' }, 400)
  }
  if (quantity < 1) return c.json({ error: '올바른 수량을 입력하세요' }, 400)

  try {
    const resolved = await resolveScanCode(c.env.DB, tenantId, qr_code, userId)
    if (!resolved) return c.json({ error: 'QR/바코드/SKU를 찾을 수 없습니다' }, 404)
    if (resolved.status !== 'active') {
      return c.json({ error: `비활성화된 코드입니다 (상태: ${resolved.status})` }, 400)
    }

    const whStock = await getWarehouseStock(c.env.DB, tenantId, resolved.product_id, warehouse_id)
    const available = whStock > 0 ? whStock : resolved.current_stock
    if (available < quantity) {
      return c.json({
        error: '재고가 부족합니다',
        current_stock: available,
        requested: quantity
      }, 400)
    }

    const previousStock = resolved.current_stock

    await c.env.DB.prepare(`
      UPDATE products
      SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `).bind(quantity, resolved.product_id, tenantId).run()

    if (whStock >= quantity) {
      await c.env.DB.prepare(`
        UPDATE product_warehouse_stocks
        SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = ? AND product_id = ? AND warehouse_id = ?
      `).bind(quantity, tenantId, resolved.product_id, warehouse_id).run()
    } else {
      await deductWarehouseStock(c.env.DB, tenantId, resolved.product_id, quantity, warehouse_id)
    }

    await c.env.DB.prepare(`
      INSERT INTO qr_transactions (qr_code_id, transaction_type, product_id, quantity, warehouse_id, created_by, notes)
      VALUES (?, 'outbound', ?, ?, ?, ?, ?)
    `).bind(resolved.qr_id, resolved.product_id, quantity, warehouse_id, userId, notes || null).run()

    await c.env.DB.prepare(`
      INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason, notes, created_by)
      VALUES (?, ?, ?, '출고', ?, ?, ?, ?)
    `).bind(
      tenantId,
      resolved.product_id,
      warehouse_id,
      -quantity,
      `스캔 출고 (${resolved.scan_source}): ${resolved.qr_code}`,
      notes || null,
      userId
    ).run()

    const updated = await c.env.DB.prepare(`
      SELECT COALESCE(current_stock, 0) AS current_stock FROM products WHERE id = ?
    `).bind(resolved.product_id).first<{ current_stock: number }>()

    return c.json({
      success: true,
      message: '출고가 완료되었습니다',
      transaction: {
        product_name: resolved.product_name,
        quantity,
        previous_stock: previousStock,
        new_stock: updated?.current_stock || 0,
        warehouse_id,
        scan_source: resolved.scan_source
      }
    })
  } catch (error: any) {
    console.error('출고 처리 오류:', error)
    return c.json({ error: error.message || '출고 처리 중 오류가 발생했습니다', details: error.message }, 500)
  }
})

// ================================================
// 9. 트랜잭션 이력 조회
// ================================================
qr.get('/transactions/:type', async (c) => {
  const tenantId = c.get('tenantId')
  const type = c.req.param('type')
  const limit = parseInt(c.req.query('limit') || '20')
  const date = c.req.query('date')

  try {
    let query = `
      SELECT
        qt.id,
        qt.transaction_type,
        qt.quantity,
        qt.notes,
        qt.created_at,
        qc.code AS qr_code,
        qc.type AS code_type,
        p.name AS product_name,
        p.sku AS product_sku,
        p.barcode AS product_barcode,
        w.name AS warehouse_name,
        u.name AS user_name
      FROM qr_transactions qt
      LEFT JOIN qr_codes qc ON qt.qr_code_id = qc.id
      LEFT JOIN products p ON COALESCE(qt.product_id, qc.product_id) = p.id
      LEFT JOIN warehouses w ON qt.warehouse_id = w.id
      LEFT JOIN users u ON qt.created_by = u.id
      WHERE p.tenant_id = ?
    `
    const params: any[] = [tenantId]

    if (type !== 'all') {
      query += ' AND qt.transaction_type = ?'
      params.push(type)
    }

    if (date) {
      query += ' AND DATE(qt.created_at) = ?'
      params.push(date)
    }

    query += ' ORDER BY qt.created_at DESC LIMIT ?'
    params.push(limit)

    const { results } = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({
      success: true,
      transactions: results
    })
  } catch (error: any) {
    console.error('트랜잭션 조회 오류:', error)
    return c.json({ error: '트랜잭션 조회 중 오류가 발생했습니다', details: error.message }, 500)
  }
})

// ================================================
// 10. 판매 처리 (QR/바코드)
// ================================================
qr.post('/sale', async (c) => {
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const { qr_code, quantity, customer_name, sale_price, notes } = await c.req.json()

  if (!qr_code) return c.json({ error: '스캔 코드가 필요합니다' }, 400)
  if (!quantity || quantity < 1) return c.json({ error: '올바른 수량을 입력하세요' }, 400)
  if (sale_price == null || sale_price < 0) return c.json({ error: '올바른 판매가를 입력하세요' }, 400)

  try {
    const resolved = await resolveScanCode(c.env.DB, tenantId, qr_code, userId)
    if (!resolved) return c.json({ error: 'QR/바코드/SKU를 찾을 수 없습니다' }, 404)
    if (resolved.status !== 'active') {
      return c.json({ error: `비활성화된 코드입니다 (상태: ${resolved.status})` }, 400)
    }

    if (resolved.current_stock < quantity) {
      return c.json({
        error: '재고가 부족합니다',
        current_stock: resolved.current_stock,
        requested: quantity
      }, 400)
    }

    const previousStock = resolved.current_stock
    const totalAmount = Number(sale_price) * quantity
    const saleNotes = [
      `스캔 판매 (${resolved.scan_source}): ${resolved.qr_code}`,
      customer_name ? `고객: ${customer_name}` : null,
      notes || null
    ].filter(Boolean).join(' / ')

    const saleResult = await c.env.DB.prepare(`
      INSERT INTO sales (tenant_id, customer_id, total_amount, discount_amount, final_amount, payment_method, notes, created_by)
      VALUES (?, NULL, ?, 0, ?, '현금', ?, ?)
    `).bind(tenantId, totalAmount, totalAmount, saleNotes, userId).run()

    const saleId = Number(saleResult.meta.last_row_id)

    await c.env.DB.prepare(`
      INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
      VALUES (?, ?, ?, ?, ?)
    `).bind(saleId, resolved.product_id, quantity, sale_price, totalAmount).run()

    await c.env.DB.prepare(`
      UPDATE products
      SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `).bind(quantity, resolved.product_id, tenantId).run()

    const allocations = await deductWarehouseStock(c.env.DB, tenantId, resolved.product_id, quantity, null)
    for (const a of allocations) {
      await c.env.DB.prepare(`
        INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason, reference_id, notes, created_by)
        VALUES (?, ?, ?, '출고', ?, '판매', ?, ?, ?)
      `).bind(tenantId, resolved.product_id, a.warehouse_id, -a.quantity, saleId, saleNotes, userId).run()
    }

    await c.env.DB.prepare(`
      INSERT INTO qr_transactions (qr_code_id, transaction_type, product_id, quantity, created_by, notes, reference_type, reference_id)
      VALUES (?, 'sale', ?, ?, ?, ?, 'sale', ?)
    `).bind(resolved.qr_id, resolved.product_id, quantity, userId, notes || null, saleId).run()

    const updated = await c.env.DB.prepare(`
      SELECT COALESCE(current_stock, 0) AS current_stock FROM products WHERE id = ?
    `).bind(resolved.product_id).first<{ current_stock: number }>()

    return c.json({
      success: true,
      message: '판매가 완료되었습니다',
      transaction: {
        product_name: resolved.product_name,
        quantity,
        sale_price,
        total_amount: totalAmount,
        previous_stock: previousStock,
        new_stock: updated?.current_stock || 0,
        customer_name,
        scan_source: resolved.scan_source,
        sale_id: saleId
      }
    })
  } catch (error: any) {
    console.error('판매 처리 오류:', error)
    return c.json({ error: error.message || '판매 처리 중 오류가 발생했습니다', details: error.message }, 500)
  }
})

export default qr
