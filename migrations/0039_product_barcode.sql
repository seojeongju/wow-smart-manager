-- 제품 바코드(EAN/Code128 등) 관리
ALTER TABLE products ADD COLUMN barcode TEXT;

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- 테넌트 내 바코드 중복 방지 (빈 값 제외)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_tenant_barcode
  ON products(tenant_id, barcode)
  WHERE barcode IS NOT NULL AND barcode != '';
