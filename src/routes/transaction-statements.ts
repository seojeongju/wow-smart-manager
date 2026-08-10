import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'
import { nextDocNumber } from '../utils/stock-reservation'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.get('/', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const customerId = c.req.query('customerId') || ''
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10) || 50, 100)

  let q = `
    SELECT ts.*, c.name as customer_name, u.name as created_by_name
    FROM transaction_statements ts
    LEFT JOIN customers c ON ts.customer_id = c.id
    LEFT JOIN users u ON ts.created_by = u.id
    WHERE ts.tenant_id = ?
  `
  const params: any[] = [tenantId]
  if (customerId) {
    q += ' AND ts.customer_id = ?'
    params.push(customerId)
  }
  q += ' ORDER BY ts.id DESC LIMIT ?'
  params.push(limit)

  const { results } = await DB.prepare(q).bind(...params).all()
  return c.json({ success: true, data: results || [] })
})

app.get('/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const row = await DB.prepare(`
    SELECT ts.*, c.name as customer_name, c.phone as customer_phone,
           c.address_detail as customer_address, u.name as created_by_name
    FROM transaction_statements ts
    LEFT JOIN customers c ON ts.customer_id = c.id
    LEFT JOIN users u ON ts.created_by = u.id
    WHERE ts.id = ? AND ts.tenant_id = ?
  `).bind(id, tenantId).first<any>()

  if (!row) return c.json({ success: false, error: '거래명세서를 찾을 수 없습니다.' }, 404)

  const { results: sales } = await DB.prepare(`
    SELECT tss.sale_id, s.final_amount, s.created_at, s.status
    FROM transaction_statement_sales tss
    JOIN sales s ON s.id = tss.sale_id
    WHERE tss.statement_id = ?
  `).bind(id).all()

  let snapshot = null
  try {
    snapshot = row.snapshot_json ? JSON.parse(row.snapshot_json) : null
  } catch {
    snapshot = null
  }

  return c.json({
    success: true,
    data: { ...row, sales: sales || [], snapshot, snapshot_json: undefined }
  })
})

app.post('/', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const body = await c.req.json<{
    customer_id: number
    start_date: string
    end_date: string
    apply_vat?: boolean
    note?: string
    sale_ids: number[]
    snapshot?: any
    supply_amount?: number
    vat_amount?: number
    total_amount?: number
  }>()

  if (!body.customer_id || !body.start_date || !body.end_date) {
    return c.json({ success: false, error: '고객·기간이 필요합니다.' }, 400)
  }
  if (!body.sale_ids?.length) {
    return c.json({ success: false, error: '포함할 판매가 없습니다.' }, 400)
  }

  const docNumber = await nextDocNumber(DB, tenantId, 'transaction_statements', 'TS')

  let supply = Number(body.supply_amount)
  let vat = Number(body.vat_amount)
  let total = Number(body.total_amount)

  if (!Number.isFinite(supply) || !Number.isFinite(total)) {
    const placeholders = body.sale_ids.map(() => '?').join(',')
    const sumRow = await DB.prepare(`
      SELECT COALESCE(SUM(final_amount), 0) as t
      FROM sales
      WHERE tenant_id = ? AND id IN (${placeholders})
    `).bind(tenantId, ...body.sale_ids).first<{ t: number }>()
    supply = Number(sumRow?.t) || 0
    if (body.apply_vat) {
      vat = Math.round(supply * 0.1)
      total = supply + vat
    } else {
      vat = 0
      total = supply
    }
  }

  const result = await DB.prepare(`
    INSERT INTO transaction_statements (
      tenant_id, doc_number, customer_id, start_date, end_date,
      apply_vat, supply_amount, vat_amount, total_amount, note, snapshot_json, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    tenantId,
    docNumber,
    body.customer_id,
    body.start_date,
    body.end_date,
    body.apply_vat ? 1 : 0,
    supply,
    vat || 0,
    total,
    body.note || null,
    body.snapshot ? JSON.stringify(body.snapshot) : null,
    userId
  ).run()

  const statementId = Number(result.meta.last_row_id)

  for (const saleId of body.sale_ids) {
    await DB.prepare(`
      INSERT OR IGNORE INTO transaction_statement_sales (tenant_id, statement_id, sale_id)
      VALUES (?, ?, ?)
    `).bind(tenantId, statementId, saleId).run()
  }

  return c.json({
    success: true,
    message: '거래명세서가 저장되었습니다.',
    data: { id: statementId, doc_number: docNumber }
  })
})

app.delete('/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  await DB.prepare('DELETE FROM transaction_statements WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId).run()
  return c.json({ success: true, message: '삭제되었습니다.' })
})

export default app
