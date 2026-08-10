import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

function genOsNumber() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const r = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `OS-${d}-${r}`
}

// ---------- 자재 소요 (MRP성) ----------
app.get('/mrp', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')

  // 미완료 WO 기준 잔여 생산량 × BOM 소요 − 현재고
  const { results } = await DB.prepare(`
    SELECT
      bi.component_product_id as product_id,
      p.name as product_name,
      p.sku as product_sku,
      p.current_stock,
      COALESCE(SUM(
        bi.quantity * CASE
          WHEN (wo.planned_qty - wo.completed_qty) > 0 THEN (wo.planned_qty - wo.completed_qty)
          ELSE 0
        END
      ), 0) as required_qty
    FROM mes_work_orders wo
    JOIN mes_bom_items bi ON bi.bom_id = wo.bom_id AND bi.tenant_id = wo.tenant_id
    JOIN products p ON bi.component_product_id = p.id
    WHERE wo.tenant_id = ?
      AND wo.status IN ('planned', 'released', 'in_progress')
      AND wo.bom_id IS NOT NULL
      AND (wo.planned_qty - wo.completed_qty) > 0
    GROUP BY bi.component_product_id, p.name, p.sku, p.current_stock
    ORDER BY required_qty DESC
  `).bind(tenantId).all()

  const items = (results || []).map((r: any) => {
    const required = Number(r.required_qty) || 0
    const stock = Number(r.current_stock) || 0
    const shortage = Math.max(required - stock, 0)
    return {
      ...r,
      required_qty: required,
      current_stock: stock,
      shortage_qty: shortage,
      status: shortage > 0 ? 'shortage' : 'ok'
    }
  })

  return c.json({
    success: true,
    data: {
      items,
      shortage_count: items.filter((i: any) => i.shortage_qty > 0).length,
      total_materials: items.length
    }
  })
})

// ---------- 외주 ----------
app.get('/outsourcing', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const status = c.req.query('status') || ''

  let query = `
    SELECT o.*,
      wo.wo_number,
      p.name as product_name, p.sku as product_sku,
      s.name as supplier_name,
      pr.name as process_name
    FROM mes_outsourcing_orders o
    LEFT JOIN mes_work_orders wo ON o.work_order_id = wo.id
    LEFT JOIN products p ON o.product_id = p.id
    LEFT JOIN suppliers s ON o.supplier_id = s.id
    LEFT JOIN mes_processes pr ON o.process_id = pr.id
    WHERE o.tenant_id = ?
  `
  const params: any[] = [tenantId]
  if (status) {
    query += ' AND o.status = ?'
    params.push(status)
  }
  query += ' ORDER BY o.created_at DESC LIMIT 200'

  const { results } = await DB.prepare(query).bind(...params).all()
  return c.json({ success: true, data: results })
})

app.post('/outsourcing', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const body = await c.req.json<any>()

  if (!(Number(body.quantity) > 0)) {
    return c.json({ success: false, error: '수량은 필수입니다.' }, 400)
  }

  let productId = body.product_id ? Number(body.product_id) : null
  if (body.work_order_id) {
    const wo = await DB.prepare(
      'SELECT product_id FROM mes_work_orders WHERE id = ? AND tenant_id = ?'
    ).bind(body.work_order_id, tenantId).first<{ product_id: number }>()
    if (!wo) return c.json({ success: false, error: '작업지시를 찾을 수 없습니다.' }, 404)
    productId = productId || wo.product_id
  }

  const osNumber = body.os_number?.trim() || genOsNumber()

  try {
    const result = await DB.prepare(`
      INSERT INTO mes_outsourcing_orders (
        tenant_id, os_number, work_order_id, supplier_id, process_id, product_id,
        quantity, status, sent_at, due_date, unit_cost, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ordered', DATE('now'), ?, ?, ?, ?)
    `).bind(
      tenantId,
      osNumber,
      body.work_order_id || null,
      body.supplier_id || null,
      body.process_id || null,
      productId,
      Number(body.quantity),
      body.due_date || null,
      Number(body.unit_cost) || 0,
      body.notes || null,
      userId
    ).run()

    return c.json({ success: true, data: { id: result.meta.last_row_id, os_number: osNumber } })
  } catch (e: any) {
    return c.json({ success: false, error: e.message || '외주 등록 실패' }, 500)
  }
})

app.put('/outsourcing/:id/status', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<any>()

  const allowed = ['ordered', 'in_progress', 'received', 'cancelled']
  if (!allowed.includes(body.status)) {
    return c.json({ success: false, error: '유효하지 않은 상태입니다.' }, 400)
  }

  const os = await DB.prepare(
    'SELECT * FROM mes_outsourcing_orders WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()
  if (!os) return c.json({ success: false, error: '외주 주문을 찾을 수 없습니다.' }, 404)

  let receivedQty = os.received_qty
  let receivedAt = os.received_at
  if (body.status === 'received') {
    receivedQty = body.received_qty != null ? Number(body.received_qty) : Number(os.quantity)
    receivedAt = new Date().toISOString()
  }

  await DB.prepare(`
    UPDATE mes_outsourcing_orders
    SET status = ?, received_qty = ?, received_at = ?, notes = COALESCE(?, notes),
        updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(body.status, receivedQty, receivedAt, body.notes || null, id, tenantId).run()

  // 입고 시 완제품/대상 상품 재고 증가 (옵션)
  if (body.status === 'received' && body.apply_stock && os.product_id && body.warehouse_id) {
    const qty = receivedQty
    const warehouseId = Number(body.warehouse_id)
    await DB.prepare(`
      UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `).bind(qty, os.product_id, tenantId).run()

    await DB.prepare(`
      INSERT INTO product_warehouse_stocks (tenant_id, product_id, warehouse_id, quantity)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(product_id, warehouse_id)
      DO UPDATE SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
    `).bind(tenantId, os.product_id, warehouseId, qty, qty).run()

    await DB.prepare(`
      INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason, notes, created_by)
      VALUES (?, ?, ?, '입고', ?, '외주입고', ?, ?)
    `).bind(tenantId, os.product_id, warehouseId, qty, `외주 ${os.os_number}`, c.get('userId')).run()
  }

  return c.json({ success: true, message: '외주 상태가 변경되었습니다.' })
})

// ---------- 설비 ----------
app.get('/equipment', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')

  const { results } = await DB.prepare(`
    SELECT e.*, pr.name as process_name
    FROM mes_equipment e
    LEFT JOIN mes_processes pr ON e.process_id = pr.id
    WHERE e.tenant_id = ?
    ORDER BY e.is_active DESC, e.name ASC
  `).bind(tenantId).all()

  return c.json({ success: true, data: results })
})

app.post('/equipment', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const body = await c.req.json<any>()

  if (!body.name?.trim()) {
    return c.json({ success: false, error: '설비명은 필수입니다.' }, 400)
  }

  try {
    const result = await DB.prepare(`
      INSERT INTO mes_equipment (tenant_id, code, name, process_id, location, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      body.code?.trim() || null,
      body.name.trim(),
      body.process_id || null,
      body.location || null,
      body.notes || null
    ).run()
    return c.json({ success: true, data: { id: result.meta.last_row_id } })
  } catch (e: any) {
    if (String(e.message || '').includes('UNIQUE')) {
      return c.json({ success: false, error: '동일한 설비 코드가 있습니다.' }, 400)
    }
    return c.json({ success: false, error: e.message || '등록 실패' }, 500)
  }
})

app.put('/equipment/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<any>()

  await DB.prepare(`
    UPDATE mes_equipment
    SET code = ?, name = ?, process_id = ?, location = ?, is_active = ?, notes = ?,
        updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(
    body.code || null,
    body.name?.trim() || '',
    body.process_id || null,
    body.location || null,
    body.is_active === 0 || body.is_active === false ? 0 : 1,
    body.notes || null,
    id,
    tenantId
  ).run()

  return c.json({ success: true, message: '설비가 수정되었습니다.' })
})

app.post('/equipment/:id/events', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json<any>()

  const eventType = body.event_type
  if (!['run', 'stop', 'breakdown', 'maintenance'].includes(eventType)) {
    return c.json({ success: false, error: '이벤트 유형이 올바르지 않습니다.' }, 400)
  }

  const eq = await DB.prepare(
    'SELECT * FROM mes_equipment WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()
  if (!eq) return c.json({ success: false, error: '설비를 찾을 수 없습니다.' }, 404)

  // 진행 중 로그 종료
  const openLog = await DB.prepare(`
    SELECT * FROM mes_equipment_logs
    WHERE equipment_id = ? AND tenant_id = ? AND ended_at IS NULL
    ORDER BY id DESC LIMIT 1
  `).bind(id, tenantId).first<any>()

  if (openLog) {
    await DB.prepare(`
      UPDATE mes_equipment_logs
      SET ended_at = datetime('now'),
          duration_minutes = (julianday(datetime('now')) - julianday(started_at)) * 24 * 60
      WHERE id = ?
    `).bind(openLog.id).run()
  }

  await DB.prepare(`
    INSERT INTO mes_equipment_logs (
      tenant_id, equipment_id, work_order_id, event_type, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    tenantId,
    id,
    body.work_order_id || null,
    eventType,
    body.notes || null,
    userId
  ).run()

  const statusMap: Record<string, string> = {
    run: 'running',
    stop: 'idle',
    breakdown: 'breakdown',
    maintenance: 'maintenance'
  }

  await DB.prepare(`
    UPDATE mes_equipment SET status = ?, updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(statusMap[eventType], id, tenantId).run()

  return c.json({ success: true, message: '설비 상태가 기록되었습니다.' })
})

app.get('/equipment/:id/logs', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const { results } = await DB.prepare(`
    SELECT l.*, wo.wo_number, u.name as created_by_name
    FROM mes_equipment_logs l
    LEFT JOIN mes_work_orders wo ON l.work_order_id = wo.id
    LEFT JOIN users u ON l.created_by = u.id
    WHERE l.equipment_id = ? AND l.tenant_id = ?
    ORDER BY l.started_at DESC
    LIMIT 100
  `).bind(id, tenantId).all()

  return c.json({ success: true, data: results })
})

app.get('/stats', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')

  const row = await DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM mes_equipment WHERE tenant_id = ? AND is_active = 1) as equipment_count,
      (SELECT COUNT(*) FROM mes_equipment WHERE tenant_id = ? AND status = 'running') as running_count,
      (SELECT COUNT(*) FROM mes_equipment WHERE tenant_id = ? AND status = 'breakdown') as breakdown_count,
      (SELECT COUNT(*) FROM mes_outsourcing_orders WHERE tenant_id = ? AND status IN ('ordered','in_progress')) as open_os,
      (SELECT COUNT(*) FROM mes_outsourcing_orders WHERE tenant_id = ? AND status = 'received' AND DATE(received_at)=DATE('now','localtime')) as received_today
  `).bind(tenantId, tenantId, tenantId, tenantId, tenantId).first()

  return c.json({ success: true, data: row })
})

export default app
