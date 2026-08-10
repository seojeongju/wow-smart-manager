import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

function agingBucket(createdAt: string | null | undefined): string {
  if (!createdAt) return '0-30'
  const t = Date.parse(String(createdAt).replace(' ', 'T'))
  if (!Number.isFinite(t)) return '0-30'
  const days = Math.floor((Date.now() - t) / (86400 * 1000))
  if (days <= 30) return '0-30'
  if (days <= 60) return '31-60'
  if (days <= 90) return '61-90'
  return '90+'
}

/** 매출채권 목록 */
app.get('/ar', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const status = (c.req.query('status') || 'open').toLowerCase() // open | all | paid
  const limit = Math.min(parseInt(c.req.query('limit') || '100', 10) || 100, 200)

  let q = `
    SELECT s.id, s.final_amount, s.paid_amount, s.payment_status, s.payment_method,
           s.status as sale_status, s.created_at, s.fulfillment,
           c.id as customer_id, c.name as customer_name, c.phone as customer_phone
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
    WHERE s.tenant_id = ?
      AND COALESCE(s.status, '') != 'cancelled'
  `
  const params: any[] = [tenantId]

  if (status === 'open') {
    q += ` AND COALESCE(s.payment_status, 'paid') IN ('unpaid', 'partial')`
  } else if (status === 'paid') {
    q += ` AND COALESCE(s.payment_status, 'paid') = 'paid'`
  }

  q += ' ORDER BY s.created_at ASC LIMIT ?'
  params.push(limit)

  try {
    const { results } = await DB.prepare(q).bind(...params).all<any>()
    const rows = (results || []).map((r: any) => {
      const finalAmt = Number(r.final_amount) || 0
      const paid = Number(r.paid_amount) || 0
      const balance = Math.max(0, finalAmt - paid)
      return {
        ...r,
        balance,
        aging: agingBucket(r.created_at)
      }
    })

    const summary = {
      count: rows.length,
      total_balance: rows.reduce((s: number, r: any) => s + r.balance, 0),
      aging: {
        '0-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0
      } as Record<string, number>
    }
    for (const r of rows) {
      if (r.balance > 0) summary.aging[r.aging] = (summary.aging[r.aging] || 0) + r.balance
    }

    return c.json({ success: true, data: rows, summary })
  } catch (e: any) {
    return c.json({
      success: false,
      error: '매출채권 조회 실패. 마이그레이션 0041을 확인해 주세요. ' + e.message
    }, 500)
  }
})

/** 매입채무 목록 */
app.get('/ap', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const status = (c.req.query('status') || 'open').toLowerCase()
  const limit = Math.min(parseInt(c.req.query('limit') || '100', 10) || 100, 200)

  let q = `
    SELECT po.id, po.code, po.status as po_status, po.total_amount,
           po.paid_amount, po.payment_status, po.payment_due_date,
           po.received_at, po.created_at, po.expected_at,
           s.id as supplier_id, s.name as supplier_name
    FROM purchase_orders po
    LEFT JOIN suppliers s ON s.id = po.supplier_id
    WHERE po.tenant_id = ?
      AND UPPER(COALESCE(po.status, '')) IN ('PARTIAL', 'COMPLETED')
  `
  const params: any[] = [tenantId]

  if (status === 'open') {
    q += ` AND COALESCE(po.payment_status, 'unpaid') IN ('unpaid', 'partial')`
  } else if (status === 'paid') {
    q += ` AND COALESCE(po.payment_status, 'unpaid') = 'paid'`
  }

  q += ' ORDER BY COALESCE(po.received_at, po.created_at) ASC LIMIT ?'
  params.push(limit)

  try {
    const { results } = await DB.prepare(q).bind(...params).all<any>()
    const rows = (results || []).map((r: any) => {
      const total = Number(r.total_amount) || 0
      const paid = Number(r.paid_amount) || 0
      const balance = Math.max(0, total - paid)
      return {
        ...r,
        balance,
        aging: agingBucket(r.received_at || r.created_at)
      }
    })

    const summary = {
      count: rows.length,
      total_balance: rows.reduce((s: number, r: any) => s + r.balance, 0),
      aging: {
        '0-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0
      } as Record<string, number>
    }
    for (const r of rows) {
      if (r.balance > 0) summary.aging[r.aging] = (summary.aging[r.aging] || 0) + r.balance
    }

    return c.json({ success: true, data: rows, summary })
  } catch (e: any) {
    return c.json({
      success: false,
      error: '매입채무 조회 실패. 마이그레이션 0043을 적용해 주세요. ' + e.message
    }, 500)
  }
})

/** 전표 목록 */
app.get('/vouchers', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const type = c.req.query('type') || ''
  const limit = Math.min(parseInt(c.req.query('limit') || '100', 10) || 100, 200)

  let q = `
    SELECT v.*, u.name as created_by_name
    FROM vouchers v
    LEFT JOIN users u ON u.id = v.created_by
    WHERE v.tenant_id = ?
  `
  const params: any[] = [tenantId]
  if (type) {
    q += ' AND v.voucher_type = ?'
    params.push(type)
  }
  q += ' ORDER BY v.id DESC LIMIT ?'
  params.push(limit)

  try {
    const { results } = await DB.prepare(q).bind(...params).all()
    return c.json({ success: true, data: results || [] })
  } catch (e: any) {
    return c.json({
      success: false,
      error: '전표 조회 실패. 마이그레이션 0043을 적용해 주세요. ' + e.message
    }, 500)
  }
})

export default app
