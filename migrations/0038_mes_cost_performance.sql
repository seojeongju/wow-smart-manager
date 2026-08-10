-- Phase 9: 제조 원가·성과 (표준원가 / 실적 스냅샷)

-- 완제품 표준단가 수동 보정 (NULL이면 BOM×매입가 자동계산)
ALTER TABLE products ADD COLUMN standard_cost REAL;

CREATE TABLE IF NOT EXISTS mes_cost_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  work_order_id INTEGER NOT NULL,
  production_record_id INTEGER,
  product_id INTEGER NOT NULL,
  good_qty REAL NOT NULL DEFAULT 0,
  scrap_qty REAL NOT NULL DEFAULT 0,
  standard_unit_cost REAL NOT NULL DEFAULT 0,
  material_std_cost REAL NOT NULL DEFAULT 0,
  material_act_cost REAL NOT NULL DEFAULT 0,
  scrap_cost REAL NOT NULL DEFAULT 0,
  outsourcing_cost REAL NOT NULL DEFAULT 0,
  total_std_cost REAL NOT NULL DEFAULT 0,
  total_act_cost REAL NOT NULL DEFAULT 0,
  snapshot_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mes_cost_snap_tenant_date
  ON mes_cost_snapshots(tenant_id, snapshot_at);

CREATE INDEX IF NOT EXISTS idx_mes_cost_snap_wo
  ON mes_cost_snapshots(work_order_id);

CREATE INDEX IF NOT EXISTS idx_mes_cost_snap_product
  ON mes_cost_snapshots(tenant_id, product_id);
