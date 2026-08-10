import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'
import { nextDocNumber } from '../utils/stock-reservation'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const EMP_TYPES = ['full_time', 'contract', 'part_time', 'intern'] as const
const EMP_STATUS = ['active', 'leave', 'resigned'] as const
const ATT_STATUS = ['present', 'late', 'absent', 'leave', 'half_day', 'holiday'] as const
const LEAVE_TYPES = ['annual', 'sick', 'unpaid', 'other'] as const

type EmpType = (typeof EMP_TYPES)[number]
type EmpStatus = (typeof EMP_STATUS)[number]
type AttStatus = (typeof ATT_STATUS)[number]
type LeaveType = (typeof LEAVE_TYPES)[number]

function inSet<T extends string>(v: any, set: readonly T[]): v is T {
  return set.includes(v)
}

function todayYmd() {
  return new Date().toISOString().slice(0, 10)
}

function addDaysYmd(ymd: string, days: number) {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

app.get('/meta', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')

  const [{ results: departments }, { results: users }] = await Promise.all([
    DB.prepare(`
      SELECT id, name, code, parent_id, sort_order, is_active
      FROM hr_departments
      WHERE tenant_id = ?
      ORDER BY sort_order ASC, name ASC
    `).bind(tenantId).all(),
    DB.prepare(`
      SELECT id, name, email FROM users
      WHERE tenant_id = ?
      ORDER BY name ASC
    `).bind(tenantId).all()
  ])

  return c.json({
    success: true,
    data: {
      employment_types: EMP_TYPES,
      employee_statuses: EMP_STATUS,
      attendance_statuses: ATT_STATUS,
      leave_types: LEAVE_TYPES,
      departments: departments || [],
      users: users || []
    }
  })
})

// ---------- Departments ----------

app.get('/departments', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const activeOnly = c.req.query('active') !== '0'

  let sql = `
    SELECT d.*,
      (SELECT COUNT(*) FROM hr_employees e
        WHERE e.department_id = d.id AND e.tenant_id = d.tenant_id AND e.status != 'resigned') as employee_count
    FROM hr_departments d
    WHERE d.tenant_id = ?
  `
  if (activeOnly) sql += ' AND d.is_active = 1'
  sql += ' ORDER BY d.sort_order ASC, d.name ASC'

  const { results } = await DB.prepare(sql).bind(tenantId).all()
  return c.json({ success: true, data: results || [] })
})

app.post('/departments', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const body = await c.req.json<any>()
  const name = String(body.name || '').trim()
  if (!name) return c.json({ success: false, error: '부서명을 입력하세요.' }, 400)

  if (body.parent_id) {
    const parent = await DB.prepare(
      'SELECT id FROM hr_departments WHERE id = ? AND tenant_id = ?'
    ).bind(body.parent_id, tenantId).first()
    if (!parent) return c.json({ success: false, error: '상위 부서를 찾을 수 없습니다.' }, 404)
  }

  const ins = await DB.prepare(`
    INSERT INTO hr_departments (tenant_id, name, code, parent_id, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).bind(
    tenantId,
    name,
    body.code ? String(body.code).trim() : null,
    body.parent_id || null,
    Number(body.sort_order) || 0
  ).run()

  return c.json({ success: true, data: { id: Number(ins.meta.last_row_id) } })
})

app.put('/departments/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<any>()

  const row = await DB.prepare(
    'SELECT * FROM hr_departments WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()
  if (!row) return c.json({ success: false, error: '부서를 찾을 수 없습니다.' }, 404)

  if (body.parent_id != null && body.parent_id !== '' && Number(body.parent_id) === Number(id)) {
    return c.json({ success: false, error: '자기 자신을 상위 부서로 지정할 수 없습니다.' }, 400)
  }

  await DB.prepare(`
    UPDATE hr_departments SET
      name = ?,
      code = ?,
      parent_id = ?,
      sort_order = ?,
      is_active = ?,
      updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(
    body.name != null ? String(body.name).trim() || row.name : row.name,
    body.code !== undefined ? (body.code ? String(body.code).trim() : null) : row.code,
    body.parent_id !== undefined ? (body.parent_id || null) : row.parent_id,
    body.sort_order != null ? Number(body.sort_order) || 0 : row.sort_order,
    body.is_active != null ? (body.is_active ? 1 : 0) : row.is_active,
    id,
    tenantId
  ).run()

  return c.json({ success: true })
})

app.delete('/departments/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const row = await DB.prepare(
    'SELECT id FROM hr_departments WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first()
  if (!row) return c.json({ success: false, error: '부서를 찾을 수 없습니다.' }, 404)

  const used = await DB.prepare(
    'SELECT id FROM hr_employees WHERE department_id = ? AND tenant_id = ? LIMIT 1'
  ).bind(id, tenantId).first()
  if (used) {
    await DB.prepare(`
      UPDATE hr_departments SET is_active = 0, updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(id, tenantId).run()
    return c.json({ success: true, message: '소속 사원이 있어 비활성화했습니다.' })
  }

  await DB.prepare('DELETE FROM hr_departments WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId).run()
  return c.json({ success: true })
})

// ---------- Employees ----------

app.get('/employees', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const q = (c.req.query('q') || '').trim()
  const departmentId = c.req.query('department_id') || ''
  const status = c.req.query('status') || 'active'
  const limit = Math.min(parseInt(c.req.query('limit') || '200', 10) || 200, 500)

  let sql = `
    SELECT e.*,
      d.name as department_name,
      u.name as user_name, u.email as user_email
    FROM hr_employees e
    LEFT JOIN hr_departments d ON e.department_id = d.id
    LEFT JOIN users u ON e.user_id = u.id
    WHERE e.tenant_id = ?
  `
  const params: any[] = [tenantId]
  if (status && status !== 'all') {
    sql += ' AND e.status = ?'
    params.push(status)
  }
  if (departmentId) {
    sql += ' AND e.department_id = ?'
    params.push(Number(departmentId))
  }
  if (q) {
    sql += ` AND (
      e.name LIKE ? OR e.employee_number LIKE ? OR e.email LIKE ? OR e.phone LIKE ? OR e.position LIKE ?
    )`
    const like = `%${q}%`
    params.push(like, like, like, like, like)
  }
  sql += ' ORDER BY e.name ASC LIMIT ?'
  params.push(limit)

  const { results } = await DB.prepare(sql).bind(...params).all()
  return c.json({ success: true, data: results || [] })
})

app.get('/employees/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const row = await DB.prepare(`
    SELECT e.*,
      d.name as department_name,
      u.name as user_name, u.email as user_email
    FROM hr_employees e
    LEFT JOIN hr_departments d ON e.department_id = d.id
    LEFT JOIN users u ON e.user_id = u.id
    WHERE e.id = ? AND e.tenant_id = ?
  `).bind(id, tenantId).first()

  if (!row) return c.json({ success: false, error: '사원을 찾을 수 없습니다.' }, 404)
  return c.json({ success: true, data: row })
})

app.post('/employees', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const body = await c.req.json<any>()

  const name = String(body.name || '').trim()
  if (!name) return c.json({ success: false, error: '사원명을 입력하세요.' }, 400)

  const employmentType: EmpType = inSet(body.employment_type, EMP_TYPES)
    ? body.employment_type
    : 'full_time'
  const status: EmpStatus = inSet(body.status, EMP_STATUS) ? body.status : 'active'

  if (body.department_id) {
    const dept = await DB.prepare(
      'SELECT id FROM hr_departments WHERE id = ? AND tenant_id = ?'
    ).bind(body.department_id, tenantId).first()
    if (!dept) return c.json({ success: false, error: '부서를 찾을 수 없습니다.' }, 404)
  }

  if (body.user_id) {
    const u = await DB.prepare(
      'SELECT id FROM users WHERE id = ? AND tenant_id = ?'
    ).bind(body.user_id, tenantId).first()
    if (!u) return c.json({ success: false, error: '연결할 사용자를 찾을 수 없습니다.' }, 404)
  }

  const empNumber =
    body.employee_number && String(body.employee_number).trim()
      ? String(body.employee_number).trim()
      : await nextDocNumber(DB, tenantId, 'hr_employees', 'EMP')

  try {
    const ins = await DB.prepare(`
      INSERT INTO hr_employees (
        tenant_id, employee_number, name, email, phone, department_id, position,
        employment_type, hire_date, leave_date, status, user_id, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      empNumber,
      name,
      body.email || null,
      body.phone || null,
      body.department_id || null,
      body.position || null,
      employmentType,
      body.hire_date || null,
      body.leave_date || null,
      status,
      body.user_id || null,
      body.notes || null,
      userId
    ).run()

    return c.json({
      success: true,
      data: { id: Number(ins.meta.last_row_id), employee_number: empNumber }
    })
  } catch (e: any) {
    if (String(e?.message || '').includes('UNIQUE')) {
      return c.json({ success: false, error: '이미 사용 중인 사번입니다.' }, 400)
    }
    throw e
  }
})

app.put('/employees/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<any>()

  const row = await DB.prepare(
    'SELECT * FROM hr_employees WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()
  if (!row) return c.json({ success: false, error: '사원을 찾을 수 없습니다.' }, 404)

  if (body.department_id) {
    const dept = await DB.prepare(
      'SELECT id FROM hr_departments WHERE id = ? AND tenant_id = ?'
    ).bind(body.department_id, tenantId).first()
    if (!dept) return c.json({ success: false, error: '부서를 찾을 수 없습니다.' }, 404)
  }

  if (body.user_id) {
    const u = await DB.prepare(
      'SELECT id FROM users WHERE id = ? AND tenant_id = ?'
    ).bind(body.user_id, tenantId).first()
    if (!u) return c.json({ success: false, error: '연결할 사용자를 찾을 수 없습니다.' }, 404)
  }

  const employmentType: EmpType = inSet(body.employment_type, EMP_TYPES)
    ? body.employment_type
    : row.employment_type
  const status: EmpStatus = inSet(body.status, EMP_STATUS) ? body.status : row.status

  await DB.prepare(`
    UPDATE hr_employees SET
      name = ?,
      email = ?,
      phone = ?,
      department_id = ?,
      position = ?,
      employment_type = ?,
      hire_date = ?,
      leave_date = ?,
      status = ?,
      user_id = ?,
      notes = ?,
      updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(
    body.name != null ? String(body.name).trim() || row.name : row.name,
    body.email !== undefined ? (body.email || null) : row.email,
    body.phone !== undefined ? (body.phone || null) : row.phone,
    body.department_id !== undefined ? (body.department_id || null) : row.department_id,
    body.position !== undefined ? (body.position || null) : row.position,
    employmentType,
    body.hire_date !== undefined ? (body.hire_date || null) : row.hire_date,
    body.leave_date !== undefined ? (body.leave_date || null) : row.leave_date,
    status,
    body.user_id !== undefined ? (body.user_id || null) : row.user_id,
    body.notes !== undefined ? body.notes : row.notes,
    id,
    tenantId
  ).run()

  return c.json({ success: true })
})

app.delete('/employees/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const row = await DB.prepare(
    'SELECT id FROM hr_employees WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first()
  if (!row) return c.json({ success: false, error: '사원을 찾을 수 없습니다.' }, 404)

  const att = await DB.prepare(
    'SELECT id FROM hr_attendance WHERE employee_id = ? AND tenant_id = ? LIMIT 1'
  ).bind(id, tenantId).first()

  if (att) {
    await DB.prepare(`
      UPDATE hr_employees SET status = 'resigned', leave_date = COALESCE(leave_date, ?),
        updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(todayYmd(), id, tenantId).run()
    return c.json({ success: true, message: '근태 이력이 있어 퇴직 처리했습니다.' })
  }

  await DB.prepare('DELETE FROM hr_employees WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId).run()
  return c.json({ success: true })
})

// ---------- Attendance ----------

app.get('/attendance', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const from = c.req.query('from') || addDaysYmd(todayYmd(), -14)
  const to = c.req.query('to') || todayYmd()
  const employeeId = c.req.query('employee_id') || ''
  const departmentId = c.req.query('department_id') || ''
  const status = c.req.query('status') || ''

  let sql = `
    SELECT a.*,
      e.name as employee_name, e.employee_number, e.department_id,
      d.name as department_name
    FROM hr_attendance a
    JOIN hr_employees e ON a.employee_id = e.id
    LEFT JOIN hr_departments d ON e.department_id = d.id
    WHERE a.tenant_id = ? AND a.work_date >= ? AND a.work_date <= ?
  `
  const params: any[] = [tenantId, from, to]
  if (employeeId) {
    sql += ' AND a.employee_id = ?'
    params.push(Number(employeeId))
  }
  if (departmentId) {
    sql += ' AND e.department_id = ?'
    params.push(Number(departmentId))
  }
  if (status && status !== 'all') {
    sql += ' AND a.status = ?'
    params.push(status)
  }
  sql += ' ORDER BY a.work_date DESC, e.name ASC LIMIT 500'

  const { results } = await DB.prepare(sql).bind(...params).all<any>()
  const rows = results || []

  const summary = {
    total: rows.length,
    present: rows.filter((r) => r.status === 'present').length,
    late: rows.filter((r) => r.status === 'late').length,
    absent: rows.filter((r) => r.status === 'absent').length,
    leave: rows.filter((r) => r.status === 'leave').length,
    half_day: rows.filter((r) => r.status === 'half_day').length,
    holiday: rows.filter((r) => r.status === 'holiday').length,
    overtime_minutes: rows.reduce((s, r) => s + (Number(r.overtime_minutes) || 0), 0)
  }

  return c.json({ success: true, data: rows, summary, range: { from, to } })
})

app.post('/attendance', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const body = await c.req.json<any>()

  const employeeId = Number(body.employee_id)
  const workDate = String(body.work_date || '').trim()
  if (!employeeId || !workDate) {
    return c.json({ success: false, error: '사원과 근무일을 입력하세요.' }, 400)
  }

  const emp = await DB.prepare(
    'SELECT id FROM hr_employees WHERE id = ? AND tenant_id = ?'
  ).bind(employeeId, tenantId).first()
  if (!emp) return c.json({ success: false, error: '사원을 찾을 수 없습니다.' }, 404)

  const status: AttStatus = inSet(body.status, ATT_STATUS) ? body.status : 'present'
  const leaveType: LeaveType | null =
    status === 'leave' && inSet(body.leave_type, LEAVE_TYPES) ? body.leave_type : null

  const existing = await DB.prepare(`
    SELECT id FROM hr_attendance
    WHERE tenant_id = ? AND employee_id = ? AND work_date = ?
  `).bind(tenantId, employeeId, workDate).first<{ id: number }>()

  if (existing) {
    await DB.prepare(`
      UPDATE hr_attendance SET
        clock_in = ?, clock_out = ?, status = ?, leave_type = ?,
        overtime_minutes = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(
      body.clock_in || null,
      body.clock_out || null,
      status,
      leaveType,
      Number(body.overtime_minutes) || 0,
      body.notes || null,
      existing.id,
      tenantId
    ).run()
    return c.json({ success: true, data: { id: existing.id }, updated: true })
  }

  const ins = await DB.prepare(`
    INSERT INTO hr_attendance (
      tenant_id, employee_id, work_date, clock_in, clock_out,
      status, leave_type, overtime_minutes, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    tenantId,
    employeeId,
    workDate,
    body.clock_in || null,
    body.clock_out || null,
    status,
    leaveType,
    Number(body.overtime_minutes) || 0,
    body.notes || null,
    userId
  ).run()

  return c.json({ success: true, data: { id: Number(ins.meta.last_row_id) }, updated: false })
})

app.put('/attendance/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<any>()

  const row = await DB.prepare(
    'SELECT * FROM hr_attendance WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()
  if (!row) return c.json({ success: false, error: '근태 기록을 찾을 수 없습니다.' }, 404)

  const status: AttStatus = inSet(body.status, ATT_STATUS) ? body.status : row.status
  const leaveType =
    status === 'leave'
      ? (inSet(body.leave_type, LEAVE_TYPES) ? body.leave_type : row.leave_type)
      : null

  await DB.prepare(`
    UPDATE hr_attendance SET
      clock_in = ?,
      clock_out = ?,
      status = ?,
      leave_type = ?,
      overtime_minutes = ?,
      notes = ?,
      updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(
    body.clock_in !== undefined ? (body.clock_in || null) : row.clock_in,
    body.clock_out !== undefined ? (body.clock_out || null) : row.clock_out,
    status,
    leaveType,
    body.overtime_minutes != null ? Number(body.overtime_minutes) || 0 : row.overtime_minutes,
    body.notes !== undefined ? body.notes : row.notes,
    id,
    tenantId
  ).run()

  return c.json({ success: true })
})

app.delete('/attendance/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const row = await DB.prepare(
    'SELECT id FROM hr_attendance WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first()
  if (!row) return c.json({ success: false, error: '근태 기록을 찾을 수 없습니다.' }, 404)

  await DB.prepare('DELETE FROM hr_attendance WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId).run()
  return c.json({ success: true })
})

export default app
