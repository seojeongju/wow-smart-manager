import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

function genPmNumber() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const r = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `PM-${d}-${r}`
}

function genSpcCode() {
  const r = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `SPC-${r}`
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function addDays(base: Date, days: number) {
  const d = new Date(base.getTime())
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function mean(nums: number[]) {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function stdev(nums: number[]) {
  if (nums.length < 2) return 0
  const m = mean(nums)
  const v = nums.reduce((s, n) => s + (n - m) ** 2, 0) / (nums.length - 1)
  return Math.sqrt(v)
}

async function assertEquipment(DB: D1Database, tenantId: number, equipmentId: number) {
  return DB.prepare(
    'SELECT id, name, code FROM mes_equipment WHERE id = ? AND tenant_id = ?'
  ).bind(equipmentId, tenantId).first<any>()
}

async function openMaintenanceEvent(
  DB: D1Database,
  tenantId: number,
  userId: number,
  equipmentId: number,
  notes: string | null
) {
  const openLog = await DB.prepare(`
    SELECT id FROM mes_equipment_logs
    WHERE equipment_id = ? AND tenant_id = ? AND ended_at IS NULL
    ORDER BY id DESC LIMIT 1
  `).bind(equipmentId, tenantId).first<any>()

  if (openLog) {
    await DB.prepare(`
      UPDATE mes_equipment_logs
      SET ended_at = datetime('now'),
          duration_minutes = (julianday(datetime('now')) - julianday(started_at)) * 24 * 60
      WHERE id = ?
    `).bind(openLog.id).run()
  }

  const ins = await DB.prepare(`
    INSERT INTO mes_equipment_logs (
      tenant_id, equipment_id, event_type, notes, created_by
    ) VALUES (?, ?, 'maintenance', ?, ?)
  `).bind(tenantId, equipmentId, notes, userId).run()

  await DB.prepare(`
    UPDATE mes_equipment SET status = 'maintenance', updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(equipmentId, tenantId).run()

  return Number(ins.meta.last_row_id)
}

async function closeMaintenanceEvent(
  DB: D1Database,
  tenantId: number,
  equipmentId: number,
  logId: number | null
) {
  if (logId) {
    await DB.prepare(`
      UPDATE mes_equipment_logs
      SET ended_at = datetime('now'),
          duration_minutes = (julianday(datetime('now')) - julianday(started_at)) * 24 * 60
      WHERE id = ? AND tenant_id = ? AND ended_at IS NULL
    `).bind(logId, tenantId).run()
  } else {
    await DB.prepare(`
      UPDATE mes_equipment_logs
      SET ended_at = datetime('now'),
          duration_minutes = (julianday(datetime('now')) - julianday(started_at)) * 24 * 60
      WHERE equipment_id = ? AND tenant_id = ? AND event_type = 'maintenance' AND ended_at IS NULL
    `).bind(equipmentId, tenantId).run()
  }

  await DB.prepare(`
    UPDATE mes_equipment SET status = 'idle', updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ? AND status = 'maintenance'
  `).bind(equipmentId, tenantId).run()
}

async function generateSchedulesForPlan(
  DB: D1Database,
  tenantId: number,
  plan: any,
  daysAhead = 90
) {
  const interval = Math.max(1, Number(plan.interval_days) || 30)
  const start = plan.last_done_at
    ? addDays(new Date(String(plan.last_done_at).slice(0, 10) + 'T00:00:00Z'), interval)
    : new Date()
  const end = addDays(new Date(), daysAhead)
  let cursor = new Date(Math.max(start.getTime(), Date.now() - 24 * 3600 * 1000))
  // align to today if past
  if (cursor < new Date(toDateStr(new Date()) + 'T00:00:00Z')) {
    cursor = new Date(toDateStr(new Date()) + 'T00:00:00Z')
  }

  let created = 0
  while (cursor <= end) {
    const due = toDateStr(cursor)
    const exists = await DB.prepare(`
      SELECT id FROM mes_pm_schedules
      WHERE tenant_id = ? AND plan_id = ? AND due_date = ?
        AND status IN ('scheduled', 'overdue', 'in_progress', 'done')
      LIMIT 1
    `).bind(tenantId, plan.id, due).first()

    if (!exists) {
      await DB.prepare(`
        INSERT INTO mes_pm_schedules (tenant_id, plan_id, equipment_id, due_date, status)
        VALUES (?, ?, ?, ?, 'scheduled')
      `).bind(tenantId, plan.id, plan.equipment_id, due).run()
      created++
    }
    cursor = addDays(cursor, interval)
  }
  return created
}

// ========== PM ==========
app.get('/pm/dashboard', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const today = toDateStr(new Date())
  const week = toDateStr(addDays(new Date(), 7))

  // overdue bump
  await DB.prepare(`
    UPDATE mes_pm_schedules
    SET status = 'overdue', updated_at = datetime('now')
    WHERE tenant_id = ? AND status = 'scheduled' AND due_date < ?
  `).bind(tenantId, today).run()

  const row = await DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM mes_pm_plans WHERE tenant_id = ? AND is_active = 1) as active_plans,
      (SELECT COUNT(*) FROM mes_pm_schedules WHERE tenant_id = ? AND status = 'overdue') as overdue,
      (SELECT COUNT(*) FROM mes_pm_schedules WHERE tenant_id = ? AND status = 'scheduled' AND due_date BETWEEN ? AND ?) as due_week,
      (SELECT COUNT(*) FROM mes_pm_work_orders WHERE tenant_id = ? AND status IN ('open','in_progress')) as open_wo
  `).bind(tenantId, tenantId, tenantId, today, week, tenantId).first<any>()

  return c.json({ success: true, data: row || {} })
})

app.get('/pm/plans', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const { results } = await DB.prepare(`
    SELECT p.*, e.name as equipment_name, e.code as equipment_code, e.status as equipment_status
    FROM mes_pm_plans p
    JOIN mes_equipment e ON e.id = p.equipment_id
    WHERE p.tenant_id = ?
    ORDER BY p.is_active DESC, p.id DESC
  `).bind(tenantId).all()
  return c.json({ success: true, data: results || [] })
})

app.post('/pm/plans', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const body = await c.req.json<any>()
  const equipmentId = Number(body.equipment_id)
  const name = String(body.name || '').trim()
  if (!equipmentId || !name) {
    return c.json({ success: false, error: '설비와 계획명을 입력하세요.' }, 400)
  }
  const eq = await assertEquipment(DB, tenantId, equipmentId)
  if (!eq) return c.json({ success: false, error: '설비를 찾을 수 없습니다.' }, 404)

  const code = String(body.code || '').trim() || `PLAN-${equipmentId}-${Date.now().toString().slice(-4)}`
  const checklist = Array.isArray(body.checklist)
    ? JSON.stringify(body.checklist)
    : (body.checklist_json || JSON.stringify(['육안 점검', '윤활', '이상음 확인']))

  const ins = await DB.prepare(`
    INSERT INTO mes_pm_plans (
      tenant_id, equipment_id, code, name, interval_days, estimated_minutes, checklist_json, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    tenantId,
    equipmentId,
    code,
    name,
    Math.max(1, Number(body.interval_days) || 30),
    Number(body.estimated_minutes) || 60,
    checklist,
    body.notes || null
  ).run()

  const planId = Number(ins.meta.last_row_id)
  const plan = await DB.prepare('SELECT * FROM mes_pm_plans WHERE id = ?').bind(planId).first<any>()
  const created = await generateSchedulesForPlan(DB, tenantId, plan, Number(body.days_ahead) || 90)

  return c.json({ success: true, data: { id: planId, schedules_created: created } })
})

app.put('/pm/plans/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<any>()
  const plan = await DB.prepare(
    'SELECT * FROM mes_pm_plans WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()
  if (!plan) return c.json({ success: false, error: '계획을 찾을 수 없습니다.' }, 404)

  const checklist = Array.isArray(body.checklist)
    ? JSON.stringify(body.checklist)
    : (body.checklist_json ?? plan.checklist_json)

  await DB.prepare(`
    UPDATE mes_pm_plans SET
      name = ?,
      interval_days = ?,
      estimated_minutes = ?,
      checklist_json = ?,
      is_active = ?,
      notes = ?,
      updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(
    body.name?.trim() || plan.name,
    Math.max(1, Number(body.interval_days ?? plan.interval_days) || 30),
    Number(body.estimated_minutes ?? plan.estimated_minutes) || 60,
    checklist,
    body.is_active === 0 || body.is_active === false ? 0 : 1,
    body.notes ?? plan.notes,
    id,
    tenantId
  ).run()

  return c.json({ success: true })
})

app.post('/pm/plans/:id/generate', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<any>().catch(() => ({}))
  const plan = await DB.prepare(
    'SELECT * FROM mes_pm_plans WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()
  if (!plan) return c.json({ success: false, error: '계획을 찾을 수 없습니다.' }, 404)
  const created = await generateSchedulesForPlan(DB, tenantId, plan, Number(body.days_ahead) || 90)
  return c.json({ success: true, data: { schedules_created: created } })
})

app.get('/pm/schedules', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const status = c.req.query('status') || ''
  const today = toDateStr(new Date())

  await DB.prepare(`
    UPDATE mes_pm_schedules
    SET status = 'overdue', updated_at = datetime('now')
    WHERE tenant_id = ? AND status = 'scheduled' AND due_date < ?
  `).bind(tenantId, today).run()

  let sql = `
    SELECT s.*, p.name as plan_name, p.interval_days, p.estimated_minutes, p.checklist_json,
           e.name as equipment_name, e.code as equipment_code
    FROM mes_pm_schedules s
    JOIN mes_pm_plans p ON p.id = s.plan_id
    JOIN mes_equipment e ON e.id = s.equipment_id
    WHERE s.tenant_id = ?
  `
  const binds: any[] = [tenantId]
  if (status && status !== 'all') {
    sql += ' AND s.status = ?'
    binds.push(status)
  } else {
    sql += " AND s.status IN ('scheduled','overdue','in_progress')"
  }
  sql += ' ORDER BY s.due_date ASC, s.id ASC LIMIT 200'

  const { results } = await DB.prepare(sql).bind(...binds).all()
  return c.json({ success: true, data: results || [] })
})

app.post('/pm/schedules/:id/start', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json<any>().catch(() => ({}))

  const sch = await DB.prepare(`
    SELECT s.*, p.name as plan_name, p.checklist_json
    FROM mes_pm_schedules s
    JOIN mes_pm_plans p ON p.id = s.plan_id
    WHERE s.id = ? AND s.tenant_id = ?
  `).bind(id, tenantId).first<any>()
  if (!sch) return c.json({ success: false, error: '일정을 찾을 수 없습니다.' }, 404)
  if (['done', 'skipped'].includes(sch.status)) {
    return c.json({ success: false, error: '이미 완료·건너뛴 일정입니다.' }, 400)
  }
  if (sch.work_order_id) {
    return c.json({ success: true, data: { work_order_id: sch.work_order_id }, message: '이미 시작된 작업입니다.' })
  }

  const logId = await openMaintenanceEvent(
    DB, tenantId, userId, Number(sch.equipment_id),
    body.notes || `PM 시작: ${sch.plan_name}`
  )

  let pmNumber = genPmNumber()
  for (let i = 0; i < 5; i++) {
    const exists = await DB.prepare(
      'SELECT id FROM mes_pm_work_orders WHERE tenant_id = ? AND pm_number = ?'
    ).bind(tenantId, pmNumber).first()
    if (!exists) break
    pmNumber = genPmNumber()
  }

  const woIns = await DB.prepare(`
    INSERT INTO mes_pm_work_orders (
      tenant_id, pm_number, plan_id, schedule_id, equipment_id, status,
      started_at, equipment_log_id, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, 'in_progress', datetime('now'), ?, ?, ?)
  `).bind(
    tenantId, pmNumber, sch.plan_id, sch.id, sch.equipment_id,
    logId, body.notes || null, userId
  ).run()
  const woId = Number(woIns.meta.last_row_id)

  await DB.prepare(`
    UPDATE mes_pm_schedules
    SET status = 'in_progress', work_order_id = ?, updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(woId, id, tenantId).run()

  await DB.prepare(`
    INSERT INTO mes_pm_logs (tenant_id, pm_work_order_id, equipment_id, action, notes, created_by)
    VALUES (?, ?, ?, 'start', ?, ?)
  `).bind(tenantId, woId, sch.equipment_id, body.notes || null, userId).run()

  return c.json({ success: true, data: { work_order_id: woId, pm_number: pmNumber, equipment_log_id: logId } })
})

app.get('/pm/work-orders', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const status = c.req.query('status') || ''
  let sql = `
    SELECT w.*, e.name as equipment_name, e.code as equipment_code, p.name as plan_name
    FROM mes_pm_work_orders w
    JOIN mes_equipment e ON e.id = w.equipment_id
    LEFT JOIN mes_pm_plans p ON p.id = w.plan_id
    WHERE w.tenant_id = ?
  `
  const binds: any[] = [tenantId]
  if (status && status !== 'all') {
    sql += ' AND w.status = ?'
    binds.push(status)
  }
  sql += ' ORDER BY w.id DESC LIMIT 150'
  const { results } = await DB.prepare(sql).bind(...binds).all()
  return c.json({ success: true, data: results || [] })
})

app.post('/pm/work-orders/:id/complete', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json<any>().catch(() => ({}))

  const wo = await DB.prepare(
    'SELECT * FROM mes_pm_work_orders WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()
  if (!wo) return c.json({ success: false, error: '보전 작업을 찾을 수 없습니다.' }, 404)
  if (wo.status === 'done') return c.json({ success: false, error: '이미 완료된 작업입니다.' }, 400)

  const checklistResult = body.checklist_result
    ? JSON.stringify(body.checklist_result)
    : null

  await closeMaintenanceEvent(DB, tenantId, Number(wo.equipment_id), wo.equipment_log_id || null)

  await DB.prepare(`
    UPDATE mes_pm_work_orders SET
      status = 'done',
      checklist_result_json = ?,
      notes = COALESCE(?, notes),
      completed_at = datetime('now'),
      updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(checklistResult, body.notes || null, id, tenantId).run()

  if (wo.schedule_id) {
    await DB.prepare(`
      UPDATE mes_pm_schedules
      SET status = 'done', updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(wo.schedule_id, tenantId).run()
  }

  if (wo.plan_id) {
    await DB.prepare(`
      UPDATE mes_pm_plans
      SET last_done_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(wo.plan_id, tenantId).run()

    const plan = await DB.prepare(
      'SELECT * FROM mes_pm_plans WHERE id = ? AND tenant_id = ?'
    ).bind(wo.plan_id, tenantId).first<any>()
    if (plan?.is_active) {
      await generateSchedulesForPlan(DB, tenantId, plan, 90)
    }
  }

  await DB.prepare(`
    INSERT INTO mes_pm_logs (tenant_id, pm_work_order_id, equipment_id, action, notes, created_by)
    VALUES (?, ?, ?, 'complete', ?, ?)
  `).bind(tenantId, id, wo.equipment_id, body.notes || null, userId).run()

  return c.json({ success: true, message: '보전 작업이 완료되었습니다.' })
})

app.post('/pm/schedules/:id/skip', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json<any>().catch(() => ({}))

  const sch = await DB.prepare(
    'SELECT * FROM mes_pm_schedules WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()
  if (!sch) return c.json({ success: false, error: '일정을 찾을 수 없습니다.' }, 404)
  if (sch.status === 'done') return c.json({ success: false, error: '완료된 일정입니다.' }, 400)

  await DB.prepare(`
    UPDATE mes_pm_schedules
    SET status = 'skipped', notes = ?, updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(body.notes || null, id, tenantId).run()

  return c.json({ success: true })
})

// ========== SPC ==========
app.get('/spc/characteristics', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const { results } = await DB.prepare(`
    SELECT c.*,
      e.name as equipment_name,
      p.name as product_name,
      (SELECT COUNT(*) FROM mes_spc_measurements m WHERE m.characteristic_id = c.id) as sample_count,
      (SELECT m.value FROM mes_spc_measurements m WHERE m.characteristic_id = c.id ORDER BY m.measured_at DESC LIMIT 1) as last_value
    FROM mes_spc_characteristics c
    LEFT JOIN mes_equipment e ON e.id = c.equipment_id
    LEFT JOIN products p ON p.id = c.product_id
    WHERE c.tenant_id = ?
    ORDER BY c.is_active DESC, c.id DESC
  `).bind(tenantId).all()
  return c.json({ success: true, data: results || [] })
})

app.post('/spc/characteristics', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const body = await c.req.json<any>()
  const name = String(body.name || '').trim()
  if (!name) return c.json({ success: false, error: '특성명을 입력하세요.' }, 400)

  const code = String(body.code || '').trim() || genSpcCode()
  const ins = await DB.prepare(`
    INSERT INTO mes_spc_characteristics (
      tenant_id, code, name, unit, product_id, equipment_id,
      target, usl, lsl, sample_size, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    tenantId,
    code,
    name,
    body.unit || null,
    body.product_id || null,
    body.equipment_id || null,
    body.target != null ? Number(body.target) : null,
    body.usl != null ? Number(body.usl) : null,
    body.lsl != null ? Number(body.lsl) : null,
    Math.max(1, Number(body.sample_size) || 1),
    body.notes || null
  ).run()

  return c.json({ success: true, data: { id: Number(ins.meta.last_row_id), code } })
})

app.get('/spc/characteristics/:id/chart', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const limit = Math.min(200, Math.max(10, Number(c.req.query('limit')) || 50))

  const char = await DB.prepare(
    'SELECT * FROM mes_spc_characteristics WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()
  if (!char) return c.json({ success: false, error: '특성을 찾을 수 없습니다.' }, 404)

  const { results } = await DB.prepare(`
    SELECT id, value, measured_at, lot_number, notes
    FROM mes_spc_measurements
    WHERE characteristic_id = ? AND tenant_id = ?
    ORDER BY measured_at DESC, id DESC
    LIMIT ?
  `).bind(id, tenantId, limit).all<any>()

  const points = (results || []).slice().reverse()
  const values = points.map((p) => Number(p.value))
  const m = mean(values)
  const s = stdev(values)
  const ucl = m + 3 * s
  const lcl = m - 3 * s

  const series = points.map((p) => {
    const v = Number(p.value)
    const beyondSpec =
      (char.usl != null && v > Number(char.usl)) ||
      (char.lsl != null && v < Number(char.lsl))
    const beyondControl = values.length >= 5 && (v > ucl || v < lcl)
    return {
      ...p,
      value: v,
      ooc: beyondControl,
      oos: beyondSpec
    }
  })

  return c.json({
    success: true,
    data: {
      characteristic: char,
      points: series,
      stats: {
        count: values.length,
        mean: Math.round(m * 1000) / 1000,
        stdev: Math.round(s * 1000) / 1000,
        ucl: Math.round(ucl * 1000) / 1000,
        lcl: Math.round(lcl * 1000) / 1000,
        ooc_count: series.filter((x) => x.ooc).length,
        oos_count: series.filter((x) => x.oos).length
      }
    }
  })
})

app.post('/spc/measurements', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const body = await c.req.json<any>()
  const charId = Number(body.characteristic_id)
  if (!charId || body.value == null || body.value === '') {
    return c.json({ success: false, error: '특성과 측정값을 입력하세요.' }, 400)
  }

  const char = await DB.prepare(
    'SELECT id FROM mes_spc_characteristics WHERE id = ? AND tenant_id = ? AND is_active = 1'
  ).bind(charId, tenantId).first()
  if (!char) return c.json({ success: false, error: '특성을 찾을 수 없습니다.' }, 404)

  const values = Array.isArray(body.values) ? body.values : [body.value]
  for (const raw of values) {
    await DB.prepare(`
      INSERT INTO mes_spc_measurements (
        tenant_id, characteristic_id, value, measured_at, work_order_id, lot_number, notes, created_by
      ) VALUES (?, ?, ?, COALESCE(?, datetime('now')), ?, ?, ?, ?)
    `).bind(
      tenantId,
      charId,
      Number(raw),
      body.measured_at || null,
      body.work_order_id || null,
      body.lot_number || null,
      body.notes || null,
      userId
    ).run()
  }

  return c.json({ success: true, message: `${values.length}건 기록됨` })
})

// ========== Capacity / Load ==========
app.get('/capa/load', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const days = Math.min(60, Math.max(1, Number(c.req.query('days')) || 7))

  const { results: equipment } = await DB.prepare(`
    SELECT e.id, e.code, e.name, e.status, e.location,
           COALESCE(e.capacity_hours_per_day, 8) as capacity_hours_per_day,
           pr.name as process_name, pr.standard_minutes
    FROM mes_equipment e
    LEFT JOIN mes_processes pr ON pr.id = e.process_id
    WHERE e.tenant_id = ? AND e.is_active = 1
    ORDER BY e.name
  `).bind(tenantId).all<any>()

  const { results: wos } = await DB.prepare(`
    SELECT wo.id, wo.equipment_id, wo.planned_qty, wo.completed_qty, wo.status,
           wo.planned_start_date, wo.planned_end_date,
           COALESCE(pr.standard_minutes, 0) as standard_minutes,
           p.name as product_name
    FROM mes_work_orders wo
    LEFT JOIN mes_processes pr ON pr.id = wo.process_id
    LEFT JOIN products p ON p.id = wo.product_id
    WHERE wo.tenant_id = ?
      AND wo.status IN ('planned','released','confirmed','in_progress')
      AND wo.equipment_id IS NOT NULL
  `).bind(tenantId).all<any>()

  const loadByEq = new Map<number, number>()
  const woCount = new Map<number, number>()
  for (const wo of wos || []) {
    const remQty = Math.max(0, (Number(wo.planned_qty) || 0) - (Number(wo.completed_qty) || 0))
    const stdMin = Number(wo.standard_minutes) || 0
    const hours = stdMin > 0 ? (remQty * stdMin) / 60 : remQty // fallback: 1h per unit
    const eid = Number(wo.equipment_id)
    loadByEq.set(eid, (loadByEq.get(eid) || 0) + hours)
    woCount.set(eid, (woCount.get(eid) || 0) + 1)
  }

  const rows = (equipment || []).map((eq) => {
    const capacity = (Number(eq.capacity_hours_per_day) || 8) * days
    const load = Math.round((loadByEq.get(Number(eq.id)) || 0) * 10) / 10
    const util = capacity > 0 ? Math.round((load / capacity) * 1000) / 10 : 0
    return {
      equipment_id: eq.id,
      code: eq.code,
      name: eq.name,
      status: eq.status,
      process_name: eq.process_name,
      capacity_hours: Math.round(capacity * 10) / 10,
      load_hours: load,
      open_wo: woCount.get(Number(eq.id)) || 0,
      utilization_pct: util,
      level: util >= 100 ? 'overload' : util >= 80 ? 'high' : util >= 50 ? 'normal' : 'low'
    }
  })

  const summary = {
    days,
    equipment_count: rows.length,
    overload_count: rows.filter((r) => r.level === 'overload').length,
    avg_utilization: rows.length
      ? Math.round((rows.reduce((s, r) => s + r.utilization_pct, 0) / rows.length) * 10) / 10
      : 0
  }

  return c.json({ success: true, data: rows, summary })
})

app.put('/capa/equipment/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<any>()
  const hours = Number(body.capacity_hours_per_day)
  if (!(hours > 0 && hours <= 24)) {
    return c.json({ success: false, error: '일일 능력은 0~24시간 사이여야 합니다.' }, 400)
  }
  const eq = await assertEquipment(DB, tenantId, Number(id))
  if (!eq) return c.json({ success: false, error: '설비를 찾을 수 없습니다.' }, 404)

  await DB.prepare(`
    UPDATE mes_equipment
    SET capacity_hours_per_day = ?, updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(hours, id, tenantId).run()

  return c.json({ success: true })
})

export default app
