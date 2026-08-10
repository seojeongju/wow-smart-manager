import type { Bindings } from '../types'

type D1 = Bindings['DB']

/** 완제품 1개당 표준 자재원가 (BOM × 매입가) */
export async function computeBomMaterialUnitCost(
  DB: D1,
  tenantId: number,
  productId: number,
  bomId?: number | null
): Promise<{ unitCost: number; bomId: number | null; lines: Array<{ component_product_id: number; quantity: number; unit_price: number; line_cost: number }> }> {
  let resolvedBomId = bomId || null
  if (!resolvedBomId) {
    const bom = await DB.prepare(`
      SELECT id FROM mes_boms
      WHERE tenant_id = ? AND product_id = ? AND is_active = 1
      ORDER BY id DESC LIMIT 1
    `).bind(tenantId, productId).first<{ id: number }>()
    resolvedBomId = bom?.id ?? null
  }

  if (!resolvedBomId) {
    return { unitCost: 0, bomId: null, lines: [] }
  }

  const { results } = await DB.prepare(`
    SELECT bi.component_product_id, bi.quantity,
           COALESCE(p.purchase_price, 0) as unit_price
    FROM mes_bom_items bi
    JOIN products p ON bi.component_product_id = p.id
    WHERE bi.bom_id = ? AND bi.tenant_id = ?
  `).bind(resolvedBomId, tenantId).all<any>()

  const lines = (results || []).map((r) => {
    const qty = Number(r.quantity) || 0
    const price = Number(r.unit_price) || 0
    return {
      component_product_id: Number(r.component_product_id),
      quantity: qty,
      unit_price: price,
      line_cost: Math.round(qty * price * 100) / 100
    }
  })

  const unitCost = Math.round(lines.reduce((s, l) => s + l.line_cost, 0) * 100) / 100
  return { unitCost, bomId: resolvedBomId, lines }
}

/** 표준단가: products.standard_cost 우선, 없으면 BOM 자재원가 */
export async function getStandardUnitCost(
  DB: D1,
  tenantId: number,
  productId: number,
  bomId?: number | null
): Promise<{ standardUnitCost: number; materialUnitCost: number; source: 'override' | 'bom' | 'zero' }> {
  const product = await DB.prepare(`
    SELECT id, standard_cost, purchase_price FROM products
    WHERE id = ? AND tenant_id = ?
  `).bind(productId, tenantId).first<{ id: number; standard_cost: number | null; purchase_price: number }>()

  const bom = await computeBomMaterialUnitCost(DB, tenantId, productId, bomId)
  const materialUnitCost = bom.unitCost

  if (product?.standard_cost != null && Number(product.standard_cost) > 0) {
    return {
      standardUnitCost: Number(product.standard_cost),
      materialUnitCost,
      source: 'override'
    }
  }
  if (materialUnitCost > 0) {
    return { standardUnitCost: materialUnitCost, materialUnitCost, source: 'bom' }
  }
  // BOM 없으면 매입가를 최후 수단
  const fallback = Number(product?.purchase_price) || 0
  return {
    standardUnitCost: fallback,
    materialUnitCost: fallback,
    source: fallback > 0 ? 'bom' : 'zero'
  }
}

/** 실적 등록 시 원가 스냅샷 저장 */
export async function createCostSnapshot(
  DB: D1,
  tenantId: number,
  args: {
    work_order_id: number
    production_record_id: number
    product_id: number
    bom_id?: number | null
    good_qty: number
    scrap_qty: number
  }
) {
  const { standardUnitCost, materialUnitCost } = await getStandardUnitCost(
    DB, tenantId, args.product_id, args.bom_id
  )

  const good = Number(args.good_qty) || 0
  const scrap = Number(args.scrap_qty) || 0

  // 표준 자재비 = 양품 × BOM 단위자재원가
  const materialStdCost = Math.round(good * materialUnitCost * 100) / 100
  // 불량원가 = 불량 × 표준단가
  const scrapCost = Math.round(scrap * standardUnitCost * 100) / 100

  // 실투입 자재비 (해당 WO material_issue × 매입가)
  const act = await DB.prepare(`
    SELECT COALESCE(SUM(e.quantity * COALESCE(p.purchase_price, 0)), 0) as act_cost
    FROM mes_trace_events e
    LEFT JOIN products p ON e.product_id = p.id
    WHERE e.tenant_id = ?
      AND e.work_order_id = ?
      AND e.event_type = 'material_issue'
  `).bind(tenantId, args.work_order_id).first<{ act_cost: number }>()

  // 실투입이 없으면 이론(표준 자재비)로 대체
  const materialActCost = Number(act?.act_cost) > 0
    ? Math.round(Number(act?.act_cost) * 100) / 100
    : materialStdCost

  const os = await DB.prepare(`
    SELECT COALESCE(SUM(COALESCE(unit_cost, 0) * COALESCE(received_qty, quantity)), 0) as os_cost
    FROM mes_outsourcing_orders
    WHERE tenant_id = ? AND work_order_id = ?
  `).bind(tenantId, args.work_order_id).first<{ os_cost: number }>()
  const outsourcingCost = Math.round(Number(os?.os_cost || 0) * 100) / 100

  const totalStdCost = Math.round((good * standardUnitCost + scrapCost) * 100) / 100
  const totalActCost = Math.round((materialActCost + outsourcingCost + scrapCost) * 100) / 100

  await DB.prepare(`
    INSERT INTO mes_cost_snapshots (
      tenant_id, work_order_id, production_record_id, product_id,
      good_qty, scrap_qty, standard_unit_cost,
      material_std_cost, material_act_cost, scrap_cost, outsourcing_cost,
      total_std_cost, total_act_cost
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    tenantId,
    args.work_order_id,
    args.production_record_id,
    args.product_id,
    good,
    scrap,
    standardUnitCost,
    materialStdCost,
    materialActCost,
    scrapCost,
    outsourcingCost,
    totalStdCost,
    totalActCost
  ).run()
}
