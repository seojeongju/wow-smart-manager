import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'
import productionTraceRouter from './production-trace'
import productionKpiRouter from './production-kpi'
import productionQualityRouter from './production-quality'
import productionOpsRouter from './production-ops'
import productionCostRouter from './production-cost'
import { denyIfNoPermission } from '../utils/rbac'
import { createCostSnapshot } from '../utils/mes-cost'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Phase 7: MES RBAC 가드
app.use('*', async (c, next) => {
  const method = c.req.method.toUpperCase()
  const path = c.req.path || ''

  if (method === 'OPTIONS' || method === 'HEAD') {
    return next()
  }

  if (method === 'GET') {
    const denied = denyIfNoPermission(c, 'mes.read')
    if (denied) return denied
    return next()
  }

  // 쓰기 권한 분기
  if (path.includes('/trace') || /\/work-orders\/\d+\/records/.test(path) || path.includes('/records')) {
    const denied = denyIfNoPermission(c, 'floor.write')
    if (denied) return denied
  } else if (path.includes('/quality')) {
    const denied = denyIfNoPermission(c, 'quality.write')
    if (denied) return denied
  } else if (path.includes('/kpi') || path.includes('/cost')) {
    return c.json({ success: false, error: '권한이 없습니다.' }, 403)
  } else {
    const denied = denyIfNoPermission(c, 'mes.write')
    if (denied) return denied
  }

  return next()
})

app.route('/trace', productionTraceRouter)
app.route('/kpi', productionKpiRouter)
app.route('/quality', productionQualityRouter)
app.route('/ops', productionOpsRouter)
app.route('/cost', productionCostRouter)

type D1Like = Bindings['DB']

async function syncParentStock(DB: D1Like, tenantId: number, parentId: number) {
  const totalStockResult = await DB.prepare(
    'SELECT SUM(current_stock) as total FROM products WHERE parent_id = ? AND is_active = 1 AND tenant_id = ?'
  )
    .bind(parentId, tenantId)
    .first<{ total: number }>()
  const newTotalStock = totalStockResult?.total || 0
  await DB.prepare(
    'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?'
  )
    .bind(newTotalStock, parentId, tenantId)
    .run()
}

async function applyStockIn(
  DB: D1Like,
  tenantId: number,
  userId: number,
  productId: number,
  warehouseId: number,
  quantity: number,
  reason: string,
  notes: string | null
) {
  const product = await DB.prepare(
    'SELECT id, parent_id FROM products WHERE id = ? AND is_active = 1 AND tenant_id = ?'
  )
    .bind(productId, tenantId)
    .first<{ id: number; parent_id: number | null }>()

  if (!product) {
    throw new Error(`상품을 찾을 수 없습니다. (ID: ${productId})`)
  }

  await DB.prepare(`
    UPDATE products
    SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND tenant_id = ?
  `).bind(quantity, productId, tenantId).run()

  await DB.prepare(`
    INSERT INTO product_warehouse_stocks (tenant_id, product_id, warehouse_id, quantity)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(product_id, warehouse_id)
    DO UPDATE SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
  `).bind(tenantId, productId, warehouseId, quantity, quantity).run()

  await DB.prepare(`
    INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason, notes, created_by)
    VALUES (?, ?, ?, '입고', ?, ?, ?, ?)
  `).bind(tenantId, productId, warehouseId, quantity, reason, notes, userId).run()

  if (product.parent_id) {
    await syncParentStock(DB, tenantId, product.parent_id)
  }
}

async function applyStockOut(
  DB: D1Like,
  tenantId: number,
  userId: number,
  productId: number,
  warehouseId: number,
  quantity: number,
  reason: string,
  notes: string | null
) {
  const product = await DB.prepare(
    'SELECT id, parent_id, name, sku FROM products WHERE id = ? AND is_active = 1 AND tenant_id = ?'
  )
    .bind(productId, tenantId)
    .first<{ id: number; parent_id: number | null; name: string; sku: string }>()

  if (!product) {
    throw new Error(`자재를 찾을 수 없습니다. (ID: ${productId})`)
  }

  const warehouseStock = await DB.prepare(`
    SELECT quantity FROM product_warehouse_stocks
    WHERE product_id = ? AND warehouse_id = ? AND tenant_id = ?
  `).bind(productId, warehouseId, tenantId).first<{ quantity: number }>()

  const currentWarehouseStock = warehouseStock?.quantity || 0
  if (currentWarehouseStock < quantity) {
    throw new Error(
      `자재 재고 부족: ${product.name} (${product.sku}) — 필요 ${quantity}, 창고재고 ${currentWarehouseStock}`
    )
  }

  await DB.prepare(`
    UPDATE products
    SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND tenant_id = ?
  `).bind(quantity, productId, tenantId).run()

  await DB.prepare(`
    UPDATE product_warehouse_stocks
    SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
    WHERE product_id = ? AND warehouse_id = ? AND tenant_id = ?
  `).bind(quantity, productId, warehouseId, tenantId).run()

  await DB.prepare(`
    INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason, notes, created_by)
    VALUES (?, ?, ?, '출고', ?, ?, ?, ?)
  `).bind(tenantId, productId, warehouseId, -quantity, reason, notes, userId).run()

  if (product.parent_id) {
    await syncParentStock(DB, tenantId, product.parent_id)
  }
}

// ---------- 통계 ----------
app.get('/stats', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')

  const row = await DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM mes_work_orders WHERE tenant_id = ? AND status IN ('planned', 'released', 'in_progress')) as open_wo,
      (SELECT COUNT(*) FROM mes_work_orders WHERE tenant_id = ? AND status = 'in_progress') as in_progress_wo,
      (SELECT COUNT(*) FROM mes_work_orders WHERE tenant_id = ? AND status = 'completed' AND DATE(actual_end_at) = DATE('now')) as completed_today,
      (SELECT COUNT(*) FROM mes_boms WHERE tenant_id = ? AND is_active = 1) as active_boms,
      (SELECT COALESCE(SUM(good_qty), 0) FROM mes_production_records WHERE tenant_id = ? AND DATE(recorded_at) = DATE('now')) as good_today,
      (SELECT COALESCE(SUM(scrap_qty), 0) FROM mes_production_records WHERE tenant_id = ? AND DATE(recorded_at) = DATE('now')) as scrap_today
  `).bind(tenantId, tenantId, tenantId, tenantId, tenantId, tenantId).first()

  return c.json({ success: true, data: row })
})

// ---------- 공정 ----------
app.get('/processes', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const activeOnly = c.req.query('active') === '1'

  let query = `
    SELECT * FROM mes_processes
    WHERE tenant_id = ?
  `
  const params: any[] = [tenantId]
  if (activeOnly) {
    query += ' AND is_active = 1'
  }
  query += ' ORDER BY sort_order ASC, id ASC'

  const { results } = await DB.prepare(query).bind(...params).all()
  return c.json({ success: true, data: results })
})

app.post('/processes', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const body = await c.req.json<any>()

  if (!body.name?.trim()) {
    return c.json({ success: false, error: '공정명을 입력해주세요.' }, 400)
  }

  try {
    const result = await DB.prepare(`
      INSERT INTO mes_processes (tenant_id, code, name, sort_order, standard_minutes, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      body.code || null,
      body.name.trim(),
      Number(body.sort_order) || 0,
      Number(body.standard_minutes) || 0,
      body.notes || null
    ).run()

    return c.json({ success: true, data: { id: result.meta.last_row_id } })
  } catch (e: any) {
    console.error(e)
    return c.json({ success: false, error: e.message || '공정 등록 실패' }, 500)
  }
})

app.put('/processes/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<any>()

  const existing = await DB.prepare(
    'SELECT id FROM mes_processes WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first()

  if (!existing) {
    return c.json({ success: false, error: '공정을 찾을 수 없습니다.' }, 404)
  }

  await DB.prepare(`
    UPDATE mes_processes
    SET code = ?, name = ?, sort_order = ?, standard_minutes = ?, is_active = ?, notes = ?,
        updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(
    body.code || null,
    body.name?.trim() || '',
    Number(body.sort_order) || 0,
    Number(body.standard_minutes) || 0,
    body.is_active === 0 || body.is_active === false ? 0 : 1,
    body.notes || null,
    id,
    tenantId
  ).run()

  return c.json({ success: true, message: '공정이 수정되었습니다.' })
})

app.delete('/processes/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  await DB.prepare(`
    UPDATE mes_processes
    SET is_active = 0, updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(id, tenantId).run()

  return c.json({ success: true, message: '공정이 비활성화되었습니다.' })
})

// ---------- BOM ----------
app.get('/boms', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const search = c.req.query('search') || ''
  const activeOnly = c.req.query('active') !== '0'

  let query = `
    SELECT b.*, p.name as product_name, p.sku as product_sku,
      (SELECT COUNT(*) FROM mes_bom_items bi WHERE bi.bom_id = b.id) as item_count
    FROM mes_boms b
    JOIN products p ON b.product_id = p.id
    WHERE b.tenant_id = ?
  `
  const params: any[] = [tenantId]

  if (activeOnly) {
    query += ' AND b.is_active = 1'
  }
  if (search) {
    query += ' AND (b.name LIKE ? OR p.name LIKE ? OR p.sku LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  query += ' ORDER BY b.updated_at DESC, b.id DESC'

  const { results } = await DB.prepare(query).bind(...params).all()
  return c.json({ success: true, data: results })
})

app.get('/boms/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const bom = await DB.prepare(`
    SELECT b.*, p.name as product_name, p.sku as product_sku
    FROM mes_boms b
    JOIN products p ON b.product_id = p.id
    WHERE b.id = ? AND b.tenant_id = ?
  `).bind(id, tenantId).first()

  if (!bom) {
    return c.json({ success: false, error: 'BOM을 찾을 수 없습니다.' }, 404)
  }

  const { results: items } = await DB.prepare(`
    SELECT bi.*, p.name as component_name, p.sku as component_sku, p.current_stock
    FROM mes_bom_items bi
    JOIN products p ON bi.component_product_id = p.id
    WHERE bi.bom_id = ? AND bi.tenant_id = ?
    ORDER BY bi.sort_order ASC, bi.id ASC
  `).bind(id, tenantId).all()

  return c.json({ success: true, data: { ...bom, items } })
})

app.post('/boms', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const body = await c.req.json<any>()

  if (!body.product_id || !body.name?.trim()) {
    return c.json({ success: false, error: '완제품과 BOM명을 입력해주세요.' }, 400)
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return c.json({ success: false, error: '구성 자재를 1개 이상 등록해주세요.' }, 400)
  }

  const product = await DB.prepare(
    'SELECT id FROM products WHERE id = ? AND tenant_id = ? AND is_active = 1'
  ).bind(body.product_id, tenantId).first()
  if (!product) {
    return c.json({ success: false, error: '완제품 상품을 찾을 수 없습니다.' }, 404)
  }

  for (const item of body.items) {
    if (!item.component_product_id || !(Number(item.quantity) > 0)) {
      return c.json({ success: false, error: '자재와 소요량은 필수입니다.' }, 400)
    }
    if (Number(item.component_product_id) === Number(body.product_id)) {
      return c.json({ success: false, error: '완제품과 동일한 자재는 등록할 수 없습니다.' }, 400)
    }
  }

  try {
    const result = await DB.prepare(`
      INSERT INTO mes_boms (tenant_id, product_id, name, version, notes)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      body.product_id,
      body.name.trim(),
      body.version?.trim() || '1.0',
      body.notes || null
    ).run()

    const bomId = result.meta.last_row_id

    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i]
      await DB.prepare(`
        INSERT INTO mes_bom_items (tenant_id, bom_id, component_product_id, quantity, unit, sort_order, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        tenantId,
        bomId,
        item.component_product_id,
        Number(item.quantity),
        item.unit || 'EA',
        item.sort_order ?? i,
        item.notes || null
      ).run()
    }

    return c.json({ success: true, data: { id: bomId } })
  } catch (e: any) {
    console.error(e)
    if (String(e.message || '').includes('UNIQUE')) {
      return c.json({ success: false, error: '동일 제품·버전의 BOM이 이미 있습니다.' }, 400)
    }
    return c.json({ success: false, error: e.message || 'BOM 등록 실패' }, 500)
  }
})

app.put('/boms/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<any>()

  const existing = await DB.prepare(
    'SELECT id FROM mes_boms WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first()
  if (!existing) {
    return c.json({ success: false, error: 'BOM을 찾을 수 없습니다.' }, 404)
  }

  if (!body.name?.trim()) {
    return c.json({ success: false, error: 'BOM명을 입력해주세요.' }, 400)
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return c.json({ success: false, error: '구성 자재를 1개 이상 등록해주세요.' }, 400)
  }

  try {
    await DB.prepare(`
      UPDATE mes_boms
      SET name = ?, version = ?, is_active = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(
      body.name.trim(),
      body.version?.trim() || '1.0',
      body.is_active === 0 || body.is_active === false ? 0 : 1,
      body.notes || null,
      id,
      tenantId
    ).run()

    await DB.prepare('DELETE FROM mes_bom_items WHERE bom_id = ? AND tenant_id = ?')
      .bind(id, tenantId).run()

    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i]
      await DB.prepare(`
        INSERT INTO mes_bom_items (tenant_id, bom_id, component_product_id, quantity, unit, sort_order, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        tenantId,
        id,
        item.component_product_id,
        Number(item.quantity),
        item.unit || 'EA',
        item.sort_order ?? i,
        item.notes || null
      ).run()
    }

    return c.json({ success: true, message: 'BOM이 수정되었습니다.' })
  } catch (e: any) {
    console.error(e)
    return c.json({ success: false, error: e.message || 'BOM 수정 실패' }, 500)
  }
})

app.delete('/boms/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  await DB.prepare(`
    UPDATE mes_boms
    SET is_active = 0, updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(id, tenantId).run()

  return c.json({ success: true, message: 'BOM이 비활성화되었습니다.' })
})

// ---------- 작업지시 ----------
app.get('/work-orders', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const status = c.req.query('status') || ''
  const search = c.req.query('search') || ''

  let query = `
    SELECT wo.*,
      p.name as product_name, p.sku as product_sku,
      b.name as bom_name, b.version as bom_version,
      pr.name as process_name,
      w.name as warehouse_name,
      eq.name as equipment_name,
      u.name as created_by_name
    FROM mes_work_orders wo
    JOIN products p ON wo.product_id = p.id
    LEFT JOIN mes_boms b ON wo.bom_id = b.id
    LEFT JOIN mes_processes pr ON wo.process_id = pr.id
    LEFT JOIN warehouses w ON wo.warehouse_id = w.id
    LEFT JOIN mes_equipment eq ON wo.equipment_id = eq.id
    LEFT JOIN users u ON wo.created_by = u.id
    WHERE wo.tenant_id = ?
  `
  const params: any[] = [tenantId]

  if (status) {
    query += ' AND wo.status = ?'
    params.push(status)
  }
  if (search) {
    query += ' AND (wo.wo_number LIKE ? OR p.name LIKE ? OR p.sku LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  query += ' ORDER BY wo.created_at DESC'

  const { results } = await DB.prepare(query).bind(...params).all()
  return c.json({ success: true, data: results })
})

app.get('/work-orders/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const wo = await DB.prepare(`
    SELECT wo.*,
      p.name as product_name, p.sku as product_sku,
      b.name as bom_name, b.version as bom_version,
      pr.name as process_name,
      w.name as warehouse_name,
      eq.name as equipment_name,
      u.name as created_by_name
    FROM mes_work_orders wo
    JOIN products p ON wo.product_id = p.id
    LEFT JOIN mes_boms b ON wo.bom_id = b.id
    LEFT JOIN mes_processes pr ON wo.process_id = pr.id
    LEFT JOIN warehouses w ON wo.warehouse_id = w.id
    LEFT JOIN mes_equipment eq ON wo.equipment_id = eq.id
    LEFT JOIN users u ON wo.created_by = u.id
    WHERE wo.id = ? AND wo.tenant_id = ?
  `).bind(id, tenantId).first()

  if (!wo) {
    return c.json({ success: false, error: '작업지시를 찾을 수 없습니다.' }, 404)
  }

  let bomItems: any[] = []
  if ((wo as any).bom_id) {
    const { results } = await DB.prepare(`
      SELECT bi.*, p.name as component_name, p.sku as component_sku, p.current_stock
      FROM mes_bom_items bi
      JOIN products p ON bi.component_product_id = p.id
      WHERE bi.bom_id = ? AND bi.tenant_id = ?
      ORDER BY bi.sort_order ASC, bi.id ASC
    `).bind((wo as any).bom_id, tenantId).all()
    bomItems = results || []
  }

  const { results: records } = await DB.prepare(`
    SELECT r.*, pr.name as process_name, u.name as worker_name, w.name as warehouse_name
    FROM mes_production_records r
    LEFT JOIN mes_processes pr ON r.process_id = pr.id
    LEFT JOIN users u ON r.worker_user_id = u.id
    LEFT JOIN warehouses w ON r.warehouse_id = w.id
    WHERE r.work_order_id = ? AND r.tenant_id = ?
    ORDER BY r.recorded_at DESC, r.id DESC
  `).bind(id, tenantId).all()

  return c.json({
    success: true,
    data: { ...wo, bom_items: bomItems, records }
  })
})

app.post('/work-orders', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const body = await c.req.json<any>()

  if (!body.product_id || !(Number(body.planned_qty) > 0)) {
    return c.json({ success: false, error: '완제품과 계획수량은 필수입니다.' }, 400)
  }

  const product = await DB.prepare(
    'SELECT id FROM products WHERE id = ? AND tenant_id = ? AND is_active = 1'
  ).bind(body.product_id, tenantId).first()
  if (!product) {
    return c.json({ success: false, error: '완제품 상품을 찾을 수 없습니다.' }, 404)
  }

  if (body.bom_id) {
    const bom = await DB.prepare(
      'SELECT id, product_id FROM mes_boms WHERE id = ? AND tenant_id = ? AND is_active = 1'
    ).bind(body.bom_id, tenantId).first<{ id: number; product_id: number }>()
    if (!bom) {
      return c.json({ success: false, error: 'BOM을 찾을 수 없습니다.' }, 404)
    }
    if (Number(bom.product_id) !== Number(body.product_id)) {
      return c.json({ success: false, error: 'BOM과 완제품이 일치하지 않습니다.' }, 400)
    }
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomStr = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  const woNumber = body.wo_number?.trim() || `WO-${dateStr}-${randomStr}`

  try {
    const result = await DB.prepare(`
      INSERT INTO mes_work_orders (
        tenant_id, wo_number, product_id, bom_id, process_id, planned_qty,
        status, warehouse_id, planned_start_date, planned_end_date,
        assignee_user_id, equipment_id, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, 'planned', ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      woNumber,
      body.product_id,
      body.bom_id || null,
      body.process_id || null,
      Number(body.planned_qty),
      body.warehouse_id || null,
      body.planned_start_date || null,
      body.planned_end_date || null,
      body.assignee_user_id || null,
      body.equipment_id || null,
      body.notes || null,
      userId
    ).run()

    return c.json({ success: true, data: { id: result.meta.last_row_id, wo_number: woNumber } })
  } catch (e: any) {
    console.error(e)
    if (String(e.message || '').includes('UNIQUE')) {
      return c.json({ success: false, error: '동일한 작업지시 번호가 이미 있습니다.' }, 400)
    }
    return c.json({ success: false, error: e.message || '작업지시 등록 실패' }, 500)
  }
})

app.put('/work-orders/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<any>()

  const wo = await DB.prepare(
    'SELECT * FROM mes_work_orders WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()

  if (!wo) {
    return c.json({ success: false, error: '작업지시를 찾을 수 없습니다.' }, 404)
  }
  if (['completed', 'cancelled'].includes(wo.status)) {
    return c.json({ success: false, error: '완료/취소된 작업지시는 수정할 수 없습니다.' }, 400)
  }

  await DB.prepare(`
    UPDATE mes_work_orders
    SET bom_id = ?, process_id = ?, planned_qty = ?, warehouse_id = ?,
        planned_start_date = ?, planned_end_date = ?, assignee_user_id = ?,
        equipment_id = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(
    body.bom_id ?? wo.bom_id,
    body.process_id ?? wo.process_id,
    body.planned_qty != null ? Number(body.planned_qty) : wo.planned_qty,
    body.warehouse_id ?? wo.warehouse_id,
    body.planned_start_date ?? wo.planned_start_date,
    body.planned_end_date ?? wo.planned_end_date,
    body.assignee_user_id ?? wo.assignee_user_id,
    body.equipment_id !== undefined ? (body.equipment_id || null) : wo.equipment_id,
    body.notes ?? wo.notes,
    id,
    tenantId
  ).run()

  return c.json({ success: true, message: '작업지시가 수정되었습니다.' })
})

app.put('/work-orders/:id/status', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<{ status: string }>()

  const allowed = ['planned', 'released', 'in_progress', 'completed', 'cancelled']
  if (!allowed.includes(body.status)) {
    return c.json({ success: false, error: '유효하지 않은 상태입니다.' }, 400)
  }

  const wo = await DB.prepare(
    'SELECT * FROM mes_work_orders WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()

  if (!wo) {
    return c.json({ success: false, error: '작업지시를 찾을 수 없습니다.' }, 404)
  }

  const transitions: Record<string, string[]> = {
    planned: ['released', 'cancelled'],
    released: ['in_progress', 'cancelled', 'planned'],
    in_progress: ['completed', 'cancelled'],
    completed: [],
    cancelled: ['planned']
  }

  if (!transitions[wo.status]?.includes(body.status)) {
    return c.json({
      success: false,
      error: `상태 변경 불가: ${wo.status} → ${body.status}`
    }, 400)
  }

  if (body.status === 'released' && !wo.warehouse_id) {
    return c.json({ success: false, error: '작업 지시 확정 전 창고를 지정해주세요.' }, 400)
  }

  let actualStart = wo.actual_start_at
  let actualEnd = wo.actual_end_at
  if (body.status === 'in_progress' && !actualStart) {
    actualStart = new Date().toISOString()
  }
  if (body.status === 'completed') {
    actualEnd = new Date().toISOString()
    if (!actualStart) actualStart = actualEnd
  }

  await DB.prepare(`
    UPDATE mes_work_orders
    SET status = ?, actual_start_at = ?, actual_end_at = ?, updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(body.status, actualStart, actualEnd, id, tenantId).run()

  return c.json({ success: true, message: '상태가 변경되었습니다.' })
})

// ---------- 생산실적 (+ 재고 연동) ----------
app.post('/work-orders/:id/records', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json<any>()

  const goodQty = Number(body.good_qty) || 0
  const scrapQty = Number(body.scrap_qty) || 0

  if (goodQty < 0 || scrapQty < 0 || (goodQty === 0 && scrapQty === 0)) {
    return c.json({ success: false, error: '양품/불량 수량을 확인해주세요.' }, 400)
  }

  const wo = await DB.prepare(
    'SELECT * FROM mes_work_orders WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()

  if (!wo) {
    return c.json({ success: false, error: '작업지시를 찾을 수 없습니다.' }, 404)
  }
  if (!['released', 'in_progress'].includes(wo.status)) {
    return c.json({
      success: false,
      error: '확정(released) 또는 진행중(in_progress) 상태에서만 실적을 등록할 수 있습니다.'
    }, 400)
  }

  const warehouseId = body.warehouse_id || wo.warehouse_id
  if (!warehouseId) {
    return c.json({ success: false, error: '창고를 선택해주세요.' }, 400)
  }

  const warehouse = await DB.prepare(
    'SELECT id FROM warehouses WHERE id = ? AND tenant_id = ?'
  ).bind(warehouseId, tenantId).first()
  if (!warehouse) {
    return c.json({ success: false, error: '창고를 찾을 수 없습니다.' }, 404)
  }

  const note = `WO ${wo.wo_number} 생산실적`
  const applyStock = body.apply_stock !== false

  try {
    // 재고 연동: BOM 자재 차감 + 완제품 입고 (양품만)
    if (applyStock) {
      if (wo.bom_id && goodQty > 0) {
        const { results: bomItems } = await DB.prepare(`
          SELECT * FROM mes_bom_items WHERE bom_id = ? AND tenant_id = ?
        `).bind(wo.bom_id, tenantId).all<any>()

        for (const item of bomItems || []) {
          const needQty = Number(item.quantity) * goodQty
          if (needQty > 0) {
            await applyStockOut(
              DB,
              tenantId,
              userId,
              item.component_product_id,
              warehouseId,
              needQty,
              '생산투입',
              note
            )
          }
        }
      }

      if (goodQty > 0) {
        await applyStockIn(
          DB,
          tenantId,
          userId,
          wo.product_id,
          warehouseId,
          goodQty,
          '생산입고',
          note
        )
      }
    }

    const insert = await DB.prepare(`
      INSERT INTO mes_production_records (
        tenant_id, work_order_id, good_qty, scrap_qty, process_id,
        warehouse_id, worker_user_id, stock_applied, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      id,
      goodQty,
      scrapQty,
      body.process_id || wo.process_id || null,
      warehouseId,
      body.worker_user_id || userId,
      applyStock ? 1 : 0,
      body.notes || null,
      userId
    ).run()

    const newCompleted = Number(wo.completed_qty) + goodQty
    const newScrap = Number(wo.scrap_qty) + scrapQty
    let newStatus = wo.status
    let actualStart = wo.actual_start_at
    let actualEnd = wo.actual_end_at

    if (!actualStart) {
      actualStart = new Date().toISOString()
    }
    if (newStatus === 'released') {
      newStatus = 'in_progress'
    }
    if (newCompleted >= Number(wo.planned_qty)) {
      newStatus = 'completed'
      actualEnd = new Date().toISOString()
    }

    await DB.prepare(`
      UPDATE mes_work_orders
      SET completed_qty = ?, scrap_qty = ?, status = ?,
          actual_start_at = ?, actual_end_at = ?, updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(newCompleted, newScrap, newStatus, actualStart, actualEnd, id, tenantId).run()

    // Phase 9: 원가 스냅샷
    try {
      await createCostSnapshot(DB, tenantId, {
        work_order_id: Number(id),
        production_record_id: Number(insert.meta.last_row_id),
        product_id: Number(wo.product_id),
        bom_id: wo.bom_id,
        good_qty: goodQty,
        scrap_qty: scrapQty
      })
    } catch (costErr) {
      console.error('cost snapshot failed:', costErr)
    }

    return c.json({
      success: true,
      message: applyStock
        ? '생산실적이 등록되고 재고가 반영되었습니다.'
        : '생산실적이 등록되었습니다. (재고 미반영)',
      data: {
        id: insert.meta.last_row_id,
        completed_qty: newCompleted,
        scrap_qty: newScrap,
        status: newStatus
      }
    })
  } catch (e: any) {
    console.error(e)
    return c.json({ success: false, error: e.message || '생산실적 등록 실패' }, 400)
  }
})

export default app
