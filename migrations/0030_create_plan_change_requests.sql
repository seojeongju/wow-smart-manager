-- 플랜 변경 요청 테이블 (신규 DB용 — 0018은 기존 운영 DB용 스텁이었음)
CREATE TABLE IF NOT EXISTS plan_change_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  request_user_id INTEGER,
  current_plan TEXT NOT NULL,
  requested_plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  processed_by INTEGER,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (request_user_id) REFERENCES users(id),
  FOREIGN KEY (processed_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_plan_change_requests_tenant ON plan_change_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plan_change_requests_status ON plan_change_requests(status);
