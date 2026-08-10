type D1 = D1Database

/** 창고 합산 재고 */
export async function getWarehouseStockSum(
  DB: D1,
  tenantId: number,
  productId: number
): Promise<number> {
  const row = await DB.prepare(`
    SELECT COALESCE(SUM(quantity), 0) as t
    FROM product_warehouse_stocks
    WHERE tenant_id = ? AND product_id = ?
  `).bind(tenantId, productId).first<{ t: number }>()
  return Number(row?.t) || 0
}

/** 활성 예약 수량 합 */
export async function getActiveReservedQty(
  DB: D1,
  tenantId: number,
  productId: number,
  exclude?: { source_type: string; source_id: number }
): Promise<number> {
  let q = `
    SELECT COALESCE(SUM(quantity), 0) as t
    FROM stock_reservations
    WHERE tenant_id = ? AND product_id = ? AND status = 'active'
      AND (expires_at IS NULL OR expires_at >= datetime('now'))
  `
  const params: any[] = [tenantId, productId]
  if (exclude) {
    q += ' AND NOT (source_type = ? AND source_id = ?)'
    params.push(exclude.source_type, exclude.source_id)
  }
  const row = await DB.prepare(q).bind(...params).first<{ t: number }>()
  return Number(row?.t) || 0
}

/** 가용 재고 = 창고합 - 활성예약 */
export async function getAvailableQty(
  DB: D1,
  tenantId: number,
  productId: number,
  exclude?: { source_type: string; source_id: number }
): Promise<{ physical: number; reserved: number; available: number }> {
  const physical = await getWarehouseStockSum(DB, tenantId, productId)
  const reserved = await getActiveReservedQty(DB, tenantId, productId, exclude)
  return {
    physical,
    reserved,
    available: Math.max(0, physical - reserved)
  }
}

export async function releaseReservationsForSource(
  DB: D1,
  tenantId: number,
  sourceType: string,
  sourceId: number
) {
  await DB.prepare(`
    UPDATE stock_reservations
    SET status = 'released', updated_at = datetime('now')
    WHERE tenant_id = ? AND source_type = ? AND source_id = ? AND status = 'active'
  `).bind(tenantId, sourceType, sourceId).run()
}

export async function consumeReservationsForSource(
  DB: D1,
  tenantId: number,
  sourceType: string,
  sourceId: number
) {
  await DB.prepare(`
    UPDATE stock_reservations
    SET status = 'consumed', updated_at = datetime('now')
    WHERE tenant_id = ? AND source_type = ? AND source_id = ? AND status = 'active'
  `).bind(tenantId, sourceType, sourceId).run()
}

/** 소스의 예약을 교체(기존 active 해제 후 신규 생성) */
export async function replaceReservations(
  DB: D1,
  args: {
    tenantId: number
    userId: number
    sourceType: 'quotation' | 'sale'
    sourceId: number
    items: Array<{ product_id: number; quantity: number; warehouse_id?: number | null }>
    expiresAt?: string | null
    notes?: string | null
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId, userId, sourceType, sourceId, items, expiresAt, notes } = args

  for (const item of items) {
    const qty = Number(item.quantity) || 0
    if (qty <= 0) continue
    const avail = await getAvailableQty(DB, tenantId, item.product_id, {
      source_type: sourceType,
      source_id: sourceId
    })
    if (avail.available < qty) {
      const p = await DB.prepare(
        'SELECT name FROM products WHERE id = ? AND tenant_id = ?'
      ).bind(item.product_id, tenantId).first<{ name: string }>()
      return {
        ok: false,
        error: `${p?.name || item.product_id}: 가용재고 부족 (가용 ${avail.available}, 요청 ${qty})`
      }
    }
  }

  await releaseReservationsForSource(DB, tenantId, sourceType, sourceId)

  for (const item of items) {
    const qty = Number(item.quantity) || 0
    if (qty <= 0) continue
    await DB.prepare(`
      INSERT INTO stock_reservations (
        tenant_id, source_type, source_id, product_id, warehouse_id,
        quantity, status, expires_at, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `).bind(
      tenantId,
      sourceType,
      sourceId,
      item.product_id,
      item.warehouse_id ?? null,
      qty,
      expiresAt || null,
      notes || null,
      userId
    ).run()
  }

  return { ok: true }
}

export async function nextDocNumber(
  DB: D1,
  tenantId: number,
  table: 'quotations' | 'transaction_statements',
  prefix: string
): Promise<string> {
  const col = table === 'quotations' ? 'quote_number' : 'doc_number'
  const day = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const like = `${prefix}-${day}-%`
  const row = await DB.prepare(`
    SELECT ${col} as n FROM ${table}
    WHERE tenant_id = ? AND ${col} LIKE ?
    ORDER BY id DESC LIMIT 1
  `).bind(tenantId, like).first<{ n: string }>()

  let seq = 1
  if (row?.n) {
    const part = row.n.split('-').pop()
    const n = parseInt(part || '0', 10)
    if (!Number.isNaN(n)) seq = n + 1
  }
  return `${prefix}-${day}-${String(seq).padStart(4, '0')}`
}
