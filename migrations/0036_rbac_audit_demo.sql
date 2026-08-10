-- Phase 7: RBAC 감사 로그 · users.updated_at · 데모 시드 마커
-- 역할 값(문서): SUPER_ADMIN, OWNER, ADMIN, MANAGEMENT, PRODUCTION, FLOOR, SALES, USER

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  meta_json TEXT,
  ip TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created
  ON audit_logs(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs(tenant_id, action);

-- users.updated_at (코드에서 이미 참조) — D1/SQLite ALTER는 상수 DEFAULT만 허용
ALTER TABLE users ADD COLUMN updated_at TEXT;
