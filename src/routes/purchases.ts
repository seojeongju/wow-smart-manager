import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 발주 목록 조회
app.get('/', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const search = c.req.query('search') || ''
    const status = c.req.query('status') || ''

    let query = `
    SELECT po.*, s.name as supplier_name, u.name as created_by_name
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    LEFT JOIN users u ON po.created_by = u.id
    WHERE po.tenant_id = ?
  `
    const params: any[] = [tenantId]

    if (search) {
        query += ' AND (po.code LIKE ? OR s.name LIKE ?)'
        params.push(`%${search}%`, `%${search}%`)
    }

    if (status) {
        query += ' AND po.status = ?'
        params.push(status)
    }

    query += ' ORDER BY po.created_at DESC'

    const { results } = await DB.prepare(query).bind(...params).all()

    return c.json({ success: true, data: results })
})

// 발주 상세 조회
app.get('/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')

    const po = await DB.prepare(`
    SELECT po.*, s.name as supplier_name, s.contact_person, s.phone, s.email, u.name as created_by_name
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    LEFT JOIN users u ON po.created_by = u.id
    WHERE po.id = ? AND po.tenant_id = ?
  `).bind(id, tenantId).first()

    if (!po) {
        return c.json({ success: false, error: 'Purchase Order not found' }, 404)
    }

    const { results: items } = await DB.prepare(`
    SELECT pi.*, p.name as product_name, p.sku, p.image_url
    FROM purchase_items pi
    LEFT JOIN products p ON pi.product_id = p.id
    WHERE pi.purchase_order_id = ?
  `).bind(id).all()

    return c.json({ success: true, data: { ...po, items } })
})

// 발주 등록
app.post('/', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const userId = c.get('userId')
    const body = await c.req.json()

    // body: { supplier_id, expected_at, notes, items: [{ product_id, quantity, unit_price }] }

    if (!body.supplier_id || !body.items || body.items.length === 0) {
        return c.json({ success: false, error: '필수 정보가 누락되었습니다.' }, 400)
    }

    // 발주 코드 생성 (PO-YYYYMMDD-Random)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randomStr = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const code = `PO-${dateStr}-${randomStr}`

    // 총 금액 계산
    const totalAmount = body.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0)

    try {
        // 1. 발주서 생성
        const poRes = await DB.prepare(`
        INSERT INTO purchase_orders (tenant_id, supplier_id, code, status, total_amount, expected_at, created_by, notes)
        VALUES (?, ?, ?, 'ORDERED', ?, ?, ?, ?)
      `).bind(
            tenantId,
            body.supplier_id,
            code,
            totalAmount,
            body.expected_at || null,
            userId,
            body.notes || null
        ).run()

        const poId = poRes.meta.last_row_id

        // 2. 발주 품목 생성 (Batch)
        const stmt = DB.prepare(`
        INSERT INTO purchase_items (purchase_order_id, product_id, quantity, unit_price)
        VALUES (?, ?, ?, ?)
      `)

        const batch = body.items.map((item: any) => stmt.bind(poId, item.product_id, item.quantity, item.unit_price))
        await DB.batch(batch)

        return c.json({ success: true, message: '발주가 등록되었습니다.', data: { id: poId, code } })
    } catch (e: any) {
        console.error('Purchase creation failed:', e)
        return c.json({ success: false, error: e.message || '발주 생성 중 오류가 발생했습니다.' }, 500)
    }
})

// 발주 수정
app.put('/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')
    const body = await c.req.json() // { supplier_id, expected_at, notes, items }

    const po = await DB.prepare('SELECT status FROM purchase_orders WHERE id = ? AND tenant_id = ?').bind(id, tenantId).first()
    if (!po) return c.json({ success: false, error: 'Purchase Order not found' }, 404)

    if (po.status !== 'ORDERED' && po.status !== 'DRAFT') {
        return c.json({ success: false, error: '초안(DRAFT) 또는 발주완료(ORDERED) 상태만 수정할 수 있습니다.' }, 400)
    }

    if (!body.supplier_id || !body.items || body.items.length === 0) {
        return c.json({ success: false, error: '필수 정보가 누락되었습니다.' }, 400)
    }

    const totalAmount = body.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0)

    try {
        const statements = []

        // 1. PO 정보 업데이트
        statements.push(DB.prepare(`
        UPDATE purchase_orders 
        SET supplier_id = ?, expected_at = ?, notes = ?, total_amount = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND tenant_id = ?
      `).bind(body.supplier_id, body.expected_at || null, body.notes || null, totalAmount, id, tenantId))

        // 2. 기존 상품 삭제
        statements.push(DB.prepare('DELETE FROM purchase_items WHERE purchase_order_id = ?').bind(id))

        // 3. 새 상품 추가
        const stmt = DB.prepare(`
        INSERT INTO purchase_items (purchase_order_id, product_id, quantity, unit_price)
        VALUES (?, ?, ?, ?)
      `)

        for (const item of body.items) {
            statements.push(stmt.bind(id, item.product_id, item.quantity, item.unit_price))
        }

        await DB.batch(statements)

        return c.json({ success: true, message: '발주 정보가 수정되었습니다.' })
    } catch (e: any) {
        console.error('Purchase update failed:', e)
        return c.json({ success: false, error: e.message || '발주 수정 중 오류가 발생했습니다.' }, 500)
    }
})

// 발주 삭제
app.delete('/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')

    const po = await DB.prepare('SELECT status FROM purchase_orders WHERE id = ? AND tenant_id = ?').bind(id, tenantId).first()
    if (!po) return c.json({ success: false, error: 'Purchase Order not found' }, 404)

    // 입고가 시작된 경우 삭제 불가
    if (po.status !== 'ORDERED' && po.status !== 'DRAFT') {
        return c.json({ success: false, error: '초안(DRAFT) 또는 발주완료(ORDERED) 상태만 삭제할 수 있습니다.' }, 400)
    }

    try {
        await DB.prepare('DELETE FROM purchase_orders WHERE id = ? AND tenant_id = ?')
            .bind(id, tenantId)
            .run()

        return c.json({ success: true, message: '발주서가 삭제되었습니다.' })
    } catch (e: any) {
        console.error('Purchase delete failed:', e)
        return c.json({ success: false, error: e.message || '발주 삭제 중 오류가 발생했습니다.' }, 500)
    }
})

// 발주 상태 변경 (예: 취소)
app.put('/:id/status', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')
    const { status } = await c.req.json()

    await DB.prepare('UPDATE purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?')
        .bind(status, id, tenantId)
        .run()

    return c.json({ success: true, message: '상태가 변경되었습니다.' })
})

// 입고 처리 (Receive)
app.post('/:id/receive', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const userId = c.get('userId')
    const id = c.req.param('id')
    const { items } = await c.req.json() // items: [{ item_id, quantity, warehouse_id }]

    // 1. PO 조회
    const po = await DB.prepare('SELECT * FROM purchase_orders WHERE id = ? AND tenant_id = ?').bind(id, tenantId).first()
    if (!po) return c.json({ success: false, error: 'PO not found' }, 404)

    const statements = []

    // 기본 창고 ID 조회 (없으면 생성 로직이 필요하지만, 여기서는 있다고 가정하거나 첫번째 창고 사용)
    let defaultWarehouseId = 1; // Fallback
    const wh = await DB.prepare('SELECT id FROM warehouses WHERE tenant_id = ? LIMIT 1').bind(tenantId).first()
    if (wh) defaultWarehouseId = wh.id as number

    for (const item of items) {
        // item: { id: purchase_item_id, quantity: received_qty, warehouse_id: optional }
        const warehouseId = item.warehouse_id || defaultWarehouseId

        // 2. purchase_items 업데이트 (입고 수량 증가)
        statements.push(DB.prepare(`
        UPDATE purchase_items 
        SET received_quantity = received_quantity + ?, 
            status = CASE WHEN quantity <= (received_quantity + ?) THEN 'RECEIVED' ELSE 'PENDING' END
        WHERE id = ?
     `).bind(item.quantity, item.quantity, item.id))

        // 3. 상품 재고 증가
        // purchase_item에서 product_id 가져와야 함. 서브쿼리로 해결하거나 미리 조회해야 함.
        // 여기서는 서브쿼리 사용
        statements.push(DB.prepare(`
        UPDATE products 
        SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT product_id FROM purchase_items WHERE id = ?)
     `).bind(item.quantity, item.id))

        // 4. 창고별 재고 (product_warehouse_stocks) 업데이트 (Upsert)
        // D1 (SQLite) supports UPSERT via INSERT ... ON CONFLICT
        // need product_id
        // This is hard to batch properly without product_id available directly.
        // Let's rely on simple products table update for now, or fetch product_id first.
        // To make it robust, we should fetch item details first.
    }

    // To do this properly with product_id, let's fetch items details first
    const itemIds = items.map((i: any) => i.id).join(',')
    const { results: dbItems } = await DB.prepare(`SELECT id, product_id FROM purchase_items WHERE id IN (${itemIds})`).all()
    const itemMap = new Map(dbItems.map((i: any) => [i.id, i.product_id]))

    // Re-build statements
    const refinedStatements = []

    for (const item of items) {
        const warehouseId = item.warehouse_id || defaultWarehouseId
        const productId = itemMap.get(item.id)

        if (!productId) continue;

        // Update Purchase Item
        refinedStatements.push(DB.prepare(`
        UPDATE purchase_items 
        SET received_quantity = received_quantity + ?, 
            status = CASE WHEN quantity <= (received_quantity + ?) THEN 'RECEIVED' ELSE 'PENDING' END
        WHERE id = ?
     `).bind(item.quantity, item.quantity, item.id))

        // Update Product Total Stock
        refinedStatements.push(DB.prepare(`
        UPDATE products 
        SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
     `).bind(item.quantity, productId))

        // Insert/Update Warehouse Stock
        refinedStatements.push(DB.prepare(`
        INSERT INTO product_warehouse_stocks (tenant_id, product_id, warehouse_id, quantity)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(tenant_id, product_id, warehouse_id) 
        DO UPDATE SET quantity = quantity + ?
     `).bind(tenantId, productId, warehouseId, item.quantity, item.quantity))

        // Log Movement
        refinedStatements.push(DB.prepare(`
        INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason, created_by)
        VALUES (?, ?, ?, '입고', ?, '발주 입고 (' || ? || ')', ?)
     `).bind(tenantId, productId, warehouseId, item.quantity, po.code, userId))
    }

    // Update PO level status (Simple logic: if all items received -> RECEIVED, else PARTIAL)
    // This verification is complex to do in batch. 
    // We will assume PARTIAL first, and user can manually set COMPLETED or we check later.
    // Or we just set it to 'PARTIAL_RECEIVED' if it was 'ORDERED'.
    if (po.status === 'ORDERED') {
        refinedStatements.push(DB.prepare(`UPDATE purchase_orders SET status = 'PARTIAL_RECEIVED', received_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(id))
    }

    await DB.batch(refinedStatements)

    // Check if fully received (Post-check)
    const remaining = await DB.prepare(`
    SELECT COUNT(*) as count FROM purchase_items 
    WHERE purchase_order_id = ? AND quantity > received_quantity
  `).bind(id).first('count')

    if (remaining === 0) {
        await DB.prepare(`UPDATE purchase_orders SET status = 'COMPLETED', received_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(id).run()
    }

    return c.json({ success: true, message: '입고 처리가 완료되었습니다.' })
})

export default app
