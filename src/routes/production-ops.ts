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

// 부족 자재 → 발주서 생성
app.post('/mrp/create-po', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const body = await c.req.json<any>()

  if (!body.supplier_id) {
    return c.json({ success: false, error: '공급사를 선택해주세요.' }, 400)
  }

  const supplier = await DB.prepare(
    'SELECT id FROM suppliers WHERE id = ? AND tenant_id = ?'
  ).bind(body.supplier_id, tenantId).first()
  if (!supplier) {
    return c.json({ success: false, error: '공급사를 찾을 수 없습니다.' }, 404)
  }

  // 동일 MRP 계산
  const { results } = await DB.prepare(`
    SELECT
      bi.component_product_id as product_id,
      p.name as product_name,
      p.sku as product_sku,
      p.current_stock,
      COALESCE(p.purchase_price, 0) as purchase_price,
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
    GROUP BY bi.component_product_id, p.name, p.sku, p.current_stock, p.purchase_price
  `).bind(tenantId).all<any>()

  let items = (results || []).map((r: any) => {
    const required = Number(r.required_qty) || 0
    const stock = Number(r.current_stock) || 0
    const shortage = Math.max(required - stock, 0)
    return {
      product_id: Number(r.product_id),
      quantity: shortage,
      unit_price: Number(r.purchase_price) || 0,
      product_name: r.product_name
    }
  }).filter((i: any) => i.quantity > 0)

  if (Array.isArray(body.product_ids) && body.product_ids.length) {
    const set = new Set(body.product_ids.map((x: any) => Number(x)))
    items = items.filter((i: any) => set.has(i.product_id))
  }

  if (!items.length) {
    return c.json({ success: false, error: '발주할 부족 자재가 없습니다.' }, 400)
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomStr = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  const code = `PO-${dateStr}-${randomStr}`
  const totalAmount = items.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price, 0)

  try {
    const poRes = await DB.prepare(`
      INSERT INTO purchase_orders (tenant_id, supplier_id, code, status, total_amount, expected_at, created_by, notes)
      VALUES (?, ?, ?, 'ORDERED', ?, ?, ?, ?)
    `).bind(
      tenantId,
      body.supplier_id,
      code,
      totalAmount,
      body.expected_at || null,
      userId,
      body.notes || 'MES 자재소요(MRP) 기반 자동 발주'
    ).run()

    const poId = poRes.meta.last_row_id
    for (const item of items) {
      await DB.prepare(`
        INSERT INTO purchase_items (purchase_order_id, product_id, quantity, unit_price)
        VALUES (?, ?, ?, ?)
      `).bind(poId, item.product_id, item.quantity, item.unit_price).run()
    }

    return c.json({
      success: true,
      message: `부족 자재 ${items.length}품목 발주가 생성되었습니다.`,
      data: { id: poId, code, item_count: items.length, total_amount: totalAmount }
    })
  } catch (e: any) {
    console.error(e)
    return c.json({ success: false, error: e.message || '발주 생성 실패' }, 500)
  }
})

// 작업지시 자재 불출 (재고 차감)
app.post('/material-issue', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const body = await c.req.json<any>()

  const workOrderId = Number(body.work_order_id)
  const productId = Number(body.product_id)
  const warehouseId = Number(body.warehouse_id)
  const quantity = Number(body.quantity)

  if (!workOrderId || !productId || !warehouseId || !(quantity > 0)) {
    return c.json({ success: false, error: '작업지시, 자재, 창고, 수량은 필수입니다.' }, 400)
  }

  const wo = await DB.prepare(
    'SELECT * FROM mes_work_orders WHERE id = ? AND tenant_id = ?'
  ).bind(workOrderId, tenantId).first<any>()
  if (!wo) return c.json({ success: false, error: '작업지시를 찾을 수 없습니다.' }, 404)
  if (!['released', 'in_progress'].includes(wo.status)) {
    return c.json({ success: false, error: '확정/진행중 작업지시에서만 불출할 수 있습니다.' }, 400)
  }

  if (wo.bom_id) {
    const inBom = await DB.prepare(`
      SELECT id FROM mes_bom_items
      WHERE bom_id = ? AND tenant_id = ? AND component_product_id = ?
    `).bind(wo.bom_id, tenantId, productId).first()
    if (!inBom) {
      return c.json({ success: false, error: 'BOM에 없는 자재입니다.' }, 400)
    }
  }

  const whStock = await DB.prepare(`
    SELECT quantity FROM product_warehouse_stocks
    WHERE product_id = ? AND warehouse_id = ? AND tenant_id = ?
  `).bind(productId, warehouseId, tenantId).first<{ quantity: number }>()

  if ((whStock?.quantity || 0) < quantity) {
    return c.json({
      success: false,
      error: `창고 재고 부족 (현재: ${whStock?.quantity || 0})`
    }, 400)
  }

  try {
    await DB.prepare(`
      UPDATE products SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `).bind(quantity, productId, tenantId).run()

    await DB.prepare(`
      UPDATE product_warehouse_stocks
      SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ? AND warehouse_id = ? AND tenant_id = ?
    `).bind(quantity, productId, warehouseId, tenantId).run()

    await DB.prepare(`
      INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason, notes, created_by)
      VALUES (?, ?, ?, '출고', ?, '생산불출', ?, ?)
    `).bind(tenantId, productId, warehouseId, -quantity, `WO ${wo.wo_number}`, userId).run()

    await DB.prepare(`
      INSERT INTO mes_material_issues (
        tenant_id, work_order_id, product_id, warehouse_id, quantity, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(tenantId, workOrderId, productId, warehouseId, quantity, body.notes || null, userId).run()

    if (wo.status === 'released') {
      await DB.prepare(`
        UPDATE mes_work_orders
        SET status = 'in_progress',
            actual_start_at = COALESCE(actual_start_at, datetime('now')),
            updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?
      `).bind(workOrderId, tenantId).run()
    }

    return c.json({ success: true, message: '자재 불출이 완료되었습니다.' })
  } catch (e: any) {
    return c.json({ success: false, error: e.message || '불출 실패' }, 500)
  }
})

app.get('/material-issues', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const workOrderId = c.req.query('work_order_id')

  let query = `
    SELECT mi.*, p.name as product_name, p.sku as product_sku,
      wo.wo_number, w.name as warehouse_name, u.name as created_by_name
    FROM mes_material_issues mi
    JOIN products p ON mi.product_id = p.id
    JOIN mes_work_orders wo ON mi.work_order_id = wo.id
    LEFT JOIN warehouses w ON mi.warehouse_id = w.id
    LEFT JOIN users u ON mi.created_by = u.id
    WHERE mi.tenant_id = ?
  `
  const params: any[] = [tenantId]
  if (workOrderId) {
    query += ' AND mi.work_order_id = ?'
    params.push(workOrderId)
  }
  query += ' ORDER BY mi.created_at DESC LIMIT 100'

  const { results } = await DB.prepare(query).bind(...params).all()
  return c.json({ success: true, data: results })
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
