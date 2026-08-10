-- ERP P2: 견적 / 예약재고 / 거래명세 영속화

CREATE TABLE IF NOT EXISTS quotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  quote_number TEXT NOT NULL,
  customer_id INTEGER,
  status TEXT NOT NULL DEFAULT 'draft',
  -- draft | sent | accepted | converted | cancelled | expired
  valid_until TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  discount_amount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  notes TEXT,
  reserve_stock INTEGER NOT NULL DEFAULT 0,
  converted_sale_id INTEGER,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, quote_number)
);

CREATE INDEX IF NOT EXISTS idx_quotations_tenant ON quotations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(tenant_id, customer_id);

CREATE TABLE IF NOT EXISTS quotation_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  quotation_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  subtotal REAL NOT NULL,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quote ON quotation_items(quotation_id);

CREATE TABLE IF NOT EXISTS stock_reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  source_type TEXT NOT NULL, -- quotation | sale
  source_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  warehouse_id INTEGER,
  quantity REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active | released | consumed
  expires_at TEXT,
  notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stock_reservations_tenant ON stock_reservations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_product ON stock_reservations(tenant_id, product_id, status);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_source ON stock_reservations(tenant_id, source_type, source_id);

CREATE TABLE IF NOT EXISTS transaction_statements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  doc_number TEXT NOT NULL,
  customer_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  apply_vat INTEGER NOT NULL DEFAULT 0,
  supply_amount REAL NOT NULL DEFAULT 0,
  vat_amount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  note TEXT,
  snapshot_json TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, doc_number)
);

CREATE INDEX IF NOT EXISTS idx_ts_tenant ON transaction_statements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ts_customer ON transaction_statements(tenant_id, customer_id);

CREATE TABLE IF NOT EXISTS transaction_statement_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  statement_id INTEGER NOT NULL,
  sale_id INTEGER NOT NULL,
  UNIQUE(statement_id, sale_id),
  FOREIGN KEY (statement_id) REFERENCES transaction_statements(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ts_sales_statement ON transaction_statement_sales(statement_id);
