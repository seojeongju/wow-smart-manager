-- Phase 8: 제조 Lot/QR ↔ 출고·판매·클레임 연결

CREATE TABLE IF NOT EXISTS outbound_item_lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  outbound_item_id INTEGER NOT NULL,
  outbound_order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  mes_lot_id INTEGER,
  qr_code_id INTEGER,
  lot_number TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_outbound_item_lots_tenant ON outbound_item_lots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_outbound_item_lots_order ON outbound_item_lots(outbound_order_id);
CREATE INDEX IF NOT EXISTS idx_outbound_item_lots_qr ON outbound_item_lots(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_outbound_item_lots_lot ON outbound_item_lots(lot_number);

CREATE TABLE IF NOT EXISTS sale_item_lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  sale_item_id INTEGER NOT NULL,
  sale_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  mes_lot_id INTEGER,
  qr_code_id INTEGER,
  lot_number TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sale_item_lots_tenant ON sale_item_lots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sale_item_lots_sale ON sale_item_lots(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_item_lots_qr ON sale_item_lots(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_sale_item_lots_lot ON sale_item_lots(lot_number);

ALTER TABLE claim_items ADD COLUMN mes_lot_id INTEGER;
ALTER TABLE claim_items ADD COLUMN qr_code_id INTEGER;
ALTER TABLE claim_items ADD COLUMN lot_number TEXT;

ALTER TABLE mes_trace_events ADD COLUMN reference_type TEXT;
ALTER TABLE mes_trace_events ADD COLUMN reference_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_mes_trace_events_ref
  ON mes_trace_events(tenant_id, reference_type, reference_id);
