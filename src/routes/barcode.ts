import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const barcode = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 바코드 현황 통계
barcode.get('/stats', async (c) => {
  const tenantId = c.get('tenantId')
  const { DB } = c.env

  try {
    const stats = await DB.prepare(`
      SELECT
        COUNT(*) AS total_products,
        SUM(CASE WHEN barcode IS NOT NULL AND TRIM(barcode) != '' THEN 1 ELSE 0 END) AS registered,
        SUM(CASE WHEN barcode IS NULL OR TRIM(barcode) = '' THEN 1 ELSE 0 END) AS unregistered
      FROM products
      WHERE tenant_id = ? AND is_active = 1
        AND (product_type IS NULL OR product_type != 'master')
    `).bind(tenantId).first<{
      total_products: number
      registered: number
      unregistered: number
    }>()

    return c.json({
      success: true,
      data: {
        total_products: stats?.total_products || 0,
        registered: stats?.registered || 0,
        unregistered: stats?.unregistered || 0
      }
    })
  } catch (error: any) {
    console.error('바코드 통계 오류:', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 제품 바코드 목록
barcode.get('/products', async (c) => {
  const tenantId = c.get('tenantId')
  const { DB } = c.env
  const filter = c.req.query('filter') || 'all' // all | registered | unregistered
  const search = (c.req.query('search') || '').trim()
  const limit = Math.min(parseInt(c.req.query('limit') || '100', 10) || 100, 500)
  const offset = parseInt(c.req.query('offset') || '0', 10) || 0

  try {
    let query = `
      SELECT id, sku, barcode, name, category, selling_price,
             COALESCE(current_stock, 0) AS current_stock, product_type, parent_id, status
      FROM products
      WHERE tenant_id = ? AND is_active = 1
        AND (product_type IS NULL OR product_type != 'master')
    `
    const params: any[] = [tenantId]

    if (filter === 'registered') {
      query += ` AND barcode IS NOT NULL AND TRIM(barcode) != ''`
    } else if (filter === 'unregistered') {
      query += ` AND (barcode IS NULL OR TRIM(barcode) = '')`
    }

    if (search) {
      query += ` AND (name LIKE ? OR sku LIKE ? OR IFNULL(barcode, '') LIKE ?)`
      const like = `%${search}%`
      params.push(like, like, like)
    }

    query += ` ORDER BY
      CASE WHEN barcode IS NULL OR TRIM(barcode) = '' THEN 0 ELSE 1 END,
      name ASC
      LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const { results } = await DB.prepare(query).bind(...params).all()

    let countQuery = `
      SELECT COUNT(*) AS total FROM products
      WHERE tenant_id = ? AND is_active = 1
        AND (product_type IS NULL OR product_type != 'master')
    `
    const countParams: any[] = [tenantId]
    if (filter === 'registered') {
      countQuery += ` AND barcode IS NOT NULL AND TRIM(barcode) != ''`
    } else if (filter === 'unregistered') {
      countQuery += ` AND (barcode IS NULL OR TRIM(barcode) = '')`
    }
    if (search) {
      countQuery += ` AND (name LIKE ? OR sku LIKE ? OR IFNULL(barcode, '') LIKE ?)`
      const like = `%${search}%`
      countParams.push(like, like, like)
    }
    const countRow = await DB.prepare(countQuery).bind(...countParams).first<{ total: number }>()

    return c.json({
      success: true,
      data: results || [],
      pagination: {
        total: countRow?.total || 0,
        limit,
        offset
      }
    })
  } catch (error: any) {
    console.error('바코드 목록 오류:', error)
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 바코드 조회 (스캔 검증용)
barcode.get('/lookup/:code', async (c) => {
  const tenantId = c.get('tenantId')
  const code = decodeURIComponent(c.req.param('code')).trim()
  const { DB } = c.env

  if (!code) return c.json({ success: false, error: '코드를 입력하세요' }, 400)

  try {
    const product = await DB.prepare(`
      SELECT id, sku, barcode, name, category, selling_price, COALESCE(current_stock, 0) AS current_stock
      FROM products
      WHERE tenant_id = ? AND is_active = 1
        AND (barcode = ? OR sku = ?)
      LIMIT 1
    `).bind(tenantId, code, code).first()

    if (!product) {
      return c.json({ success: false, error: '제품을 찾을 수 없습니다' }, 404)
    }

    return c.json({ success: true, data: product })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// 제품 바코드 등록/수정
barcode.put('/products/:id', async (c) => {
  const tenantId = c.get('tenantId')
  const productId = c.req.param('id')
  const { DB } = c.env
  const body = await c.req.json<{ barcode?: string | null }>()
  const barcodeValue = body.barcode == null ? null : String(body.barcode).trim() || null

  try {
    const product = await DB.prepare(`
      SELECT id FROM products WHERE id = ? AND tenant_id = ? AND is_active = 1
    `).bind(productId, tenantId).first()

    if (!product) {
      return c.json({ success: false, error: '제품을 찾을 수 없습니다' }, 404)
    }

    if (barcodeValue) {
      const dup = await DB.prepare(`
        SELECT id, name, sku FROM products
        WHERE tenant_id = ? AND barcode = ? AND id != ? AND is_active = 1
      `).bind(tenantId, barcodeValue, productId).first<{ id: number; name: string; sku: string }>()

      if (dup) {
        return c.json({
          success: false,
          error: `이미 다른 제품에 등록된 바코드입니다 (${dup.name} / ${dup.sku})`
        }, 400)
      }
    }

    await DB.prepare(`
      UPDATE products
      SET barcode = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `).bind(barcodeValue, productId, tenantId).run()

    return c.json({
      success: true,
      message: barcodeValue ? '바코드가 저장되었습니다' : '바코드가 삭제되었습니다',
      data: { id: Number(productId), barcode: barcodeValue }
    })
  } catch (error: any) {
    console.error('바코드 저장 오류:', error)
    if (String(error.message || '').includes('UNIQUE')) {
      return c.json({ success: false, error: '이미 등록된 바코드입니다' }, 400)
    }
    return c.json({ success: false, error: error.message }, 500)
  }
})

// SKU를 바코드로 복사 (미등록만)
barcode.post('/copy-sku', async (c) => {
  const tenantId = c.get('tenantId')
  const { DB } = c.env
  const body = await c.req.json<{ product_ids?: number[] }>().catch(() => ({} as any))
  const ids: number[] = Array.isArray(body.product_ids) ? body.product_ids.map(Number) : []

  try {
    let targets: { id: number; sku: string }[] = []

    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',')
      const { results } = await DB.prepare(`
        SELECT id, sku FROM products
        WHERE tenant_id = ? AND is_active = 1
          AND id IN (${placeholders})
          AND (barcode IS NULL OR TRIM(barcode) = '')
          AND sku IS NOT NULL AND TRIM(sku) != ''
      `).bind(tenantId, ...ids).all<{ id: number; sku: string }>()
      targets = results || []
    } else {
      const { results } = await DB.prepare(`
        SELECT id, sku FROM products
        WHERE tenant_id = ? AND is_active = 1
          AND (product_type IS NULL OR product_type != 'master')
          AND (barcode IS NULL OR TRIM(barcode) = '')
          AND sku IS NOT NULL AND TRIM(sku) != ''
        LIMIT 200
      `).bind(tenantId).all<{ id: number; sku: string }>()
      targets = results || []
    }

    let updated = 0
    let skipped = 0
    for (const t of targets) {
      const dup = await DB.prepare(`
        SELECT id FROM products
        WHERE tenant_id = ? AND barcode = ? AND is_active = 1
      `).bind(tenantId, t.sku).first()
      if (dup) {
        skipped++
        continue
      }
      await DB.prepare(`
        UPDATE products SET barcode = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND tenant_id = ?
      `).bind(t.sku, t.id, tenantId).run()
      updated++
    }

    return c.json({
      success: true,
      message: `SKU→바코드 복사 완료: ${updated}건` + (skipped ? ` (중복 스킵 ${skipped}건)` : ''),
      data: { updated, skipped }
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export default barcode
