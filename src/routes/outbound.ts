import { Hono } from 'hono'
import { linkOutboundItemLot } from '../utils/mes-distribution'
import type { Bindings, Variables, OutboundOrder, CreateOutboundRequest, PickingRequest, PackingRequest } from '../types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 출고 목록 조회
app.get('/', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const status = c.req.query('status')
    const search = c.req.query('search')
    const startDate = c.req.query('start_date')
    const endDate = c.req.query('end_date')
    const courier = c.req.query('courier')

    let query = `
    SELECT o.*, 
           (SELECT COUNT(*) FROM outbound_items WHERE outbound_order_id = o.id) as item_count,
           (SELECT SUM(quantity_ordered) FROM outbound_items WHERE outbound_order_id = o.id) as total_quantity,
           u.name as created_by_name,
           (SELECT p.name FROM outbound_items oi JOIN products p ON oi.product_id = p.id WHERE oi.outbound_order_id = o.id LIMIT 1) as first_product_name,
           (SELECT tracking_number FROM outbound_packages WHERE outbound_order_id = o.id LIMIT 1) as tracking_number,
           (SELECT courier FROM outbound_packages WHERE outbound_order_id = o.id LIMIT 1) as courier_name
    FROM outbound_orders o
    LEFT JOIN users u ON o.created_by = u.id
    WHERE o.tenant_id = ?
  `
    const params: any[] = [tenantId]

    if (status) {
        query += ' AND o.status = ?'
        params.push(status)
    }

    if (search) {
        query += ' AND (o.order_number LIKE ? OR o.destination_name LIKE ?)'
        params.push(`%${search}%`, `%${search}%`)
    }

    if (startDate) {
        query += ' AND DATE(o.created_at) >= ?'
        params.push(startDate)
    }

    if (endDate) {
        query += ' AND DATE(o.created_at) <= ?'
        params.push(endDate)
    }

    if (courier) {
        query += ' AND EXISTS (SELECT 1 FROM outbound_packages op WHERE op.outbound_order_id = o.id AND op.courier = ?)'
        params.push(courier)
    }

    query += ' ORDER BY o.created_at DESC'

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM outbound_orders o WHERE o.tenant_id = ?` +
        (status ? ' AND o.status = ?' : '') +
        (search ? ' AND (o.order_number LIKE ? OR o.destination_name LIKE ?)' : '') +
        (startDate ? ' AND DATE(o.created_at) >= ?' : '') +
        (endDate ? ' AND DATE(o.created_at) <= ?' : '') +
        (courier ? ' AND EXISTS (SELECT 1 FROM outbound_packages op WHERE op.outbound_order_id = o.id AND op.courier = ?)' : '')

    const countParams: any[] = [tenantId]
    if (status) countParams.push(status)
    if (search) countParams.push(`%${search}%`, `%${search}%`)
    if (startDate) countParams.push(startDate)
    if (endDate) countParams.push(endDate)
    if (courier) countParams.push(courier)

    const countResult = await DB.prepare(countQuery).bind(...countParams).first<{ total: number }>()
    const total = countResult?.total || 0

    // Pagination
    let limit = parseInt(c.req.query('limit') || '0')
    const offset = parseInt(c.req.query('offset') || '0')

    // 기본값 10개 설정 (프론트엔드 캐시 문제 방지용)
    if (limit === 0) limit = 10

    if (limit > 0) {
        query += ' LIMIT ? OFFSET ?'
        params.push(limit, offset)
    }

    const { results } = await DB.prepare(query).bind(...params).all<OutboundOrder>()

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

// 출고 상세 조회
app.get('/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')

    let order;
    try {
        order = await DB.prepare(`
        SELECT o.*, u.name as created_by_name, w.name as warehouse_name, w.location as warehouse_location
        FROM outbound_orders o
        LEFT JOIN users u ON o.created_by = u.id
        LEFT JOIN warehouses w ON o.warehouse_id = w.id
        WHERE o.id = ? AND o.tenant_id = ?
      `).bind(id, tenantId).first<OutboundOrder>()
    } catch (e) {
        // Fallback if warehouse_id column is missing
        console.warn('Warehouse join failed, falling back to basic query', e);
        order = await DB.prepare(`
        SELECT o.*, u.name as created_by_name
        FROM outbound_orders o
        LEFT JOIN users u ON o.created_by = u.id
        WHERE o.id = ? AND o.tenant_id = ?
      `).bind(id, tenantId).first<OutboundOrder>()
    }

    if (!order) {
        return c.json({ success: false, error: 'Order not found' }, 404)
    }

    const { results: items } = await DB.prepare(`
    SELECT oi.*, p.name as product_name, p.sku
    FROM outbound_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.outbound_order_id = ?
  `).bind(id).all()

    const { results: packages } = await DB.prepare(`
    SELECT * FROM outbound_packages WHERE outbound_order_id = ?
  `).bind(id).all()

    return c.json({
        success: true,
        data: {
            ...order,
            items,
            packages
        }
    })
})

// 간편 출고 등록 (단일 상품 + 즉시 출고 완료)
app.post('/direct', async (c) => {
    const { DB } = c.env;
    const tenantId = c.get('tenantId');
    const userId = c.get('userId'); // tenant middleware에서 설정됨
    const body = await c.req.json();

    // 입력값 검증
    if (!body.items || body.items.length === 0) {
        return c.json({ success: false, error: 'At least one item is required' }, 400);
    }

    // 창고 ID 검증 (필수)
    const warehouseId = body.warehouseId;
    if (!warehouseId) {
        return c.json({ success: false, error: '출고 창고를 선택해주세요.' }, 400);
    }

    // 창고 존재 확인
    const warehouse = await DB.prepare('SELECT id, name FROM warehouses WHERE id = ? AND tenant_id = ?')
        .bind(warehouseId, tenantId).first();
    if (!warehouse) {
        return c.json({ success: false, error: '선택한 창고가 존재하지 않습니다.' }, 400);
    }

    const orderDate = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const orderNumber = `DO-${orderDate}-${randomSuffix}`;

    try {
        // 1. outbound_orders 생성 (SHIPPED 상태)
        // warehouse_id 추가
        const orderResult = await DB.prepare(`
      INSERT INTO outbound_orders (
        tenant_id, order_number, destination_name, destination_address, destination_phone, 
        status, created_by, notes, purchase_path, warehouse_id
      ) VALUES (?, ?, ?, ?, ?, 'SHIPPED', ?, ?, ?, ?)
    `).bind(
            tenantId, orderNumber, body.recipient, body.address, body.phone,
            userId, body.memo, body.purchasePath, warehouseId
        ).run();

        const orderId = orderResult.meta.last_row_id;

        // 중복 상품 ID 합치기
        const mergedItems = new Map<number, number>();
        for (const item of body.items) {
            const currentQty = mergedItems.get(item.productId) || 0;
            mergedItems.set(item.productId, currentQty + item.quantity);
        }

        let totalSaleAmount = 0;
        const salesItems: any[] = [];

        // Lot/QR가 있으면 라인별 처리, 없으면 기존처럼 상품별 합산
        const hasLotLines = body.items.some((it: any) => it.qr_code || it.lot_number || it.qrCode || it.lotNumber);
        const lineItems: Array<{ productId: number; quantity: number; qr_code?: string; lot_number?: string }> = hasLotLines
            ? body.items.map((it: any) => ({
                productId: Number(it.productId),
                quantity: Number(it.quantity),
                qr_code: it.qr_code || it.qrCode || null,
                lot_number: it.lot_number || it.lotNumber || null
            }))
            : Array.from(mergedItems.entries()).map(([productId, quantity]) => ({ productId, quantity }));

        // 2. outbound_items 등록 및 재고 차감, 판매 데이터 준비
        for (const line of lineItems) {
            const productId = line.productId;
            const quantity = line.quantity;

            // 재고 및 가격 확인 (Global Stock)
            const product = await DB.prepare('SELECT current_stock, selling_price, name FROM products WHERE id = ? AND tenant_id = ?')
                .bind(productId, tenantId)
                .first<{ current_stock: number, selling_price: number, name: string }>();

            if (!product) {
                throw new Error(`Product ${productId} not found`);
            }
            // Global Check
            if (product.current_stock < quantity) {
                throw new Error(`상품 '${product.name}'의 전체 재고가 부족합니다.`);
            }

            // Warehouse Stock Check
            const whStock = await DB.prepare('SELECT quantity FROM product_warehouse_stocks WHERE product_id = ? AND warehouse_id = ?')
                .bind(productId, warehouseId).first<{ quantity: number }>();
            const currentWhStock = whStock?.quantity || 0;

            if (currentWhStock < quantity) {
                throw new Error(`상품 '${product.name}'의 선택된 창고(${warehouse.name}) 재고가 부족합니다. (현재: ${currentWhStock})`);
            }

            // 아이템 등록
            const itemResult = await DB.prepare(`
        INSERT INTO outbound_items (
            outbound_order_id, product_id, quantity_ordered, quantity_picked, quantity_packed, status
        ) VALUES (?, ?, ?, ?, ?, 'SHIPPED')
         `).bind(orderId, productId, quantity, quantity, quantity).run();
            const outboundItemId = Number(itemResult.meta.last_row_id);

            // 1) Global 재고 차감
            await DB.prepare('UPDATE products SET current_stock = current_stock - ? WHERE id = ?')
                .bind(quantity, productId).run();

            // 2) Warehouse 재고 차감
            await DB.prepare(`
                UPDATE product_warehouse_stocks 
                SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP 
                WHERE product_id = ? AND warehouse_id = ?
            `).bind(quantity, productId, warehouseId).run();

            // 3) 이동 내역 기록
            await DB.prepare(`
              INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason, notes, created_by)
              VALUES (?, ?, ?, '출고', ?, ?, ?, ?)
            `).bind(
                tenantId, productId, warehouseId, -quantity,
                '간편출고', `Order: ${orderNumber}`, userId
            ).run();

            // 4) Lot/QR 연결 (제조→유통)
            if (line.qr_code || line.lot_number) {
                await linkOutboundItemLot(DB, tenantId, userId, {
                    outbound_item_id: outboundItemId,
                    outbound_order_id: Number(orderId),
                    product_id: productId,
                    quantity,
                    warehouse_id: warehouseId,
                    qr_code: line.qr_code,
                    lot_number: line.lot_number
                });
            }

            // 판매 데이터 수집
            const unitPrice = product.selling_price || 0;
            const subtotal = unitPrice * quantity;
            totalSaleAmount += subtotal;
            salesItems.push({
                productId,
                quantity,
                unitPrice,
                subtotal,
                qr_code: line.qr_code,
                lot_number: line.lot_number,
                outboundItemId
            });
        }

        // 3. outbound_packages 등록 (운송장 번호가 있는 경우)
        if (body.courier && body.trackingNumber) {
            await DB.prepare(`
        INSERT INTO outbound_packages (
          outbound_order_id, courier, tracking_number
        ) VALUES (?, ?, ?)
      `).bind(orderId, body.courier, body.trackingNumber).run();
        }

        // 4. 고객 및 판매 정보 연동
        let customerId: number | null = null;

        // 1) 고객 ID가 직접 전달된 경우 (기존 고객 선택)
        if (body.customerId) {
            const selectedCust = await DB.prepare('SELECT id FROM customers WHERE id = ? AND tenant_id = ?')
                .bind(body.customerId, tenantId).first<{ id: number }>();
            if (selectedCust) customerId = selectedCust.id;
        }

        // 2) 고객 ID가 없고 구매자 정보(buyerName/Phone)가 있는 경우 
        const buyerName = body.buyerName || body.recipient;
        const buyerPhone = body.buyerPhone || body.phone;

        if (!customerId && buyerPhone) {
            // 연락처로 기존 고객 조회
            const existingCust = await DB.prepare('SELECT id FROM customers WHERE phone = ? AND tenant_id = ?')
                .bind(buyerPhone, tenantId).first<{ id: number }>();

            if (existingCust) {
                customerId = existingCust.id;
            } else {
                // 신규 구매자 정보로 고객 생성
                const newCust = await DB.prepare(`
                    INSERT INTO customers (
                        name, phone, address, purchase_path, 
                        total_purchase_amount, purchase_count, tenant_id
                    ) VALUES (?, ?, ?, ?, 0, 0, ?)
                `).bind(
                    buyerName || '미입력',
                    buyerPhone,
                    body.address,
                    body.purchasePath || '기타',
                    tenantId
                ).run();
                customerId = newCust.meta.last_row_id;
            }
        }

        // 고객 정보가 식별된 경우 구매 통계 업데이트 및 Sale 생성
        if (customerId) {
            // 기존 고객: 구매액/횟수 업데이트
            await DB.prepare(`
                UPDATE customers 
                SET total_purchase_amount = total_purchase_amount + ?,
                    purchase_count = purchase_count + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).bind(totalSaleAmount, customerId).run();

            // Sales 테이블 기록 (통계용)
            // 출고 등록이 이미 재고를 차감했으므로, 여기서 생성하는 Sales는 재고 차감을 하지 않아야 함 (Sales API가 아니므로 직접 INSERT)
            const saleResult = await DB.prepare(`
                INSERT INTO sales (
                    tenant_id, customer_id, total_amount, discount_amount, final_amount, 
                    payment_method, notes, created_by, status
                ) VALUES (?, ?, ?, 0, ?, '간편출고', ?, ?, 'completed')
            `).bind(tenantId, customerId, totalSaleAmount, totalSaleAmount, body.memo, userId).run();

            const saleId = saleResult.meta.last_row_id;

            for (const item of salesItems) {
                const si = await DB.prepare(`
                   INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
                   VALUES (?, ?, ?, ?, ?)
               `).bind(saleId, item.productId, item.quantity, item.unitPrice, item.subtotal).run();

                // 출고에서 이미 Lot 잔량 차감했으므로 sale_item_lots만 기록(잔량 재차감 방지)
                if (item.qr_code || item.lot_number) {
                    try {
                        const { resolveTraceUnit, insertDistributionEvent } = await import('../utils/mes-distribution');
                        const unit = await resolveTraceUnit(DB, tenantId, {
                            qr_code: item.qr_code,
                            lot_number: item.lot_number,
                            product_id: item.productId
                        });
                        await DB.prepare(`
                            INSERT INTO sale_item_lots (
                              tenant_id, sale_item_id, sale_id, product_id,
                              mes_lot_id, qr_code_id, lot_number, quantity, created_by
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `).bind(
                            tenantId, si.meta.last_row_id, saleId, item.productId,
                            unit.mes_lot_id, unit.qr_code_id, unit.lot_number, item.quantity, userId
                        ).run();
                        await insertDistributionEvent(DB, tenantId, userId, {
                            event_type: 'sale',
                            product_id: item.productId,
                            lot_number: unit.lot_number,
                            quantity: item.quantity,
                            qr_code_id: unit.qr_code_id,
                            qr_code: unit.qr_code,
                            work_order_id: unit.work_order_id,
                            warehouse_id: warehouseId,
                            reference_type: 'sale',
                            reference_id: Number(saleId),
                            notes: '간편출고 연계 판매 Lot/QR'
                        });
                    } catch (linkErr) {
                        console.error('sale lot link from outbound:', linkErr);
                    }
                }
            }
        }

        return c.json({ success: true, orderId });

    } catch (e: any) {
        console.error('Direct outbound error:', e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

// 대량 출고 등록 (Excel Upload) - PENDING 상태 생성, 재고 차감 X
app.post('/bulk', async (c) => {
    const { DB } = c.env;
    const tenantId = c.get('tenantId');
    const userId = c.get('userId');
    const body = await c.req.json();
    const items = body.items || [];

    if (!Array.isArray(items) || items.length === 0) {
        return c.json({ success: false, error: 'No items provided' }, 400);
    }

    let successCount = 0;
    let failCount = 0;
    const errors: any[] = [];

    // Loop through items (Best effort)
    for (const item of items) {
        try {
            // 필수 필드 체크
            if (!item.productName || !item.quantity || !item.recipient || !item.address) {
                throw new Error('필수 정보 누락 (상품명, 수량, 수령인, 주소)');
            }

            // 1. 상품 찾기 (이름으로)
            // 매칭 정확도를 높이기 위해 SKU 검색도 고려 가능하나, 엑셀은 보통 이름
            const product = await DB.prepare('SELECT id, name, selling_price, current_stock FROM products WHERE name = ? AND tenant_id = ?')
                .bind(item.productName, tenantId).first<{ id: number, name: string, selling_price: number, current_stock: number }>();

            if (!product) {
                throw new Error(`상품을 찾을 수 없습니다: ${item.productName}`);
            }

            // 재고 체크 (경고만 하고 생성은 허용? 아니면 차단? PENDING이므로 생성 허용하되, 나중에 출고 시 막힘)
            // 여기서는 생성 허용.

            // 2. 주문 번호 생성
            // Random suffix to avoid collision in loop
            const orderDate = new Date().toISOString().slice(2, 10).replace(/-/g, '');
            const randomSuffix = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
            const orderNumber = `BU-${orderDate}-${randomSuffix}`;

            // 3. 고객 처리 (전화번호 기준)
            let customerId: number = 0;
            if (item.phone) {
                const existingCust = await DB.prepare('SELECT id FROM customers WHERE phone = ? AND tenant_id = ?')
                    .bind(item.phone, tenantId).first<{ id: number }>();

                if (existingCust) {
                    customerId = existingCust.id;
                } else {
                    const newCust = await DB.prepare(`
                        INSERT INTO customers (name, phone, address, purchase_path, tenant_id)
                        VALUES (?, ?, ?, 'Excel Upload', ?)
                    `).bind(item.recipient, item.phone, item.address, tenantId).run();
                    customerId = newCust.meta.last_row_id;
                }
            }

            // 4. Sales 생성 (Pending Shipment)
            const unitPrice = product.selling_price || 0;
            const subtotal = unitPrice * item.quantity;

            const saleResult = await DB.prepare(`
               INSERT INTO sales (
                   tenant_id, customer_id, total_amount, discount_amount, final_amount, 
                   payment_method, notes, created_by, status
               ) VALUES (?, ?, ?, 0, ?, 'Excel Upload', ?, ?, 'pending_shipment')
            `).bind(tenantId, customerId || null, subtotal, subtotal, item.notes || '', userId).run();
            const saleId = saleResult.meta.last_row_id;

            // Sale Item
            await DB.prepare(`
               INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
               VALUES (?, ?, ?, ?, ?)
            `).bind(saleId, product.id, item.quantity, unitPrice, subtotal).run();

            // 5. Outbound Order 생성 (PENDING)
            // Warehouse ID: 기본값(NULL) 또는 지정. 엑셀에 없으므로 NULL 또는 첫번째 창고?
            // 나중에 출고 처리 시 창고 선택 가능하도록 해야 함. 일단 NULL로 둠.
            const orderResult = await DB.prepare(`
              INSERT INTO outbound_orders (
                tenant_id, order_number, destination_name, destination_address, destination_phone, 
                status, created_by, notes, purchase_path
              ) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, 'Excel Upload')
            `).bind(
                tenantId, orderNumber, item.recipient, item.address, item.phone,
                userId, item.notes || ''
            ).run();
            const orderId = orderResult.meta.last_row_id;

            // Outbound Item
            await DB.prepare(`
                INSERT INTO outbound_items (
                    outbound_order_id, product_id, quantity_ordered, status
                ) VALUES (?, ?, ?, 'PENDING')
             `).bind(orderId, product.id, item.quantity).run();

            // Outbound Package (운송장 있으면 미리 등록)
            if (item.courier && item.trackingNumber) {
                await DB.prepare(`
                    INSERT INTO outbound_packages (outbound_order_id, courier, tracking_number)
                    VALUES (?, ?, ?)
                `).bind(orderId, item.courier, item.trackingNumber).run();
            }

            // Mapping
            await DB.prepare(`
                INSERT INTO outbound_order_mappings (outbound_order_id, sale_id)
                VALUES (?, ?)
            `).bind(orderId, saleId).run();

            successCount++;

        } catch (e: any) {
            console.error('Bulk item error:', e);
            failCount++;
            errors.push({ row: item, error: e.message });
        }
    }

    return c.json({
        success: true,
        data: {
            total: items.length,
            success: successCount,
            fail: failCount,
            errors
        }
    });
});

// 출고 확정 (PENDING -> SHIPPED)
app.post('/:id/ship', async (c) => {
    const { DB } = c.env;
    const tenantId = c.get('tenantId');
    const userId = c.get('userId');
    const id = c.req.param('id');
    const body = await c.req.json(); // { warehouseId: ... } expected

    const warehouseId = body.warehouseId;
    // validation
    if (!warehouseId) return c.json({ success: false, error: 'Warehouse ID is required' }, 400);

    // 1. Order 조회
    const order = await DB.prepare('SELECT * FROM outbound_orders WHERE id = ? AND tenant_id = ?')
        .bind(id, tenantId).first<OutboundOrder & { stock_mode?: string }>();

    if (!order) return c.json({ success: false, error: 'Order not found' }, 404);
    // PENDING: 간편 즉시출고 / PACKING: 피킹·패킹 완료 후 확정
    if (order.status !== 'PENDING' && order.status !== 'PACKING') {
        return c.json({ success: false, error: '출고 확정은 PENDING 또는 PACKING 상태에서만 가능합니다.' }, 400);
    }

    const skipStock = order.stock_mode === 'pre_deducted';

    // 2. Items 조회
    const { results: items } = await DB.prepare(`
        SELECT oi.*, p.name as product_name, p.current_stock
        FROM outbound_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.outbound_order_id = ?
    `).bind(id).all<{
        id: number
        product_id: number
        quantity_ordered: number
        quantity_picked: number
        quantity_packed: number
        product_name: string
        current_stock: number
    }>();

    try {
        // 재고 체크 (사전차감 모드는 스킵)
        if (!skipStock) {
            for (const item of items) {
                const shipQty = order.status === 'PACKING'
                    ? (Number(item.quantity_packed) || Number(item.quantity_picked) || Number(item.quantity_ordered))
                    : Number(item.quantity_ordered)

                if (item.current_stock < shipQty) {
                    throw new Error(`상품 '${item.product_name}'의 재고가 부족합니다.`);
                }
                const whStock = await DB.prepare('SELECT quantity FROM product_warehouse_stocks WHERE product_id = ? AND warehouse_id = ?')
                    .bind(item.product_id, warehouseId).first<{ quantity: number }>();
                const currentWhStock = whStock?.quantity || 0;
                if (currentWhStock < shipQty) {
                    throw new Error(`상품 '${item.product_name}'의 창고 재고가 부족합니다. (현재: ${currentWhStock})`);
                }
            }
        }

        // 재고 차감 및 상태 업데이트
        for (const item of items) {
            const shipQty = order.status === 'PACKING'
                ? (Number(item.quantity_packed) || Number(item.quantity_picked) || Number(item.quantity_ordered))
                : Number(item.quantity_ordered)

            if (!skipStock) {
                await DB.prepare('UPDATE products SET current_stock = current_stock - ? WHERE id = ?')
                    .bind(shipQty, item.product_id).run();

                await DB.prepare(`
                    UPDATE product_warehouse_stocks 
                    SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE product_id = ? AND warehouse_id = ?
                `).bind(shipQty, item.product_id, warehouseId).run();

                await DB.prepare(`
                  INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason, notes, created_by)
                  VALUES (?, ?, ?, '출고', ?, ?, ?, ?)
                `).bind(
                    tenantId, item.product_id, warehouseId, -shipQty,
                    '출고확정', `Order: ${order.order_number}`, userId
                ).run();
            }

            await DB.prepare('UPDATE outbound_items SET status = ?, quantity_picked = ?, quantity_packed = ? WHERE id = ?')
                .bind('SHIPPED', shipQty, shipQty, item.id).run();
        }

        await DB.prepare('UPDATE outbound_orders SET status = ?, warehouse_id = ? WHERE id = ?')
            .bind('SHIPPED', warehouseId, id).run();

        const { results: mappings } = await DB.prepare('SELECT sale_id FROM outbound_order_mappings WHERE outbound_order_id = ?').bind(id).all<{ sale_id: number }>();
        const pkg = await DB.prepare(
            'SELECT courier, tracking_number FROM outbound_packages WHERE outbound_order_id = ? ORDER BY id DESC LIMIT 1'
        ).bind(id).first<{ courier: string; tracking_number: string }>()

        for (const map of mappings) {
            await DB.prepare(`
              UPDATE sales SET status = 'shipped',
                courier = COALESCE(?, courier),
                tracking_number = COALESCE(?, tracking_number),
                warehouse_id = COALESCE(?, warehouse_id),
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).bind(pkg?.courier || null, pkg?.tracking_number || null, warehouseId, map.sale_id).run();
        }

        return c.json({ success: true, data: { stock_skipped: skipStock } });

    } catch (e: any) {
        console.error('Ship error:', e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

// 피킹: 스캔 수량 누적 (PENDING/PICKING)
app.post('/:id/picking', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')
    const body = await c.req.json<PickingRequest>()

    const order = await DB.prepare('SELECT * FROM outbound_orders WHERE id = ? AND tenant_id = ?')
        .bind(id, tenantId).first<OutboundOrder>()
    if (!order) return c.json({ success: false, error: '출고를 찾을 수 없습니다.' }, 404)
    if (order.status !== 'PENDING' && order.status !== 'PICKING') {
        return c.json({ success: false, error: '피킹은 PENDING/PICKING 상태에서만 가능합니다.' }, 400)
    }
    if (!body.items?.length) {
        return c.json({ success: false, error: '피킹 품목이 없습니다.' }, 400)
    }

    for (const pick of body.items) {
        const item = await DB.prepare(`
            SELECT * FROM outbound_items
            WHERE outbound_order_id = ? AND product_id = ?
        `).bind(id, pick.product_id).first<{
            id: number
            quantity_ordered: number
            quantity_picked: number
        }>()
        if (!item) {
            return c.json({ success: false, error: `출고 품목에 없는 상품입니다. (product_id=${pick.product_id})` }, 400)
        }
        const add = Math.max(0, Number(pick.quantity) || 0)
        if (add <= 0) continue
        const nextPicked = Math.min(Number(item.quantity_ordered), Number(item.quantity_picked || 0) + add)
        const itemStatus = nextPicked >= Number(item.quantity_ordered) ? 'PICKED' : 'PENDING'
        await DB.prepare(`
            UPDATE outbound_items SET quantity_picked = ?, status = ? WHERE id = ?
        `).bind(nextPicked, itemStatus, item.id).run()
    }

    const pending = await DB.prepare(`
        SELECT COUNT(*) as cnt FROM outbound_items
        WHERE outbound_order_id = ? AND COALESCE(quantity_picked, 0) < quantity_ordered
    `).bind(id).first<{ cnt: number }>()

    const nextStatus = (pending?.cnt || 0) === 0 ? 'PACKING' : 'PICKING'
    await DB.prepare(`
        UPDATE outbound_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(nextStatus, id).run()

    return c.json({
        success: true,
        message: nextStatus === 'PACKING' ? '피킹이 완료되어 패킹 단계로 이동합니다.' : '피킹이 반영되었습니다.',
        data: { status: nextStatus }
    })
})

// 패킹: 송장 저장 및 PACKING 상태 유지 (출고확정은 /ship)
app.post('/:id/packing', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')
    const body = await c.req.json<PackingRequest>()

    const order = await DB.prepare('SELECT * FROM outbound_orders WHERE id = ? AND tenant_id = ?')
        .bind(id, tenantId).first<OutboundOrder>()
    if (!order) return c.json({ success: false, error: '출고를 찾을 수 없습니다.' }, 404)
    if (order.status !== 'PICKING' && order.status !== 'PACKING' && order.status !== 'PENDING') {
        return c.json({ success: false, error: '패킹은 PENDING/PICKING/PACKING 상태에서만 가능합니다.' }, 400)
    }
    if (!body.tracking_number) {
        return c.json({ success: false, error: '운송장 번호가 필요합니다.' }, 400)
    }

    await DB.prepare(`
        INSERT INTO outbound_packages (outbound_order_id, tracking_number, courier, box_type, box_count, weight)
        VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
        id,
        body.tracking_number,
        body.courier || null,
        body.box_type || null,
        body.box_count || 1,
        body.weight ?? null
    ).run()

    await DB.prepare(`
        UPDATE outbound_items
        SET quantity_packed = CASE
              WHEN COALESCE(quantity_picked, 0) > 0 THEN quantity_picked
              ELSE quantity_ordered
            END,
            status = 'PACKED'
        WHERE outbound_order_id = ?
    `).bind(id).run()

    await DB.prepare(`
        UPDATE outbound_orders SET status = 'PACKING', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(id).run()

    // 연결된 판매에 송장 동기화
    const { results: maps } = await DB.prepare(
        'SELECT sale_id FROM outbound_order_mappings WHERE outbound_order_id = ?'
    ).bind(id).all<{ sale_id: number }>()
    for (const m of maps || []) {
        await DB.prepare(`
          UPDATE sales SET courier = ?, tracking_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).bind(body.courier || null, body.tracking_number, m.sale_id).run()
    }

    return c.json({ success: true, message: '패킹·송장이 저장되었습니다. 출고 확정 단계에서 재고가 차감됩니다.' })
})

// 출고 수정 (배송 정보 등)
app.put('/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')
    const body = await c.req.json()

    // 존재 여부 확인
    const exists = await DB.prepare('SELECT id FROM outbound_orders WHERE id = ? AND tenant_id = ?')
        .bind(id, tenantId).first()

    if (!exists) {
        return c.json({ success: false, error: 'Order not found' }, 404)
    }

    try {
        // 기본 정보 업데이트 (출고일시 포함)
        const updateFields: string[] = []
        const updateValues: any[] = []

        if (body.destination_name !== undefined) {
            updateFields.push('destination_name = ?')
            updateValues.push(body.destination_name)
        }
        if (body.destination_phone !== undefined) {
            updateFields.push('destination_phone = ?')
            updateValues.push(body.destination_phone)
        }
        if (body.destination_address !== undefined) {
            updateFields.push('destination_address = ?')
            updateValues.push(body.destination_address)
        }
        if (body.notes !== undefined) {
            updateFields.push('notes = ?')
            updateValues.push(body.notes)
        }
        if (body.purchase_path !== undefined) {
            updateFields.push('purchase_path = ?')
            updateValues.push(body.purchase_path)
        }
        if (body.created_at !== undefined && body.created_at !== null) {
            updateFields.push('created_at = ?')
            updateValues.push(body.created_at)
        }

        if (updateFields.length > 0) {
            updateValues.push(id)
            await DB.prepare(`
                UPDATE outbound_orders 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `).bind(...updateValues).run()
        }

        // 상품명 및 수량 업데이트 (첫 번째 아이템)
        if (body.product_name !== undefined || body.quantity !== undefined) {
            const firstItem = await DB.prepare('SELECT id, product_id FROM outbound_items WHERE outbound_order_id = ? ORDER BY id LIMIT 1')
                .bind(id).first<{ id: number, product_id: number }>()

            if (firstItem) {
                // 상품명이 변경된 경우, 상품 ID 찾기
                if (body.product_name !== undefined && body.product_name !== '') {
                    const product = await DB.prepare('SELECT id FROM products WHERE name = ? AND tenant_id = ?')
                        .bind(body.product_name, tenantId).first<{ id: number }>()

                    if (product) {
                        await DB.prepare('UPDATE outbound_items SET product_id = ? WHERE id = ?')
                            .bind(product.id, firstItem.id).run()
                    }
                }

                // 수량 업데이트
                if (body.quantity !== undefined && body.quantity !== null) {
                    await DB.prepare('UPDATE outbound_items SET quantity_ordered = ? WHERE id = ?')
                        .bind(body.quantity, firstItem.id).run()
                }
            }
        }

        // 운송장 정보 업데이트 (패키지가 있으면 업데이트, 없으면 생성)
        if (body.courier || body.tracking_number) {
            const pkg = await DB.prepare('SELECT id FROM outbound_packages WHERE outbound_order_id = ?').bind(id).first()

            if (pkg) {
                await DB.prepare(`
                    UPDATE outbound_packages 
                    SET courier = COALESCE(?, courier), 
                        tracking_number = COALESCE(?, tracking_number)
                    WHERE id = ?
                `).bind(body.courier, body.tracking_number, pkg.id).run()
            } else if (body.courier && body.tracking_number) {
                await DB.prepare(`
                    INSERT INTO outbound_packages (outbound_order_id, courier, tracking_number)
                    VALUES (?, ?, ?)
                `).bind(id, body.courier, body.tracking_number).run()
            }
        }

        return c.json({ success: true })
    } catch (e: any) {
        console.error('Update error:', e)
        return c.json({ success: false, error: e.message }, 500)
    }
})

// 출고 삭제 (재고 복구 포함)
app.delete('/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const userId = c.get('userId')
    const id = c.req.param('id')

    // 존재 여부 확인
    const order = await DB.prepare('SELECT id, status, order_number, warehouse_id FROM outbound_orders WHERE id = ? AND tenant_id = ?')
        .bind(id, tenantId).first<{ id: number, status: string, order_number: string, warehouse_id: number }>()

    if (!order) {
        return c.json({ success: false, error: 'Order not found' }, 404)
    }

    try {
        // 1. 재고 복구 (SHIPPED 상태라면 복구)
        // 안심 출고의 경우 등록(Direct) 시 바로 SHIPPED.

        // 아이템 조회
        const { results: items } = await DB.prepare(`
            SELECT product_id, quantity_ordered 
            FROM outbound_items 
            WHERE outbound_order_id = ?
        `).bind(id).all<{ product_id: number, quantity_ordered: number }>()

        if (items && items.length > 0) {
            for (const item of items) {
                const qtyToRestore = item.quantity_ordered // Direct 출고는 ordered = fulfilled 가정

                if (qtyToRestore > 0) {
                    // 1) Global 재고 복구
                    await DB.prepare('UPDATE products SET current_stock = current_stock + ? WHERE id = ?')
                        .bind(qtyToRestore, item.product_id).run()

                    // 2) Warehouse 재고 복구 (warehouse_id가 있는 경우)
                    if (order.warehouse_id) {
                        await DB.prepare(`
                            UPDATE product_warehouse_stocks 
                            SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP 
                            WHERE product_id = ? AND warehouse_id = ?
                        `).bind(qtyToRestore, item.product_id, order.warehouse_id).run();

                        // 3) 이동 내역 기록 (취소/복구)
                        await DB.prepare(`
                          INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, reason, notes, created_by)
                          VALUES (?, ?, ?, '입고', ?, ?, ?, ?)
                        `).bind(
                            tenantId, item.product_id, order.warehouse_id, qtyToRestore,
                            '출고취소', `Order Cancelled: ${order.order_number}`, userId
                        ).run();
                    }
                }
            }
        }

        // 2. 관련 데이터 삭제
        await DB.prepare('DELETE FROM outbound_items WHERE outbound_order_id = ?').bind(id).run()
        await DB.prepare('DELETE FROM outbound_packages WHERE outbound_order_id = ?').bind(id).run()
        await DB.prepare('DELETE FROM outbound_order_mappings WHERE outbound_order_id = ?').bind(id).run()

        // 3. 주문 삭제
        await DB.prepare('DELETE FROM outbound_orders WHERE id = ?').bind(id).run()

        return c.json({ success: true })
    } catch (e: any) {
        console.error('Delete error:', e)
        return c.json({
            success: false,
            error: e.message,
            details: String(e),
            debug: JSON.stringify(e, Object.getOwnPropertyNames(e))
        }, 500)
    }
})

export default app
