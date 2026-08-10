-- ERP Phase 2: 구매 단가이력 · 공급사 평가

CREATE TABLE IF NOT EXISTS supplier_unit_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  supplier_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  effective_from TEXT NOT NULL DEFAULT (date('now')),
  notes TEXT,
  source_type TEXT,
  -- purchase_order | manual
  source_id INTEGER,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sup_unit_prices_tenant ON supplier_unit_prices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sup_unit_prices_lookup
  ON supplier_unit_prices(tenant_id, supplier_id, product_id, effective_from DESC);

CREATE TABLE IF NOT EXISTS supplier_evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  supplier_id INTEGER NOT NULL,
  period_label TEXT,
  score_delivery REAL NOT NULL DEFAULT 0,
  score_quality REAL NOT NULL DEFAULT 0,
  score_price REAL NOT NULL DEFAULT 0,
  score_total REAL NOT NULL DEFAULT 0,
  notes TEXT,
  evaluated_by INTEGER,
  evaluated_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sup_eval_tenant ON supplier_evaluations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sup_eval_supplier ON supplier_evaluations(tenant_id, supplier_id);
