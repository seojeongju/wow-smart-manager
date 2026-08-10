import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'
import { fetchDistributionJourney } from '../utils/mes-distribution'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

function generateQrCode() {
  return 'QR-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 11).toUpperCase()
}

function generateLotNumber(prefix = 'LOT') {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const r = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${prefix}-${d}-${r}`
}

async function getWorkOrder(DB: Bindings['DB'], tenantId: number, workOrderId: number) {
  return DB.prepare(`
    SELECT wo.*, p.name as product_name, p.sku as product_sku
    FROM mes_work_orders wo
    JOIN products p ON wo.product_id = p.id
    WHERE wo.id = ? AND wo.tenant_id = ?
  `).bind(workOrderId, tenantId).first<any>()
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

async function insertEvent(
  DB: Bindings['DB'],
  tenantId: number,
  userId: number,
  data: {
    event_type: string
    work_order_id?: number | null
    qr_code_id?: number | null
    qr_code?: string | null
    product_id?: number | null
    lot_number?: string | null
    quantity?: number
    process_id?: number | null
    warehouse_id?: number | null
    related_qr_code_id?: number | null
    production_record_id?: number | null
    notes?: string | null
  }
) {
  await DB.prepare(`
    INSERT INTO mes_trace_events (
      tenant_id, event_type, work_order_id, qr_code_id, qr_code, product_id,
      lot_number, quantity, process_id, warehouse_id, related_qr_code_id,
      production_record_id, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    tenantId,
    data.event_type,
    data.work_order_id || null,
    data.qr_code_id || null,
    data.qr_code || null,
    data.product_id || null,
    data.lot_number || null,
    data.quantity ?? 1,
    data.process_id || null,
    data.warehouse_id || null,
    data.related_qr_code_id || null,
    data.production_record_id || null,
    data.notes || null,
    userId
  ).run()
}

// 생산용 QR 발행 (작업지시 연결)
app.post('/generate', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const body = await c.req.json<any>()

  const workOrderId = Number(body.work_order_id)
  const quantity = Math.min(Math.max(Number(body.quantity) || 1, 1), 100)
  const type = body.type === 'material' ? 'production_material' : 'production_fg'

  if (!workOrderId) {
    return c.json({ success: false, error: '작업지시 ID가 필요합니다.' }, 400)
  }

  const wo = await getWorkOrder(DB, tenantId, workOrderId)
  if (!wo) {
    return c.json({ success: false, error: '작업지시를 찾을 수 없습니다.' }, 404)
  }

  let productId = Number(body.product_id) || Number(wo.product_id)
  if (type === 'production_material') {
    if (!body.product_id) {
      return c.json({ success: false, error: '자재 QR 발행 시 product_id가 필요합니다.' }, 400)
    }
    productId = Number(body.product_id)
    if (wo.bom_id) {
      const inBom = await DB.prepare(`
        SELECT id FROM mes_bom_items
        WHERE bom_id = ? AND tenant_id = ? AND component_product_id = ?
      `).bind(wo.bom_id, tenantId, productId).first()
      if (!inBom) {
        return c.json({ success: false, error: '해당 자재는 이 작업지시 BOM에 없습니다.' }, 400)
      }
    }
  }

  const product = await DB.prepare(
    'SELECT id, name, sku FROM products WHERE id = ? AND tenant_id = ? AND is_active = 1'
  ).bind(productId, tenantId).first<any>()
  if (!product) {
    return c.json({ success: false, error: '상품을 찾을 수 없습니다.' }, 404)
  }

  const lotNumber = body.lot_number?.trim() || generateLotNumber(type === 'production_fg' ? 'FG' : 'MAT')
  const codes: any[] = []

  try {
    for (let i = 0; i < quantity; i++) {
      const code = generateQrCode()
      const serial = body.serial_prefix
        ? `${body.serial_prefix}-${String(i + 1).padStart(3, '0')}`
        : `${wo.wo_number}-${String(i + 1).padStart(3, '0')}`

      const result = await DB.prepare(`
        INSERT INTO qr_codes (
          code, product_id, type, status, batch_number, tenant_id,
          work_order_id, lot_number, serial_number, created_by
        ) VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)
      `).bind(
        code,
        productId,
        type,
        lotNumber,
        tenantId,
        workOrderId,
        lotNumber,
        serial,
        userId
      ).run()

      codes.push({
        id: result.meta.last_row_id,
        code,
        product_id: productId,
        type,
        lot_number: lotNumber,
        serial_number: serial,
        work_order_id: workOrderId
      })

      await insertEvent(DB, tenantId, userId, {
        event_type: 'qr_issue',
        work_order_id: workOrderId,
        qr_code_id: result.meta.last_row_id as number,
        qr_code: code,
        product_id: productId,
        lot_number: lotNumber,
        quantity: 1,
        warehouse_id: wo.warehouse_id,
        notes: type === 'production_fg' ? '완제품 QR 발행' : '자재 QR 발행'
      })
    }

    // Lot 마스터 upsert (수량 누적)
    const existingLot = await DB.prepare(`
      SELECT id, quantity FROM mes_lots
      WHERE tenant_id = ? AND product_id = ? AND lot_number = ?
    `).bind(tenantId, productId, lotNumber).first<{ id: number; quantity: number }>()

    if (existingLot) {
      await DB.prepare(`
        UPDATE mes_lots
        SET quantity = quantity + ?, remaining_quantity = remaining_quantity + ?
        WHERE id = ?
      `).bind(quantity, quantity, existingLot.id).run()
    } else {
      await DB.prepare(`
        INSERT INTO mes_lots (
          tenant_id, product_id, lot_number, work_order_id, quantity, remaining_quantity,
          warehouse_id, manufacture_date, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, DATE('now'), ?)
      `).bind(
        tenantId,
        productId,
        lotNumber,
        workOrderId,
        quantity,
        quantity,
        wo.warehouse_id,
        userId
      ).run()
    }

    return c.json({
      success: true,
      message: `${quantity}개의 생산 QR이 발행되었습니다.`,
      data: { lot_number: lotNumber, codes, product }
    })
  } catch (e: any) {
    console.error(e)
    return c.json({ success: false, error: e.message || 'QR 발행 실패' }, 500)
  }
})

// 자재 투입 스캔
app.post('/material-issue', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const body = await c.req.json<any>()

  const workOrderId = Number(body.work_order_id)
  const qrCode = String(body.qr_code || '').trim()
  const quantity = Number(body.quantity) > 0 ? Number(body.quantity) : 1

  if (!workOrderId || !qrCode) {
    return c.json({ success: false, error: '작업지시와 QR 코드가 필요합니다.' }, 400)
  }

  const wo = await getWorkOrder(DB, tenantId, workOrderId)
  if (!wo) {
    return c.json({ success: false, error: '작업지시를 찾을 수 없습니다.' }, 404)
  }
  if (!['released', 'in_progress'].includes(wo.status)) {
    return c.json({ success: false, error: '확정/진행중 작업지시에서만 자재 투입이 가능합니다.' }, 400)
  }

  const qr = await resolveQr(DB, tenantId, qrCode)
  if (!qr) {
    return c.json({ success: false, error: 'QR 코드를 찾을 수 없습니다.' }, 404)
  }
  if (qr.status !== 'active') {
    return c.json({ success: false, error: '비활성 QR입니다.' }, 400)
  }

  if (wo.bom_id) {
    const inBom = await DB.prepare(`
      SELECT id FROM mes_bom_items
      WHERE bom_id = ? AND tenant_id = ? AND component_product_id = ?
    `).bind(wo.bom_id, tenantId, qr.product_id).first()
    if (!inBom) {
      return c.json({
        success: false,
        error: `BOM에 없는 자재입니다: ${qr.product_name || qr.product_id}`
      }, 400)
    }
  }

  try {
    // 아직 완제품에 묶이지 않은 투입 링크
    await DB.prepare(`
      INSERT INTO mes_lot_links (
        tenant_id, finished_qr_code_id, material_qr_code_id, material_product_id,
        lot_number, quantity, work_order_id, created_by
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      qr.id,
      qr.product_id,
      qr.lot_number || qr.batch_number || null,
      quantity,
      workOrderId,
      userId
    ).run()

    await insertEvent(DB, tenantId, userId, {
      event_type: 'material_issue',
      work_order_id: workOrderId,
      qr_code_id: qr.id,
      qr_code: qr.code,
      product_id: qr.product_id,
      lot_number: qr.lot_number || qr.batch_number,
      quantity,
      warehouse_id: wo.warehouse_id,
      notes: body.notes || '자재 투입 스캔'
    })

    if (wo.status === 'released') {
      await DB.prepare(`
        UPDATE mes_work_orders
        SET status = 'in_progress',
            actual_start_at = COALESCE(actual_start_at, datetime('now')),
            updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?
      `).bind(workOrderId, tenantId).run()
    }

    return c.json({
      success: true,
      message: '자재 투입이 기록되었습니다.',
      data: {
        qr_code: qr.code,
        product_name: qr.product_name,
        lot_number: qr.lot_number || qr.batch_number,
        quantity
      }
    })
  } catch (e: any) {
    console.error(e)
    return c.json({ success: false, error: e.message || '자재 투입 실패' }, 500)
  }
})

// 공정 완료 스캔
app.post('/process-complete', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const body = await c.req.json<any>()

  const workOrderId = Number(body.work_order_id)
  const qrCode = String(body.qr_code || '').trim()
  const processId = body.process_id ? Number(body.process_id) : null

  if (!workOrderId) {
    return c.json({ success: false, error: '작업지시 ID가 필요합니다.' }, 400)
  }

  const wo = await getWorkOrder(DB, tenantId, workOrderId)
  if (!wo) {
    return c.json({ success: false, error: '작업지시를 찾을 수 없습니다.' }, 404)
  }

  let qr: any = null
  if (qrCode) {
    qr = await resolveQr(DB, tenantId, qrCode)
    if (!qr) {
      return c.json({ success: false, error: 'QR 코드를 찾을 수 없습니다.' }, 404)
    }
  }

  const pid = processId || wo.process_id || null
  let processName: string | null = null
  if (pid) {
    const proc = await DB.prepare(
      'SELECT name FROM mes_processes WHERE id = ? AND tenant_id = ?'
    ).bind(pid, tenantId).first<{ name: string }>()
    processName = proc?.name || null
  }

  await insertEvent(DB, tenantId, userId, {
    event_type: 'process_complete',
    work_order_id: workOrderId,
    qr_code_id: qr?.id || null,
    qr_code: qr?.code || null,
    product_id: qr?.product_id || wo.product_id,
    lot_number: qr?.lot_number || null,
    quantity: Number(body.quantity) || 1,
    process_id: pid,
    warehouse_id: wo.warehouse_id,
    notes: body.notes || (processName ? `공정 완료: ${processName}` : '공정 완료')
  })

  if (wo.status === 'released') {
    await DB.prepare(`
      UPDATE mes_work_orders
      SET status = 'in_progress',
          actual_start_at = COALESCE(actual_start_at, datetime('now')),
          updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(workOrderId, tenantId).run()
  }

  return c.json({
    success: true,
    message: '공정 완료가 기록되었습니다.',
    data: { process_id: pid, process_name: processName, qr_code: qr?.code || null }
  })
})

// 완제품 포장/라벨 연결 (+ 미연결 자재 링크 묶기)
app.post('/fg-pack', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const body = await c.req.json<any>()

  const workOrderId = Number(body.work_order_id)
  const quantity = Number(body.quantity) > 0 ? Number(body.quantity) : 1
  const createQr = body.create_qr !== false

  if (!workOrderId) {
    return c.json({ success: false, error: '작업지시 ID가 필요합니다.' }, 400)
  }

  const wo = await getWorkOrder(DB, tenantId, workOrderId)
  if (!wo) {
    return c.json({ success: false, error: '작업지시를 찾을 수 없습니다.' }, 404)
  }
  if (!['released', 'in_progress', 'completed'].includes(wo.status)) {
    return c.json({ success: false, error: '포장 가능한 작업지시 상태가 아닙니다.' }, 400)
  }

  try {
    let qr: any = null
    const lotNumber = body.lot_number?.trim() || generateLotNumber('FG')

    if (body.qr_code) {
      qr = await resolveQr(DB, tenantId, String(body.qr_code).trim())
      if (!qr) {
        return c.json({ success: false, error: 'QR 코드를 찾을 수 없습니다.' }, 404)
      }
      if (Number(qr.product_id) !== Number(wo.product_id)) {
        return c.json({ success: false, error: 'QR 상품과 작업지시 완제품이 일치하지 않습니다.' }, 400)
      }
      await DB.prepare(`
        UPDATE qr_codes
        SET work_order_id = ?, lot_number = COALESCE(lot_number, ?),
            batch_number = COALESCE(batch_number, ?),
            tenant_id = COALESCE(tenant_id, ?),
            type = CASE WHEN type = 'product' THEN 'production_fg' ELSE type END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(workOrderId, lotNumber, lotNumber, tenantId, qr.id).run()
      qr.lot_number = qr.lot_number || lotNumber
    } else if (createQr) {
      const code = generateQrCode()
      const serial = `${wo.wo_number}-P${Date.now().toString().slice(-4)}`
      const result = await DB.prepare(`
        INSERT INTO qr_codes (
          code, product_id, type, status, batch_number, tenant_id,
          work_order_id, lot_number, serial_number, created_by
        ) VALUES (?, ?, 'production_fg', 'active', ?, ?, ?, ?, ?, ?)
      `).bind(
        code, wo.product_id, lotNumber, tenantId, workOrderId, lotNumber, serial, userId
      ).run()
      qr = {
        id: result.meta.last_row_id,
        code,
        product_id: wo.product_id,
        lot_number: lotNumber,
        serial_number: serial
      }
    } else {
      return c.json({ success: false, error: 'QR 코드가 없거나 생성 옵션이 꺼져 있습니다.' }, 400)
    }

    // 미연결 자재 투입을 이 완제품 QR에 연결
    await DB.prepare(`
      UPDATE mes_lot_links
      SET finished_qr_code_id = ?
      WHERE tenant_id = ? AND work_order_id = ? AND finished_qr_code_id IS NULL
    `).bind(qr.id, tenantId, workOrderId).run()

    const existingLot = await DB.prepare(`
      SELECT id FROM mes_lots
      WHERE tenant_id = ? AND product_id = ? AND lot_number = ?
    `).bind(tenantId, wo.product_id, lotNumber).first<{ id: number }>()

    if (existingLot) {
      await DB.prepare(`
        UPDATE mes_lots
        SET quantity = quantity + ?, remaining_quantity = remaining_quantity + ?,
            work_order_id = COALESCE(work_order_id, ?)
        WHERE id = ?
      `).bind(quantity, quantity, workOrderId, existingLot.id).run()
    } else {
      await DB.prepare(`
        INSERT INTO mes_lots (
          tenant_id, product_id, lot_number, work_order_id, quantity, remaining_quantity,
          warehouse_id, manufacture_date, created_by, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, DATE('now'), ?, ?)
      `).bind(
        tenantId,
        wo.product_id,
        lotNumber,
        workOrderId,
        quantity,
        quantity,
        wo.warehouse_id,
        userId,
        body.notes || '완제품 포장'
      ).run()
    }

    await insertEvent(DB, tenantId, userId, {
      event_type: 'fg_pack',
      work_order_id: workOrderId,
      qr_code_id: qr.id,
      qr_code: qr.code,
      product_id: wo.product_id,
      lot_number: lotNumber,
      quantity,
      warehouse_id: wo.warehouse_id,
      notes: body.notes || '완제품 포장/라벨'
    })

    return c.json({
      success: true,
      message: '완제품 포장 및 추적이 연결되었습니다.',
      data: {
        qr_code: qr.code,
        lot_number: lotNumber,
        serial_number: qr.serial_number,
        quantity
      }
    })
  } catch (e: any) {
    console.error(e)
    return c.json({ success: false, error: e.message || '포장 처리 실패' }, 500)
  }
})

// 역추적 조회
app.get('/lookup/:code', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const code = c.req.param('code')

  const qr = await resolveQr(DB, tenantId, code)
  if (!qr) {
    return c.json({ success: false, error: 'QR 코드를 찾을 수 없습니다.' }, 404)
  }

  let workOrder = null
  if (qr.work_order_id) {
    workOrder = await getWorkOrder(DB, tenantId, qr.work_order_id)
  }

  // 완제품 QR → 투입 자재
  const { results: materials } = await DB.prepare(`
    SELECT ll.*,
      mp.name as material_name, mp.sku as material_sku,
      mqc.code as material_qr_code, mqc.lot_number as material_qr_lot
    FROM mes_lot_links ll
    JOIN products mp ON ll.material_product_id = mp.id
    LEFT JOIN qr_codes mqc ON ll.material_qr_code_id = mqc.id
    WHERE ll.tenant_id = ? AND ll.finished_qr_code_id = ?
    ORDER BY ll.created_at ASC
  `).bind(tenantId, qr.id).all()

  // 자재 QR → 사용된 완제품
  const { results: usedIn } = await DB.prepare(`
    SELECT ll.*,
      fqc.code as finished_qr_code, fqc.lot_number as finished_lot,
      fp.name as finished_name, fp.sku as finished_sku
    FROM mes_lot_links ll
    LEFT JOIN qr_codes fqc ON ll.finished_qr_code_id = fqc.id
    LEFT JOIN products fp ON fqc.product_id = fp.id
    WHERE ll.tenant_id = ? AND ll.material_qr_code_id = ?
    ORDER BY ll.created_at DESC
  `).bind(tenantId, qr.id).all()

  const { results: events } = await DB.prepare(`
    SELECT e.*, pr.name as process_name, u.name as created_by_name
    FROM mes_trace_events e
    LEFT JOIN mes_processes pr ON e.process_id = pr.id
    LEFT JOIN users u ON e.created_by = u.id
    WHERE e.tenant_id = ? AND (e.qr_code_id = ? OR e.qr_code = ?)
    ORDER BY e.created_at DESC
    LIMIT 100
  `).bind(tenantId, qr.id, qr.code).all()

  let woEvents: any[] = []
  if (qr.work_order_id) {
    const { results } = await DB.prepare(`
      SELECT e.*, pr.name as process_name, u.name as created_by_name
      FROM mes_trace_events e
      LEFT JOIN mes_processes pr ON e.process_id = pr.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.tenant_id = ? AND e.work_order_id = ?
      ORDER BY e.created_at ASC
      LIMIT 200
    `).bind(tenantId, qr.work_order_id).all()
    woEvents = results || []
  }

  const distribution = await fetchDistributionJourney(DB, tenantId, {
    qr_code_id: qr.id,
    lot_number: qr.lot_number || qr.batch_number || null,
    product_id: qr.product_id
  })

  return c.json({
    success: true,
    data: {
      qr: {
        id: qr.id,
        code: qr.code,
        type: qr.type,
        status: qr.status,
        lot_number: qr.lot_number || qr.batch_number,
        serial_number: qr.serial_number,
        product_id: qr.product_id,
        product_name: qr.product_name,
        product_sku: qr.product_sku,
        work_order_id: qr.work_order_id,
        created_at: qr.created_at
      },
      work_order: workOrder,
      materials: materials || [],
      used_in: usedIn || [],
      events: events || [],
      work_order_timeline: woEvents,
      distribution
    }
  })
})

// 통합 여정 조회 (제조→출고→판매→클레임)
app.get('/journey/:code', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const code = c.req.param('code')

  const qr = await resolveQr(DB, tenantId, code)
  if (!qr) {
    // Lot 번호로도 조회 허용
    const lot = await DB.prepare(`
      SELECT l.*, p.name as product_name, p.sku as product_sku
      FROM mes_lots l
      JOIN products p ON l.product_id = p.id
      WHERE l.tenant_id = ? AND l.lot_number = ?
      LIMIT 1
    `).bind(tenantId, code).first<any>()

    if (!lot) {
      return c.json({ success: false, error: 'QR 또는 Lot을 찾을 수 없습니다.' }, 404)
    }

    const distribution = await fetchDistributionJourney(DB, tenantId, {
      lot_number: lot.lot_number,
      product_id: lot.product_id
    })

    const { results: events } = await DB.prepare(`
      SELECT e.*, u.name as created_by_name
      FROM mes_trace_events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.tenant_id = ? AND e.lot_number = ?
      ORDER BY e.created_at ASC
      LIMIT 200
    `).bind(tenantId, lot.lot_number).all()

    return c.json({
      success: true,
      data: {
        mode: 'lot',
        lot,
        distribution,
        events: events || []
      }
    })
  }

  const distribution = await fetchDistributionJourney(DB, tenantId, {
    qr_code_id: qr.id,
    lot_number: qr.lot_number || null,
    product_id: qr.product_id
  })

  const { results: events } = await DB.prepare(`
    SELECT e.*, u.name as created_by_name
    FROM mes_trace_events e
    LEFT JOIN users u ON e.created_by = u.id
    WHERE e.tenant_id = ? AND (e.qr_code_id = ? OR e.qr_code = ? OR e.lot_number = ?)
    ORDER BY e.created_at ASC
    LIMIT 200
  `).bind(tenantId, qr.id, qr.code, qr.lot_number || '').all()

  let workOrder = null
  if (qr.work_order_id) {
    workOrder = await getWorkOrder(DB, tenantId, qr.work_order_id)
  }

  return c.json({
    success: true,
    data: {
      mode: 'qr',
      qr: {
        id: qr.id,
        code: qr.code,
        lot_number: qr.lot_number,
        product_id: qr.product_id,
        product_name: qr.product_name,
        product_sku: qr.product_sku,
        work_order_id: qr.work_order_id
      },
      work_order: workOrder,
      distribution,
      events: events || []
    }
  })
})

// 작업지시 타임라인
app.get('/work-orders/:id/timeline', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const wo = await getWorkOrder(DB, tenantId, Number(id))
  if (!wo) {
    return c.json({ success: false, error: '작업지시를 찾을 수 없습니다.' }, 404)
  }

  const { results: events } = await DB.prepare(`
    SELECT e.*, pr.name as process_name, u.name as created_by_name,
      p.name as product_name
    FROM mes_trace_events e
    LEFT JOIN mes_processes pr ON e.process_id = pr.id
    LEFT JOIN users u ON e.created_by = u.id
    LEFT JOIN products p ON e.product_id = p.id
    WHERE e.tenant_id = ? AND e.work_order_id = ?
    ORDER BY e.created_at ASC
  `).bind(tenantId, id).all()

  const { results: codes } = await DB.prepare(`
    SELECT id, code, type, lot_number, serial_number, product_id, status, created_at
    FROM qr_codes
    WHERE tenant_id = ? AND work_order_id = ?
    ORDER BY created_at DESC
  `).bind(tenantId, id).all()

  const { results: pendingMaterials } = await DB.prepare(`
    SELECT ll.*, p.name as material_name, p.sku as material_sku, qc.code as material_qr_code
    FROM mes_lot_links ll
    JOIN products p ON ll.material_product_id = p.id
    LEFT JOIN qr_codes qc ON ll.material_qr_code_id = qc.id
    WHERE ll.tenant_id = ? AND ll.work_order_id = ? AND ll.finished_qr_code_id IS NULL
    ORDER BY ll.created_at DESC
  `).bind(tenantId, id).all()

  return c.json({
    success: true,
    data: {
      work_order: wo,
      events: events || [],
      qr_codes: codes || [],
      pending_materials: pendingMaterials || []
    }
  })
})

// Lot 목록
app.get('/lots', async (c) => {
  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const search = c.req.query('search') || ''

  let query = `
    SELECT l.*, p.name as product_name, p.sku as product_sku,
      wo.wo_number, w.name as warehouse_name
    FROM mes_lots l
    JOIN products p ON l.product_id = p.id
    LEFT JOIN mes_work_orders wo ON l.work_order_id = wo.id
    LEFT JOIN warehouses w ON l.warehouse_id = w.id
    WHERE l.tenant_id = ?
  `
  const params: any[] = [tenantId]
  if (search) {
    query += ' AND (l.lot_number LIKE ? OR p.name LIKE ? OR p.sku LIKE ? OR wo.wo_number LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }
  query += ' ORDER BY l.created_at DESC LIMIT 200'

  const { results } = await DB.prepare(query).bind(...params).all()
  return c.json({ success: true, data: results })
})

export default app
