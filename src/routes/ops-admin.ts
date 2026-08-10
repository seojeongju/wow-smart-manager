import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'
import { denyIfNoPermission, permissionsForRole, ROLE_LABELS, ASSIGNABLE_ROLES } from '../utils/rbac'
import { writeAuditLog } from '../utils/audit'
import { hashPassword } from '../utils/auth'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 현재 역할·권한·역할 라벨
app.get('/rbac/me', async (c) => {
  const role = c.get('userRole')
  return c.json({
    success: true,
    data: {
      role,
      permissions: permissionsForRole(role),
      role_labels: ROLE_LABELS,
      assignable_roles: ASSIGNABLE_ROLES
    }
  })
})

// 감사 로그 조회
app.get('/audit-logs', async (c) => {
  const denied = denyIfNoPermission(c, 'audit.read')
  if (denied) return denied

  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const limit = Math.min(Math.max(Number(c.req.query('limit') || 50), 1), 200)
  const offset = Math.max(Number(c.req.query('offset') || 0), 0)
  const action = (c.req.query('action') || '').trim()

  let where = 'WHERE a.tenant_id = ?'
  const params: any[] = [tenantId]
  if (action) {
    where += ' AND a.action LIKE ?'
    params.push(`%${action}%`)
  }

  const { results } = await DB.prepare(`
    SELECT a.*, u.name as user_name, u.email as user_email
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.user_id
    ${where}
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT ? OFFSET ?
  `).bind(...params, limit, offset).all()

  const countRow = await DB.prepare(`
    SELECT COUNT(*) as cnt FROM audit_logs a ${where}
  `).bind(...params).first<{ cnt: number }>()

  return c.json({
    success: true,
    data: results || [],
    total: countRow?.cnt || 0
  })
})

// 파일럿 시나리오 안내 (정적)
app.get('/demo/scenario', async (c) => {
  const denied = denyIfNoPermission(c, 'demo.manage')
  if (denied) return denied

  return c.json({
    success: true,
    data: {
      title: '스마트제조 파일럿 시나리오',
      steps: [
        { step: 1, title: '데모 데이터 생성', desc: '설정 > 데모/파일럿에서 시드 실행' },
        { step: 2, title: '기준정보 확인', desc: '공정·BOM·설비가 DEMO 접두로 생성됨' },
        { step: 3, title: '작업지시 확정', desc: '제조실행 > 작업지시에서 DEMO-WO 상태를 확정/시작' },
        { step: 4, title: '현장 실행', desc: '현장 실행에서 자재 투입 → 공정 완료 → 포장 → 실적' },
        { step: 5, title: '품질·KPI', desc: '품질검사 등록 후 제조 현황 KPI 확인' },
        { step: 6, title: '역추적', desc: '완제품 QR로 투입 자재·작업자·일시 조회' }
      ],
      demo_users: [
        { email: 'floor@demo.local', role: 'FLOOR', password: 'demo1234' },
        { email: 'production@demo.local', role: 'PRODUCTION', password: 'demo1234' },
        { email: 'sales@demo.local', role: 'SALES', password: 'demo1234' },
        { email: 'management@demo.local', role: 'MANAGEMENT', password: 'demo1234' }
      ]
    }
  })
})

async function ensureWarehouse(DB: Bindings['DB'], tenantId: number) {
  const wh = await DB.prepare(
    'SELECT id FROM warehouses WHERE tenant_id = ? AND is_active = 1 ORDER BY id ASC LIMIT 1'
  ).bind(tenantId).first<{ id: number }>()
  if (wh) return wh.id

  const r = await DB.prepare(`
    INSERT INTO warehouses (tenant_id, name, location, description, is_active)
    VALUES (?, 'DEMO-본창', '본사', '파일럿 데모 창고', 1)
  `).bind(tenantId).run()
  return Number(r.meta.last_row_id)
}

async function ensureDemoProduct(
  DB: Bindings['DB'],
  tenantId: number,
  sku: string,
  name: string,
  stock: number
) {
  const existing = await DB.prepare(
    'SELECT id FROM products WHERE tenant_id = ? AND sku = ?'
  ).bind(tenantId, sku).first<{ id: number }>()
  if (existing) return existing.id

  const r = await DB.prepare(`
    INSERT INTO products (
      tenant_id, sku, name, category, purchase_price, selling_price,
      current_stock, min_stock_alert, is_active
    ) VALUES (?, ?, ?, 'DEMO', 1000, 3000, ?, 10, 1)
  `).bind(tenantId, sku, name, stock).run()
  return Number(r.meta.last_row_id)
}

async function ensureDemoUser(
  DB: Bindings['DB'],
  tenantId: number,
  email: string,
  name: string,
  role: string,
  password: string
) {
  const existing = await DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email).first<{ id: number }>()
  if (existing) {
    await DB.prepare('UPDATE users SET role = ?, tenant_id = ? WHERE id = ?')
      .bind(role, tenantId, existing.id).run()
    return existing.id
  }
  const hash = await hashPassword(password)
  const r = await DB.prepare(`
    INSERT INTO users (tenant_id, email, name, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
  `).bind(tenantId, email, name, hash, role).run()
  return Number(r.meta.last_row_id)
}

// 데모 시드
app.post('/demo/seed', async (c) => {
  const denied = denyIfNoPermission(c, 'demo.manage')
  if (denied) return denied

  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')

  try {
    const warehouseId = await ensureWarehouse(DB, tenantId)

    const fgId = await ensureDemoProduct(DB, tenantId, `DEMO-T${tenantId}-FG-001`, 'DEMO 완제품 A', 0)
    const matId = await ensureDemoProduct(DB, tenantId, `DEMO-T${tenantId}-MAT-001`, 'DEMO 원자재 B', 500)

    // 창고 재고
    const stockRow = await DB.prepare(`
      SELECT id, quantity FROM product_warehouse_stocks
      WHERE product_id = ? AND warehouse_id = ?
    `).bind(matId, warehouseId).first<{ id: number; quantity: number }>()
    if (stockRow) {
      if (Number(stockRow.quantity) < 500) {
        await DB.prepare('UPDATE product_warehouse_stocks SET quantity = 500 WHERE id = ?')
          .bind(stockRow.id).run()
      }
    } else {
      await DB.prepare(`
        INSERT INTO product_warehouse_stocks (tenant_id, product_id, warehouse_id, quantity)
        VALUES (?, ?, ?, 500)
      `).bind(tenantId, matId, warehouseId).run()
    }

    // 공정
    let assembleId: number | null = null
    let packId: number | null = null
    const procAssemble = await DB.prepare(
      "SELECT id FROM mes_processes WHERE tenant_id = ? AND code = 'DEMO-ASM'"
    ).bind(tenantId).first<{ id: number }>()
    if (procAssemble) assembleId = procAssemble.id
    else {
      const r = await DB.prepare(`
        INSERT INTO mes_processes (tenant_id, code, name, sort_order, standard_minutes, is_active)
        VALUES (?, 'DEMO-ASM', 'DEMO 조립', 1, 30, 1)
      `).bind(tenantId).run()
      assembleId = Number(r.meta.last_row_id)
    }
    const procPack = await DB.prepare(
      "SELECT id FROM mes_processes WHERE tenant_id = ? AND code = 'DEMO-PACK'"
    ).bind(tenantId).first<{ id: number }>()
    if (procPack) packId = procPack.id
    else {
      const r = await DB.prepare(`
        INSERT INTO mes_processes (tenant_id, code, name, sort_order, standard_minutes, is_active)
        VALUES (?, 'DEMO-PACK', 'DEMO 포장', 2, 15, 1)
      `).bind(tenantId).run()
      packId = Number(r.meta.last_row_id)
    }

    // 설비
    const eq = await DB.prepare(
      "SELECT id FROM mes_equipment WHERE tenant_id = ? AND code = 'DEMO-EQ1'"
    ).bind(tenantId).first<{ id: number }>()
    let equipmentId = eq?.id
    if (!equipmentId) {
      const r = await DB.prepare(`
        INSERT INTO mes_equipment (tenant_id, code, name, status, is_active)
        VALUES (?, 'DEMO-EQ1', 'DEMO 조립라인 1', 'idle', 1)
      `).bind(tenantId).run()
      equipmentId = Number(r.meta.last_row_id)
    }

    // BOM
    let bomId: number | null = null
    const bom = await DB.prepare(
      "SELECT id FROM mes_boms WHERE tenant_id = ? AND name = 'DEMO-BOM-A' AND is_active = 1"
    ).bind(tenantId).first<{ id: number }>()
    if (bom) bomId = bom.id
    else {
      const r = await DB.prepare(`
        INSERT INTO mes_boms (tenant_id, product_id, name, version, is_active)
        VALUES (?, ?, 'DEMO-BOM-A', '1.0', 1)
      `).bind(tenantId, fgId).run()
      bomId = Number(r.meta.last_row_id)
      await DB.prepare(`
        INSERT INTO mes_bom_items (tenant_id, bom_id, component_product_id, quantity, unit, sort_order)
        VALUES (?, ?, ?, 2, 'EA', 1)
      `).bind(tenantId, bomId, matId).run()
    }

    // 작업지시
    const woNumber = 'DEMO-WO-' + new Date().toISOString().slice(0, 10).replace(/-/g, '')
    let wo = await DB.prepare(
      'SELECT id FROM mes_work_orders WHERE tenant_id = ? AND wo_number = ?'
    ).bind(tenantId, woNumber).first<{ id: number }>()
    let woId = wo?.id
    if (!woId) {
      const r = await DB.prepare(`
        INSERT INTO mes_work_orders (
          tenant_id, wo_number, product_id, bom_id, process_id, planned_qty,
          status, warehouse_id, equipment_id, created_by
        ) VALUES (?, ?, ?, ?, ?, 10, 'released', ?, ?, ?)
      `).bind(tenantId, woNumber, fgId, bomId, assembleId, warehouseId, equipmentId, userId).run()
      woId = Number(r.meta.last_row_id)
    }

    // 역할별 데모 사용자
    await ensureDemoUser(DB, tenantId, 'floor@demo.local', '데모현장', 'FLOOR', 'demo1234')
    await ensureDemoUser(DB, tenantId, 'production@demo.local', '데모생산', 'PRODUCTION', 'demo1234')
    await ensureDemoUser(DB, tenantId, 'sales@demo.local', '데모영업', 'SALES', 'demo1234')
    await ensureDemoUser(DB, tenantId, 'management@demo.local', '데모경영', 'MANAGEMENT', 'demo1234')

    await writeAuditLog(DB, {
      tenantId,
      userId,
      action: 'demo.seed',
      entityType: 'demo',
      entityId: woId,
      meta: { wo_number: woNumber, fg_id: fgId, mat_id: matId },
      ip: c.req.header('cf-connecting-ip') || null
    })

    return c.json({
      success: true,
      message: '데모 데이터가 준비되었습니다.',
      data: {
        warehouse_id: warehouseId,
        product_fg_id: fgId,
        product_mat_id: matId,
        bom_id: bomId,
        process_assemble_id: assembleId,
        process_pack_id: packId,
        equipment_id: equipmentId,
        work_order_id: woId,
        wo_number: woNumber,
        demo_users: [
          'floor@demo.local / demo1234 (FLOOR)',
          'production@demo.local / demo1234 (PRODUCTION)',
          'sales@demo.local / demo1234 (SALES)',
          'management@demo.local / demo1234 (MANAGEMENT)'
        ]
      }
    })
  } catch (e: any) {
    console.error('demo seed error', e)
    return c.json({ success: false, error: e.message || '데모 시드 실패' }, 500)
  }
})

// 데모 데이터 정리 (DEMO 접두만)
app.post('/demo/reset', async (c) => {
  const denied = denyIfNoPermission(c, 'demo.manage')
  if (denied) return denied

  const { DB } = c.env
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')

  try {
    const { results: wos } = await DB.prepare(
      "SELECT id FROM mes_work_orders WHERE tenant_id = ? AND wo_number LIKE 'DEMO-%'"
    ).bind(tenantId).all<{ id: number }>()
    const woIds = (wos || []).map((w) => w.id)

    for (const id of woIds) {
      await DB.prepare('DELETE FROM mes_production_records WHERE tenant_id = ? AND work_order_id = ?')
        .bind(tenantId, id).run()
      await DB.prepare('DELETE FROM mes_trace_events WHERE tenant_id = ? AND work_order_id = ?')
        .bind(tenantId, id).run()
      await DB.prepare('DELETE FROM mes_lots WHERE tenant_id = ? AND work_order_id = ?')
        .bind(tenantId, id).run().catch(() => {})
    }
    await DB.prepare("DELETE FROM mes_work_orders WHERE tenant_id = ? AND wo_number LIKE 'DEMO-%'")
      .bind(tenantId).run()

    const { results: boms } = await DB.prepare(
      "SELECT id FROM mes_boms WHERE tenant_id = ? AND name LIKE 'DEMO-%'"
    ).bind(tenantId).all<{ id: number }>()
    for (const b of boms || []) {
      await DB.prepare('DELETE FROM mes_bom_items WHERE tenant_id = ? AND bom_id = ?')
        .bind(tenantId, b.id).run()
    }
    await DB.prepare("DELETE FROM mes_boms WHERE tenant_id = ? AND name LIKE 'DEMO-%'")
      .bind(tenantId).run()

    await DB.prepare("DELETE FROM mes_processes WHERE tenant_id = ? AND code LIKE 'DEMO-%'")
      .bind(tenantId).run()
    await DB.prepare("DELETE FROM mes_equipment WHERE tenant_id = ? AND code LIKE 'DEMO-%'")
      .bind(tenantId).run()

    // DEMO 상품/QR (테넌트 내)
    const { results: products } = await DB.prepare(
      "SELECT id FROM products WHERE tenant_id = ? AND sku LIKE 'DEMO-%'"
    ).bind(tenantId).all<{ id: number }>()
    for (const p of products || []) {
      await DB.prepare('DELETE FROM product_warehouse_stocks WHERE tenant_id = ? AND product_id = ?')
        .bind(tenantId, p.id).run()
      await DB.prepare('DELETE FROM qr_codes WHERE product_id = ?')
        .bind(p.id).run().catch(() => {})
    }
    await DB.prepare("DELETE FROM products WHERE tenant_id = ? AND sku LIKE 'DEMO-%'")
      .bind(tenantId).run()

    // 데모 사용자 (이메일 도메인)
    await DB.prepare("DELETE FROM users WHERE tenant_id = ? AND email LIKE '%@demo.local'")
      .bind(tenantId).run()

    await writeAuditLog(DB, {
      tenantId,
      userId,
      action: 'demo.reset',
      entityType: 'demo',
      entityId: 'all',
      meta: { removed_work_orders: woIds.length },
      ip: c.req.header('cf-connecting-ip') || null
    })

    return c.json({ success: true, message: 'DEMO 접두 데이터가 정리되었습니다.' })
  } catch (e: any) {
    console.error('demo reset error', e)
    return c.json({ success: false, error: e.message || '데모 리셋 실패' }, 500)
  }
})

export default app
