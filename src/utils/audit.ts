import type { Bindings } from '../types'

export type AuditPayload = {
  tenantId: number
  userId?: number | null
  action: string
  entityType?: string | null
  entityId?: string | number | null
  meta?: Record<string, unknown> | null
  ip?: string | null
}

export async function writeAuditLog(DB: Bindings['DB'], payload: AuditPayload): Promise<void> {
  try {
    await DB.prepare(`
      INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, meta_json, ip)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      payload.tenantId,
      payload.userId ?? null,
      payload.action,
      payload.entityType ?? null,
      payload.entityId != null ? String(payload.entityId) : null,
      payload.meta ? JSON.stringify(payload.meta) : null,
      payload.ip ?? null
    ).run()
  } catch (e) {
    // 감사 로그 실패가 본 업무를 막지 않도록 로그만 남김
    console.error('[audit] write failed:', e)
  }
}
