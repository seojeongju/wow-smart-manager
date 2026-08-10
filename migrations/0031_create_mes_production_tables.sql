-- Phase 1: 스마트제조 MES — 공정 / BOM / 작업지시 / 생산실적

CREATE TABLE IF NOT EXISTS mes_processes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  code TEXT,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  standard_minutes REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mes_processes_tenant ON mes_processes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mes_processes_active ON mes_processes(tenant_id, is_active);

CREATE TABLE IF NOT EXISTS mes_boms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  is_active INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, product_id, version)
);

CREATE INDEX IF NOT EXISTS idx_mes_boms_tenant ON mes_boms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mes_boms_product ON mes_boms(tenant_id, product_id);

CREATE TABLE IF NOT EXISTS mes_bom_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  bom_id INTEGER NOT NULL,
  component_product_id INTEGER NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL DEFAULT 'EA',
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (bom_id) REFERENCES mes_boms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mes_bom_items_bom ON mes_bom_items(bom_id);
CREATE INDEX IF NOT EXISTS idx_mes_bom_items_tenant ON mes_bom_items(tenant_id);

CREATE TABLE IF NOT EXISTS mes_work_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  wo_number TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  bom_id INTEGER,
  process_id INTEGER,
  planned_qty REAL NOT NULL,
  completed_qty REAL NOT NULL DEFAULT 0,
  scrap_qty REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned',
  warehouse_id INTEGER,
  planned_start_date TEXT,
  planned_end_date TEXT,
  actual_start_at TEXT,
  actual_end_at TEXT,
  assignee_user_id INTEGER,
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, wo_number)
);

CREATE INDEX IF NOT EXISTS idx_mes_work_orders_tenant ON mes_work_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mes_work_orders_status ON mes_work_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_mes_work_orders_product ON mes_work_orders(tenant_id, product_id);

CREATE TABLE IF NOT EXISTS mes_production_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  work_order_id INTEGER NOT NULL,
  good_qty REAL NOT NULL DEFAULT 0,
  scrap_qty REAL NOT NULL DEFAULT 0,
  process_id INTEGER,
  warehouse_id INTEGER NOT NULL,
  worker_user_id INTEGER,
  recorded_at TEXT DEFAULT (datetime('now')),
  stock_applied INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (work_order_id) REFERENCES mes_work_orders(id)
);

CREATE INDEX IF NOT EXISTS idx_mes_production_records_wo ON mes_production_records(work_order_id);
CREATE INDEX IF NOT EXISTS idx_mes_production_records_tenant ON mes_production_records(tenant_id);
