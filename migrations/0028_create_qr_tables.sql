-- Migration: 0028 - Create QR MES Tables
-- QR 코드 기반 MES(제조실행시스템) 테이블

CREATE TABLE IF NOT EXISTS qr_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  product_id INTEGER,
  type TEXT DEFAULT 'product',
  status TEXT DEFAULT 'active',
  batch_number TEXT,
  manufacture_date DATE,
  expiry_date DATE,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes(code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_product ON qr_codes(product_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_type ON qr_codes(type);

CREATE TABLE IF NOT EXISTS qr_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_code_id INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_type TEXT,
  reference_id INTEGER,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  warehouse_id INTEGER,
  location TEXT,
  notes TEXT,
  device_info TEXT,
  latitude REAL,
  longitude REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_qr_trans_code ON qr_transactions(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_trans_type ON qr_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_qr_trans_product ON qr_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_qr_trans_date ON qr_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_qr_trans_warehouse ON qr_transactions(warehouse_id);

CREATE TABLE IF NOT EXISTS qr_scan_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_code TEXT NOT NULL,
  scan_result TEXT,
  product_id INTEGER,
  user_id INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  latitude REAL,
  longitude REAL,
  scan_duration_ms INTEGER,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_code ON qr_scan_logs(qr_code);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_result ON qr_scan_logs(scan_result);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_date ON qr_scan_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_user ON qr_scan_logs(user_id);

CREATE TABLE IF NOT EXISTS qr_print_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_code_id INTEGER NOT NULL,
  print_format TEXT,
  print_size TEXT,
  quantity INTEGER DEFAULT 1,
  printer_name TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_qr_print_history_code ON qr_print_history(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_print_history_date ON qr_print_history(created_at);

ALTER TABLE users ADD COLUMN mes_role TEXT DEFAULT 'none';
