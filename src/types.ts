// Cloudflare Bindings 타입
export type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
}

export type Variables = {
  tenantId: number;
  userId: number;
  userRole: string;
}

// 테넌트 타입
export interface Tenant {
  id: number;
  name: string;
  plan_type: 'FREE' | 'BASIC' | 'PRO';
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
}

// 사용자 타입
export interface User {
  id: number;
  tenant_id: number;
  email: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'USER' | 'MANAGEMENT' | 'PRODUCTION' | 'FLOOR' | 'SALES' | 'SUPER_ADMIN';
  password_hash?: string;
  created_at: string;
  updated_at: string;
}

// 상품 타입
export interface Product {
  id: number;
  tenant_id: number;
  sku: string;
  barcode?: string | null;
  name: string;
  category: string;
  category_medium?: string;
  category_small?: string;
  description?: string;
  purchase_price: number;
  selling_price: number;
  current_stock: number;
  min_stock_alert: number;
  supplier?: string;
  image_url?: string;
  brand?: string;
  tags?: string;
  status?: string;
  specifications?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 고객 타입
export interface Customer {
  id: number;
  tenant_id: number;
  name: string;
  phone: string;
  email?: string;
  zip_code?: string;
  address?: string;
  address_detail?: string;
  company?: string;
  department?: string;
  position?: string;
  birthday?: string;
  grade?: string;
  purchase_path?: string;
  business_number?: string;
  notes?: string;
  total_purchase_amount: number;
  purchase_count: number;
  created_at: string;
  updated_at: string;
}

// 판매 타입
export interface Sale {
  id: number;
  tenant_id: number;
  customer_id?: number;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_method: string;
  notes?: string;
  status: string;
  shipping_address?: string;
  tracking_number?: string;
  courier?: string;
  created_at: string;
  updated_at: string;
}

// 반품/교환 타입
export interface Claim {
  id: number;
  tenant_id: number;
  sale_id: number;
  type: 'return' | 'exchange';
  status: 'requested' | 'approved' | 'completed' | 'rejected';
  reason?: string;
  admin_notes?: string;
  warehouse_id?: number;
  refund_amount?: number;
  settlement_status?: string;
  created_at: string;
  updated_at: string;
}

export interface ClaimItem {
  id: number;
  claim_id: number;
  product_id: number;
  quantity: number;
  condition?: string;
  created_at: string;
}

// 판매 상세 타입
export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

// 재고 이동 타입
export interface StockMovement {
  id: number;
  tenant_id: number;
  product_id: number;
  movement_type: string;
  quantity: number;
  reason?: string;
  reference_id?: number;
  notes?: string;
  created_at: string;
}

// API 요청 타입
export interface CreateProductRequest {
  sku: string;
  barcode?: string | null;
  name: string;
  category: string;
  category_medium?: string;
  category_small?: string;
  description?: string;
  purchase_price: number;
  selling_price: number;
  current_stock: number;
  min_stock_alert?: number;
  supplier?: string;
  image_url?: string;
  brand?: string;
  tags?: string;
  status?: string;
  specifications?: string;
  product_type?: 'simple' | 'master' | 'variant' | 'bundle';
  has_options?: boolean;
  variants?: {
    sku: string;
    name: string;
    purchase_price: number;
    selling_price: number;
    current_stock: number;
    options: {
      group_id: number;
      value_id: number;
    }[];
  }[];
  bundle_items?: {
    product_id: number;
    quantity: number;
  }[];
}

export interface UpdateProductRequest {
  name?: string;
  barcode?: string | null;
  category?: string;
  category_medium?: string;
  category_small?: string;
  description?: string;
  purchase_price?: number;
  selling_price?: number;
  min_stock_alert?: number;
  supplier?: string;
  image_url?: string;
  brand?: string;
  tags?: string;
  status?: string;
  specifications?: string;
  product_type?: 'simple' | 'master' | 'variant' | 'bundle';
  bundle_items?: {
    product_id: number;
    quantity: number;
  }[];
  variants?: {
    sku: string;
    purchase_price?: number;
    selling_price?: number;
    current_stock?: number;
  }[];
}

export interface CreateCustomerRequest {
  name: string;
  phone: string;
  email?: string;
  zip_code?: string;
  address?: string;
  address_detail?: string;
  company?: string;
  department?: string;
  position?: string;
  birthday?: string;
  purchase_path?: string;
  business_number?: string;
  notes?: string;
  grade?: string;
}

export interface CreateSaleRequest {
  customer_id?: number;
  /** POS·매장 판매 시 출고 창고(미지정 시 창고 재고가 많은 순으로 자동 배분) */
  warehouse_id?: number;
  /** immediate=즉시재고차감 / shipment=출고지시 후 확정 시 차감 */
  fulfillment?: 'immediate' | 'shipment';
  payment_status?: 'paid' | 'unpaid' | 'partial';
  paid_amount?: number;
  items: {
    product_id: number;
    quantity: number;
    /** 확정 단가(미전송 시 고객/등급/기본 판매가로 서버 계산) */
    unit_price?: number;
    qr_code?: string;
    lot_number?: string;
  }[];
  discount_amount?: number;
  payment_method: string;
  notes?: string;
}

export interface StockMovementRequest {
  product_id: number;
  movement_type: 'IN' | 'OUT' | 'ADJUST';
  quantity: number;
  reason?: string;
  notes?: string;
}

export interface UpdateShippingRequest {
  shipping_address?: string;
  tracking_number?: string;
  courier?: string;
  status?: string;
}

export interface CreateClaimRequest {
  sale_id: number;
  type: 'return' | 'exchange';
  reason?: string;
  items: {
    product_id: number;
    quantity: number;
    condition?: string;
    qr_code?: string;
    lot_number?: string;
  }[];
}

export interface UpdateClaimStatusRequest {
  status: 'approved' | 'completed' | 'rejected';
  admin_notes?: string;
}

// 재고 Lot 타입
export interface StockLot {
  id: number;
  product_id: number;
  lot_number: string;
  quantity: number;
  remaining_quantity: number;
  expiry_date?: string;
  created_at: string;
}

// 출고 지시서 타입
export interface OutboundOrder {
  id: number;
  tenant_id: number;
  order_number: string;
  destination_name: string;
  destination_address: string;
  destination_phone: string;
  status: 'PENDING' | 'PICKING' | 'PACKING' | 'SHIPPED' | 'CANCELLED';
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: OutboundItem[];
  packages?: OutboundPackage[];
  sales?: number[]; // sale_ids
}

// 출고 상세 품목 타입
export interface OutboundItem {
  id: number;
  outbound_order_id: number;
  product_id: number;
  product_name?: string; // Join result
  sku?: string; // Join result
  quantity_ordered: number;
  quantity_picked: number;
  quantity_packed: number;
  status: 'PENDING' | 'PICKED' | 'PACKED';
}

// 출고 패키지 타입
export interface OutboundPackage {
  id: number;
  outbound_order_id: number;
  tracking_number?: string;
  courier?: string;
  box_type?: string;
  box_count: number;
  weight?: number;
  created_at: string;
}

export interface Warehouse {
  id: number;
  tenant_id: number;
  name: string;
  location?: string;
  description?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ProductWarehouseStock {
  id: number;
  tenant_id: number;
  product_id: number;
  warehouse_id: number;
  quantity: number;
  location_code?: string;
  warehouse_name?: string;
}

export interface CreateWarehouseRequest {
  name: string;
  location?: string;
  description?: string;
}

export interface UpdateWarehouseRequest {
  name?: string;
  location?: string;
  description?: string;
  is_active?: number;
}

export interface StockTransferRequest {
  product_id: number;
  from_warehouse_id: number;
  to_warehouse_id: number;
  quantity: number;
  reason?: string;
}

export interface CreateOutboundRequest {
  sale_ids: number[];
  notes?: string;
}

export interface PickingRequest {
  items: {
    product_id: number;
    quantity: number;
  }[];
}

export interface PackingRequest {
  box_type?: string;
  box_count: number;
  weight?: number;
  courier?: string;
  tracking_number?: string;
}

// 등급별 가격 타입
export interface ProductGradePrice {
  id: number;
  tenant_id: number;
  product_id: number;
  grade: string;
  price: number;
  created_at: string;
  updated_at: string;
}

// 고객별 지정 가격 타입
export interface ProductCustomerPrice {
  id: number;
  tenant_id: number;
  customer_id: number;
  product_id: number;
  price: number;
  created_at: string;
  updated_at: string;
}

