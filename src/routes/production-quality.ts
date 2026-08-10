import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const DEFAULT_DEFECTS = [
  { code: 'DIM', name: '치수 불량', category: 'dimension', sort_order: 1 },
  { code: 'APP', name: '외관 불량', category: 'appearance', sort_order: 2 },
  { code: 'FUNC', name: '기능 불량', category: 'function', sort_order: 3 },
  { code: 'MAT', name: '자재 불량', category: 'material', sort_order: 4 },
  { code: 'PKG', name: '포장 불량', category: 'packaging', sort_order: 5 },
  { code: 'OTHER', name: '기타', category: 'general', sort_order: 99 }
]

async function ensureDefaultDefects(DB: Bindings['DB'], tenantId: number) {
  const count = await DB.prepare(
    'SELECT COUNT(*) as c FROM mes_defect_types WHERE tenant_id = ?'
  ).bind(tenantId).first<{ c: number }>()
  if ((count?.c || 0) > 0) return

  for (const d of DEFAULT_DEFECTS) {
    await DB.prepare(`
      INSERT OR IGNORE INTO mes_defect_types (tenant_id, code, name, category, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).bind(tenantId, d.code, d.name, d.category, d.sort_order).run()
  }
}

function generateNcrNumber() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const r = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `NCR-${d}-${r}`
}

// ---------- 불량 유형 ----------
app.get('/defect-types', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  await ensureDefaultDefects(DB, tenantId)

  const activeOnly = c.req.query('active') !== '0'
  let query = 'SELECT * FROM mes_defect_types WHERE tenant_id = ?'
  if (activeOnly) query += ' AND is_active = 1'
  query += ' ORDER BY sort_order ASC, id ASC'

  const { results } = await DB.prepare(query).bind(tenantId).all()
  return c.json({ success: true, data: results })
})

app.post('/defect-types', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const body = await c.req.json<any>()

  if (!body.code?.trim() || !body.name?.trim()) {
    return c.json({ success: false, error: '코드와 명칭은 필수입니다.' }, 400)
  }

  try {
    const result = await DB.prepare(`
      INSERT INTO mes_defect_types (tenant_id, code, name, category, sort_order, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      body.code.trim().toUpperCase(),
      body.name.trim(),
      body.category || 'general',
      Number(body.sort_order) || 0,
      body.notes || null
    ).run()
    return c.json({ success: true, data: { id: result.meta.last_row_id } })
  } catch (e: any) {
    if (String(e.message || '').includes('UNIQUE')) {
      return c.json({ success: false, error: '이미 존재하는 불량 코드입니다.' }, 400)
    }
    return c.json({ success: false, error: e.message || '등록 실패' }, 500)
  }
})

app.put('/defect-types/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<any>()

  const existing = await DB.prepare(
    'SELECT id FROM mes_defect_types WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first()
  if (!existing) return c.json({ success: false, error: '불량 유형을 찾을 수 없습니다.' }, 404)

  await DB.prepare(`
    UPDATE mes_defect_types
    SET code = ?, name = ?, category = ?, sort_order = ?, is_active = ?, notes = ?,
        updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(
    body.code?.trim()?.toUpperCase() || '',
    body.name?.trim() || '',
    body.category || 'general',
    Number(body.sort_order) || 0,
    body.is_active === 0 || body.is_active === false ? 0 : 1,
    body.notes || null,
    id,
    tenantId
  ).run()

  return c.json({ success: true, message: '수정되었습니다.' })
})

app.delete('/defect-types/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  await DB.prepare(`
    UPDATE mes_defect_types SET is_active = 0, updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(id, tenantId).run()

  return c.json({ success: true, message: '비활성화되었습니다.' })
})

// ---------- 검사 ----------
app.get('/inspections', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const result = c.req.query('result') || ''
  const workOrderId = c.req.query('work_order_id') || ''

  let query = `
    SELECT i.*,
      p.name as product_name, p.sku as product_sku,
      wo.wo_number,
      u.name as inspector_name
    FROM mes_inspections i
    JOIN products p ON i.product_id = p.id
    LEFT JOIN mes_work_orders wo ON i.work_order_id = wo.id
    LEFT JOIN users u ON i.inspector_user_id = u.id
    WHERE i.tenant_id = ?
  `
  const params: any[] = [tenantId]
  if (result) {
    query += ' AND i.result = ?'
    params.push(result)
  }
  if (workOrderId) {
    query += ' AND i.work_order_id = ?'
    params.push(workOrderId)
  }
  query += ' ORDER BY i.inspected_at DESC, i.id DESC LIMIT 200'

  const { results } = await DB.prepare(query).bind(...params).all()
  return c.json({ success: true, data: results })
})

app.get('/inspections/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const inspection = await DB.prepare(`
    SELECT i.*,
      p.name as product_name, p.sku as product_sku,
      wo.wo_number,
      u.name as inspector_name
    FROM mes_inspections i
    JOIN products p ON i.product_id = p.id
    LEFT JOIN mes_work_orders wo ON i.work_order_id = wo.id
    LEFT JOIN users u ON i.inspector_user_id = u.id
    WHERE i.id = ? AND i.tenant_id = ?
  `).bind(id, tenantId).first()

  if (!inspection) {
    return c.json({ success: false, error: '검사 기록을 찾을 수 없습니다.' }, 404)
  }

  const { results: defects } = await DB.prepare(`
    SELECT d.*, dt.code as defect_code, dt.name as defect_name
    FROM mes_inspection_defects d
    JOIN mes_defect_types dt ON d.defect_type_id = dt.id
    WHERE d.inspection_id = ? AND d.tenant_id = ?
  `).bind(id, tenantId).all()

  return c.json({ success: true, data: { ...inspection, defects } })
})

app.post('/inspections', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const body = await c.req.json<any>()

  const result = body.result === 'fail' ? 'fail' : 'pass'
  const inspectedQty = Number(body.inspected_qty) > 0 ? Number(body.inspected_qty) : 1
  const defectQty = Number(body.defect_qty) || 0

  if (!body.product_id && !body.work_order_id) {
    return c.json({ success: false, error: '상품 또는 작업지시가 필요합니다.' }, 400)
  }

  let productId = body.product_id ? Number(body.product_id) : null
  let workOrderId = body.work_order_id ? Number(body.work_order_id) : null
  let lotNumber = body.lot_number || null
  let qrCodeId = body.qr_code_id || null
  let qrCode = body.qr_code || null

  if (workOrderId) {
    const wo = await DB.prepare(
      'SELECT * FROM mes_work_orders WHERE id = ? AND tenant_id = ?'
    ).bind(workOrderId, tenantId).first<any>()
    if (!wo) return c.json({ success: false, error: '작업지시를 찾을 수 없습니다.' }, 404)
    productId = productId || wo.product_id
  }

  if (qrCode && !qrCodeId) {
    const qr = await DB.prepare(`
      SELECT id, product_id, lot_number, work_order_id FROM qr_codes
      WHERE code = ? AND (tenant_id = ? OR tenant_id IS NULL)
    `).bind(qrCode, tenantId).first<any>()
    if (qr) {
      qrCodeId = qr.id
      lotNumber = lotNumber || qr.lot_number
      productId = productId || qr.product_id
      workOrderId = workOrderId || qr.work_order_id
    }
  }

  if (!productId) {
    return c.json({ success: false, error: '검사 대상 상품을 확인할 수 없습니다.' }, 400)
  }

  if (result === 'fail' && defectQty <= 0) {
    return c.json({ success: false, error: '불합격 시 불량 수량을 입력해주세요.' }, 400)
  }

  try {
    const insert = await DB.prepare(`
      INSERT INTO mes_inspections (
        tenant_id, work_order_id, product_id, lot_number, qr_code_id, qr_code,
        result, inspected_qty, defect_qty, inspector_user_id, notes, claim_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      workOrderId,
      productId,
      lotNumber,
      qrCodeId,
      qrCode,
      result,
      inspectedQty,
      result === 'fail' ? defectQty : 0,
      body.inspector_user_id || userId,
      body.notes || null,
      body.claim_id || null,
      userId
    ).run()

    const inspectionId = insert.meta.last_row_id as number
    const defects = Array.isArray(body.defects) ? body.defects : []

    for (const d of defects) {
      if (!d.defect_type_id) continue
      await DB.prepare(`
        INSERT INTO mes_inspection_defects (tenant_id, inspection_id, defect_type_id, quantity, notes)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        tenantId,
        inspectionId,
        d.defect_type_id,
        Number(d.quantity) > 0 ? Number(d.quantity) : 1,
        d.notes || null
      ).run()
    }

    let ncr = null
    // 불합격이고 create_ncr가 false가 아니면 NCR 자동 생성
    if (result === 'fail' && body.create_ncr !== false) {
      const primaryDefect = defects[0]?.defect_type_id || null
      const ncrNumber = generateNcrNumber()
      const product = await DB.prepare(
        'SELECT name FROM products WHERE id = ? AND tenant_id = ?'
      ).bind(productId, tenantId).first<{ name: string }>()

      const ncrRes = await DB.prepare(`
        INSERT INTO mes_ncrs (
          tenant_id, ncr_number, work_order_id, product_id, lot_number, qr_code_id,
          inspection_id, claim_id, defect_type_id, quantity, status, title, description, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
      `).bind(
        tenantId,
        ncrNumber,
        workOrderId,
        productId,
        lotNumber,
        qrCodeId,
        inspectionId,
        body.claim_id || null,
        primaryDefect,
        defectQty || inspectedQty,
        `검사 불합격 — ${product?.name || productId}`,
        body.notes || '검사 불합격으로 자동 생성된 부적합 보고서',
        userId
      ).run()

      ncr = { id: ncrRes.meta.last_row_id, ncr_number: ncrNumber }
    }

    return c.json({
      success: true,
      message: result === 'pass' ? '합격 검사가 등록되었습니다.' : '불합격 검사 및 부적합이 등록되었습니다.',
      data: { id: inspectionId, ncr }
    })
  } catch (e: any) {
    console.error(e)
    return c.json({ success: false, error: e.message || '검사 등록 실패' }, 500)
  }
})

// ---------- NCR (부적합) ----------
app.get('/ncrs', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const status = c.req.query('status') || ''
  const search = c.req.query('search') || ''

  let query = `
    SELECT n.*,
      p.name as product_name, p.sku as product_sku,
      wo.wo_number,
      dt.code as defect_code, dt.name as defect_name,
      u.name as created_by_name
    FROM mes_ncrs n
    LEFT JOIN products p ON n.product_id = p.id
    LEFT JOIN mes_work_orders wo ON n.work_order_id = wo.id
    LEFT JOIN mes_defect_types dt ON n.defect_type_id = dt.id
    LEFT JOIN users u ON n.created_by = u.id
    WHERE n.tenant_id = ?
  `
  const params: any[] = [tenantId]
  if (status) {
    query += ' AND n.status = ?'
    params.push(status)
  }
  if (search) {
    query += ' AND (n.ncr_number LIKE ? OR n.title LIKE ? OR n.lot_number LIKE ? OR p.name LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }
  query += ' ORDER BY n.created_at DESC LIMIT 200'

  const { results } = await DB.prepare(query).bind(...params).all()
  return c.json({ success: true, data: results })
})

app.get('/ncrs/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const ncr = await DB.prepare(`
    SELECT n.*,
      p.name as product_name, p.sku as product_sku,
      wo.wo_number,
      dt.code as defect_code, dt.name as defect_name,
      u.name as created_by_name,
      qc.code as qr_code
    FROM mes_ncrs n
    LEFT JOIN products p ON n.product_id = p.id
    LEFT JOIN mes_work_orders wo ON n.work_order_id = wo.id
    LEFT JOIN mes_defect_types dt ON n.defect_type_id = dt.id
    LEFT JOIN users u ON n.created_by = u.id
    LEFT JOIN qr_codes qc ON n.qr_code_id = qc.id
    WHERE n.id = ? AND n.tenant_id = ?
  `).bind(id, tenantId).first()

  if (!ncr) return c.json({ success: false, error: 'NCR을 찾을 수 없습니다.' }, 404)
  return c.json({ success: true, data: ncr })
})

app.post('/ncrs', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const body = await c.req.json<any>()

  if (!body.title?.trim()) {
    return c.json({ success: false, error: '제목은 필수입니다.' }, 400)
  }

  const ncrNumber = body.ncr_number?.trim() || generateNcrNumber()

  try {
    const result = await DB.prepare(`
      INSERT INTO mes_ncrs (
        tenant_id, ncr_number, work_order_id, product_id, lot_number, qr_code_id,
        inspection_id, claim_id, defect_type_id, quantity, status, title, description, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
    `).bind(
      tenantId,
      ncrNumber,
      body.work_order_id || null,
      body.product_id || null,
      body.lot_number || null,
      body.qr_code_id || null,
      body.inspection_id || null,
      body.claim_id || null,
      body.defect_type_id || null,
      Number(body.quantity) > 0 ? Number(body.quantity) : 1,
      body.title.trim(),
      body.description || null,
      userId
    ).run()

    return c.json({ success: true, data: { id: result.meta.last_row_id, ncr_number: ncrNumber } })
  } catch (e: any) {
    if (String(e.message || '').includes('UNIQUE')) {
      return c.json({ success: false, error: '동일한 NCR 번호가 있습니다.' }, 400)
    }
    return c.json({ success: false, error: e.message || 'NCR 등록 실패' }, 500)
  }
})

app.put('/ncrs/:id/dispose', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json<any>()

  const allowed = ['rework', 'scrap', 'use_as_is', 'return_supplier', 'closed']
  if (!allowed.includes(body.disposition) && !allowed.includes(body.status)) {
    return c.json({ success: false, error: '유효하지 않은 처리 구분입니다.' }, 400)
  }

  const ncr = await DB.prepare(
    'SELECT * FROM mes_ncrs WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()
  if (!ncr) return c.json({ success: false, error: 'NCR을 찾을 수 없습니다.' }, 404)
  if (ncr.status === 'closed') {
    return c.json({ success: false, error: '이미 종결된 NCR입니다.' }, 400)
  }

  const disposition = body.disposition || body.status
  const status = disposition === 'closed' ? 'closed' : disposition
  const closedAt = status === 'closed' || ['scrap', 'use_as_is', 'return_supplier'].includes(disposition)
    ? new Date().toISOString()
    : null
  const finalStatus = disposition === 'rework' ? 'rework' : (closedAt ? 'closed' : status)

  await DB.prepare(`
    UPDATE mes_ncrs
    SET status = ?, disposition = ?, action_notes = ?, claim_id = COALESCE(?, claim_id),
        closed_at = CASE WHEN ? IS NOT NULL THEN ? ELSE closed_at END,
        updated_by = ?, updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(
    finalStatus === 'rework' && body.close_after_rework ? 'closed' : finalStatus,
    disposition,
    body.action_notes || null,
    body.claim_id || null,
    closedAt,
    closedAt,
    userId,
    id,
    tenantId
  ).run()

  // 폐기 시 재고 차감 옵션
  if (disposition === 'scrap' && body.apply_stock && ncr.product_id && body.warehouse_id) {
    const qty = Number(body.quantity) > 0 ? Number(body.quantity) : Number(ncr.quantity) || 1
    const warehouseId = Number(body.warehouse_id)

    const whStock = await DB.prepare(`
      SELECT quantity FROM product_warehouse_stocks
      WHERE product_id = ? AND warehouse_id = ? AND tenant_id = ?
    `).bind(ncr.product_id, warehouseId, tenantId).first<{ quantity: number }>()

    if ((whStock?.quantity || 0) < qty) {
      return c.json({
        success: false,
        error: `폐기 재고 부족 (창고재고: ${whStock?.quantity || 0})`
      }, 400)
    }

    await DB.prepare(`
      UPDATE products SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `).bind(qty, ncr.product_id, tenantId).run()

    await DB.prepare(`
      UPDATE product_warehouse_stocks
      SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ? AND warehouse_id = ? AND tenant_id = ?
    `).bind(qty, ncr.product_id, warehouseId, tenantId).run()

    await DB.prepare(`
      INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason, notes, created_by)
      VALUES (?, ?, ?, '출고', ?, '품질폐기', ?, ?)
    `).bind(tenantId, ncr.product_id, warehouseId, -qty, `NCR ${ncr.ncr_number}`, userId).run()
  }

  return c.json({ success: true, message: '부적합 처리가 반영되었습니다.' })
})

// 품질 요약
app.get('/stats', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')

  const row = await DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM mes_inspections WHERE tenant_id = ? AND DATE(inspected_at) = DATE('now','localtime')) as inspections_today,
      (SELECT COUNT(*) FROM mes_inspections WHERE tenant_id = ? AND result = 'fail' AND DATE(inspected_at) = DATE('now','localtime')) as fails_today,
      (SELECT COUNT(*) FROM mes_ncrs WHERE tenant_id = ? AND status IN ('open','rework')) as open_ncrs,
      (SELECT COUNT(*) FROM mes_ncrs WHERE tenant_id = ? AND status = 'closed' AND DATE(closed_at) = DATE('now','localtime')) as closed_today,
      (SELECT COUNT(*) FROM mes_inspections WHERE tenant_id = ? AND result = 'pass' AND DATE(inspected_at) >= DATE('now','localtime','-30 day')) as pass_30d,
      (SELECT COUNT(*) FROM mes_inspections WHERE tenant_id = ? AND DATE(inspected_at) >= DATE('now','localtime','-30 day')) as total_30d
  `).bind(tenantId, tenantId, tenantId, tenantId, tenantId, tenantId).first<any>()

  const total30 = Number(row?.total_30d) || 0
  const pass30 = Number(row?.pass_30d) || 0

  return c.json({
    success: true,
    data: {
      ...row,
      pass_rate_30d: total30 ? Math.round((pass30 / total30) * 1000) / 10 : 0
    }
  })
})

export default app
