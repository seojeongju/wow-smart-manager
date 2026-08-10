/** ERP 전표 — 경량 자동 기장 */

type D1 = D1Database

export type VoucherType = 'AR_INVOICE' | 'AR_RECEIPT' | 'AP_INVOICE' | 'AP_PAYMENT' | 'ADJUST'

export async function nextVoucherNo(DB: D1, tenantId: number): Promise<string> {
  const day = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const like = `VCH-${day}-%`
  const row = await DB.prepare(`
    SELECT voucher_no as n FROM vouchers
    WHERE tenant_id = ? AND voucher_no LIKE ?
    ORDER BY id DESC LIMIT 1
  `).bind(tenantId, like).first<{ n: string }>()

  let seq = 1
  if (row?.n) {
    const part = row.n.split('-').pop()
    const n = parseInt(part || '0', 10)
    if (!Number.isNaN(n)) seq = n + 1
  }
  return `VCH-${day}-${String(seq).padStart(4, '0')}`
}

export async function insertVoucher(
  DB: D1,
  opts: {
    tenantId: number
    voucherType: VoucherType
    sourceType?: string | null
    sourceId?: number | null
    partnerName?: string | null
    description?: string | null
    amount: number
    createdBy?: number | null
    voucherDate?: string | null
  }
): Promise<{ id: number; voucher_no: string } | null> {
  const amount = Number(opts.amount) || 0
  if (amount <= 0) return null

  try {
    const voucherNo = await nextVoucherNo(DB, opts.tenantId)
    const voucherDate = opts.voucherDate || new Date().toISOString().slice(0, 10)
    const result = await DB.prepare(`
      INSERT INTO vouchers (
        tenant_id, voucher_no, voucher_type, source_type, source_id,
        partner_name, description, amount, status, voucher_date, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'posted', ?, ?)
    `).bind(
      opts.tenantId,
      voucherNo,
      opts.voucherType,
      opts.sourceType || null,
      opts.sourceId ?? null,
      opts.partnerName || null,
      opts.description || null,
      amount,
      voucherDate,
      opts.createdBy ?? null
    ).run()

    return { id: Number(result.meta.last_row_id), voucher_no: voucherNo }
  } catch (e) {
    // 마이그레이션 미적용 시 업무 flow는 막지 않음
    console.warn('[voucher] insert skipped:', (e as Error)?.message)
    return null
  }
}
