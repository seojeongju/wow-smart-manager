-- Phase 2: 생산 추적 — Lot / QR-작업지시 연결 / 역추적

ALTER TABLE qr_codes ADD COLUMN tenant_id INTEGER;
ALTER TABLE qr_codes ADD COLUMN work_order_id INTEGER;
ALTER TABLE qr_codes ADD COLUMN lot_number TEXT;
ALTER TABLE qr_codes ADD COLUMN serial_number TEXT;

UPDATE qr_codes
SET tenant_id = (
  SELECT p.tenant_id FROM products p WHERE p.id = qr_codes.product_id
)
WHERE tenant_id IS NULL AND product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qr_codes_tenant ON qr_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_work_order ON qr_codes(work_order_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_lot ON qr_codes(lot_number);

CREATE TABLE IF NOT EXISTS mes_lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  lot_number TEXT NOT NULL,
  work_order_id INTEGER,
  quantity REAL NOT NULL DEFAULT 0,
  remaining_quantity REAL NOT NULL DEFAULT 0,
  warehouse_id INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  manufacture_date TEXT,
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, product_id, lot_number)
);

CREATE INDEX IF NOT EXISTS idx_mes_lots_tenant ON mes_lots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mes_lots_wo ON mes_lots(work_order_id);
CREATE INDEX IF NOT EXISTS idx_mes_lots_product ON mes_lots(tenant_id, product_id);

CREATE TABLE IF NOT EXISTS mes_trace_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  work_order_id INTEGER,
  qr_code_id INTEGER,
  qr_code TEXT,
  product_id INTEGER,
  lot_number TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  process_id INTEGER,
  warehouse_id INTEGER,
  related_qr_code_id INTEGER,
  production_record_id INTEGER,
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mes_trace_events_tenant ON mes_trace_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mes_trace_events_wo ON mes_trace_events(work_order_id);
CREATE INDEX IF NOT EXISTS idx_mes_trace_events_qr ON mes_trace_events(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_mes_trace_events_type ON mes_trace_events(tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_mes_trace_events_code ON mes_trace_events(qr_code);

CREATE TABLE IF NOT EXISTS mes_lot_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  finished_qr_code_id INTEGER,
  material_qr_code_id INTEGER,
  material_product_id INTEGER NOT NULL,
  lot_number TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  work_order_id INTEGER,
  production_record_id INTEGER,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mes_lot_links_fg ON mes_lot_links(finished_qr_code_id);
CREATE INDEX IF NOT EXISTS idx_mes_lot_links_mat ON mes_lot_links(material_qr_code_id);
CREATE INDEX IF NOT EXISTS idx_mes_lot_links_wo ON mes_lot_links(work_order_id);
CREATE INDEX IF NOT EXISTS idx_mes_lot_links_tenant ON mes_lot_links(tenant_id);
