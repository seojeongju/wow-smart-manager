import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'
import { nextDocNumber } from '../utils/stock-reservation'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

export const OPP_STAGES = [
  'lead',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost'
] as const

export type OppStage = (typeof OPP_STAGES)[number]

const STAGE_PROB: Record<OppStage, number> = {
  lead: 10,
  qualified: 25,
  proposal: 50,
  negotiation: 75,
  won: 100,
  lost: 0
}

function isStage(v: any): v is OppStage {
  return OPP_STAGES.includes(v)
}

function clampProb(n: any, fallback = 10) {
  const v = Number(n)
  if (Number.isNaN(v)) return fallback
  return Math.max(0, Math.min(100, Math.round(v)))
}

app.get('/meta', async (c) => {
  return c.json({
    success: true,
    data: {
      stages: OPP_STAGES.map((s) => ({
        key: s,
        default_probability: STAGE_PROB[s]
      }))
    }
  })
})

app.get('/pipeline', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const assignedTo = c.req.query('assigned_to') || ''
  const q = (c.req.query('q') || '').trim()

  let sql = `
    SELECT o.*,
      c.name as customer_name, c.phone as customer_phone, c.company as customer_company,
      u.name as assigned_name,
      qt.quote_number, qt.total_amount as quote_total, qt.status as quote_status
    FROM opportunities o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.assigned_to = u.id
    LEFT JOIN quotations qt ON o.quotation_id = qt.id
    WHERE o.tenant_id = ?
  `
  const params: any[] = [tenantId]
  if (assignedTo) {
    sql += ' AND o.assigned_to = ?'
    params.push(Number(assignedTo))
  }
  if (q) {
    sql += ` AND (
      o.title LIKE ? OR o.opportunity_number LIKE ? OR c.name LIKE ? OR c.company LIKE ?
    )`
    const like = `%${q}%`
    params.push(like, like, like, like)
  }
  sql += ' ORDER BY o.updated_at DESC, o.id DESC LIMIT 500'

  const { results } = await DB.prepare(sql).bind(...params).all<any>()
  const rows = results || []

  const columns: Record<string, any[]> = {}
  for (const s of OPP_STAGES) columns[s] = []
  for (const r of rows) {
    const stage = isStage(r.stage) ? r.stage : 'lead'
    columns[stage].push(r)
  }

  const open = rows.filter((r) => !['won', 'lost'].includes(r.stage))
  const weighted = open.reduce(
    (s, r) => s + (Number(r.amount) || 0) * ((Number(r.probability) || 0) / 100),
    0
  )
  const pipelineAmount = open.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const wonAmount = rows
    .filter((r) => r.stage === 'won')
    .reduce((s, r) => s + (Number(r.amount) || 0), 0)

  return c.json({
    success: true,
    data: {
      columns,
      items: rows,
      summary: {
        total: rows.length,
        open_count: open.length,
        pipeline_amount: Math.round(pipelineAmount),
        weighted_amount: Math.round(weighted),
        won_count: rows.filter((r) => r.stage === 'won').length,
        won_amount: Math.round(wonAmount),
        lost_count: rows.filter((r) => r.stage === 'lost').length
      }
    }
  })
})

app.get('/', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const stage = c.req.query('stage') || ''
  const limit = Math.min(parseInt(c.req.query('limit') || '100', 10) || 100, 300)

  let sql = `
    SELECT o.*,
      c.name as customer_name, c.phone as customer_phone,
      u.name as assigned_name,
      qt.quote_number
    FROM opportunities o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.assigned_to = u.id
    LEFT JOIN quotations qt ON o.quotation_id = qt.id
    WHERE o.tenant_id = ?
  `
  const params: any[] = [tenantId]
  if (stage && stage !== 'all') {
    sql += ' AND o.stage = ?'
    params.push(stage)
  }
  sql += ' ORDER BY o.id DESC LIMIT ?'
  params.push(limit)

  const { results } = await DB.prepare(sql).bind(...params).all()
  return c.json({ success: true, data: results || [] })
})

app.get('/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const row = await DB.prepare(`
    SELECT o.*,
      c.name as customer_name, c.phone as customer_phone, c.company as customer_company,
      u.name as assigned_name,
      qt.quote_number, qt.total_amount as quote_total, qt.status as quote_status
    FROM opportunities o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.assigned_to = u.id
    LEFT JOIN quotations qt ON o.quotation_id = qt.id
    WHERE o.id = ? AND o.tenant_id = ?
  `).bind(id, tenantId).first()

  if (!row) return c.json({ success: false, error: '영업 기회를 찾을 수 없습니다.' }, 404)
  return c.json({ success: true, data: row })
})

app.post('/', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const body = await c.req.json<any>()

  const title = String(body.title || '').trim()
  if (!title) return c.json({ success: false, error: '기회명을 입력하세요.' }, 400)

  const stage: OppStage = isStage(body.stage) ? body.stage : 'lead'
  const probability =
    body.probability != null ? clampProb(body.probability) : STAGE_PROB[stage]

  if (body.customer_id) {
    const cust = await DB.prepare(
      'SELECT id FROM customers WHERE id = ? AND tenant_id = ?'
    ).bind(body.customer_id, tenantId).first()
    if (!cust) return c.json({ success: false, error: '고객을 찾을 수 없습니다.' }, 404)
  }

  const oppNumber = await nextDocNumber(DB, tenantId, 'opportunities', 'OP')

  const ins = await DB.prepare(`
    INSERT INTO opportunities (
      tenant_id, opportunity_number, title, customer_id, stage, amount, probability,
      expected_close, assigned_to, quotation_id, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    tenantId,
    oppNumber,
    title,
    body.customer_id || null,
    stage,
    Number(body.amount) || 0,
    probability,
    body.expected_close || null,
    body.assigned_to || userId || null,
    body.quotation_id || null,
    body.notes || null,
    userId
  ).run()

  return c.json({
    success: true,
    data: { id: Number(ins.meta.last_row_id), opportunity_number: oppNumber }
  })
})

app.put('/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<any>()

  const row = await DB.prepare(
    'SELECT * FROM opportunities WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()
  if (!row) return c.json({ success: false, error: '영업 기회를 찾을 수 없습니다.' }, 404)

  const stage: OppStage = isStage(body.stage) ? body.stage : row.stage
  let probability = row.probability
  if (body.probability != null) {
    probability = clampProb(body.probability)
  } else if (body.stage && body.stage !== row.stage) {
    probability = STAGE_PROB[stage]
  }

  if (body.customer_id) {
    const cust = await DB.prepare(
      'SELECT id FROM customers WHERE id = ? AND tenant_id = ?'
    ).bind(body.customer_id, tenantId).first()
    if (!cust) return c.json({ success: false, error: '고객을 찾을 수 없습니다.' }, 404)
  }

  await DB.prepare(`
    UPDATE opportunities SET
      title = ?,
      customer_id = ?,
      stage = ?,
      amount = ?,
      probability = ?,
      expected_close = ?,
      assigned_to = ?,
      quotation_id = ?,
      lost_reason = ?,
      notes = ?,
      updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(
    body.title != null ? String(body.title).trim() || row.title : row.title,
    body.customer_id !== undefined ? (body.customer_id || null) : row.customer_id,
    stage,
    body.amount != null ? Number(body.amount) || 0 : row.amount,
    probability,
    body.expected_close !== undefined ? (body.expected_close || null) : row.expected_close,
    body.assigned_to !== undefined ? (body.assigned_to || null) : row.assigned_to,
    body.quotation_id !== undefined ? (body.quotation_id || null) : row.quotation_id,
    stage === 'lost'
      ? (body.lost_reason != null ? body.lost_reason : row.lost_reason)
      : null,
    body.notes !== undefined ? body.notes : row.notes,
    id,
    tenantId
  ).run()

  return c.json({ success: true })
})

app.post('/:id/stage', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<any>()

  if (!isStage(body.stage)) {
    return c.json({ success: false, error: '유효하지 않은 단계입니다.' }, 400)
  }

  const row = await DB.prepare(
    'SELECT * FROM opportunities WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()
  if (!row) return c.json({ success: false, error: '영업 기회를 찾을 수 없습니다.' }, 404)

  const probability =
    body.probability != null ? clampProb(body.probability) : STAGE_PROB[body.stage]

  await DB.prepare(`
    UPDATE opportunities SET
      stage = ?,
      probability = ?,
      lost_reason = ?,
      updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(
    body.stage,
    probability,
    body.stage === 'lost' ? (body.lost_reason || row.lost_reason || null) : null,
    id,
    tenantId
  ).run()

  return c.json({ success: true, data: { stage: body.stage, probability } })
})

app.post('/:id/link-quotation', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<any>()
  const quotationId = Number(body.quotation_id)
  if (!quotationId) return c.json({ success: false, error: '견적을 선택하세요.' }, 400)

  const row = await DB.prepare(
    'SELECT * FROM opportunities WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()
  if (!row) return c.json({ success: false, error: '영업 기회를 찾을 수 없습니다.' }, 404)

  const quote = await DB.prepare(
    'SELECT * FROM quotations WHERE id = ? AND tenant_id = ?'
  ).bind(quotationId, tenantId).first<any>()
  if (!quote) return c.json({ success: false, error: '견적을 찾을 수 없습니다.' }, 404)

  const nextStage =
    row.stage === 'lead' || row.stage === 'qualified' ? 'proposal' : row.stage
  const amount = Number(quote.total_amount) || Number(row.amount) || 0

  await DB.prepare(`
    UPDATE opportunities SET
      quotation_id = ?,
      customer_id = COALESCE(?, customer_id),
      amount = ?,
      stage = ?,
      probability = ?,
      updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(
    quotationId,
    quote.customer_id || null,
    amount,
    nextStage,
    STAGE_PROB[nextStage as OppStage] ?? row.probability,
    id,
    tenantId
  ).run()

  return c.json({ success: true, message: '견적이 연결되었습니다.' })
})

app.post('/:id/mark-won', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<any>().catch(() => ({}))

  const row = await DB.prepare(
    'SELECT * FROM opportunities WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()
  if (!row) return c.json({ success: false, error: '영업 기회를 찾을 수 없습니다.' }, 404)

  await DB.prepare(`
    UPDATE opportunities SET
      stage = 'won',
      probability = 100,
      won_sale_id = ?,
      updated_at = datetime('now')
    WHERE id = ? AND tenant_id = ?
  `).bind(body.won_sale_id || null, id, tenantId).run()

  return c.json({
    success: true,
    message: '수주로 표시했습니다. 견적 수주 변환은 견적 관리에서 진행하세요.',
    data: { quotation_id: row.quotation_id }
  })
})

app.delete('/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const row = await DB.prepare(
    'SELECT id FROM opportunities WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first()
  if (!row) return c.json({ success: false, error: '영업 기회를 찾을 수 없습니다.' }, 404)

  await DB.prepare('DELETE FROM opportunities WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId).run()

  return c.json({ success: true })
})

export default app
