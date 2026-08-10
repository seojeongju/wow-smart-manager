import type { Bindings } from '../types'

export type TraceUnit = {
  product_id: number
  lot_number: string | null
  mes_lot_id: number | null
  qr_code_id: number | null
  qr_code: string | null
  work_order_id: number | null
}

async function resolveQr(DB: Bindings['DB'], tenantId: number, code: string) {
  return DB.prepare(`
    SELECT qc.*, p.name as product_name, p.sku as product_sku, p.tenant_id as product_tenant_id
    FROM qr_codes qc
    LEFT JOIN products p ON qc.product_id = p.id
    WHERE qc.code = ?
      AND (qc.tenant_id = ? OR p.tenant_id = ?)
  `).bind(code, tenantId, tenantId).first<any>()
}

/** QR 코드 또는 (상품+Lot)으로 추적 단위 해석 */
export async function resolveTraceUnit(
  DB: Bindings['DB'],
  tenantId: number,
  opts: { qr_code?: string | null; lot_number?: string | null; product_id?: number | null }
): Promise<TraceUnit> {
  const qrCode = opts.qr_code?.trim()
  if (qrCode) {
    const qr = await resolveQr(DB, tenantId, qrCode)
    if (!qr) throw new Error(`QR 코드를 찾을 수 없습니다: ${qrCode}`)
    if (opts.product_id && Number(qr.product_id) !== Number(opts.product_id)) {
      throw new Error('QR 상품과 출고/판매 상품이 일치하지 않습니다.')
    }
    let mesLotId: number | null = null
    if (qr.lot_number && qr.product_id) {
      const lot = await DB.prepare(`
        SELECT id FROM mes_lots
        WHERE tenant_id = ? AND product_id = ? AND lot_number = ?
      `).bind(tenantId, qr.product_id, qr.lot_number).first<{ id: number }>()
      mesLotId = lot?.id ?? null
    }
    return {
      product_id: Number(qr.product_id),
      lot_number: qr.lot_number || null,
      mes_lot_id: mesLotId,
      qr_code_id: Number(qr.id),
      qr_code: qr.code,
      work_order_id: qr.work_order_id ? Number(qr.work_order_id) : null
    }
  }

  const lotNumber = opts.lot_number?.trim()
  const productId = opts.product_id ? Number(opts.product_id) : null
  if (lotNumber && productId) {
    const lot = await DB.prepare(`
      SELECT * FROM mes_lots
      WHERE tenant_id = ? AND product_id = ? AND lot_number = ?
    `).bind(tenantId, productId, lotNumber).first<any>()
    if (!lot) throw new Error(`Lot을 찾을 수 없습니다: ${lotNumber}`)
    return {
      product_id: productId,
      lot_number: lot.lot_number,
      mes_lot_id: Number(lot.id),
      qr_code_id: null,
      qr_code: null,
      work_order_id: lot.work_order_id ? Number(lot.work_order_id) : null
    }
  }

  throw new Error('QR 코드 또는 Lot 번호가 필요합니다.')
}

export async function insertDistributionEvent(
  DB: Bindings['DB'],
  tenantId: number,
  userId: number,
  data: {
    event_type: string
    product_id?: number | null
    lot_number?: string | null
    quantity?: number
    qr_code_id?: number | null
    qr_code?: string | null
    work_order_id?: number | null
    warehouse_id?: number | null
    reference_type?: string | null
    reference_id?: number | null
    notes?: string | null
  }
) {
  await DB.prepare(`
    INSERT INTO mes_trace_events (
      tenant_id, event_type, work_order_id, qr_code_id, qr_code, product_id,
      lot_number, quantity, warehouse_id, notes, created_by,
      reference_type, reference_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    tenantId,
    data.event_type,
    data.work_order_id || null,
    data.qr_code_id || null,
    data.qr_code || null,
    data.product_id || null,
    data.lot_number || null,
    data.quantity ?? 1,
    data.warehouse_id || null,
    data.notes || null,
    userId,
    data.reference_type || null,
    data.reference_id || null
  ).run()
}

/** Lot 잔량 차감 (있을 때만) */
export async function consumeMesLot(
  DB: Bindings['DB'],
  tenantId: number,
  mesLotId: number | null,
  quantity: number
) {
  if (!mesLotId || !(quantity > 0)) return
  const lot = await DB.prepare(
    'SELECT remaining_quantity FROM mes_lots WHERE id = ? AND tenant_id = ?'
  ).bind(mesLotId, tenantId).first<{ remaining_quantity: number }>()
  if (!lot) return
  if (Number(lot.remaining_quantity) < quantity) {
    throw new Error(`Lot 잔량이 부족합니다. (잔량: ${lot.remaining_quantity}, 요청: ${quantity})`)
  }
  await DB.prepare(`
    UPDATE mes_lots
    SET remaining_quantity = remaining_quantity - ?,
        status = CASE WHEN remaining_quantity - ? <= 0 THEN 'consumed' ELSE status END
    WHERE id = ? AND tenant_id = ?
  `).bind(quantity, quantity, mesLotId, tenantId).run()
}

/** Lot 잔량 복원 (클레임 반품 등) */
export async function restoreMesLot(
  DB: Bindings['DB'],
  tenantId: number,
  mesLotId: number | null,
  quantity: number
) {
  if (!mesLotId || !(quantity > 0)) return
  await DB.prepare(`
    UPDATE mes_lots
    SET remaining_quantity = remaining_quantity + ?,
        status = 'active'
    WHERE id = ? AND tenant_id = ?
  `).bind(quantity, mesLotId, tenantId).run()
}

export async function linkOutboundItemLot(
  DB: Bindings['DB'],
  tenantId: number,
  userId: number,
  args: {
    outbound_item_id: number
    outbound_order_id: number
    product_id: number
    quantity: number
    warehouse_id?: number | null
    qr_code?: string | null
    lot_number?: string | null
  }
) {
  if (!args.qr_code && !args.lot_number) return null

  const unit = await resolveTraceUnit(DB, tenantId, {
    qr_code: args.qr_code,
    lot_number: args.lot_number,
    product_id: args.product_id
  })

  await consumeMesLot(DB, tenantId, unit.mes_lot_id, args.quantity)

  const result = await DB.prepare(`
    INSERT INTO outbound_item_lots (
      tenant_id, outbound_item_id, outbound_order_id, product_id,
      mes_lot_id, qr_code_id, lot_number, quantity, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    tenantId,
    args.outbound_item_id,
    args.outbound_order_id,
    args.product_id,
    unit.mes_lot_id,
    unit.qr_code_id,
    unit.lot_number,
    args.quantity,
    userId
  ).run()

  await insertDistributionEvent(DB, tenantId, userId, {
    event_type: 'outbound_ship',
    product_id: args.product_id,
    lot_number: unit.lot_number,
    quantity: args.quantity,
    qr_code_id: unit.qr_code_id,
    qr_code: unit.qr_code,
    work_order_id: unit.work_order_id,
    warehouse_id: args.warehouse_id,
    reference_type: 'outbound',
    reference_id: args.outbound_order_id,
    notes: '출고 Lot/QR 연결'
  })

  return { id: result.meta.last_row_id, ...unit }
}

export async function linkSaleItemLot(
  DB: Bindings['DB'],
  tenantId: number,
  userId: number,
  args: {
    sale_item_id: number
    sale_id: number
    product_id: number
    quantity: number
    warehouse_id?: number | null
    qr_code?: string | null
    lot_number?: string | null
  }
) {
  if (!args.qr_code && !args.lot_number) return null

  const unit = await resolveTraceUnit(DB, tenantId, {
    qr_code: args.qr_code,
    lot_number: args.lot_number,
    product_id: args.product_id
  })

  // 출고에서 이미 Lot 차감했을 수 있으므로, 판매만 단독일 때 차감
  // skip_lot_consume 옵션으로 제어 가능 — 기본은 차감
  await consumeMesLot(DB, tenantId, unit.mes_lot_id, args.quantity)

  const result = await DB.prepare(`
    INSERT INTO sale_item_lots (
      tenant_id, sale_item_id, sale_id, product_id,
      mes_lot_id, qr_code_id, lot_number, quantity, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    tenantId,
    args.sale_item_id,
    args.sale_id,
    args.product_id,
    unit.mes_lot_id,
    unit.qr_code_id,
    unit.lot_number,
    args.quantity,
    userId
  ).run()

  await insertDistributionEvent(DB, tenantId, userId, {
    event_type: 'sale',
    product_id: args.product_id,
    lot_number: unit.lot_number,
    quantity: args.quantity,
    qr_code_id: unit.qr_code_id,
    qr_code: unit.qr_code,
    work_order_id: unit.work_order_id,
    warehouse_id: args.warehouse_id,
    reference_type: 'sale',
    reference_id: args.sale_id,
    notes: '판매 Lot/QR 연결'
  })

  return { id: result.meta.last_row_id, ...unit }
}

export async function linkClaimItemLot(
  DB: Bindings['DB'],
  tenantId: number,
  userId: number,
  args: {
    claim_id: number
    product_id: number
    quantity: number
    qr_code?: string | null
    lot_number?: string | null
  }
): Promise<TraceUnit | null> {
  if (!args.qr_code && !args.lot_number) return null

  const unit = await resolveTraceUnit(DB, tenantId, {
    qr_code: args.qr_code,
    lot_number: args.lot_number,
    product_id: args.product_id
  })

  await insertDistributionEvent(DB, tenantId, userId, {
    event_type: 'claim',
    product_id: args.product_id,
    lot_number: unit.lot_number,
    quantity: args.quantity,
    qr_code_id: unit.qr_code_id,
    qr_code: unit.qr_code,
    work_order_id: unit.work_order_id,
    reference_type: 'claim',
    reference_id: args.claim_id,
    notes: '클레임 Lot/QR 연결'
  })

  return unit
}

export async function fetchDistributionJourney(
  DB: Bindings['DB'],
  tenantId: number,
  opts: { qr_code_id?: number | null; lot_number?: string | null; product_id?: number | null }
) {
  const outbounds: any[] = []
  const sales: any[] = []
  const claims: any[] = []

  if (opts.qr_code_id || opts.lot_number) {
    let obQuery = `
      SELECT oil.*, oo.order_number, oo.status as order_status, oo.destination_name,
             oo.created_at as order_date, p.name as product_name, p.sku as product_sku,
             qc.code as qr_code
      FROM outbound_item_lots oil
      JOIN outbound_orders oo ON oil.outbound_order_id = oo.id
      JOIN products p ON oil.product_id = p.id
      LEFT JOIN qr_codes qc ON oil.qr_code_id = qc.id
      WHERE oil.tenant_id = ?
    `
    const obParams: any[] = [tenantId]
    if (opts.qr_code_id) {
      obQuery += ' AND oil.qr_code_id = ?'
      obParams.push(opts.qr_code_id)
    } else if (opts.lot_number) {
      obQuery += ' AND oil.lot_number = ?'
      obParams.push(opts.lot_number)
      if (opts.product_id) {
        obQuery += ' AND oil.product_id = ?'
        obParams.push(opts.product_id)
      }
    }
    obQuery += ' ORDER BY oil.created_at DESC'
    const { results: ob } = await DB.prepare(obQuery).bind(...obParams).all()
    outbounds.push(...(ob || []))

    let saleQuery = `
      SELECT sil.*, s.final_amount, s.payment_method, s.status as sale_status,
             s.created_at as sale_date, p.name as product_name, p.sku as product_sku,
             qc.code as qr_code, cust.name as customer_name
      FROM sale_item_lots sil
      JOIN sales s ON sil.sale_id = s.id
      JOIN products p ON sil.product_id = p.id
      LEFT JOIN qr_codes qc ON sil.qr_code_id = qc.id
      LEFT JOIN customers cust ON s.customer_id = cust.id
      WHERE sil.tenant_id = ?
    `
    const saleParams: any[] = [tenantId]
    if (opts.qr_code_id) {
      saleQuery += ' AND sil.qr_code_id = ?'
      saleParams.push(opts.qr_code_id)
    } else if (opts.lot_number) {
      saleQuery += ' AND sil.lot_number = ?'
      saleParams.push(opts.lot_number)
      if (opts.product_id) {
        saleQuery += ' AND sil.product_id = ?'
        saleParams.push(opts.product_id)
      }
    }
    saleQuery += ' ORDER BY sil.created_at DESC'
    const { results: sa } = await DB.prepare(saleQuery).bind(...saleParams).all()
    sales.push(...(sa || []))

    let claimQuery = `
      SELECT ci.*, c.id as claim_id, c.type as claim_type, c.status as claim_status,
             c.reason, c.created_at as claim_date, c.sale_id,
             p.name as product_name, p.sku as product_sku, qc.code as qr_code
      FROM claim_items ci
      JOIN claims c ON ci.claim_id = c.id
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN qr_codes qc ON ci.qr_code_id = qc.id
      WHERE 1=1
    `
    const claimParams: any[] = []
    if (opts.qr_code_id) {
      claimQuery += ' AND ci.qr_code_id = ?'
      claimParams.push(opts.qr_code_id)
    } else if (opts.lot_number) {
      claimQuery += ' AND ci.lot_number = ?'
      claimParams.push(opts.lot_number)
      if (opts.product_id) {
        claimQuery += ' AND ci.product_id = ?'
        claimParams.push(opts.product_id)
      }
    } else {
      return { outbounds, sales, claims }
    }
    // tenant filter via sale
    claimQuery += ` AND EXISTS (
      SELECT 1 FROM sales s WHERE s.id = c.sale_id AND s.tenant_id = ?
    ) ORDER BY c.created_at DESC`
    claimParams.push(tenantId)
    const { results: cl } = await DB.prepare(claimQuery).bind(...claimParams).all()
    claims.push(...(cl || []))
  }

  return { outbounds, sales, claims }
}
