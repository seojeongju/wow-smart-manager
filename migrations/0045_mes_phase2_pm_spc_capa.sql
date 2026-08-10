-- MES Phase 2: 예방보전(PM) · SPC · 능력·부하

-- 설비 일일 능력(시간)
ALTER TABLE mes_equipment ADD COLUMN capacity_hours_per_day REAL DEFAULT 8;

-- ---------- PM ----------
CREATE TABLE IF NOT EXISTS mes_pm_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  equipment_id INTEGER NOT NULL,
  code TEXT,
  name TEXT NOT NULL,
  interval_days INTEGER NOT NULL DEFAULT 30,
  estimated_minutes REAL DEFAULT 60,
  checklist_json TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  last_done_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_mes_pm_plans_tenant ON mes_pm_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mes_pm_plans_eq ON mes_pm_plans(equipment_id);

CREATE TABLE IF NOT EXISTS mes_pm_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  plan_id INTEGER NOT NULL,
  equipment_id INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  work_order_id INTEGER,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mes_pm_schedules_tenant ON mes_pm_schedules(tenant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_mes_pm_schedules_status ON mes_pm_schedules(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_mes_pm_schedules_plan ON mes_pm_schedules(plan_id);

CREATE TABLE IF NOT EXISTS mes_pm_work_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  pm_number TEXT NOT NULL,
  plan_id INTEGER,
  schedule_id INTEGER,
  equipment_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  checklist_result_json TEXT,
  assigned_user_id INTEGER,
  started_at TEXT,
  completed_at TEXT,
  equipment_log_id INTEGER,
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, pm_number)
);

CREATE INDEX IF NOT EXISTS idx_mes_pm_wo_tenant ON mes_pm_work_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_mes_pm_wo_eq ON mes_pm_work_orders(equipment_id);

CREATE TABLE IF NOT EXISTS mes_pm_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  pm_work_order_id INTEGER NOT NULL,
  equipment_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mes_pm_logs_wo ON mes_pm_logs(pm_work_order_id);

-- ---------- SPC ----------
CREATE TABLE IF NOT EXISTS mes_spc_characteristics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  code TEXT,
  name TEXT NOT NULL,
  unit TEXT,
  product_id INTEGER,
  equipment_id INTEGER,
  target REAL,
  usl REAL,
  lsl REAL,
  sample_size INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_mes_spc_chars_tenant ON mes_spc_characteristics(tenant_id);

CREATE TABLE IF NOT EXISTS mes_spc_measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  characteristic_id INTEGER NOT NULL,
  value REAL NOT NULL,
  measured_at TEXT DEFAULT (datetime('now')),
  work_order_id INTEGER,
  lot_number TEXT,
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (characteristic_id) REFERENCES mes_spc_characteristics(id)
);

CREATE INDEX IF NOT EXISTS idx_mes_spc_meas_char ON mes_spc_measurements(characteristic_id, measured_at);
CREATE INDEX IF NOT EXISTS idx_mes_spc_meas_tenant ON mes_spc_measurements(tenant_id);
