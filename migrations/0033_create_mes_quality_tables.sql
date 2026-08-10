-- Phase 4: 경량 QMS — 불량유형 / 검사 / 부적합(NCR)

CREATE TABLE IF NOT EXISTS mes_defect_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_mes_defect_types_tenant ON mes_defect_types(tenant_id);

CREATE TABLE IF NOT EXISTS mes_inspections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  work_order_id INTEGER,
  product_id INTEGER NOT NULL,
  lot_number TEXT,
  qr_code_id INTEGER,
  qr_code TEXT,
  result TEXT NOT NULL DEFAULT 'pass',
  inspected_qty REAL NOT NULL DEFAULT 1,
  defect_qty REAL NOT NULL DEFAULT 0,
  inspector_user_id INTEGER,
  inspected_at TEXT DEFAULT (datetime('now')),
  notes TEXT,
  claim_id INTEGER,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mes_inspections_tenant ON mes_inspections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mes_inspections_wo ON mes_inspections(work_order_id);
CREATE INDEX IF NOT EXISTS idx_mes_inspections_product ON mes_inspections(product_id);
CREATE INDEX IF NOT EXISTS idx_mes_inspections_result ON mes_inspections(tenant_id, result);
CREATE INDEX IF NOT EXISTS idx_mes_inspections_lot ON mes_inspections(lot_number);

CREATE TABLE IF NOT EXISTS mes_inspection_defects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  inspection_id INTEGER NOT NULL,
  defect_type_id INTEGER NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (inspection_id) REFERENCES mes_inspections(id) ON DELETE CASCADE,
  FOREIGN KEY (defect_type_id) REFERENCES mes_defect_types(id)
);

CREATE INDEX IF NOT EXISTS idx_mes_inspection_defects_insp ON mes_inspection_defects(inspection_id);

CREATE TABLE IF NOT EXISTS mes_ncrs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  ncr_number TEXT NOT NULL,
  work_order_id INTEGER,
  product_id INTEGER,
  lot_number TEXT,
  qr_code_id INTEGER,
  inspection_id INTEGER,
  claim_id INTEGER,
  defect_type_id INTEGER,
  quantity REAL NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open',
  disposition TEXT,
  title TEXT NOT NULL,
  description TEXT,
  action_notes TEXT,
  closed_at TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, ncr_number)
);

CREATE INDEX IF NOT EXISTS idx_mes_ncrs_tenant ON mes_ncrs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mes_ncrs_status ON mes_ncrs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_mes_ncrs_wo ON mes_ncrs(work_order_id);
CREATE INDEX IF NOT EXISTS idx_mes_ncrs_claim ON mes_ncrs(claim_id);
CREATE INDEX IF NOT EXISTS idx_mes_ncrs_lot ON mes_ncrs(lot_number);
