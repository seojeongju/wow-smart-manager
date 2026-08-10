import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'
import { resolveLineUnitPrice } from '../utils/sale-price'
import { createOutboundFromSale } from '../utils/sale-outbound'
import {
  consumeReservationsForSource,
  nextDocNumber,
  releaseReservationsForSource,
  replaceReservations
} from '../utils/stock-reservation'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.get('/', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const status = c.req.query('status') || ''
  const limit = Math.min(parseInt(c.req.query('limit') || '100', 10) || 100, 200)

  let q = `
    SELECT q.*, c.name as customer_name, c.phone as customer_phone,
           u.name as created_by_name
    FROM quotations q
    LEFT JOIN customers c ON q.customer_id = c.id
    LEFT JOIN users u ON q.created_by = u.id
    WHERE q.tenant_id = ?
  `
  const params: any[] = [tenantId]
  if (status && status !== 'all') {
    q += ' AND q.status = ?'
    params.push(status)
  }
  q += ' ORDER BY q.id DESC LIMIT ?'
  params.push(limit)

  const { results } = await DB.prepare(q).bind(...params).all()
  return c.json({ success: true, data: results || [] })
})

app.get('/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const quote = await DB.prepare(`
    SELECT q.*, c.name as customer_name, c.phone as customer_phone
    FROM quotations q
    LEFT JOIN customers c ON q.customer_id = c.id
    WHERE q.id = ? AND q.tenant_id = ?
  `).bind(id, tenantId).first()

  if (!quote) return c.json({ success: false, error: '견적을 찾을 수 없습니다.' }, 404)

  const { results: items } = await DB.prepare(`
    SELECT qi.*, p.name as product_name, p.sku
    FROM quotation_items qi
    JOIN products p ON qi.product_id = p.id
    WHERE qi.quotation_id = ?
    ORDER BY qi.sort_order, qi.id
  `).bind(id).all()

  const { results: reservations } = await DB.prepare(`
    SELECT * FROM stock_reservations
    WHERE tenant_id = ? AND source_type = 'quotation' AND source_id = ?
  `).bind(tenantId, id).all()

  return c.json({ success: true, data: { ...quote, items: items || [], reservations: reservations || [] } })
})

app.post('/', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const body = await c.req.json<{
    customer_id?: number | null
    valid_until?: string | null
    discount_amount?: number
    notes?: string
    reserve_stock?: boolean
    items: Array<{ product_id: number; quantity: number; unit_price?: number }>
  }>()

  if (!body.items?.length) {
    return c.json({ success: false, error: '품목이 필요합니다.' }, 400)
  }

  const quoteNumber = await nextDocNumber(DB, tenantId, 'quotations', 'QT')
  const customerId = body.customer_id ? Number(body.customer_id) : null

  let subtotal = 0
  const lines: Array<{ product_id: number; quantity: number; unit_price: number; subtotal: number }> = []

  for (const item of body.items) {
    const product = await DB.prepare(
      'SELECT id, selling_price, name FROM products WHERE id = ? AND tenant_id = ? AND is_active = 1'
    ).bind(item.product_id, tenantId).first<{ id: number; selling_price: number; name: string }>()
    if (!product) {
      return c.json({ success: false, error: `상품 ${item.product_id}을(를) 찾을 수 없습니다.` }, 400)
    }
    const { unitPrice } = await resolveLineUnitPrice(
      DB, tenantId, product.id, product.selling_price, customerId, item.unit_price
    )
    const qty = Number(item.quantity) || 0
    if (qty <= 0) {
      return c.json({ success: false, error: `${product.name}: 수량이 올바르지 않습니다.` }, 400)
    }
    const lineSub = unitPrice * qty
    subtotal += lineSub
    lines.push({ product_id: product.id, quantity: qty, unit_price: unitPrice, subtotal: lineSub })
  }

  const discount = Number(body.discount_amount) || 0
  const total = Math.max(0, subtotal - discount)

  const result = await DB.prepare(`
    INSERT INTO quotations (
      tenant_id, quote_number, customer_id, status, valid_until,
      subtotal, discount_amount, total_amount, notes, reserve_stock, created_by
    ) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    tenantId,
    quoteNumber,
    customerId,
    body.valid_until || null,
    subtotal,
    discount,
    total,
    body.notes || null,
    body.reserve_stock ? 1 : 0,
    userId
  ).run()

  const quoteId = Number(result.meta.last_row_id)

  let sort = 0
  for (const line of lines) {
    await DB.prepare(`
      INSERT INTO quotation_items (
        tenant_id, quotation_id, product_id, quantity, unit_price, subtotal, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(tenantId, quoteId, line.product_id, line.quantity, line.unit_price, line.subtotal, sort++).run()
  }

  if (body.reserve_stock) {
    const reserved = await replaceReservations(DB, {
      tenantId,
      userId,
      sourceType: 'quotation',
      sourceId: quoteId,
      items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
      expiresAt: body.valid_until || null,
      notes: `견적 ${quoteNumber}`
    })
    if (!reserved.ok) {
      await DB.prepare('DELETE FROM quotations WHERE id = ? AND tenant_id = ?').bind(quoteId, tenantId).run()
      return c.json({ success: false, error: reserved.error }, 400)
    }
  }

  return c.json({
    success: true,
    data: { id: quoteId, quote_number: quoteNumber },
    message: '견적이 등록되었습니다.'
  })
})

app.put('/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const id = Number(c.req.param('id'))
  const body = await c.req.json<any>()

  const quote = await DB.prepare(
    'SELECT * FROM quotations WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()
  if (!quote) return c.json({ success: false, error: '견적을 찾을 수 없습니다.' }, 404)
  if (['converted', 'cancelled'].includes(quote.status)) {
    return c.json({ success: false, error: '변환/취소된 견적은 수정할 수 없습니다.' }, 400)
  }

  if (body.status && ['draft', 'sent', 'accepted', 'cancelled', 'expired'].includes(body.status)) {
    await DB.prepare(
      `UPDATE quotations SET status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(body.status, id).run()
    if (body.status === 'cancelled') {
      await releaseReservationsForSource(DB, tenantId, 'quotation', id)
    }
  }

  if (body.items?.length) {
    const customerId = body.customer_id != null ? Number(body.customer_id) : quote.customer_id
    let subtotal = 0
    const lines: Array<{ product_id: number; quantity: number; unit_price: number; subtotal: number }> = []
    for (const item of body.items) {
      const product = await DB.prepare(
        'SELECT id, selling_price FROM products WHERE id = ? AND tenant_id = ?'
      ).bind(item.product_id, tenantId).first<{ id: number; selling_price: number }>()
      if (!product) continue
      const { unitPrice } = await resolveLineUnitPrice(
        DB, tenantId, product.id, product.selling_price, customerId, item.unit_price
      )
      const qty = Number(item.quantity) || 0
      const lineSub = unitPrice * qty
      subtotal += lineSub
      lines.push({ product_id: product.id, quantity: qty, unit_price: unitPrice, subtotal: lineSub })
    }
    const discount = body.discount_amount != null ? Number(body.discount_amount) : Number(quote.discount_amount)
    const total = Math.max(0, subtotal - discount)

    await DB.prepare('DELETE FROM quotation_items WHERE quotation_id = ?').bind(id).run()
    let sort = 0
    for (const line of lines) {
      await DB.prepare(`
        INSERT INTO quotation_items (
          tenant_id, quotation_id, product_id, quantity, unit_price, subtotal, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(tenantId, id, line.product_id, line.quantity, line.unit_price, line.subtotal, sort++).run()
    }

    await DB.prepare(`
      UPDATE quotations SET
        customer_id = ?, valid_until = COALESCE(?, valid_until),
        discount_amount = ?, subtotal = ?, total_amount = ?,
        notes = COALESCE(?, notes),
        reserve_stock = COALESCE(?, reserve_stock),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      customerId,
      body.valid_until ?? null,
      discount,
      subtotal,
      total,
      body.notes ?? null,
      body.reserve_stock != null ? (body.reserve_stock ? 1 : 0) : null,
      id
    ).run()

    const shouldReserve = body.reserve_stock != null ? !!body.reserve_stock : !!quote.reserve_stock
    if (shouldReserve) {
      const reserved = await replaceReservations(DB, {
        tenantId,
        userId,
        sourceType: 'quotation',
        sourceId: id,
        items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
        expiresAt: body.valid_until || quote.valid_until || null,
        notes: `견적 ${quote.quote_number}`
      })
      if (!reserved.ok) return c.json({ success: false, error: reserved.error }, 400)
    } else {
      await releaseReservationsForSource(DB, tenantId, 'quotation', id)
    }
  }

  return c.json({ success: true, message: '견적이 수정되었습니다.' })
})

/** 견적 → 수주(판매 shipment) 변환 */
app.post('/:id/convert', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => ({} as any))

  const quote = await DB.prepare(
    'SELECT * FROM quotations WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<any>()
  if (!quote) return c.json({ success: false, error: '견적을 찾을 수 없습니다.' }, 404)
  if (quote.status === 'converted') {
    return c.json({ success: false, error: '이미 수주로 변환된 견적입니다.', data: { sale_id: quote.converted_sale_id } }, 400)
  }
  if (quote.status === 'cancelled') {
    return c.json({ success: false, error: '취소된 견적입니다.' }, 400)
  }

  const { results: items } = await DB.prepare(
    'SELECT * FROM quotation_items WHERE quotation_id = ?'
  ).bind(id).all<any>()
  if (!items?.length) return c.json({ success: false, error: '견적 품목이 없습니다.' }, 400)

  const paymentStatus = body.payment_status === 'paid' ? 'paid' : (body.payment_status || 'unpaid')
  const paymentMethod = body.payment_method || 'credit'
  const paidAmount = paymentStatus === 'paid' ? Number(quote.total_amount) : 0

  const saleResult = await DB.prepare(`
    INSERT INTO sales (
      tenant_id, customer_id, total_amount, discount_amount, final_amount,
      payment_method, notes, created_by, status,
      payment_status, paid_amount, fulfillment
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_shipment', ?, ?, 'shipment')
  `).bind(
    tenantId,
    quote.customer_id || null,
    quote.subtotal,
    quote.discount_amount,
    quote.total_amount,
    paymentMethod,
    `견적 ${quote.quote_number} 수주 변환`,
    userId,
    paymentStatus,
    paidAmount
  ).run()

  const saleId = Number(saleResult.meta.last_row_id)

  for (const item of items) {
    await DB.prepare(`
      INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
      VALUES (?, ?, ?, ?, ?)
    `).bind(saleId, item.product_id, item.quantity, item.unit_price, item.subtotal).run()
  }

  // 견적 예약 → 소비, 판매 예약으로 이전
  await consumeReservationsForSource(DB, tenantId, 'quotation', id)
  const reserved = await replaceReservations(DB, {
    tenantId,
    userId,
    sourceType: 'sale',
    sourceId: saleId,
    items: items.map((i: any) => ({ product_id: i.product_id, quantity: i.quantity })),
    notes: `수주 판매 #${saleId}`
  })
  if (!reserved.ok) {
    // 판매는 유지하되 예약 실패 메시지만
    console.warn('sale reserve after convert failed:', reserved.error)
  }

  let outbound = null
  try {
    outbound = await createOutboundFromSale(DB, {
      tenantId,
      userId,
      saleId,
      stockMode: 'deduct_on_ship'
    })
  } catch (e: any) {
    console.error('convert outbound failed', e)
  }

  await DB.prepare(`
    UPDATE quotations
    SET status = 'converted', converted_sale_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(saleId, id).run()

  if (quote.customer_id) {
    await DB.prepare(`
      UPDATE customers
      SET total_purchase_amount = total_purchase_amount + ?,
          purchase_count = purchase_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `).bind(quote.total_amount, quote.customer_id, tenantId).run()
  }

  return c.json({
    success: true,
    message: '견적이 수주(판매·출고지시)로 변환되었습니다.',
    data: { sale_id: saleId, outbound }
  })
})

app.delete('/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = Number(c.req.param('id'))

  const quote = await DB.prepare(
    'SELECT status FROM quotations WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<{ status: string }>()
  if (!quote) return c.json({ success: false, error: '견적을 찾을 수 없습니다.' }, 404)
  if (quote.status === 'converted') {
    return c.json({ success: false, error: '변환된 견적은 삭제할 수 없습니다. 취소만 가능합니다.' }, 400)
  }

  await releaseReservationsForSource(DB, tenantId, 'quotation', id)
  await DB.prepare('DELETE FROM quotations WHERE id = ? AND tenant_id = ?').bind(id, tenantId).run()
  return c.json({ success: true, message: '견적이 삭제되었습니다.' })
})

export default app
