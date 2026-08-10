-- Phase 5 고도화: 작업지시-설비 배정, 자재불출 이력

ALTER TABLE mes_work_orders ADD COLUMN equipment_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_mes_work_orders_equipment ON mes_work_orders(equipment_id);

CREATE TABLE IF NOT EXISTS mes_material_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  work_order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  warehouse_id INTEGER NOT NULL,
  quantity REAL NOT NULL,
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (work_order_id) REFERENCES mes_work_orders(id)
);

CREATE INDEX IF NOT EXISTS idx_mes_material_issues_tenant ON mes_material_issues(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mes_material_issues_wo ON mes_material_issues(work_order_id);
