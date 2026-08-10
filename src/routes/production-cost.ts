import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'
import { computeBomMaterialUnitCost, getStandardUnitCost } from '../utils/mes-cost'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

function parseRange(c: any) {
  const to = c.req.query('to') || new Date().toISOString().slice(0, 10)
  const fromDefault = new Date()
  fromDefault.setDate(fromDefault.getDate() - 29)
  const from = c.req.query('from') || fromDefault.toISOString().slice(0, 10)
  return { from, to }
}

function money(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100
}

// 제품 표준원가 상세
app.get('/standard', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const productId = Number(c.req.query('product_id'))
  if (!productId) {
    return c.json({ success: false, error: 'product_id가 필요합니다.' }, 400)
  }

  const product = await DB.prepare(`
    SELECT id, name, sku, purchase_price, selling_price, standard_cost
    FROM products WHERE id = ? AND tenant_id = ?
  `).bind(productId, tenantId).first<any>()
  if (!product) {
    return c.json({ success: false, error: '상품을 찾을 수 없습니다.' }, 404)
  }

  const bom = await computeBomMaterialUnitCost(DB, tenantId, productId)
  const std = await getStandardUnitCost(DB, tenantId, productId, bom.bomId)

  return c.json({
    success: true,
    data: {
      product,
      bom_id: bom.bomId,
      bom_lines: bom.lines,
      material_unit_cost: bom.unitCost,
      standard_unit_cost: std.standardUnitCost,
      source: std.source
    }
  })
})

// 기간 원가 요약
app.get('/summary', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const { from, to } = parseRange(c)

  // 스냅샷 우선 집계
  const snap = await DB.prepare(`
    SELECT
      COALESCE(SUM(good_qty), 0) as good_qty,
      COALESCE(SUM(scrap_qty), 0) as scrap_qty,
      COALESCE(SUM(material_std_cost), 0) as material_std_cost,
      COALESCE(SUM(material_act_cost), 0) as material_act_cost,
      COALESCE(SUM(scrap_cost), 0) as scrap_cost,
      COALESCE(SUM(outsourcing_cost), 0) as outsourcing_cost,
      COALESCE(SUM(total_std_cost), 0) as total_std_cost,
      COALESCE(SUM(total_act_cost), 0) as total_act_cost,
      COUNT(*) as snapshot_count
    FROM mes_cost_snapshots
    WHERE tenant_id = ?
      AND DATE(snapshot_at) BETWEEN DATE(?) AND DATE(?)
  `).bind(tenantId, from, to).first<any>()

  let summary = {
    from,
    to,
    source: 'snapshot' as string,
    good_qty: Number(snap?.good_qty) || 0,
    scrap_qty: Number(snap?.scrap_qty) || 0,
    material_std_cost: money(snap?.material_std_cost),
    material_act_cost: money(snap?.material_act_cost),
    scrap_cost: money(snap?.scrap_cost),
    outsourcing_cost: money(snap?.outsourcing_cost),
    total_std_cost: money(snap?.total_std_cost),
    total_act_cost: money(snap?.total_act_cost),
    variance_cost: 0,
    snapshot_count: Number(snap?.snapshot_count) || 0
  }

  // 스냅샷 없으면 실적 기준 온더플라이
  if (summary.snapshot_count === 0) {
    const records = await DB.prepare(`
      SELECT r.good_qty, r.scrap_qty, wo.product_id, wo.bom_id
      FROM mes_production_records r
      JOIN mes_work_orders wo ON r.work_order_id = wo.id
      WHERE r.tenant_id = ?
        AND DATE(r.recorded_at) BETWEEN DATE(?) AND DATE(?)
    `).bind(tenantId, from, to).all<any>()

    let goodQty = 0
    let scrapQty = 0
    let materialStd = 0
    let scrapCost = 0
    let totalStd = 0

    for (const r of records.results || []) {
      const g = Number(r.good_qty) || 0
      const s = Number(r.scrap_qty) || 0
      goodQty += g
      scrapQty += s
      const std = await getStandardUnitCost(DB, tenantId, r.product_id, r.bom_id)
      materialStd += g * std.materialUnitCost
      scrapCost += s * std.standardUnitCost
      totalStd += g * std.standardUnitCost + s * std.standardUnitCost
    }

    summary = {
      from,
      to,
      source: 'computed',
      good_qty: goodQty,
      scrap_qty: scrapQty,
      material_std_cost: money(materialStd),
      material_act_cost: money(materialStd),
      scrap_cost: money(scrapCost),
      outsourcing_cost: 0,
      total_std_cost: money(totalStd),
      total_act_cost: money(materialStd + scrapCost),
      variance_cost: 0,
      snapshot_count: 0
    }
  }

  summary.variance_cost = money(summary.total_act_cost - summary.total_std_cost)

  // NCR 폐기 수량 (참고)
  let ncrScrapQty = 0
  try {
    const ncr = await DB.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as scrap_ncr_qty
      FROM mes_ncrs
      WHERE tenant_id = ?
        AND disposition = 'scrap'
        AND DATE(created_at) BETWEEN DATE(?) AND DATE(?)
    `).bind(tenantId, from, to).first<{ scrap_ncr_qty: number }>()
    ncrScrapQty = Number(ncr?.scrap_ncr_qty) || 0
  } catch (_) {
    ncrScrapQty = 0
  }

  return c.json({
    success: true,
    data: {
      ...summary,
      ncr_scrap_qty: ncrScrapQty
    }
  })
})

// 제품별 원가
app.get('/by-product', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const { from, to } = parseRange(c)

  const { results: snaps } = await DB.prepare(`
    SELECT cs.product_id, p.name as product_name, p.sku as product_sku,
      SUM(cs.good_qty) as good_qty,
      SUM(cs.scrap_qty) as scrap_qty,
      AVG(cs.standard_unit_cost) as avg_unit_cost,
      SUM(cs.material_std_cost) as material_std_cost,
      SUM(cs.material_act_cost) as material_act_cost,
      SUM(cs.scrap_cost) as scrap_cost,
      SUM(cs.outsourcing_cost) as outsourcing_cost,
      SUM(cs.total_std_cost) as total_std_cost,
      SUM(cs.total_act_cost) as total_act_cost
    FROM mes_cost_snapshots cs
    JOIN products p ON cs.product_id = p.id
    WHERE cs.tenant_id = ?
      AND DATE(cs.snapshot_at) BETWEEN DATE(?) AND DATE(?)
    GROUP BY cs.product_id, p.name, p.sku
    ORDER BY total_act_cost DESC
  `).bind(tenantId, from, to).all<any>()

  if (snaps && snaps.length) {
    return c.json({
      success: true,
      data: {
        from,
        to,
        source: 'snapshot',
        items: snaps.map((r) => ({
          ...r,
          material_std_cost: money(r.material_std_cost),
          material_act_cost: money(r.material_act_cost),
          scrap_cost: money(r.scrap_cost),
          outsourcing_cost: money(r.outsourcing_cost),
          total_std_cost: money(r.total_std_cost),
          total_act_cost: money(r.total_act_cost),
          variance_cost: money(Number(r.total_act_cost) - Number(r.total_std_cost)),
          avg_unit_cost: money(r.avg_unit_cost)
        }))
      }
    })
  }

  // fallback: 실적 기준
  const { results: recs } = await DB.prepare(`
    SELECT wo.product_id, p.name as product_name, p.sku as product_sku, wo.bom_id,
      SUM(r.good_qty) as good_qty, SUM(r.scrap_qty) as scrap_qty
    FROM mes_production_records r
    JOIN mes_work_orders wo ON r.work_order_id = wo.id
    JOIN products p ON wo.product_id = p.id
    WHERE r.tenant_id = ?
      AND DATE(r.recorded_at) BETWEEN DATE(?) AND DATE(?)
    GROUP BY wo.product_id, p.name, p.sku, wo.bom_id
  `).bind(tenantId, from, to).all<any>()

  const items = []
  for (const r of recs || []) {
    const std = await getStandardUnitCost(DB, tenantId, r.product_id, r.bom_id)
    const g = Number(r.good_qty) || 0
    const s = Number(r.scrap_qty) || 0
    const materialStd = money(g * std.materialUnitCost)
    const scrapCost = money(s * std.standardUnitCost)
    const totalStd = money(g * std.standardUnitCost + scrapCost)
    items.push({
      product_id: r.product_id,
      product_name: r.product_name,
      product_sku: r.product_sku,
      good_qty: g,
      scrap_qty: s,
      avg_unit_cost: std.standardUnitCost,
      material_std_cost: materialStd,
      material_act_cost: materialStd,
      scrap_cost: scrapCost,
      outsourcing_cost: 0,
      total_std_cost: totalStd,
      total_act_cost: money(materialStd + scrapCost),
      variance_cost: 0
    })
  }

  items.sort((a, b) => b.total_act_cost - a.total_act_cost)

  return c.json({
    success: true,
    data: { from, to, source: 'computed', items }
  })
})

// 월간 성과
app.get('/monthly', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const ym = c.req.query('year_month') || new Date().toISOString().slice(0, 7)
  const from = `${ym}-01`
  // 다음 달 1일 - 1일
  const [y, m] = ym.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const to = `${ym}-${String(lastDay).padStart(2, '0')}`

  const costRes = await (async () => {
    // reuse summary logic via internal query
    const snap = await DB.prepare(`
      SELECT
        COALESCE(SUM(good_qty), 0) as good_qty,
        COALESCE(SUM(scrap_qty), 0) as scrap_qty,
        COALESCE(SUM(material_std_cost), 0) as material_std_cost,
        COALESCE(SUM(material_act_cost), 0) as material_act_cost,
        COALESCE(SUM(scrap_cost), 0) as scrap_cost,
        COALESCE(SUM(outsourcing_cost), 0) as outsourcing_cost,
        COALESCE(SUM(total_std_cost), 0) as total_std_cost,
        COALESCE(SUM(total_act_cost), 0) as total_act_cost,
        COUNT(*) as snapshot_count
      FROM mes_cost_snapshots
      WHERE tenant_id = ?
        AND DATE(snapshot_at) BETWEEN DATE(?) AND DATE(?)
    `).bind(tenantId, from, to).first<any>()
    return snap
  })()

  const wo = await DB.prepare(`
    SELECT
      COUNT(*) as total_wo,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_wo,
      COALESCE(SUM(planned_qty), 0) as planned_qty,
      COALESCE(SUM(completed_qty), 0) as completed_qty,
      COALESCE(SUM(scrap_qty), 0) as scrap_qty
    FROM mes_work_orders
    WHERE tenant_id = ?
      AND DATE(created_at) BETWEEN DATE(?) AND DATE(?)
  `).bind(tenantId, from, to).first<any>()

  const planned = Number(wo?.planned_qty) || 0
  const completed = Number(wo?.completed_qty) || 0
  const scrap = Number(wo?.scrap_qty) || 0
  const produced = completed + scrap

  const totalStd = money(costRes?.total_std_cost)
  const totalAct = money(costRes?.total_act_cost)
  const scrapCost = money(costRes?.scrap_cost)

  return c.json({
    success: true,
    data: {
      year_month: ym,
      from,
      to,
      production: {
        total_wo: Number(wo?.total_wo) || 0,
        completed_wo: Number(wo?.completed_wo) || 0,
        planned_qty: planned,
        completed_qty: completed,
        scrap_qty: scrap,
        plan_achievement_rate: planned ? Math.round((completed / planned) * 1000) / 10 : 0,
        yield_rate: produced ? Math.round((completed / produced) * 1000) / 10 : 0
      },
      cost: {
        good_qty: Number(costRes?.good_qty) || 0,
        scrap_qty: Number(costRes?.scrap_qty) || 0,
        material_std_cost: money(costRes?.material_std_cost),
        material_act_cost: money(costRes?.material_act_cost),
        scrap_cost: scrapCost,
        outsourcing_cost: money(costRes?.outsourcing_cost),
        total_std_cost: totalStd,
        total_act_cost: totalAct,
        variance_cost: money(totalAct - totalStd),
        snapshot_count: Number(costRes?.snapshot_count) || 0
      }
    }
  })
})

// 원가 리포트 (인쇄/엑셀용)
app.get('/report', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const { from, to } = parseRange(c)

  const snap = await DB.prepare(`
    SELECT
      COALESCE(SUM(good_qty), 0) as good_qty,
      COALESCE(SUM(scrap_qty), 0) as scrap_qty,
      COALESCE(SUM(material_std_cost), 0) as material_std_cost,
      COALESCE(SUM(material_act_cost), 0) as material_act_cost,
      COALESCE(SUM(scrap_cost), 0) as scrap_cost,
      COALESCE(SUM(outsourcing_cost), 0) as outsourcing_cost,
      COALESCE(SUM(total_std_cost), 0) as total_std_cost,
      COALESCE(SUM(total_act_cost), 0) as total_act_cost
    FROM mes_cost_snapshots
    WHERE tenant_id = ?
      AND DATE(snapshot_at) BETWEEN DATE(?) AND DATE(?)
  `).bind(tenantId, from, to).first<any>()

  const { results: byProduct } = await DB.prepare(`
    SELECT cs.product_id, p.name as product_name, p.sku as product_sku,
      SUM(cs.good_qty) as good_qty,
      SUM(cs.scrap_qty) as scrap_qty,
      SUM(cs.material_std_cost) as material_std_cost,
      SUM(cs.material_act_cost) as material_act_cost,
      SUM(cs.scrap_cost) as scrap_cost,
      SUM(cs.total_std_cost) as total_std_cost,
      SUM(cs.total_act_cost) as total_act_cost
    FROM mes_cost_snapshots cs
    JOIN products p ON cs.product_id = p.id
    WHERE cs.tenant_id = ?
      AND DATE(cs.snapshot_at) BETWEEN DATE(?) AND DATE(?)
    GROUP BY cs.product_id, p.name, p.sku
    ORDER BY total_act_cost DESC
  `).bind(tenantId, from, to).all<any>()

  const { results: recent } = await DB.prepare(`
    SELECT cs.*, p.name as product_name, wo.wo_number
    FROM mes_cost_snapshots cs
    JOIN products p ON cs.product_id = p.id
    LEFT JOIN mes_work_orders wo ON cs.work_order_id = wo.id
    WHERE cs.tenant_id = ?
      AND DATE(cs.snapshot_at) BETWEEN DATE(?) AND DATE(?)
    ORDER BY cs.snapshot_at DESC
    LIMIT 50
  `).bind(tenantId, from, to).all()

  const totalStd = money(snap?.total_std_cost)
  const totalAct = money(snap?.total_act_cost)

  return c.json({
    success: true,
    data: {
      from,
      to,
      generated_at: new Date().toISOString(),
      summary: {
        good_qty: Number(snap?.good_qty) || 0,
        scrap_qty: Number(snap?.scrap_qty) || 0,
        material_std_cost: money(snap?.material_std_cost),
        material_act_cost: money(snap?.material_act_cost),
        scrap_cost: money(snap?.scrap_cost),
        outsourcing_cost: money(snap?.outsourcing_cost),
        total_std_cost: totalStd,
        total_act_cost: totalAct,
        variance_cost: money(totalAct - totalStd)
      },
      by_product: (byProduct || []).map((r) => ({
        ...r,
        material_std_cost: money(r.material_std_cost),
        material_act_cost: money(r.material_act_cost),
        scrap_cost: money(r.scrap_cost),
        total_std_cost: money(r.total_std_cost),
        total_act_cost: money(r.total_act_cost)
      })),
      recent_snapshots: recent || []
    }
  })
})

export default app
