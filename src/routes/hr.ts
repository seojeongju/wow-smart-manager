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
        employment_type, hire_date, leave_date, status, user_id, notes, created_by, base_salary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      userId,
      Math.max(0, Number(body.base_salary) || 0)
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
      base_salary = ?,
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
    body.base_salary != null ? Math.max(0, Number(body.base_salary) || 0) : (row.base_salary || 0),
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

// ---------- Payroll ----------

const MONTHLY_HOURS = 209

function roundWon(n: number) {
  return Math.round(Number(n) || 0)
}

function periodRange(periodYm: string) {
  if (!/^\d{4}-\d{2}$/.test(periodYm)) return null
  const [y, m] = periodYm.split('-').map(Number)
  const from = `${periodYm}-01`
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const to = `${periodYm}-${String(last).padStart(2, '0')}`
  return { from, to }
}

function calcItemAmounts(input: {
  baseSalary: number
  overtimeMinutes: number
  base_pay?: number
  overtime_pay?: number
  allowance?: number
  bonus?: number
  national_pension?: number
  health_insurance?: number
  employment_insurance?: number
  income_tax?: number
  other_deduction?: number
  useAutoDeductions?: boolean
}) {
  const basePay = roundWon(input.base_pay != null ? input.base_pay : input.baseSalary)
  const hourly = (Number(input.baseSalary) || 0) / MONTHLY_HOURS
  const overtimePay = roundWon(
    input.overtime_pay != null
      ? input.overtime_pay
      : hourly * 1.5 * ((Number(input.overtimeMinutes) || 0) / 60)
  )
  const allowance = roundWon(input.allowance || 0)
  const bonus = roundWon(input.bonus || 0)
  const gross = basePay + overtimePay + allowance + bonus

  let national = roundWon(input.national_pension || 0)
  let health = roundWon(input.health_insurance || 0)
  let employ = roundWon(input.employment_insurance || 0)
  let tax = roundWon(input.income_tax || 0)
  const other = roundWon(input.other_deduction || 0)

  if (input.useAutoDeductions) {
    national = roundWon(basePay * 0.045)
    health = roundWon(basePay * 0.03545)
    employ = roundWon(basePay * 0.009)
    tax = roundWon(gross * 0.03)
  }

  const deduction = national + health + employ + tax + other
  return {
    base_pay: basePay,
    overtime_pay: overtimePay,
    allowance,
    bonus,
    national_pension: national,
    health_insurance: health,
    employment_insurance: employ,
    income_tax: tax,
    other_deduction: other,
    gross_pay: gross,
    deduction_total: deduction,
    net_pay: gross - deduction
  }
}

async function refreshPayrollRunTotals(DB: D1Database, tenantId: number, runId: number) {
  const sums = await DB.prepare(`
    SELECT
      COALESCE(SUM(gross_pay), 0) as total_gross,
      COALESCE(SUM(deduction_total), 0) as total_deduction,
      COALESCE(SUM(net_pay), 0) as total_net
    FROM hr_payroll_items
    WHERE tenant_id = ? AND run_id = ?
  `).bind(tenantId, runId).first<any>()

  await DB.prepare(`
    UPDATE hr_payroll_runs SET
      total_gross = ?,
      total_deduction = ?,
      total_net = ?,
      updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(
    Number(sums?.total_gross) || 0,
    Number(sums?.total_deduction) || 0,
    Number(sums?.total_net) || 0,
    runId,
    tenantId
  ).run()
}

async function buildPayrollLines(
  DB: D1Database,
  tenantId: number,
  periodYm: string
) {
  const range = periodRange(periodYm)
  if (!range) throw new Error('INVALID_PERIOD')

  const { results: employees } = await DB.prepare(`
    SELECT * FROM hr_employees
    WHERE tenant_id = ? AND status IN ('active', 'leave')
    ORDER BY name ASC
  `).bind(tenantId).all<any>()

  const lines = []
  for (const emp of employees || []) {
    const att = await DB.prepare(`
      SELECT
        SUM(CASE WHEN status IN ('present', 'late', 'half_day') THEN 1 ELSE 0 END) as work_days,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END) as leave_days,
        COALESCE(SUM(overtime_minutes), 0) as overtime_minutes
      FROM hr_attendance
      WHERE tenant_id = ? AND employee_id = ? AND work_date >= ? AND work_date <= ?
    `).bind(tenantId, emp.id, range.from, range.to).first<any>()

    const overtimeMinutes = Number(att?.overtime_minutes) || 0
    const amounts = calcItemAmounts({
      baseSalary: Number(emp.base_salary) || 0,
      overtimeMinutes,
      useAutoDeductions: true
    })

    lines.push({
      employee_id: emp.id,
      work_days: Number(att?.work_days) || 0,
      late_days: Number(att?.late_days) || 0,
      absent_days: Number(att?.absent_days) || 0,
      leave_days: Number(att?.leave_days) || 0,
      overtime_minutes: overtimeMinutes,
      ...amounts
    })
  }
  return lines
}

app.get('/payroll/runs', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const { results } = await DB.prepare(`
    SELECT r.*,
      (SELECT COUNT(*) FROM hr_payroll_items i WHERE i.run_id = r.id) as item_count
    FROM hr_payroll_runs r
    WHERE r.tenant_id = ?
    ORDER BY r.period_ym DESC, r.id DESC
    LIMIT 100
  `).bind(tenantId).all()
  return c.json({ success: true, data: results || [] })
})

app.get('/payroll/runs/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const run = await DB.prepare(
    'SELECT * FROM hr_payroll_runs WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first()
  if (!run) return c.json({ success: false, error: '급여대장을 찾을 수 없습니다.' }, 404)

  const { results: items } = await DB.prepare(`
    SELECT i.*,
      e.name as employee_name, e.employee_number, e.department_id,
      d.name as department_name
    FROM hr_payroll_items i
    JOIN hr_employees e ON i.employee_id = e.id
    LEFT JOIN hr_departments d ON e.department_id = d.id
    WHERE i.run_id = ? AND i.tenant_id = ?
    ORDER BY e.name ASC
  `).bind(id, tenantId).all()

  return c.json({ success: true, data: { run, items: items || [] } })
})

app.post('/payroll/runs', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const body = await c.req.json<any>()
  const periodYm = String(body.period_ym || '').trim()
  if (!periodRange(periodYm)) {
    return c.json({ success: false, error: '급여 연월은 YYYY-MM 형식이어야 합니다.' }, 400)
  }

  const exists = await DB.prepare(
    'SELECT id, status FROM hr_payroll_runs WHERE tenant_id = ? AND period_ym = ?'
  ).bind(tenantId, periodYm).first<any>()
  if (exists) {
    return c.json({
      success: false,
      error: '해당 연월 급여대장이 이미 있습니다.',
      data: { id: exists.id, status: exists.status }
    }, 400)
  }

  let lines
  try {
    lines = await buildPayrollLines(DB, tenantId, periodYm)
  } catch {
    return c.json({ success: false, error: '급여 연월이 올바르지 않습니다.' }, 400)
  }

  if (!lines.length) {
    return c.json({ success: false, error: '재직/휴직 사원이 없습니다. 먼저 사원을 등록하세요.' }, 400)
  }

  const title = body.title || `${periodYm} 급여`
  const ins = await DB.prepare(`
    INSERT INTO hr_payroll_runs (tenant_id, period_ym, title, status, notes, created_by)
    VALUES (?, ?, ?, 'draft', ?, ?)
  `).bind(tenantId, periodYm, title, body.notes || null, userId).run()
  const runId = Number(ins.meta.last_row_id)

  for (const line of lines) {
    await DB.prepare(`
      INSERT INTO hr_payroll_items (
        tenant_id, run_id, employee_id,
        base_pay, overtime_pay, allowance, bonus,
        national_pension, health_insurance, employment_insurance, income_tax, other_deduction,
        work_days, late_days, absent_days, leave_days, overtime_minutes,
        gross_pay, deduction_total, net_pay
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      runId,
      line.employee_id,
      line.base_pay,
      line.overtime_pay,
      line.allowance,
      line.bonus,
      line.national_pension,
      line.health_insurance,
      line.employment_insurance,
      line.income_tax,
      line.other_deduction,
      line.work_days,
      line.late_days,
      line.absent_days,
      line.leave_days,
      line.overtime_minutes,
      line.gross_pay,
      line.deduction_total,
      line.net_pay
    ).run()
  }

  await refreshPayrollRunTotals(DB, tenantId, runId)
  return c.json({ success: true, data: { id: runId, period_ym: periodYm, item_count: lines.length } })
})

app.post('/payroll/runs/:id/recalculate', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = Number(c.req.param('id'))

  const run = await DB.prepare(
    'SELECT * FROM hr_payroll_runs WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()
  if (!run) return c.json({ success: false, error: '급여대장을 찾을 수 없습니다.' }, 404)
  if (run.status === 'confirmed') {
    return c.json({ success: false, error: '확정된 급여대장은 재계산할 수 없습니다.' }, 400)
  }

  const lines = await buildPayrollLines(DB, tenantId, run.period_ym)
  await DB.prepare(
    'DELETE FROM hr_payroll_items WHERE run_id = ? AND tenant_id = ?'
  ).bind(id, tenantId).run()

  for (const line of lines) {
    await DB.prepare(`
      INSERT INTO hr_payroll_items (
        tenant_id, run_id, employee_id,
        base_pay, overtime_pay, allowance, bonus,
        national_pension, health_insurance, employment_insurance, income_tax, other_deduction,
        work_days, late_days, absent_days, leave_days, overtime_minutes,
        gross_pay, deduction_total, net_pay
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      id,
      line.employee_id,
      line.base_pay,
      line.overtime_pay,
      line.allowance,
      line.bonus,
      line.national_pension,
      line.health_insurance,
      line.employment_insurance,
      line.income_tax,
      line.other_deduction,
      line.work_days,
      line.late_days,
      line.absent_days,
      line.leave_days,
      line.overtime_minutes,
      line.gross_pay,
      line.deduction_total,
      line.net_pay
    ).run()
  }

  await refreshPayrollRunTotals(DB, tenantId, id)
  return c.json({ success: true, data: { item_count: lines.length } })
})

app.put('/payroll/items/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<any>()

  const item = await DB.prepare(`
    SELECT i.*, e.base_salary, r.status as run_status
    FROM hr_payroll_items i
    JOIN hr_employees e ON i.employee_id = e.id
    JOIN hr_payroll_runs r ON i.run_id = r.id
    WHERE i.id = ? AND i.tenant_id = ?
  `).bind(id, tenantId).first<any>()
  if (!item) return c.json({ success: false, error: '급여 항목을 찾을 수 없습니다.' }, 404)
  if (item.run_status === 'confirmed') {
    return c.json({ success: false, error: '확정된 급여대장은 수정할 수 없습니다.' }, 400)
  }

  const amounts = calcItemAmounts({
    baseSalary: Number(item.base_salary) || 0,
    overtimeMinutes: Number(item.overtime_minutes) || 0,
    base_pay: body.base_pay != null ? body.base_pay : item.base_pay,
    overtime_pay: body.overtime_pay != null ? body.overtime_pay : item.overtime_pay,
    allowance: body.allowance != null ? body.allowance : item.allowance,
    bonus: body.bonus != null ? body.bonus : item.bonus,
    national_pension: body.national_pension != null ? body.national_pension : item.national_pension,
    health_insurance: body.health_insurance != null ? body.health_insurance : item.health_insurance,
    employment_insurance:
      body.employment_insurance != null ? body.employment_insurance : item.employment_insurance,
    income_tax: body.income_tax != null ? body.income_tax : item.income_tax,
    other_deduction: body.other_deduction != null ? body.other_deduction : item.other_deduction,
    useAutoDeductions: false
  })

  await DB.prepare(`
    UPDATE hr_payroll_items SET
      base_pay = ?, overtime_pay = ?, allowance = ?, bonus = ?,
      national_pension = ?, health_insurance = ?, employment_insurance = ?,
      income_tax = ?, other_deduction = ?,
      gross_pay = ?, deduction_total = ?, net_pay = ?,
      notes = ?, updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(
    amounts.base_pay,
    amounts.overtime_pay,
    amounts.allowance,
    amounts.bonus,
    amounts.national_pension,
    amounts.health_insurance,
    amounts.employment_insurance,
    amounts.income_tax,
    amounts.other_deduction,
    amounts.gross_pay,
    amounts.deduction_total,
    amounts.net_pay,
    body.notes !== undefined ? body.notes : item.notes,
    id,
    tenantId
  ).run()

  await refreshPayrollRunTotals(DB, tenantId, Number(item.run_id))
  return c.json({ success: true, data: amounts })
})

app.post('/payroll/runs/:id/confirm', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const id = c.req.param('id')

  const run = await DB.prepare(
    'SELECT * FROM hr_payroll_runs WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()
  if (!run) return c.json({ success: false, error: '급여대장을 찾을 수 없습니다.' }, 404)
  if (run.status === 'confirmed') {
    return c.json({ success: false, error: '이미 확정된 급여대장입니다.' }, 400)
  }

  const cnt = await DB.prepare(
    'SELECT COUNT(*) as c FROM hr_payroll_items WHERE run_id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<{ c: number }>()
  if (!cnt?.c) return c.json({ success: false, error: '급여 항목이 없습니다.' }, 400)

  await DB.prepare(`
    UPDATE hr_payroll_runs SET
      status = 'confirmed',
      confirmed_by = ?,
      confirmed_at = datetime('now'),
      updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(userId, id, tenantId).run()

  return c.json({ success: true, message: '급여대장을 확정했습니다.' })
})

app.delete('/payroll/runs/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const run = await DB.prepare(
    'SELECT * FROM hr_payroll_runs WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()
  if (!run) return c.json({ success: false, error: '급여대장을 찾을 수 없습니다.' }, 404)
  if (run.status === 'confirmed') {
    return c.json({ success: false, error: '확정된 급여대장은 삭제할 수 없습니다.' }, 400)
  }

  await DB.prepare('DELETE FROM hr_payroll_items WHERE run_id = ? AND tenant_id = ?')
    .bind(id, tenantId).run()
  await DB.prepare('DELETE FROM hr_payroll_runs WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId).run()
  return c.json({ success: true })
})

export default app
