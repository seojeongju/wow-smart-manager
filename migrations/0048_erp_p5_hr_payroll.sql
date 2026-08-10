-- ERP Phase 5 (2차): 급여

ALTER TABLE hr_employees ADD COLUMN base_salary REAL NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS hr_payroll_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  period_ym TEXT NOT NULL,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  total_gross REAL NOT NULL DEFAULT 0,
  total_deduction REAL NOT NULL DEFAULT 0,
  total_net REAL NOT NULL DEFAULT 0,
  created_by INTEGER,
  confirmed_by INTEGER,
  confirmed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, period_ym)
);

CREATE INDEX IF NOT EXISTS idx_hr_payroll_runs_tenant ON hr_payroll_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_runs_status ON hr_payroll_runs(tenant_id, status);

CREATE TABLE IF NOT EXISTS hr_payroll_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  run_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  base_pay REAL NOT NULL DEFAULT 0,
  overtime_pay REAL NOT NULL DEFAULT 0,
  allowance REAL NOT NULL DEFAULT 0,
  bonus REAL NOT NULL DEFAULT 0,
  national_pension REAL NOT NULL DEFAULT 0,
  health_insurance REAL NOT NULL DEFAULT 0,
  employment_insurance REAL NOT NULL DEFAULT 0,
  income_tax REAL NOT NULL DEFAULT 0,
  other_deduction REAL NOT NULL DEFAULT 0,
  work_days INTEGER NOT NULL DEFAULT 0,
  late_days INTEGER NOT NULL DEFAULT 0,
  absent_days INTEGER NOT NULL DEFAULT 0,
  leave_days INTEGER NOT NULL DEFAULT 0,
  overtime_minutes INTEGER NOT NULL DEFAULT 0,
  gross_pay REAL NOT NULL DEFAULT 0,
  deduction_total REAL NOT NULL DEFAULT 0,
  net_pay REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(run_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_hr_payroll_items_tenant ON hr_payroll_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_items_run ON hr_payroll_items(run_id);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_items_emp ON hr_payroll_items(tenant_id, employee_id);
