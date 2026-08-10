import { Hono } from 'hono'
import type { Bindings, Variables, Claim, CreateClaimRequest, UpdateClaimStatusRequest } from '../types'
import { linkClaimItemLot, restoreMesLot, insertDistributionEvent } from '../utils/mes-distribution'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 클레임 목록 조회
app.get('/', async (c) => {
  const { DB } = c.env
  const type = c.req.query('type') || ''
  const status = c.req.query('status') || ''

  let query = `
    SELECT c.*, s.customer_id, cust.name as customer_name, cust.phone as customer_phone,
           p.name as product_name, ci.quantity, ci.condition, u.name as created_by_name
    FROM claims c
    JOIN sales s ON c.sale_id = s.id
    LEFT JOIN customers cust ON s.customer_id = cust.id
    JOIN claim_items ci ON c.id = ci.claim_id
    JOIN products p ON ci.product_id = p.id
    LEFT JOIN users u ON c.created_by = u.id
    WHERE 1=1
  `
  const params: any[] = []

  if (type) {
    query += ' AND c.type = ?'
    params.push(type)
  }

  if (status) {
    query += ' AND c.status = ?'
    params.push(status)
  }

  query += ' ORDER BY c.created_at DESC'

  const { results } = await DB.prepare(query).bind(...params).all()

  return c.json({ success: true, data: results })
})

// 클레임 생성 (반품/교환 요청)
app.post('/', async (c) => {
  const { DB } = c.env
  const body = await c.req.json<CreateClaimRequest>()

  // 판매 내역 확인
  const sale = await DB.prepare('SELECT * FROM sales WHERE id = ?').bind(body.sale_id).first()
  if (!sale) {
    return c.json({ success: false, error: '판매 내역을 찾을 수 없습니다.' }, 404)
  }

  // 클레임 생성
  const claimResult = await DB.prepare(`
    INSERT INTO claims (sale_id, type, reason, status, created_by)
    VALUES (?, ?, ?, 'requested', ?)
  `).bind(body.sale_id, body.type, body.reason || null, c.get('userId')).run()

  const claimId = claimResult.meta.last_row_id

  const tenantId = c.get('tenantId')
  const userId = c.get('userId')

  // 클레임 아이템 생성 (+ Lot/QR)
  for (const item of body.items) {
    let mesLotId: number | null = null
    let qrCodeId: number | null = null
    let lotNumber: string | null = null

    if (item.qr_code || item.lot_number) {
      try {
        const unit = await linkClaimItemLot(DB, tenantId, userId, {
          claim_id: Number(claimId),
          product_id: item.product_id,
          quantity: item.quantity,
          qr_code: item.qr_code,
          lot_number: item.lot_number
        })
        if (unit) {
          mesLotId = unit.mes_lot_id
          qrCodeId = unit.qr_code_id
          lotNumber = unit.lot_number
        }
      } catch (e: any) {
        return c.json({ success: false, error: e.message || 'Lot/QR 연결 실패' }, 400)
      }
    }

    await DB.prepare(`
      INSERT INTO claim_items (claim_id, product_id, quantity, condition, mes_lot_id, qr_code_id, lot_number)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      claimId,
      item.product_id,
      item.quantity,
      item.condition || 'good',
      mesLotId,
      qrCodeId,
      lotNumber
    ).run()
  }

  return c.json({ success: true, message: '반품/교환 요청이 등록되었습니다.' })
})

// 클레임 상태 변경
app.put('/:id/status', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const body = await c.req.json<UpdateClaimStatusRequest & { warehouse_id?: number }>()

  const claim = await DB.prepare('SELECT * FROM claims WHERE id = ?').bind(id).first<Claim>()
  if (!claim) {
    return c.json({ success: false, error: '클레임 내역을 찾을 수 없습니다.' }, 404)
  }

  if (claim.status === 'completed' || claim.status === 'rejected') {
    return c.json({ success: false, error: '이미 처리된 클레임입니다.' }, 400)
  }

  // 상태 및 창고 업데이트
  await DB.prepare(`
    UPDATE claims 
    SET status = ?, admin_notes = ?, warehouse_id = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).bind(body.status, body.admin_notes || null, body.warehouse_id || null, id).run()

  // 승인(approved) 시 재고 처리
  // 반품인 경우 재고 입고 처리
  if (body.status === 'approved' && claim.type === 'return') {
    const warehouseId = body.warehouse_id;
    if (!warehouseId) {
      return c.json({ success: false, error: '입고할 창고를 지정해야 합니다.' }, 400)
    }

    const { results: items } = await DB.prepare('SELECT * FROM claim_items WHERE claim_id = ?').bind(id).all<any>()

    for (const item of items) {
      // 전체 재고 증가
      await DB.prepare(`
        UPDATE products 
        SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(item.quantity, item.product_id).run()

      // 창고 재고 증가 (없으면 생성)
      const whStock = await DB.prepare('SELECT * FROM product_warehouse_stocks WHERE product_id = ? AND warehouse_id = ?')
        .bind(item.product_id, warehouseId).first()

      if (whStock) {
        await DB.prepare('UPDATE product_warehouse_stocks SET quantity = quantity + ? WHERE product_id = ? AND warehouse_id = ?')
          .bind(item.quantity, item.product_id, warehouseId).run()
      } else {
        await DB.prepare('INSERT INTO product_warehouse_stocks (product_id, warehouse_id, quantity) VALUES (?, ?, ?)')
          .bind(item.product_id, warehouseId, item.quantity).run()
      }

      // 재고 이동 기록
      await DB.prepare(`
        INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity, reason, reference_id, created_by)
        VALUES (?, ?, '입고', ?, '반품 입고', ?, ?)
      `).bind(item.product_id, warehouseId, item.quantity, claim.sale_id, c.get('userId')).run()

      // Lot 잔량 복원 + 이벤트
      if (item.mes_lot_id) {
        const tenantId = c.get('tenantId')
        await restoreMesLot(DB, tenantId, item.mes_lot_id, Number(item.quantity))
        await insertDistributionEvent(DB, tenantId, c.get('userId'), {
          event_type: 'claim_return',
          product_id: item.product_id,
          lot_number: item.lot_number,
          quantity: item.quantity,
          qr_code_id: item.qr_code_id,
          warehouse_id: warehouseId,
          reference_type: 'claim',
          reference_id: Number(id),
          notes: '반품 승인 — Lot 잔량 복원'
        })
      }
    }
  }

  return c.json({ success: true, message: '상태가 변경되었습니다.' })
})

export default app
