-- ERP Phase 5 (1차): 조직 · 사원 · 근태

CREATE TABLE IF NOT EXISTS hr_departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  parent_id INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hr_departments_tenant ON hr_departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_departments_parent ON hr_departments(tenant_id, parent_id);

CREATE TABLE IF NOT EXISTS hr_employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  employee_number TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department_id INTEGER,
  position TEXT,
  employment_type TEXT NOT NULL DEFAULT 'full_time',
  hire_date TEXT,
  leave_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  user_id INTEGER,
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, employee_number)
);

CREATE INDEX IF NOT EXISTS idx_hr_employees_tenant ON hr_employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_dept ON hr_employees(tenant_id, department_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_status ON hr_employees(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_employees_user ON hr_employees(tenant_id, user_id);

CREATE TABLE IF NOT EXISTS hr_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  work_date TEXT NOT NULL,
  clock_in TEXT,
  clock_out TEXT,
  status TEXT NOT NULL DEFAULT 'present',
  leave_type TEXT,
  overtime_minutes INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, employee_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_hr_attendance_tenant ON hr_attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_date ON hr_attendance(tenant_id, work_date);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_employee ON hr_attendance(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_status ON hr_attendance(tenant_id, status);
