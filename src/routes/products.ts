import { Hono } from 'hono'
import type { Bindings, Variables, Product, CreateProductRequest, UpdateProductRequest } from '../types'
import { checkPlanLimit } from '../utils/subscription'
import { applyDisplayStockFromWarehouses } from '../utils/product-stock-display'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 상품 목록 조회
app.get('/', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const search = c.req.query('search') || ''
  const category = c.req.query('category') || ''
  const categoryMedium = c.req.query('category_medium') || ''
  const categorySmall = c.req.query('category_small') || ''
  const stockStatus = c.req.query('stock_status') || '' // out_of_stock, low_stock, in_stock
  const minPrice = parseInt(c.req.query('min_price') || '0')
  const maxPrice = parseInt(c.req.query('max_price') || '0')
  const startDate = c.req.query('start_date') || ''
  const endDate = c.req.query('end_date') || ''

  let query = `
    SELECT p.*, COALESCE(p.current_stock, 0) as current_stock,
    (SELECT COUNT(*) FROM products v WHERE v.parent_id = p.id AND v.is_active = 1 AND v.tenant_id = ?) as variant_count 
    FROM products p 
    WHERE p.is_active = 1 AND p.tenant_id = ?
  `
  // params: [tenantId (for subquery), tenantId (for main query)]
  const params: any[] = [tenantId, tenantId]

  if (!c.req.query('show_variants')) {
    query += ' AND p.parent_id IS NULL'
  }

  if (search) {
    query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR IFNULL(p.barcode, \'\') LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }

  if (category) {
    query += ' AND p.category = ?'
    params.push(category)
  }
  if (categoryMedium) {
    query += ' AND category_medium = ?'
    params.push(categoryMedium)
  }

  if (categorySmall) {
    query += ' AND category_small = ?'
    params.push(categorySmall)
  }

  if (stockStatus) {
    // stockStatus filters rely on current_stock.
    // If we use stockStatus filter, we should be careful if it was NULL. 
    // But we are coalescing in SELECT, not WHERE?
    // In WHERE, current_stock refers to the column.
    // D1 might handle NULL <= 0 as false. COALESCE in WHERE is better if needed.
    // But let's assume standard behavior for now.
    if (stockStatus === 'out_of_stock') {
      query += ' AND (current_stock <= 0 OR current_stock IS NULL)'
    } else if (stockStatus === 'low_stock') {
      query += ' AND current_stock <= min_stock_alert AND current_stock > 0'
    } else if (stockStatus === 'in_stock') {
      query += ' AND current_stock > min_stock_alert'
    }
  }

  if (minPrice > 0) {
    query += ' AND selling_price >= ?'
    params.push(minPrice)
  }

  if (maxPrice > 0) {
    query += ' AND selling_price <= ?'
    params.push(maxPrice)
  }

  if (startDate) {
    query += ' AND DATE(created_at) >= ?'
    params.push(startDate)
  }

  if (endDate) {
    query += ' AND DATE(created_at) <= ?'
    params.push(endDate)
  }

  query += ' ORDER BY created_at DESC'

  // Get total count for pagination (before LIMIT)
  const countQuery = query.replace(/^[\s\S]*?FROM products p/, 'SELECT COUNT(*) as total FROM products p')

  // params for countQuery: Remove the first tenantId which was for the variant_count subquery
  const countParams = params.slice(1)

  const countResult = await DB.prepare(countQuery).bind(...countParams).first<{ total: number }>()
  const total = countResult?.total || 0

  // Pagination
  const limit = parseInt(c.req.query('limit') || '0')
  const offset = parseInt(c.req.query('offset') || '0')
  if (limit > 0) {
    query += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)
  }

  const { results } = await DB.prepare(query).bind(...params).all<Product>()

  if (results?.length) {
    await applyDisplayStockFromWarehouses(DB, tenantId, results as { id: number; current_stock?: number }[])
  }

  return c.json({
    success: true,
    data: results,
    pagination: {
      total,
      limit: limit > 0 ? limit : total,
      offset,
      hasMore: offset + (limit > 0 ? limit : total) < total
    }
  })
})

// 상품 상세 조회
app.get('/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const product = await DB.prepare('SELECT * FROM products WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<Product>()

  if (!product) {
    return c.json({ success: false, error: '상품을 찾을 수 없습니다.' }, 404)
  }

  // 변체 정보 추가
  // 변체 정보 추가 (product_type이 master가 아니더라도 parent_id가 있는 자식이 있으면 조회)
  // 변체 정보 추가 (product_type이 master가 아니더라도 parent_id가 있는 자식이 있으면 조회)
  const variants = await DB.prepare(`
    SELECT p.* FROM products p
    WHERE p.parent_id = ? AND p.tenant_id = ?
  `).bind(id, tenantId).all<Product>()

  if (variants.results && variants.results.length > 0) {
    if (product.product_type !== 'bundle') {
      (product as any).product_type = 'master';
    }
    const variantsWithChoices = await Promise.all(variants.results.map(async (v: any) => {
      const choices = await DB.prepare(`
          SELECT pvo.option_group_id as group_id, pvo.option_value_id as value_id,
                 pog.name as group_name, pov.value as value_name
          FROM product_variant_options pvo
          JOIN product_option_groups pog ON pvo.option_group_id = pog.id
          JOIN product_option_values pov ON pvo.option_value_id = pov.id
          WHERE pvo.product_id = ? AND pvo.tenant_id = ?
        `).bind(v.id, tenantId).all()
      return { ...v, options: choices.results }
    }))
      ; (product as any).variants = variantsWithChoices

    const variantRows = [
      product as { id: number; current_stock?: number },
      ...variantsWithChoices.map((v: any) => v as { id: number; current_stock?: number })
    ]
    await applyDisplayStockFromWarehouses(DB, tenantId, variantRows)
  } else {
    ; (product as any).variants = [];
    // 만약 옵션이 있는 상품인데 variants가 안 불러와진 경우를 대비해 
    // DB의 product_type이 master라면 그대로 유지
  }

  // 세트 구성 정보 추가
  if (product.product_type === 'bundle') {
    const bundleItems = await DB.prepare(`
      SELECT pb.component_product_id, pb.quantity, p.name, p.sku, p.purchase_price, p.selling_price, p.image_url
      FROM product_bundles pb
      JOIN products p ON pb.component_product_id = p.id
      WHERE pb.master_product_id = ? AND pb.tenant_id = ?
    `).bind(id, tenantId).all()

      ; (product as any).bundle_items = bundleItems.results
  }

  if (!(product as any).variants?.length) {
    await applyDisplayStockFromWarehouses(DB, tenantId, [
      product as { id: number; current_stock?: number }
    ])
  }

  return c.json({ success: true, data: product })
})

// 상품 등록
app.post('/', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const body = await c.req.json<CreateProductRequest>()

  // 플랜 한도 체크
  const limitCheck = await checkPlanLimit(DB, tenantId, 'products')
  if (!limitCheck.allowed) {
    return c.json({ success: false, error: limitCheck.error }, 403)
  }

  // SKU 중복 체크
  const existing = await DB.prepare('SELECT id FROM products WHERE sku = ? AND tenant_id = ?')
    .bind(body.sku, tenantId)
    .first()

  if (existing) {
    return c.json({ success: false, error: 'SKU가 이미 존재합니다.' }, 400)
  }

  const barcode = body.barcode?.trim() || null
  if (barcode) {
    const dupBarcode = await DB.prepare(
      'SELECT id FROM products WHERE tenant_id = ? AND barcode = ? AND is_active = 1'
    ).bind(tenantId, barcode).first()
    if (dupBarcode) {
      return c.json({ success: false, error: '바코드가 이미 등록되어 있습니다.' }, 400)
    }
  }

  try {
    const result = await DB.prepare(`
      INSERT INTO products (tenant_id, sku, barcode, name, category, category_medium, category_small, description, purchase_price, selling_price, 
                            current_stock, min_stock_alert, supplier, image_url, brand, tags, status, specifications, product_type, has_options)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      body.sku,
      barcode,
      body.name,
      body.category || '미분류',
      body.category_medium || null,
      body.category_small || null,
      body.description || null,
      body.purchase_price,
      body.selling_price,
      body.current_stock,
      body.min_stock_alert || 10,
      body.supplier || null,
      body.image_url || null,
      body.brand || null,
      body.tags || null,
      body.status || 'sale',
      body.specifications || null,
      body.product_type || 'simple',
      body.has_options ? 1 : 0
    ).run()

    const masterId = result.meta.last_row_id;

    // 변체 전용 처리
    if (body.product_type === 'master' && body.variants && body.variants.length > 0) {
      for (const v of body.variants) {
        const vResult = await DB.prepare(`
          INSERT INTO products (tenant_id, sku, name, category, category_medium, category_small, purchase_price, selling_price, 
                                current_stock, min_stock_alert, status, product_type, parent_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'variant', ?)
        `).bind(
          tenantId, v.sku, v.name, body.category, body.category_medium, body.category_small,
          v.purchase_price || body.purchase_price, v.selling_price, v.current_stock, body.min_stock_alert, 'sale', masterId
        ).run();

        const variantId = vResult.meta.last_row_id;

        // 옵션 매핑 기록
        for (const opt of v.options) {
          await DB.prepare('INSERT INTO product_variant_options (tenant_id, product_id, option_group_id, option_value_id) VALUES (?, ?, ?, ?)')
            .bind(tenantId, variantId, opt.group_id, opt.value_id)
            .run();
        }

        // 변체 재고 기록 (간단하게)
        if (v.current_stock > 0) {
          await DB.prepare('INSERT INTO stock_movements (tenant_id, product_id, movement_type, quantity, reason) VALUES (?, ?, "입고", ?, "초기 재고 (변체)")')
            .bind(tenantId, variantId, v.current_stock)
            .run();
        }
      }

      // 변체 등록 후 마스터 상품 재고 업데이트
      const totalStockResult = await DB.prepare('SELECT SUM(current_stock) as total FROM products WHERE parent_id = ? AND is_active = 1 AND tenant_id = ?')
        .bind(masterId, tenantId)
        .first<{ total: number }>()

      const newTotalStock = totalStockResult?.total || 0

      await DB.prepare('UPDATE products SET current_stock = ? WHERE id = ? AND tenant_id = ?')
        .bind(newTotalStock, masterId, tenantId)
        .run()
    }

    // 세트(Bundle) 처리
    if (body.product_type === 'bundle' && body.bundle_items && body.bundle_items.length > 0) {
      for (const item of body.bundle_items) {
        await DB.prepare('INSERT INTO product_bundles (tenant_id, master_product_id, component_product_id, quantity) VALUES (?, ?, ?, ?)')
          .bind(tenantId, masterId, item.product_id, item.quantity)
          .run();
      }
    }

    // 재고 이동 기록 (초기 재고) & 기본 창고 할당
    if (body.current_stock > 0) {
      // 1. 기본 창고 확인 또는 생성
      let defaultWarehouse = await DB.prepare('SELECT id FROM warehouses WHERE tenant_id = ? AND name = ?')
        .bind(tenantId, '기본 창고')
        .first<{ id: number }>()

      if (!defaultWarehouse) {
        const res = await DB.prepare('INSERT INTO warehouses (tenant_id, name, location, description) VALUES (?, ?, ?, ?) RETURNING id')
          .bind(tenantId, '기본 창고', '본사', '초기 재고 할당용 기본 창고')
          .first<{ id: number }>()
        defaultWarehouse = { id: res.id }
      }

      const warehouseId = defaultWarehouse.id

      // 2. 창고 재고 등록
      await DB.prepare(`
        INSERT INTO product_warehouse_stocks (tenant_id, product_id, warehouse_id, quantity)
        VALUES (?, ?, ?, ?)
      `).bind(tenantId, masterId, warehouseId, body.current_stock).run()

      // 3. 이동 내역 기록 (창고 ID 포함)
      await DB.prepare(`
        INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason)
        VALUES (?, ?, ?, '입고', ?, '초기 재고')
      `).bind(tenantId, masterId, warehouseId, body.current_stock).run()
    }

    return c.json({
      success: true,
      data: { id: masterId },
      message: '상품이 등록되었습니다.'
    })
  } catch (error: any) {
    console.error('Create product error:', error)
    return c.json({ success: false, error: error.message || '상품 등록 중 오류가 발생했습니다.' }, 500)
  }
})

// 상품 수정
app.put('/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = await c.req.json<UpdateProductRequest>()

  const product = await DB.prepare('SELECT * FROM products WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first()

  if (!product) {
    return c.json({ success: false, error: '상품을 찾을 수 없습니다.' }, 404)
  }

  const updates: string[] = []
  const params: any[] = []

  if (body.name !== undefined) {
    updates.push('name = ?')
    params.push(body.name)
  }
  if (body.barcode !== undefined) {
    const barcode = body.barcode?.trim() || null
    if (barcode) {
      const dupBarcode = await DB.prepare(
        'SELECT id FROM products WHERE tenant_id = ? AND barcode = ? AND id != ? AND is_active = 1'
      ).bind(tenantId, barcode, id).first()
      if (dupBarcode) {
        return c.json({ success: false, error: '바코드가 이미 등록되어 있습니다.' }, 400)
      }
    }
    updates.push('barcode = ?')
    params.push(barcode)
  }
  if (body.category !== undefined) {
    updates.push('category = ?')
    params.push(body.category || '미분류')
  }
  if (body.category_medium !== undefined) {
    updates.push('category_medium = ?')
    params.push(body.category_medium)
  }
  if (body.category_small !== undefined) {
    updates.push('category_small = ?')
    params.push(body.category_small)
  }
  if (body.description !== undefined) {
    updates.push('description = ?')
    params.push(body.description)
  }
  if (body.purchase_price !== undefined) {
    updates.push('purchase_price = ?')
    params.push(body.purchase_price)
  }
  if (body.selling_price !== undefined) {
    updates.push('selling_price = ?')
    params.push(body.selling_price)
  }
  if (body.min_stock_alert !== undefined) {
    updates.push('min_stock_alert = ?')
    params.push(body.min_stock_alert)
  }
  if (body.supplier !== undefined) {
    updates.push('supplier = ?')
    params.push(body.supplier)
  }
  if (body.image_url !== undefined) {
    updates.push('image_url = ?')
    params.push(body.image_url)
  }
  if (body.brand !== undefined) {
    updates.push('brand = ?')
    params.push(body.brand)
  }
  if (body.tags !== undefined) {
    updates.push('tags = ?')
    params.push(body.tags)
  }
  if (body.status !== undefined) {
    updates.push('status = ?')
    params.push(body.status)
  }
  if (body.specifications !== undefined) {
    updates.push('specifications = ?')
    params.push(body.specifications)
  }
  if (body.product_type !== undefined) {
    updates.push('product_type = ?')
    params.push(body.product_type)
  }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP')
    params.push(id, tenantId)

    await DB.prepare(`
        UPDATE products SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?
      `).bind(...params).run()
  }

  // 세트(Bundle) 업데이트
  // explicitly provided bundle_items가 있는 경우에만 동기화하여 의도치 않은 삭제 방지
  if (body.bundle_items !== undefined && Array.isArray(body.bundle_items)) {
    console.log('Synchronizing bundle items for product:', id);

    // 기존 연결 정보 삭제
    await DB.prepare('DELETE FROM product_bundles WHERE master_product_id = ? AND tenant_id = ?').bind(id, tenantId).run()

    // 신규 정보 삽입
    for (const item of body.bundle_items) {
      await DB.prepare('INSERT INTO product_bundles (tenant_id, master_product_id, component_product_id, quantity) VALUES (?, ?, ?, ?)')
        .bind(tenantId, id, item.product_id, item.quantity)
        .run();
    }
    console.log('Bundle items update completed');
  } else if (body.product_type === 'bundle' || product.product_type === 'bundle') {
    console.log('Product is bundle but no bundle_items in payload, skipping components update to preserve data');
  }

  // 옵션(Variants) 업데이트
  if (body.product_type === 'master') {
    const submittedVariants = (body.variants || []) as any[]
    const submittedSkus = submittedVariants.map(v => v.sku).filter(Boolean)
    const userId = c.get('userId')

    for (const v of submittedVariants) {
      if (!v.sku) continue

      const existing = await DB.prepare('SELECT * FROM products WHERE sku = ? AND tenant_id = ?').bind(v.sku, tenantId).first() as any

      if (existing) {
        // [업데이트]
        const updatesV: string[] = []
        const paramsV: any[] = []

        updatesV.push('purchase_price = ?'); paramsV.push(v.purchase_price || 0);
        updatesV.push('selling_price = ?'); paramsV.push(v.selling_price || 0);
        updatesV.push('name = ?'); paramsV.push(v.name);
        updatesV.push('is_active = 1'); // 다시 활성화

        // 재고 변경 처리
        const newStock = parseInt(v.current_stock)
        if (!isNaN(newStock) && existing.current_stock !== newStock) {
          const diff = newStock - existing.current_stock
          if (diff !== 0) {
            const defaultWarehouse = await DB.prepare('SELECT id FROM warehouses WHERE tenant_id = ? ORDER BY id ASC LIMIT 1').bind(tenantId).first<{ id: number }>()
            const warehouseId = defaultWarehouse?.id

            await DB.prepare(`
              INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason, notes, reference_id, created_by)
              VALUES (?, ?, ?, '조정', ?, '상품 수정에서 재고 조정', '옵션 수량 직접 수정', ?, ?)
            `).bind(tenantId, existing.id, warehouseId || null, diff, id, userId).run()

            if (warehouseId) {
              await DB.prepare(`
                  INSERT INTO product_warehouse_stocks (tenant_id, product_id, warehouse_id, quantity)
                  VALUES (?, ?, ?, ?)
                  ON CONFLICT(product_id, warehouse_id) 
                  DO UPDATE SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
                `).bind(tenantId, existing.id, warehouseId, diff, diff).run()
            }

            updatesV.push('current_stock = ?')
            paramsV.push(newStock)
          }
        }

        if (updatesV.length > 0) {
          updatesV.push('updated_at = CURRENT_TIMESTAMP')
          paramsV.push(existing.id, tenantId)
          await DB.prepare(`UPDATE products SET ${updatesV.join(', ')} WHERE id = ? AND tenant_id = ?`).bind(...paramsV).run()
        }

        // 옵션 매핑 정보 재생성
        await DB.prepare('DELETE FROM product_variant_options WHERE product_id = ? AND tenant_id = ?').bind(existing.id, tenantId).run()
        if (v.options && v.options.length > 0) {
          const optStmt = DB.prepare('INSERT INTO product_variant_options (tenant_id, product_id, option_group_id, option_value_id) VALUES (?, ?, ?, ?)')
          const batch = v.options.map((opt: any) => optStmt.bind(tenantId, existing.id, opt.group_id, opt.value_id))
          await DB.batch(batch)
        }

      } else {
        // [신규 변체 -> INSERT]
        const vResult = await DB.prepare(`
            INSERT INTO products (tenant_id, sku, name, category, category_medium, category_small, purchase_price, selling_price, 
                                  current_stock, min_stock_alert, status, product_type, parent_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'variant', ?)
          `).bind(
          tenantId, v.sku, v.name, body.category || '미분류', body.category_medium, body.category_small,
          v.purchase_price || 0, v.selling_price, v.current_stock, body.min_stock_alert || 0, 'sale', id
        ).run();

        const variantId = vResult.meta.last_row_id;

        // 옵션 매핑
        if (v.options && v.options.length > 0) {
          const optStmt = DB.prepare('INSERT INTO product_variant_options (tenant_id, product_id, option_group_id, option_value_id) VALUES (?, ?, ?, ?)')
          const batch = v.options.map((opt: any) => optStmt.bind(tenantId, variantId, opt.group_id, opt.value_id))
          await DB.batch(batch)
        }

        // 초기 재고 처리
        if (v.current_stock > 0) {
          const defaultWarehouse = await DB.prepare('SELECT id FROM warehouses WHERE tenant_id = ? ORDER BY id ASC LIMIT 1').bind(tenantId).first<{ id: number }>()
          const warehouseId = defaultWarehouse?.id

          if (warehouseId) {
            await DB.prepare('INSERT INTO product_warehouse_stocks (tenant_id, product_id, warehouse_id, quantity) VALUES (?, ?, ?, ?)').bind(tenantId, variantId, warehouseId, v.current_stock).run()
          }

          await DB.prepare('INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason, notes, created_by) VALUES (?, ?, ?, "입고", ?, "변체 추가", "상품 수정 시 추가됨", ?)')
            .bind(tenantId, variantId, warehouseId || null, v.current_stock, userId)
            .run();
        }
      }
    } // for loop end

    // 2. 삭제 처리 (화면에 없는 기존 변체 비활성화)
    const currentVariants = await DB.prepare('SELECT sku, id FROM products WHERE parent_id = ? AND is_active = 1 AND tenant_id = ?').bind(id, tenantId).all<{ sku: string, id: number }>()
    const submittedSkuSet = new Set(submittedSkus)

    const toDelete = currentVariants.results.filter((cv: any) => !submittedSkuSet.has(cv.sku))

    if (toDelete.length > 0) {
      const deleteIds = toDelete.map((d: any) => d.id)
      const placeholders = deleteIds.map(() => '?').join(',')
      await DB.prepare(`UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders}) AND tenant_id = ?`)
        .bind(...deleteIds, tenantId)
        .run()
    }

    // 변체 업데이트 완료 후, 마스터 상품의 총 재고 재계산 및 업데이트
    const totalStockResult = await DB.prepare('SELECT SUM(current_stock) as total FROM products WHERE parent_id = ? AND is_active = 1 AND tenant_id = ?')
      .bind(id, tenantId)
      .first<{ total: number }>()

    const newTotalStock = totalStockResult?.total || 0

    await DB.prepare('UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?')
      .bind(newTotalStock, id, tenantId)
      .run()
  }

  return c.json({ success: true, message: '상품이 수정되었습니다.' })
})

// 상품 삭제 (비활성화)
app.delete('/:id', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const product = await DB.prepare('SELECT * FROM products WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first()

  if (!product) {
    return c.json({ success: false, error: '상품을 찾을 수 없습니다.' }, 404)
  }

  await DB.prepare('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .run()

  return c.json({ success: true, message: '상품이 삭제되었습니다.' })
})

// 재고 부족 상품 조회
app.get('/alerts/low-stock', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')

  const { results } = await DB.prepare(`
    SELECT * FROM products 
    WHERE is_active = 1 AND current_stock <= min_stock_alert AND tenant_id = ?
    ORDER BY current_stock ASC
  `).bind(tenantId).all<Product>()

  return c.json({ success: true, data: results })
})

// 카테고리 목록 조회
app.get('/meta/categories', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')

  const { results } = await DB.prepare(`
    SELECT DISTINCT category FROM products WHERE is_active = 1 AND tenant_id = ? ORDER BY category
  `).bind(tenantId).all<{ category: string }>()

  return c.json({
    success: true,
    data: results.map((r: { category: string }) => r.category)
  })
})

export default app
