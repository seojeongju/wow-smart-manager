-- ERP P1: 판매 결제/출고 방식 + 출고 재고차감 모드
ALTER TABLE sales ADD COLUMN payment_status TEXT DEFAULT 'paid';
ALTER TABLE sales ADD COLUMN paid_amount REAL;
ALTER TABLE sales ADD COLUMN fulfillment TEXT DEFAULT 'immediate';
ALTER TABLE outbound_orders ADD COLUMN stock_mode TEXT DEFAULT 'deduct_on_ship';

UPDATE sales
SET paid_amount = COALESCE(final_amount, 0),
    payment_status = COALESCE(payment_status, 'paid')
WHERE paid_amount IS NULL;
