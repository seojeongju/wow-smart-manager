type D1 = D1Database

/**
 * 판매 단가 결정: 고객별 지정가 > 등급가 > 기본 판매가
 * (POST /prices/lookup 과 동일 우선순위)
 */
export async function resolveSaleUnitPrice(
  DB: D1,
  tenantId: number,
  productId: number,
  baseSellingPrice: number,
  customerId?: number | null
): Promise<{ unitPrice: number; priceSource: 'customer' | 'grade' | 'list' }> {
  const listPrice = Number(baseSellingPrice) || 0

  if (customerId) {
    const cp = await DB.prepare(`
      SELECT price FROM product_customer_prices
      WHERE tenant_id = ? AND customer_id = ? AND product_id = ?
    `).bind(tenantId, customerId, productId).first<{ price: number }>()
    if (cp != null && cp.price != null) {
      return { unitPrice: Number(cp.price), priceSource: 'customer' }
    }

    const customer = await DB.prepare(`
      SELECT grade FROM customers WHERE id = ? AND tenant_id = ?
    `).bind(customerId, tenantId).first<{ grade: string | null }>()

    const grade = customer?.grade || '일반'
    const gp = await DB.prepare(`
      SELECT price FROM product_grade_prices
      WHERE tenant_id = ? AND grade = ? AND product_id = ?
    `).bind(tenantId, grade, productId).first<{ price: number }>()
    if (gp != null && gp.price != null) {
      return { unitPrice: Number(gp.price), priceSource: 'grade' }
    }
  }

  return { unitPrice: listPrice, priceSource: 'list' }
}

/**
 * 클라이언트가 보낸 unit_price가 있으면 사용(0 이상), 없으면 정책 단가 적용
 */
export async function resolveLineUnitPrice(
  DB: D1,
  tenantId: number,
  productId: number,
  baseSellingPrice: number,
  customerId: number | null | undefined,
  requestedUnitPrice?: number | null
): Promise<{ unitPrice: number; priceSource: string }> {
  if (requestedUnitPrice != null && !Number.isNaN(Number(requestedUnitPrice)) && Number(requestedUnitPrice) >= 0) {
    return { unitPrice: Number(requestedUnitPrice), priceSource: 'requested' }
  }
  return resolveSaleUnitPrice(DB, tenantId, productId, baseSellingPrice, customerId)
}
