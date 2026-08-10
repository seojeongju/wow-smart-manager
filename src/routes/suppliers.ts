import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 공급사 목록 조회
app.get('/', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const search = c.req.query('search') || ''

    let query = 'SELECT * FROM suppliers WHERE tenant_id = ?'
    const params: any[] = [tenantId]

    if (search) {
        query += ' AND (name LIKE ? OR contact_person LIKE ? OR phone LIKE ?)'
        params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY created_at DESC'

    const { results } = await DB.prepare(query).bind(...params).all()

    return c.json({ success: true, data: results })
})

/** 최근 단가 (발주 제안용) — GET /:id 보다 먼저 등록 */
app.get('/prices/latest', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const productId = c.req.query('product_id') || ''
    const supplierId = c.req.query('supplier_id') || ''

    try {
        let q = `
          SELECT sp.*, p.name as product_name, p.sku, s.name as supplier_name
          FROM supplier_unit_prices sp
          JOIN (
            SELECT supplier_id, product_id, MAX(id) as max_id
            FROM supplier_unit_prices
            WHERE tenant_id = ?
            GROUP BY supplier_id, product_id
          ) latest ON latest.max_id = sp.id
          LEFT JOIN products p ON p.id = sp.product_id
          LEFT JOIN suppliers s ON s.id = sp.supplier_id
          WHERE sp.tenant_id = ?
        `
        const params: any[] = [tenantId, tenantId]
        if (productId) {
            q += ' AND sp.product_id = ?'
            params.push(productId)
        }
        if (supplierId) {
            q += ' AND sp.supplier_id = ?'
            params.push(supplierId)
        }
        q += ' ORDER BY sp.effective_from DESC LIMIT 200'
        const { results } = await DB.prepare(q).bind(...params).all()
        return c.json({ success: true, data: results || [] })
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500)
    }
})

/** 평가 요약 — GET /:id 보다 먼저 등록 */
app.get('/evaluations/summary', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')

    try {
        const { results } = await DB.prepare(`
          SELECT s.id as supplier_id, s.name as supplier_name,
                 se.score_delivery, se.score_quality, se.score_price, se.score_total,
                 se.period_label, se.evaluated_at, se.notes
          FROM suppliers s
          LEFT JOIN supplier_evaluations se ON se.id = (
            SELECT id FROM supplier_evaluations
            WHERE tenant_id = ? AND supplier_id = s.id
            ORDER BY evaluated_at DESC LIMIT 1
          )
          WHERE s.tenant_id = ?
          ORDER BY COALESCE(se.score_total, -1) DESC, s.name ASC
        `).bind(tenantId, tenantId).all()
        return c.json({ success: true, data: results || [] })
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500)
    }
})

// 공급사 상세 조회
app.get('/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')

    const supplier = await DB.prepare('SELECT * FROM suppliers WHERE id = ? AND tenant_id = ?')
        .bind(id, tenantId)
        .first()

    if (!supplier) {
        return c.json({ success: false, error: 'Supplier not found' }, 404)
    }

    return c.json({ success: true, data: supplier })
})

// 공급사 등록
app.post('/', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const body = await c.req.json()

    // 필수 필드 체크
    if (!body.name) {
        return c.json({ success: false, error: '공급사명은 필수입니다.' }, 400)
    }

    const res = await DB.prepare(`
    INSERT INTO suppliers (tenant_id, name, contact_person, phone, email, address, business_number, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
        tenantId,
        body.name,
        body.contact_person || null,
        body.phone || null,
        body.email || null,
        body.address || null,
        body.business_number || null,
        body.notes || null
    ).run()

    return c.json({ success: true, data: { id: res.meta.last_row_id }, message: '공급사가 등록되었습니다.' })
})

// 공급사 수정
app.put('/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')
    const body = await c.req.json()

    const supplier = await DB.prepare('SELECT id FROM suppliers WHERE id = ? AND tenant_id = ?')
        .bind(id, tenantId)
        .first()

    if (!supplier) {
        return c.json({ success: false, error: 'Supplier not found' }, 404)
    }

    await DB.prepare(`
    UPDATE suppliers 
    SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, business_number = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND tenant_id = ?
  `).bind(
        body.name,
        body.contact_person || null,
        body.phone || null,
        body.email || null,
        body.address || null,
        body.business_number || null,
        body.notes || null,
        id,
        tenantId
    ).run()

    return c.json({ success: true, message: '공급사 정보가 수정되었습니다.' })
})

/** 공급사 단가 이력 */
app.get('/:id/prices', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')
    const limit = Math.min(parseInt(c.req.query('limit') || '100', 10) || 100, 200)

    try {
        const { results } = await DB.prepare(`
          SELECT sp.*, p.name as product_name, p.sku
          FROM supplier_unit_prices sp
          LEFT JOIN products p ON p.id = sp.product_id
          WHERE sp.tenant_id = ? AND sp.supplier_id = ?
          ORDER BY sp.effective_from DESC, sp.id DESC
          LIMIT ?
        `).bind(tenantId, id, limit).all()
        return c.json({ success: true, data: results || [] })
    } catch (e: any) {
        return c.json({ success: false, error: '단가 이력 조회 실패. 마이그레이션 0044 필요. ' + e.message }, 500)
    }
})

app.post('/:id/prices', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const userId = c.get('userId')
    const id = c.req.param('id')
    const body = await c.req.json<{
        product_id: number
        unit_price: number
        effective_from?: string
        notes?: string
    }>()

    if (!body.product_id || !Number.isFinite(Number(body.unit_price))) {
        return c.json({ success: false, error: 'product_id와 unit_price가 필요합니다.' }, 400)
    }

    try {
        const res = await DB.prepare(`
          INSERT INTO supplier_unit_prices (
            tenant_id, supplier_id, product_id, unit_price, effective_from, notes, source_type, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, 'manual', ?)
        `).bind(
            tenantId,
            id,
            body.product_id,
            Number(body.unit_price),
            body.effective_from || new Date().toISOString().slice(0, 10),
            body.notes || null,
            userId
        ).run()
        return c.json({ success: true, data: { id: res.meta.last_row_id } })
    } catch (e: any) {
        return c.json({ success: false, error: '단가 등록 실패. 마이그레이션 0044 필요. ' + e.message }, 500)
    }
})

/** 최근 단가 — /prices/latest 로 이동됨 */

/** 공급사 평가 */
app.get('/:id/evaluations', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')

    try {
        const { results } = await DB.prepare(`
          SELECT se.*, u.name as evaluated_by_name
          FROM supplier_evaluations se
          LEFT JOIN users u ON u.id = se.evaluated_by
          WHERE se.tenant_id = ? AND se.supplier_id = ?
          ORDER BY se.evaluated_at DESC
          LIMIT 50
        `).bind(tenantId, id).all()
        return c.json({ success: true, data: results || [] })
    } catch (e: any) {
        return c.json({ success: false, error: '평가 조회 실패. 마이그레이션 0044 필요. ' + e.message }, 500)
    }
})

app.post('/:id/evaluations', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const userId = c.get('userId')
    const id = c.req.param('id')
    const body = await c.req.json<{
        period_label?: string
        score_delivery: number
        score_quality: number
        score_price: number
        notes?: string
    }>()

    const d = Number(body.score_delivery) || 0
    const q = Number(body.score_quality) || 0
    const p = Number(body.score_price) || 0
    const total = Math.round(((d + q + p) / 3) * 10) / 10

    try {
        const res = await DB.prepare(`
          INSERT INTO supplier_evaluations (
            tenant_id, supplier_id, period_label,
            score_delivery, score_quality, score_price, score_total,
            notes, evaluated_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            tenantId,
            id,
            body.period_label || null,
            d, q, p, total,
            body.notes || null,
            userId
        ).run()
        return c.json({ success: true, data: { id: res.meta.last_row_id, score_total: total } })
    } catch (e: any) {
        return c.json({ success: false, error: '평가 등록 실패. 마이그레이션 0044 필요. ' + e.message }, 500)
    }
})

// 공급사 삭제
app.delete('/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')

    // 사용 중인 발주서가 있는지 확인
    const usage = await DB.prepare('SELECT COUNT(*) as count FROM purchase_orders WHERE supplier_id = ?').bind(id).first('count')

    if (usage && usage > 0) {
        return c.json({ success: false, error: '발주 내역이 존재하는 공급사는 삭제할 수 없습니다.' }, 400)
    }

    await DB.prepare('DELETE FROM suppliers WHERE id = ? AND tenant_id = ?')
        .bind(id, tenantId)
        .run()

    return c.json({ success: true, message: '공급사가 삭제되었습니다.' })
})

export default app
