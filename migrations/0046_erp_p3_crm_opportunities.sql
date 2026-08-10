-- ERP Phase 3: CRM 영업 기회 (Pipeline)

CREATE TABLE IF NOT EXISTS opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  opportunity_number TEXT NOT NULL,
  title TEXT NOT NULL,
  customer_id INTEGER,
  stage TEXT NOT NULL DEFAULT 'lead',
  amount REAL NOT NULL DEFAULT 0,
  probability INTEGER NOT NULL DEFAULT 10,
  expected_close TEXT,
  assigned_to INTEGER,
  quotation_id INTEGER,
  won_sale_id INTEGER,
  lost_reason TEXT,
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, opportunity_number)
);

CREATE INDEX IF NOT EXISTS idx_opportunities_tenant ON opportunities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(tenant_id, stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer ON opportunities(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_assigned ON opportunities(tenant_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_opportunities_quote ON opportunities(tenant_id, quotation_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_close ON opportunities(tenant_id, expected_close);
