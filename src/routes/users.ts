import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'
import { checkPlanLimit } from '../utils/subscription'
import { hashPassword } from '../utils/auth'
import { denyIfNoPermission, normalizeRole, ROLE_LABELS } from '../utils/rbac'
import { writeAuditLog } from '../utils/audit'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 현재 사용자 정보 조회
app.get('/me', async (c) => {
    const { DB } = c.env
    const userId = c.get('userId')

    if (!userId) {
        return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const user = await DB.prepare(`
        SELECT u.*, t.name as tenant_name, t.plan_type 
        FROM users u 
        JOIN tenants t ON u.tenant_id = t.id 
        WHERE u.id = ?
    `).bind(userId).first()

    if (!user) {
        return c.json({ success: false, error: 'User not found' }, 404)
    }

    return c.json({ success: true, data: user })
})

// 사용자 목록 조회 (같은 테넌트)
app.get('/', async (c) => {
    const denied = denyIfNoPermission(c, 'admin.settings')
    if (denied) return denied

    const { DB } = c.env
    const tenantId = c.get('tenantId')

    const { results } = await DB.prepare(`
        SELECT id, email, name, role, created_at 
        FROM users 
        WHERE tenant_id = ?
        ORDER BY created_at DESC
    `).bind(tenantId).all()

    return c.json({
        success: true,
        data: results,
        role_labels: ROLE_LABELS
    })
})

// 사용자 추가 (초대)
app.post('/', async (c) => {
    const denied = denyIfNoPermission(c, 'admin.settings')
    if (denied) return denied

    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const actorId = c.get('userId')

    const body = await c.req.json<{
        email: string;
        name: string;
        password: string;
        role?: string;
    }>()

    if (!body.email || !body.name || !body.password) {
        return c.json({ success: false, error: '필수 항목을 입력해주세요.' }, 400)
    }

    const role = normalizeRole(body.role || 'USER')
    if (!['ADMIN', 'MANAGEMENT', 'PRODUCTION', 'FLOOR', 'SALES', 'USER'].includes(role)) {
        return c.json({ success: false, error: '부여할 수 없는 역할입니다.' }, 400)
    }

    const limitCheck = await checkPlanLimit(DB, tenantId, 'users')
    if (!limitCheck.allowed) {
        return c.json({ success: false, error: limitCheck.error }, 403)
    }

    const existing = await DB.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first()
    if (existing) {
        return c.json({ success: false, error: '이미 존재하는 이메일입니다.' }, 400)
    }

    try {
        const passwordHash = await hashPassword(body.password)

        const result = await DB.prepare(`
            INSERT INTO users (tenant_id, email, name, password_hash, role)
            VALUES (?, ?, ?, ?, ?)
        `).bind(
            tenantId,
            body.email,
            body.name,
            passwordHash,
            role
        ).run()

        await writeAuditLog(DB, {
            tenantId,
            userId: actorId,
            action: 'user.create',
            entityType: 'user',
            entityId: result.meta.last_row_id,
            meta: { email: body.email, role },
            ip: c.req.header('cf-connecting-ip') || null
        })

        return c.json({ success: true, message: '사용자가 추가되었습니다.' })
    } catch (e) {
        console.error(e)
        return c.json({ success: false, error: '사용자 추가 중 오류가 발생했습니다.' }, 500)
    }
})

// 사용자 정보 수정
app.put('/:id', async (c) => {
    const denied = denyIfNoPermission(c, 'admin.settings')
    if (denied) return denied

    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const myId = c.get('userId')
    let myRole = c.get('userRole')
    const targetId = c.req.param('id')

    if (!myRole) {
        const user = await DB.prepare('SELECT role FROM users WHERE id = ?').bind(myId).first<{ role: string }>()
        myRole = user?.role
    }

    const body = await c.req.json<{
        name?: string;
        role?: string;
        password?: string;
    }>()

    const targetUser = await DB.prepare('SELECT role FROM users WHERE id = ? AND tenant_id = ?')
        .bind(targetId, tenantId).first<{ role: string }>()
    if (!targetUser) {
        return c.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, 404)
    }

    if (targetUser.role === 'OWNER' && body.role && normalizeRole(body.role) !== 'OWNER') {
        return c.json({ success: false, error: '소유자(OWNER)의 등급은 변경할 수 없습니다.' }, 403)
    }

    if (body.role) {
        const newRole = normalizeRole(body.role)
        if (newRole === 'SUPER_ADMIN' && normalizeRole(myRole) !== 'SUPER_ADMIN') {
            return c.json({ success: false, error: 'SUPER_ADMIN은 부여할 수 없습니다.' }, 403)
        }
        if (newRole !== 'OWNER' && !['ADMIN', 'MANAGEMENT', 'PRODUCTION', 'FLOOR', 'SALES', 'USER'].includes(newRole)) {
            return c.json({ success: false, error: '유효하지 않은 역할입니다.' }, 400)
        }
    }

    const updates = []
    const params = []

    if (body.name) {
        updates.push('name = ?')
        params.push(body.name)
    }

    if (body.role) {
        updates.push('role = ?')
        params.push(normalizeRole(body.role))
    }

    if (body.password) {
        const passwordHash = await hashPassword(body.password)
        updates.push('password_hash = ?')
        params.push(passwordHash)
    }

    if (updates.length === 0) {
        return c.json({ success: false, error: '변경할 내용이 없습니다.' }, 400)
    }

    updates.push("updated_at = datetime('now')")

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`
    params.push(targetId, tenantId)

    try {
        await DB.prepare(query).bind(...params).run()

        await writeAuditLog(DB, {
            tenantId,
            userId: myId,
            action: 'user.update',
            entityType: 'user',
            entityId: targetId,
            meta: {
                name: body.name,
                role: body.role ? normalizeRole(body.role) : undefined,
                password_changed: !!body.password,
                previous_role: targetUser.role
            },
            ip: c.req.header('cf-connecting-ip') || null
        })

        return c.json({ success: true, message: '사용자 정보가 수정되었습니다.' })
    } catch (e) {
        console.error(e)
        return c.json({ success: false, error: '수정 중 오류가 발생했습니다.' }, 500)
    }
})

// 사용자 삭제
app.delete('/:id', async (c) => {
    const { DB } = c.env
    const tenantId = c.get('tenantId')
    const myId = c.get('userId')
    let myRole = c.get('userRole')
    const targetId = c.req.param('id')

    if (!myRole) {
        const user = await DB.prepare('SELECT role FROM users WHERE id = ?').bind(myId).first<{ role: string }>()
        myRole = user?.role
    }

    if (normalizeRole(myRole) !== 'OWNER' && normalizeRole(myRole) !== 'SUPER_ADMIN') {
        return c.json({ success: false, error: '권한이 없습니다. (OWNER만 삭제 가능)' }, 403)
    }

    if (String(myId) === targetId) {
        return c.json({ success: false, error: '자기 자신은 삭제할 수 없습니다.' }, 400)
    }

    const targetUser = await DB.prepare('SELECT role, email FROM users WHERE id = ? AND tenant_id = ?')
        .bind(targetId, tenantId).first<{ role: string; email: string }>()
    if (!targetUser) {
        return c.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, 404)
    }
    if (targetUser.role === 'OWNER') {
        return c.json({ success: false, error: '소유자는 삭제할 수 없습니다.' }, 403)
    }

    await DB.prepare('DELETE FROM users WHERE id = ? AND tenant_id = ?')
        .bind(targetId, tenantId)
        .run()

    await writeAuditLog(DB, {
        tenantId,
        userId: myId,
        action: 'user.delete',
        entityType: 'user',
        entityId: targetId,
        meta: { email: targetUser.email, role: targetUser.role },
        ip: c.req.header('cf-connecting-ip') || null
    })

    return c.json({ success: true, message: '사용자가 삭제되었습니다.' })
})

export default app
