-- ERP Phase 1: 매입채무(AP) + 회계 전표(간단)

ALTER TABLE purchase_orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE purchase_orders ADD COLUMN paid_amount REAL DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN payment_due_date TEXT;

-- 입고된 발주만 채무로 인식 (PARTAL/COMPLETED). 미입고·취소는 paid 처리로 목록에서 제외
UPDATE purchase_orders
SET payment_status = CASE
      WHEN UPPER(COALESCE(status, '')) IN ('PARTIAL', 'COMPLETED') THEN 'unpaid'
      ELSE 'paid'
    END,
    paid_amount = COALESCE(paid_amount, 0)
WHERE payment_status IS NULL OR payment_status = 'unpaid';

CREATE TABLE IF NOT EXISTS vouchers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  voucher_no TEXT NOT NULL,
  voucher_type TEXT NOT NULL,
  -- AR_INVOICE | AR_RECEIPT | AP_INVOICE | AP_PAYMENT | ADJUST
  source_type TEXT,
  -- sale | purchase_order | manual
  source_id INTEGER,
  partner_name TEXT,
  description TEXT,
  amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'posted',
  -- draft | posted | void
  voucher_date TEXT NOT NULL DEFAULT (date('now')),
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, voucher_no)
);

CREATE INDEX IF NOT EXISTS idx_vouchers_tenant ON vouchers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_type ON vouchers(tenant_id, voucher_type);
CREATE INDEX IF NOT EXISTS idx_vouchers_source ON vouchers(tenant_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers(tenant_id, voucher_date);
