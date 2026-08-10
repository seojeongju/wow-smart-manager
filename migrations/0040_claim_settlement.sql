-- ERP P0-3: 클레임 환불·정산 필드
ALTER TABLE claims ADD COLUMN refund_amount REAL DEFAULT 0;
ALTER TABLE claims ADD COLUMN settlement_status TEXT DEFAULT 'none';
