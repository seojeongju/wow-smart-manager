-- 상품 옵션 그룹 (예: 색상, 사이즈)
CREATE TABLE IF NOT EXISTS product_option_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 상품 옵션 값 (예: 블랙, 화이트, XL, L)
CREATE TABLE IF NOT EXISTS product_option_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  group_id INTEGER NOT NULL,
  value TEXT NOT NULL,
  additional_price REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES product_option_groups(id) ON DELETE CASCADE
);

-- 기존 상품 테이블 확장 (옵션/변체 지원)
ALTER TABLE products ADD COLUMN parent_id INTEGER;
ALTER TABLE products ADD COLUMN product_type TEXT DEFAULT 'simple'; -- simple, master, variant
ALTER TABLE products ADD COLUMN has_options BOOLEAN DEFAULT 0;

-- 상품 변체와 옵션 값 매핑
CREATE TABLE IF NOT EXISTS product_variant_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL, -- Variant Product ID
  option_group_id INTEGER NOT NULL,
  option_value_id INTEGER NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (option_group_id) REFERENCES product_option_groups(id),
  FOREIGN KEY (option_value_id) REFERENCES product_option_values(id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_products_parent_id ON products(parent_id);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_product_option_groups_tenant ON product_option_groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_option_values_group ON product_option_values(group_id);
CREATE INDEX IF NOT EXISTS idx_product_variant_options_product ON product_variant_options(product_id);
