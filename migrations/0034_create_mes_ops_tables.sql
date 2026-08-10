-- Phase 5: 자재소요 / 외주 / 설비

CREATE TABLE IF NOT EXISTS mes_equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  code TEXT,
  name TEXT NOT NULL,
  process_id INTEGER,
  status TEXT NOT NULL DEFAULT 'idle',
  location TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_mes_equipment_tenant ON mes_equipment(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mes_equipment_status ON mes_equipment(tenant_id, status);

CREATE TABLE IF NOT EXISTS mes_equipment_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  equipment_id INTEGER NOT NULL,
  work_order_id INTEGER,
  event_type TEXT NOT NULL,
  started_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT,
  duration_minutes REAL,
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (equipment_id) REFERENCES mes_equipment(id)
);

CREATE INDEX IF NOT EXISTS idx_mes_equipment_logs_eq ON mes_equipment_logs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_mes_equipment_logs_tenant ON mes_equipment_logs(tenant_id);

CREATE TABLE IF NOT EXISTS mes_outsourcing_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  os_number TEXT NOT NULL,
  work_order_id INTEGER,
  supplier_id INTEGER,
  process_id INTEGER,
  product_id INTEGER,
  quantity REAL NOT NULL DEFAULT 1,
  received_qty REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ordered',
  sent_at TEXT,
  due_date TEXT,
  received_at TEXT,
  unit_cost REAL DEFAULT 0,
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, os_number)
);

CREATE INDEX IF NOT EXISTS idx_mes_outsourcing_tenant ON mes_outsourcing_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mes_outsourcing_status ON mes_outsourcing_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_mes_outsourcing_wo ON mes_outsourcing_orders(work_order_id);
