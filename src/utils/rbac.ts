import type { Context } from 'hono'
import type { Bindings, Variables } from '../types'

/** 테넌트/플랫폼 역할 (대문자) */
export const APP_ROLES = [
  'SUPER_ADMIN',
  'OWNER',
  'ADMIN',
  'MANAGEMENT',
  'PRODUCTION',
  'FLOOR',
  'SALES',
  'USER'
] as const

export type AppRole = (typeof APP_ROLES)[number]

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: '플랫폼 관리자',
  OWNER: '소유자',
  ADMIN: '관리자',
  MANAGEMENT: '경영',
  PRODUCTION: '생산관리',
  FLOOR: '현장',
  SALES: '영업',
  USER: '일반(영업)',
  staff: '일반(레거시)'
}

/** 팀원에게 부여 가능한 역할 (OWNER/SUPER_ADMIN 제외) */
export const ASSIGNABLE_ROLES = [
  'ADMIN',
  'MANAGEMENT',
  'PRODUCTION',
  'FLOOR',
  'SALES',
  'USER'
] as const

export type Permission =
  | 'mes.read'
  | 'mes.write'
  | 'floor.write'
  | 'quality.write'
  | 'sales.access'
  | 'admin.settings'
  | 'audit.read'
  | 'demo.manage'

const PERMISSIONS: Record<Permission, string[]> = {
  'mes.read': ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'MANAGEMENT', 'PRODUCTION', 'FLOOR'],
  'mes.write': ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'PRODUCTION'],
  'floor.write': ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'PRODUCTION', 'FLOOR'],
  'quality.write': ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'PRODUCTION'],
  'sales.access': ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'MANAGEMENT', 'SALES', 'USER', 'STAFF'],
  'admin.settings': ['SUPER_ADMIN', 'OWNER', 'ADMIN'],
  'audit.read': ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'MANAGEMENT'],
  'demo.manage': ['SUPER_ADMIN', 'OWNER', 'ADMIN']
}

export function normalizeRole(role: string | null | undefined): string {
  const r = String(role || '').trim().toUpperCase()
  if (r === 'STAFF') return 'USER'
  return r
}

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  const normalized = normalizeRole(role)
  const allowed = PERMISSIONS[permission] || []
  return allowed.includes(normalized)
}

export function denyIfNoPermission(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  permission: Permission
) {
  const role = c.get('userRole')
  if (!hasPermission(role, permission)) {
    return c.json({ success: false, error: '권한이 없습니다.' }, 403)
  }
  return null
}

export function isAssignableRole(role: string): boolean {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(normalizeRole(role))
    || normalizeRole(role) === 'OWNER'
}

/** 프론트 메뉴 게이팅용 권한 맵 */
export function permissionsForRole(role: string | null | undefined): Record<Permission, boolean> {
  const keys = Object.keys(PERMISSIONS) as Permission[]
  const out = {} as Record<Permission, boolean>
  for (const k of keys) out[k] = hasPermission(role, k)
  return out
}
