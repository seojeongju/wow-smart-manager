import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

function parseRange(c: any) {
  const to = c.req.query('to') || new Date().toISOString().slice(0, 10)
  const fromDefault = new Date()
  fromDefault.setDate(fromDefault.getDate() - 29)
  const from = c.req.query('from') || fromDefault.toISOString().slice(0, 10)
  return { from, to }
}

function pct(n: number, d: number) {
  if (!d) return 0
  return Math.round((n / d) * 1000) / 10
}

// 요약 KPI
app.get('/summary', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const { from, to } = parseRange(c)

  const wo = await DB.prepare(`
    SELECT
      COUNT(*) as total_wo,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_wo,
      SUM(CASE WHEN status IN ('planned','released','in_progress') THEN 1 ELSE 0 END) as open_wo,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_wo,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_wo,
      COALESCE(SUM(planned_qty), 0) as planned_qty,
      COALESCE(SUM(completed_qty), 0) as completed_qty,
      COALESCE(SUM(scrap_qty), 0) as scrap_qty,
      SUM(CASE
        WHEN status = 'completed'
         AND planned_end_date IS NOT NULL
         AND DATE(actual_end_at) <= DATE(planned_end_date)
        THEN 1 ELSE 0 END) as on_time_wo,
      SUM(CASE
        WHEN status = 'completed' AND planned_end_date IS NOT NULL
        THEN 1 ELSE 0 END) as due_completed_wo
    FROM mes_work_orders
    WHERE tenant_id = ?
      AND DATE(created_at) BETWEEN DATE(?) AND DATE(?)
  `).bind(tenantId, from, to).first<any>()

  const records = await DB.prepare(`
    SELECT
      COALESCE(SUM(good_qty), 0) as good_qty,
      COALESCE(SUM(scrap_qty), 0) as scrap_qty,
      COUNT(*) as record_count
    FROM mes_production_records
    WHERE tenant_id = ?
      AND DATE(recorded_at) BETWEEN DATE(?) AND DATE(?)
  `).bind(tenantId, from, to).first<any>()

  const today = await DB.prepare(`
    SELECT
      COALESCE(SUM(good_qty), 0) as good_qty,
      COALESCE(SUM(scrap_qty), 0) as scrap_qty
    FROM mes_production_records
    WHERE tenant_id = ?
      AND DATE(recorded_at) = DATE('now', 'localtime')
  `).bind(tenantId).first<any>()

  const events = await DB.prepare(`
    SELECT
      SUM(CASE WHEN event_type = 'material_issue' THEN 1 ELSE 0 END) as material_scans,
      SUM(CASE WHEN event_type = 'fg_pack' THEN 1 ELSE 0 END) as fg_packs,
      SUM(CASE WHEN event_type = 'process_complete' THEN 1 ELSE 0 END) as process_completes
    FROM mes_trace_events
    WHERE tenant_id = ?
      AND DATE(created_at) BETWEEN DATE(?) AND DATE(?)
  `).bind(tenantId, from, to).first<any>()

  const plannedQty = Number(wo?.planned_qty) || 0
  const completedQty = Number(wo?.completed_qty) || 0
  const scrapQty = Number(wo?.scrap_qty) || 0
  const goodFromRecords = Number(records?.good_qty) || 0
  const scrapFromRecords = Number(records?.scrap_qty) || 0
  const producedTotal = goodFromRecords + scrapFromRecords
  const dueCompleted = Number(wo?.due_completed_wo) || 0
  const onTime = Number(wo?.on_time_wo) || 0

  return c.json({
    success: true,
    data: {
      from,
      to,
      total_wo: Number(wo?.total_wo) || 0,
      completed_wo: Number(wo?.completed_wo) || 0,
      open_wo: Number(wo?.open_wo) || 0,
      in_progress_wo: Number(wo?.in_progress_wo) || 0,
      cancelled_wo: Number(wo?.cancelled_wo) || 0,
      planned_qty: plannedQty,
      completed_qty: completedQty,
      scrap_qty: scrapQty,
      plan_achievement_rate: pct(completedQty, plannedQty),
      yield_rate: pct(goodFromRecords, producedTotal),
      scrap_rate: pct(scrapFromRecords, producedTotal),
      on_time_rate: pct(onTime, dueCompleted),
      record_good_qty: goodFromRecords,
      record_scrap_qty: scrapFromRecords,
      record_count: Number(records?.record_count) || 0,
      today_good_qty: Number(today?.good_qty) || 0,
      today_scrap_qty: Number(today?.scrap_qty) || 0,
      material_scans: Number(events?.material_scans) || 0,
      fg_packs: Number(events?.fg_packs) || 0,
      process_completes: Number(events?.process_completes) || 0
    }
  })
})

// 일별 추이
app.get('/trend', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const { from, to } = parseRange(c)

  const { results } = await DB.prepare(`
    SELECT
      DATE(recorded_at) as date,
      COALESCE(SUM(good_qty), 0) as good_qty,
      COALESCE(SUM(scrap_qty), 0) as scrap_qty,
      COUNT(*) as record_count
    FROM mes_production_records
    WHERE tenant_id = ?
      AND DATE(recorded_at) BETWEEN DATE(?) AND DATE(?)
    GROUP BY DATE(recorded_at)
    ORDER BY date ASC
  `).bind(tenantId, from, to).all()

  const { results: woTrend } = await DB.prepare(`
    SELECT
      DATE(COALESCE(actual_end_at, updated_at, created_at)) as date,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_wo,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN completed_qty ELSE 0 END), 0) as completed_qty
    FROM mes_work_orders
    WHERE tenant_id = ?
      AND DATE(COALESCE(actual_end_at, updated_at, created_at)) BETWEEN DATE(?) AND DATE(?)
    GROUP BY DATE(COALESCE(actual_end_at, updated_at, created_at))
    ORDER BY date ASC
  `).bind(tenantId, from, to).all()

  return c.json({
    success: true,
    data: {
      from,
      to,
      production: results || [],
      work_orders: woTrend || []
    }
  })
})

// 제품별
app.get('/by-product', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const { from, to } = parseRange(c)

  const { results } = await DB.prepare(`
    SELECT
      wo.product_id,
      p.name as product_name,
      p.sku as product_sku,
      COUNT(*) as wo_count,
      SUM(CASE WHEN wo.status = 'completed' THEN 1 ELSE 0 END) as completed_wo,
      COALESCE(SUM(wo.planned_qty), 0) as planned_qty,
      COALESCE(SUM(wo.completed_qty), 0) as completed_qty,
      COALESCE(SUM(wo.scrap_qty), 0) as scrap_qty
    FROM mes_work_orders wo
    JOIN products p ON wo.product_id = p.id
    WHERE wo.tenant_id = ?
      AND DATE(wo.created_at) BETWEEN DATE(?) AND DATE(?)
    GROUP BY wo.product_id, p.name, p.sku
    ORDER BY completed_qty DESC
    LIMIT 50
  `).bind(tenantId, from, to).all()

  const data = (results || []).map((r: any) => {
    const planned = Number(r.planned_qty) || 0
    const completed = Number(r.completed_qty) || 0
    const scrap = Number(r.scrap_qty) || 0
    const total = completed + scrap
    return {
      ...r,
      plan_achievement_rate: pct(completed, planned),
      yield_rate: pct(completed, total),
      scrap_rate: pct(scrap, total)
    }
  })

  return c.json({ success: true, data: { from, to, items: data } })
})

// 공정별
app.get('/by-process', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const { from, to } = parseRange(c)

  const { results } = await DB.prepare(`
    SELECT
      e.process_id,
      COALESCE(pr.name, '(미지정)') as process_name,
      COUNT(*) as event_count,
      COALESCE(SUM(e.quantity), 0) as quantity
    FROM mes_trace_events e
    LEFT JOIN mes_processes pr ON e.process_id = pr.id
    WHERE e.tenant_id = ?
      AND e.event_type = 'process_complete'
      AND DATE(e.created_at) BETWEEN DATE(?) AND DATE(?)
    GROUP BY e.process_id, pr.name
    ORDER BY event_count DESC
  `).bind(tenantId, from, to).all()

  return c.json({ success: true, data: { from, to, items: results || [] } })
})

// BOM 이론소요 vs 투입 스캔 수량
app.get('/material-variance', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const { from, to } = parseRange(c)

  // 기간 내 완료/진행 WO의 양품 기준 이론 소요
  const { results: theoretical } = await DB.prepare(`
    SELECT
      bi.component_product_id as product_id,
      p.name as product_name,
      p.sku as product_sku,
      COALESCE(SUM(bi.quantity * wo.completed_qty), 0) as theoretical_qty
    FROM mes_work_orders wo
    JOIN mes_bom_items bi ON bi.bom_id = wo.bom_id AND bi.tenant_id = wo.tenant_id
    JOIN products p ON bi.component_product_id = p.id
    WHERE wo.tenant_id = ?
      AND wo.bom_id IS NOT NULL
      AND wo.completed_qty > 0
      AND DATE(wo.created_at) BETWEEN DATE(?) AND DATE(?)
    GROUP BY bi.component_product_id, p.name, p.sku
  `).bind(tenantId, from, to).all<any>()

  const { results: actual } = await DB.prepare(`
    SELECT
      e.product_id,
      p.name as product_name,
      p.sku as product_sku,
      COALESCE(SUM(e.quantity), 0) as actual_qty
    FROM mes_trace_events e
    JOIN products p ON e.product_id = p.id
    WHERE e.tenant_id = ?
      AND e.event_type = 'material_issue'
      AND DATE(e.created_at) BETWEEN DATE(?) AND DATE(?)
    GROUP BY e.product_id, p.name, p.sku
  `).bind(tenantId, from, to).all<any>()

  const map = new Map<number, any>()
  for (const row of theoretical || []) {
    map.set(Number(row.product_id), {
      product_id: row.product_id,
      product_name: row.product_name,
      product_sku: row.product_sku,
      theoretical_qty: Number(row.theoretical_qty) || 0,
      actual_qty: 0
    })
  }
  for (const row of actual || []) {
    const id = Number(row.product_id)
    const cur = map.get(id) || {
      product_id: row.product_id,
      product_name: row.product_name,
      product_sku: row.product_sku,
      theoretical_qty: 0,
      actual_qty: 0
    }
    cur.actual_qty = Number(row.actual_qty) || 0
    map.set(id, cur)
  }

  const items = Array.from(map.values()).map((r) => ({
    ...r,
    variance_qty: Math.round((r.actual_qty - r.theoretical_qty) * 1000) / 1000,
    variance_rate: pct(r.actual_qty - r.theoretical_qty, r.theoretical_qty || r.actual_qty || 1)
  })).sort((a, b) => Math.abs(b.variance_qty) - Math.abs(a.variance_qty))

  return c.json({ success: true, data: { from, to, items } })
})

// 리포트 통합 (인쇄/엑셀용)
app.get('/report', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const { from, to } = parseRange(c)

  const summary = await DB.prepare(`
    SELECT
      COUNT(*) as total_wo,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_wo,
      SUM(CASE WHEN status IN ('planned','released','in_progress') THEN 1 ELSE 0 END) as open_wo,
      COALESCE(SUM(planned_qty), 0) as planned_qty,
      COALESCE(SUM(completed_qty), 0) as completed_qty,
      COALESCE(SUM(scrap_qty), 0) as scrap_qty
    FROM mes_work_orders
    WHERE tenant_id = ? AND DATE(created_at) BETWEEN DATE(?) AND DATE(?)
  `).bind(tenantId, from, to).first<any>()

  const records = await DB.prepare(`
    SELECT COALESCE(SUM(good_qty),0) as good_qty, COALESCE(SUM(scrap_qty),0) as scrap_qty
    FROM mes_production_records
    WHERE tenant_id = ? AND DATE(recorded_at) BETWEEN DATE(?) AND DATE(?)
  `).bind(tenantId, from, to).first<any>()

  const { results: byProduct } = await DB.prepare(`
    SELECT p.name as product_name, p.sku as product_sku,
      COALESCE(SUM(wo.planned_qty),0) as planned_qty,
      COALESCE(SUM(wo.completed_qty),0) as completed_qty,
      COALESCE(SUM(wo.scrap_qty),0) as scrap_qty,
      COUNT(*) as wo_count
    FROM mes_work_orders wo
    JOIN products p ON wo.product_id = p.id
    WHERE wo.tenant_id = ? AND DATE(wo.created_at) BETWEEN DATE(?) AND DATE(?)
    GROUP BY p.name, p.sku
    ORDER BY completed_qty DESC
  `).bind(tenantId, from, to).all()

  const { results: recentRecords } = await DB.prepare(`
    SELECT r.recorded_at, r.good_qty, r.scrap_qty, r.stock_applied,
      wo.wo_number, p.name as product_name, u.name as worker_name
    FROM mes_production_records r
    JOIN mes_work_orders wo ON r.work_order_id = wo.id
    JOIN products p ON wo.product_id = p.id
    LEFT JOIN users u ON r.worker_user_id = u.id
    WHERE r.tenant_id = ? AND DATE(r.recorded_at) BETWEEN DATE(?) AND DATE(?)
    ORDER BY r.recorded_at DESC
    LIMIT 100
  `).bind(tenantId, from, to).all()

  const good = Number(records?.good_qty) || 0
  const scrap = Number(records?.scrap_qty) || 0
  const planned = Number(summary?.planned_qty) || 0
  const completed = Number(summary?.completed_qty) || 0

  return c.json({
    success: true,
    data: {
      from,
      to,
      generated_at: new Date().toISOString(),
      summary: {
        ...summary,
        plan_achievement_rate: pct(completed, planned),
        yield_rate: pct(good, good + scrap),
        scrap_rate: pct(scrap, good + scrap),
        record_good_qty: good,
        record_scrap_qty: scrap
      },
      by_product: byProduct || [],
      recent_records: recentRecords || []
    }
  })
})

export default app
