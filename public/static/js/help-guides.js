/**
 * 사용설명서 — 페이지 ? 패널 + 사이드바 사용안내 허브
 * 키: page 또는 page:tab (예: production:schedule, qr:inbound)
 */

window._helpContext = { page: 'dashboard', tab: null };

const HELP_GUIDES = {
  // ---------- 시나리오 / 허브 ----------
  hub: {
    title: '사용안내 허브',
    summary: '메뉴별 짧은 설명서와 업무 시나리오를 모았습니다. 화면 우측 상단 ? 버튼으로도 현재 화면 안내를 열 수 있습니다.',
    steps: [
      '왼쪽 목록에서 메뉴를 고르거나, 아래 시나리오를 눌러보세요.',
      '실제 작업은 해당 메뉴로 이동한 뒤 진행합니다.',
      '현장에서는 각 화면의 ? 만으로도 충분합니다.'
    ],
    tips: ['안내 문구는 UI 버튼명과 같게 맞춰 두었습니다.'],
    related: []
  },

  // ---------- 공통 ----------
  dashboard: {
    title: '대시보드',
    summary: '매출·재고·주요 지표를 한눈에 보는 시작 화면입니다.',
    steps: [
      '상단·카드에서 오늘 현황을 확인합니다.',
      '빠른 업무가 필요하면 카드/메뉴로 해당 화면으로 이동합니다.'
    ],
    tips: ['자세한 제조 KPI는 제조실행 → 현황을 이용하세요.'],
    related: [{ label: '제조 현황', page: 'production', tab: 'kpi' }]
  },
  products: {
    title: '상품 관리',
    summary: '상품·SKU·바코드·가격·재고의 기준 정보를 관리합니다.',
    steps: [
      '[상품 등록]에서 이름·SKU·판매가·매입가를 입력합니다.',
      '바코드가 있으면 바코드 칸에 스캔/입력합니다.',
      '옵션·이미지가 필요하면 옵션 관리·상품 수정에서 연결합니다.',
      '수정 시 SKU는 변경되지 않습니다.'
    ],
    tips: ['바코드만 대량으로 다루려면 바코드 관리 메뉴를 쓰세요.'],
    related: [
      { label: '옵션 관리', page: 'product-options' },
      { label: '바코드 등록', page: 'barcode', tab: 'register' },
      { label: '재고', page: 'stock' }
    ]
  },
  'product-options': {
    title: '옵션 관리',
    summary: '색상·사이즈 등 옵션 그룹과 값을 관리하고 상품에 연결합니다.',
    steps: [
      '[새 옵션 그룹 등록]으로 그룹명과 값 목록을 만듭니다.',
      '상품 등록/수정 화면에서 해당 옵션을 선택합니다.',
      '사용하지 않는 그룹은 삭제하거나 수정합니다.'
    ],
    tips: ['옵션을 바꾸면 기존 재고·주문에 영향이 있을 수 있으니 운영 중에는 신중히 수정하세요.'],
    related: [{ label: '상품', page: 'products' }]
  },
  stock: {
    title: '재고 관리',
    summary: '입고·출고·조정·이동으로 창고별 재고를 맞춥니다.',
    steps: [
      '상단 [입고]/[출고]/[조정]/[이동]으로 즉시 처리할 수 있습니다.',
      '재고 이동 내역 탭에서 이력을 확인합니다.',
      '창고별 재고 현황 탭에서 위치별 잔량을 봅니다.'
    ],
    tips: ['현장 스캔 입고/출고는 QR 현장 메뉴가 더 빠릅니다.'],
    related: [
      { label: '재고 이동 내역', page: 'stock', tab: 'movements' },
      { label: 'QR 입고', page: 'qr', tab: 'inbound' }
    ]
  },
  'stock:movements': {
    title: '재고 이동 내역',
    summary: '입고·출고·조정·이동 이력을 조회합니다.',
    steps: [
      '기간·상품·창고 필터로 이력을 좁힙니다.',
      '상단 버튼으로 새 입고/출고/조정을 등록합니다.',
      '이상이 있으면 조정으로 수량을 맞춥니다.'
    ],
    tips: [],
    related: [{ label: '창고별 현황', page: 'stock', tab: 'levels' }]
  },
  'stock:levels': {
    title: '창고별 재고 현황',
    summary: '창고·상품별 현재고를 확인합니다.',
    steps: [
      '창고를 골라 잔량을 확인합니다.',
      '부족·과다가 보이면 이동 또는 발주를 검토합니다.'
    ],
    tips: ['부족 자재 생산용은 제조실행 → 자재·외주도 함께 보세요.'],
    related: [
      { label: '재고 이동', page: 'stock', tab: 'movements' },
      { label: '자재·외주', page: 'production', tab: 'materials' }
    ]
  },
  sales: {
    title: '판매 관리',
    summary: 'POS 판매, 주문 이력, 클레임을 관리합니다.',
    steps: [
      '판매(POS) 탭에서 상품을 담아 즉시 판매합니다.',
      '주문 관리에서 이력을 조회·처리합니다.',
      '클레임 탭에서 반품·교환을 등록합니다.'
    ],
    tips: ['스캔 위주 매장이면 QR 현장 → 판매도 활용하세요.'],
    related: [
      { label: '판매(POS)', page: 'sales', tab: 'pos' },
      { label: 'QR 판매', page: 'qr', tab: 'sale' }
    ]
  },
  'sales:pos': {
    title: '판매 (POS)',
    summary: '상품을 담고 결제·판매를 즉시 처리하는 화면입니다.',
    steps: [
      '상품을 검색·선택해 장바구니에 담습니다.',
      '(선택) 고객을 연결하면 등급/전용 단가가 반영될 수 있습니다.',
      '결제수단을 고릅니다. 외상은 미수로 기록됩니다.',
      '배송출고를 켜면 재고는 출고 확정 시 차감되고 출고지시가 만들어집니다.',
      '판매를 확정합니다.'
    ],
    tips: ['견적→수주가 필요하면 견적 관리를 이용하세요.', '바코드건은 검색/스캔 입력칸에 포커스를 두고 사용하세요.'],
    related: [
      { label: '견적 관리', page: 'quotations' },
      { label: '주문 관리', page: 'sales', tab: 'orders' },
      { label: '가격 정책', page: 'pricing-policy' }
    ]
  },
  quotations: {
    title: '견적 관리',
    summary: '견적을 작성하고 재고를 예약한 뒤 수주(판매·출고지시)로 변환합니다.',
    steps: [
      '고객·유효일·품목·단가를 입력합니다.',
      '재고 예약을 켜면 가용재고에서 soft allocation 됩니다.',
      '[수주변환]으로 배송출고 판매와 출고지시를 만듭니다.'
    ],
    tips: ['예약은 물리 재고를 차감하지 않습니다. 출고 확정 시 실제 차감됩니다.'],
    related: [
      { label: '주문/배송', page: 'sales', tab: 'orders' },
      { label: '출고 피킹', page: 'outbound', tab: 'picking' }
    ]
  },
  'sales:orders': {
    title: '주문 관리',
    summary: '판매 주문 이력을 조회하고 상태를 관리합니다.',
    steps: [
      '기간·고객·상태로 주문을 검색합니다.',
      '상세에서 품목·금액을 확인합니다.',
      '필요 시 클레임으로 연결합니다.'
    ],
    tips: [],
    related: [
      { label: '클레임', page: 'sales', tab: 'claims' },
      { label: '거래명세서', page: 'transaction-statement' }
    ]
  },
  'sales:claims': {
    title: '클레임',
    summary: '반품·교환·불만 등 판매 후 이슈를 처리합니다.',
    steps: [
      '관련 주문을 찾아 클레임을 등록합니다.',
      '사유·수량을 입력하고 처리 상태를 갱신합니다.'
    ],
    tips: ['재고 환원 여부는 처리 유형에 따라 확인하세요.'],
    related: [{ label: '주문 관리', page: 'sales', tab: 'orders' }]
  },
  customers: {
    title: '고객 관리',
    summary: '고객 연락처·주소·등급 정보를 관리합니다.',
    steps: [
      '[고객 등록]으로 기본 정보를 저장합니다.',
      '등급을 지정하면 가격 정책의 단가가 연결됩니다.',
      '판매·출고·거래명세서에서 고객을 선택합니다.'
    ],
    tips: ['등급·전용 단가는 가격 정책 메뉴에서 관리합니다.'],
    related: [
      { label: '판매', page: 'sales', tab: 'pos' },
      { label: '가격 정책', page: 'pricing-policy' }
    ]
  },
  outbound: {
    title: '출고 관리',
    summary: '거래처 출고 등록·이력·창고별 현황을 관리합니다.',
    steps: [
      '간편 출고 등록에서 상품·수량을 담아 출고합니다.',
      '이력에서 송장/추적을 확인합니다.',
      '창고별 관리로 위치별 출고를 점검합니다.'
    ],
    tips: ['현장 스캔 출고는 QR 출고를 사용하세요.'],
    related: [{ label: '간편 출고', page: 'outbound', tab: 'reg' }]
  },
  'outbound:reg': {
    title: '간편 출고 등록',
    summary: '상품을 선택해 빠르게 출고 전표를 만듭니다.',
    steps: [
      '왼쪽에서 상품을 골라 장바구니에 담습니다.',
      '고객·창고·수량을 확인합니다.',
      '출고를 확정하면 재고가 차감됩니다.'
    ],
    tips: ['단계별 물류는 피킹 → 패킹/송장 → 출고확정 탭을 사용하세요.', '엑셀 템플릿 일괄 등록도 지원됩니다.'],
    related: [
      { label: '피킹', page: 'outbound', tab: 'picking' },
      { label: '패킹/송장', page: 'outbound', tab: 'packing' },
      { label: 'QR 출고', page: 'qr', tab: 'outbound' }
    ]
  },
  'outbound:picking': {
    title: '출고 피킹',
    summary: 'PENDING/PICKING 출고 지시서에서 바코드·SKU로 피킹 수량을 쌓습니다.',
    steps: [
      '피킹 대기 카드를 눌러 검수 화면을 엽니다.',
      'SKU를 스캔(또는 입력)하면 피킹 수량이 증가합니다.',
      '전 품목 피킹이 끝나면 자동으로 패킹 단계로 넘어갑니다.'
    ],
    tips: ['이 단계에서는 아직 재고가 차감되지 않습니다.'],
    related: [{ label: '패킹/송장', page: 'outbound', tab: 'packing' }]
  },
  'outbound:packing': {
    title: '패킹/송장',
    summary: '피킹 완료 건에 택배사·운송장을 넣고 출고를 확정합니다.',
    steps: [
      '택배사·운송장·박스를 입력한 뒤 [패킹 완료 및 송장 저장]을 누릅니다.',
      '출고 창고를 고른 뒤 [출고 확정]으로 재고를 차감합니다.'
    ],
    tips: ['간편 출고는 등록 시 바로 확정될 수 있습니다.'],
    related: [
      { label: '피킹', page: 'outbound', tab: 'picking' },
      { label: '출고 이력', page: 'outbound', tab: 'hist' }
    ]
  },
  'outbound:hist': {
    title: '출고 이력',
    summary: '과거 출고 전표와 배송 정보를 조회합니다.',
    steps: [
      '기간·고객으로 이력을 검색합니다.',
      '상세에서 품목을 확인하고 추적을 입력합니다.'
    ],
    tips: [],
    related: [{ label: '간편 출고', page: 'outbound', tab: 'reg' }]
  },
  'outbound:warehouse': {
    title: '창고별 출고 관리',
    summary: '창고 기준으로 출고·재고를 점검합니다.',
    steps: ['창고를 선택합니다.', '해당 창고의 출고·잔량을 확인합니다.'],
    tips: [],
    related: [{ label: '창고별 재고', page: 'stock', tab: 'levels' }]
  },
  purchases: {
    title: '입고/발주',
    summary: '공급사 발주서 작성·입고 처리와 공급사 마스터를 관리합니다.',
    steps: [
      '발주 관리 탭에서 발주서를 작성하거나 MES 초안을 확인합니다.',
      '초안(DRAFT)은 발주확정 후 입고합니다.',
      '공급사 관리에서 거래처를 먼저 등록해 두세요.'
    ],
    tips: ['부족 자재는 제조실행 → 자재·외주에서 초안을 만들 수 있습니다.'],
    related: [
      { label: '발주 관리', page: 'purchases', tab: 'purchases' },
      { label: '자재·외주', page: 'production', tab: 'materials' }
    ]
  },
  'purchases:purchases': {
    title: '발주 관리',
    summary: '발주서 작성·확정·입고 처리를 진행합니다.',
    steps: [
      '새 발주를 만들거나 목록의 초안을 엽니다.',
      '공급사·품목·수량·납기를 확인합니다.',
      '[발주확정] 후 입고 처리하면 재고에 반영됩니다.'
    ],
    tips: ['DRAFT는 수정 가능, ORDERED 이후는 입고 흐름을 따릅니다.'],
    related: [
      { label: '공급사', page: 'purchases', tab: 'suppliers' },
      { label: '자재·외주', page: 'production', tab: 'materials' }
    ]
  },
  'purchases:suppliers': {
    title: '공급사 관리',
    summary: '발주에 사용할 공급사(거래처)를 등록합니다.',
    steps: [
      '[공급사 등록]으로 상호·담당·연락처를 저장합니다.',
      '발주서 작성 시 이 목록에서 선택합니다.'
    ],
    tips: [],
    related: [{ label: '발주 관리', page: 'purchases', tab: 'purchases' }]
  },
  prices: {
    title: '가격 정책',
    summary: '등급·고객별 특수 단가를 관리합니다.',
    steps: ['등급별 단가 또는 고객 전용 단가를 등록합니다.', '판매(POS) 시 고객/등급에 따라 적용됩니다.'],
    tips: [],
    related: [{ label: '가격 정책', page: 'pricing-policy' }]
  },
  'pricing-policy': {
    title: '가격 정책',
    summary: '등급별 가격과 고객별 전용 단가를 설정합니다.',
    steps: [
      '등급별 가격 설정 탭에서 상품·등급 단가를 입력·저장합니다.',
      '고객별 전용 단가 탭에서 특정 고객 계약을 등록합니다.',
      '판매 시 고객을 선택하면 해당 단가가 반영됩니다.'
    ],
    tips: ['운영 가이드 버튼으로 화면 내 안내도 확인할 수 있습니다.'],
    related: [
      { label: '고객', page: 'customers' },
      { label: '판매(POS)', page: 'sales', tab: 'pos' }
    ]
  },
  'pricing-policy:grade': {
    title: '등급별 가격',
    summary: '고객 등급(A/B/C 등)에 따른 상품 단가를 설정합니다.',
    steps: [
      '상품을 검색합니다.',
      '등급별 칸에 단가를 입력하고 저장합니다.'
    ],
    tips: [],
    related: [{ label: '고객별 단가', page: 'pricing-policy', tab: 'customer' }]
  },
  'pricing-policy:customer': {
    title: '고객별 전용 단가',
    summary: '특정 고객과 상품의 계약 단가를 관리합니다.',
    steps: [
      '고객을 선택하고 계약 상품·단가를 추가합니다.',
      '저장 후 POS/판매에서 해당 고객 선택 시 적용됩니다.'
    ],
    tips: [],
    related: [{ label: '등급별 가격', page: 'pricing-policy', tab: 'grade' }]
  },
  'transaction-statement': {
    title: '거래명세서',
    summary: '고객·기간 기준으로 거래명세서를 조회·저장·출력합니다.',
    steps: [
      '고객을 검색·선택합니다.',
      '시작일·종료일을 지정한 뒤 내역을 조회합니다.',
      '[명세서 저장]으로 문서번호(TS-…)를 발급·보관합니다.',
      '인쇄/엑셀로 출력합니다.'
    ],
    tips: ['저장 이력은 화면 하단에서 확인할 수 있습니다.'],
    related: [
      { label: '주문 관리', page: 'sales', tab: 'orders' },
      { label: '고객', page: 'customers' }
    ]
  },
  settings: {
    title: '설정',
    summary: '회사·사용자·권한 등 시스템 설정을 다룹니다.',
    steps: [
      '회사 정보·로고를 확인합니다.',
      '필요 시 멤버를 초대하고 역할을 지정합니다.',
      '창고·기본 운영 옵션을 점검합니다.'
    ],
    tips: ['관리자 권한이 필요합니다.'],
    related: [{ label: '사용안내', page: 'help' }]
  },
  'super-admin': {
    title: '슈퍼관리',
    summary: '플랫폼 관리자용 테넌트·시스템 점검 화면입니다.',
    steps: ['테넌트를 조회·전환합니다.', '일반 운영 업무는 각 테넌트 메뉴에서 진행합니다.'],
    tips: ['일반 사용자에게는 보이지 않습니다.'],
    related: []
  },

  // ---------- 제조실행 (우선) ----------
  'production:shopfloor': {
    title: '현장 실행',
    summary: '작업지시를 고르고 QR/바코드로 투입·공정·포장·실적을 처리하는 현장 화면입니다.',
    steps: [
      '왼쪽에서 오늘 작업(확정/진행) WO를 선택합니다.',
      '상태가 확정이면 [작업 시작]으로 진행중으로 바꿉니다.',
      '자재 투입 / 공정 완료 / 완제품 포장 / 실적 등록 중 작업을 고릅니다.',
      'QR을 스캔(또는 입력)하고 수량을 넣은 뒤 [확인·실행]합니다.',
      '최근 타임라인에서 결과가 쌓이는지 확인합니다.'
    ],
    tips: [
      '완료/취소 WO는 일정·현장에서 수정이 제한됩니다.',
      '카메라 권한이 필요합니다. 바코드건은 입력칸 포커스 후 스캔하세요.'
    ],
    related: [
      { label: '생산 일정', page: 'production', tab: 'schedule' },
      { label: '작업지시', page: 'production', tab: 'work-orders' }
    ]
  },
  'production:kpi': {
    title: '제조 현황',
    summary: '생산 KPI·원가·월간 성과를 확인하는 관리 대시보드입니다.',
    steps: [
      '상단 지표로 미완료 WO·진행·양품을 봅니다.',
      '아래로 스크롤해 원가·성과 표를 확인합니다.'
    ],
    tips: ['세부 실행은 현장실행·작업지시에서 합니다.'],
    related: [{ label: '현장 실행', page: 'production', tab: 'shopfloor' }]
  },
  'production:schedule': {
    title: '생산 일정',
    summary: '작업지시를 주간 칸에 끌어다 배치하는 일정판입니다.',
    steps: [
      '왼쪽 미배정 풀에서 WO 카드를 확인합니다.',
      '카드를 원하는 요일 칸으로 드래그합니다. (시작일이 저장됩니다)',
      '기간이 있던 WO는 일수를 유지한 채 이동합니다.',
      '미배정으로 다시 드롭하면 일정이 해제됩니다.',
      '완료/취소 숨김으로 목록을 정리할 수 있습니다.'
    ],
    tips: ['납기 지연은 빨간 테두리로 표시됩니다.', '먼저 작업지시 탭에서 WO를 등록·확정하세요.'],
    related: [
      { label: '작업지시', page: 'production', tab: 'work-orders' },
      { label: '현장 실행', page: 'production', tab: 'shopfloor' }
    ]
  },
  'production:masters': {
    title: '기준정보',
    summary: 'BOM·공정·설비 마스터를 관리합니다.',
    steps: [
      'BOM에 완제품과 구성자재를 등록합니다.',
      '공정·설비를 등록하고 WO에 연결할 수 있습니다.'
    ],
    tips: ['BOM이 없으면 자재소요(MRP)·투입이 제한됩니다.'],
    related: [{ label: '작업지시', page: 'production', tab: 'work-orders' }]
  },
  'production:work-orders': {
    title: '작업지시',
    summary: '생산 WO를 등록하고 상태를 관리합니다.',
    steps: [
      '완제품·계획수량·BOM·창고를 넣어 WO를 등록합니다.',
      '계획 → 확정(released) → 진행 → 완료 순으로 상태를 바꿉니다.',
      '실적은 현장실행 또는 이 화면의 실적 기능으로 등록합니다.'
    ],
    tips: ['확정 시 창고가 필요할 수 있습니다.', '일정 배치는 생산 일정 탭에서 하세요.'],
    related: [
      { label: '생산 일정', page: 'production', tab: 'schedule' },
      { label: '현장 실행', page: 'production', tab: 'shopfloor' }
    ]
  },
  'production:materials': {
    title: '자재·외주',
    summary: '미완료 WO×BOM 기준 자재 소요·부족을 보고, 발주 초안·외주를 처리합니다.',
    steps: [
      '자재 소요 표에서 부족(빨간색) 품목을 확인합니다.',
      '발주할 품목을 체크한 뒤 [부족분 발주 초안]을 누릅니다.',
      '공급사·수량·납기를 확인하고 초안 저장 또는 발주 확정합니다.',
      '필요 시 자재 불출·외주 등록을 진행합니다.'
    ],
    tips: [
      '초안(DRAFT)은 입고/발주 메뉴에서 수정·발주확정할 수 있습니다.',
      '단가는 상품 매입가를 사용합니다.'
    ],
    related: [
      { label: '입고/발주', page: 'purchases' },
      { label: '생산 일정', page: 'production', tab: 'schedule' }
    ]
  },
  'production:trace': {
    title: '현장추적',
    summary: 'Lot/QR로 제조→유통 이력을 조회하고 현장 이벤트를 남깁니다.',
    steps: [
      'QR 또는 Lot으로 역추적을 조회합니다.',
      '작업지시를 고르고 투입/공정/포장 이벤트를 기록할 수 있습니다.'
    ],
    tips: ['일상 현장 작업은 현장실행 탭이 더 단순합니다.'],
    related: [{ label: '현장 실행', page: 'production', tab: 'shopfloor' }]
  },
  'production:quality': {
    title: '품질검사',
    summary: '검사·불량유형·NCR을 관리합니다.',
    steps: ['검사 결과를 등록합니다.', '불량 시 NCR을 열어 조치합니다.'],
    tips: [],
    related: [{ label: '현장 실행', page: 'production', tab: 'shopfloor' }]
  },

  // ---------- QR (우선) ----------
  'qr:dashboard': {
    title: 'QR 현황',
    summary: '오늘 QR 입고·출고·판매와 활성 코드를 요약합니다.',
    steps: ['오늘 건수를 확인합니다.', '최근 트랜잭션을 보고 이상 여부를 점검합니다.'],
    tips: [],
    related: [{ label: 'QR 입고', page: 'qr', tab: 'inbound' }]
  },
  'qr:inbound': {
    title: 'QR 입고',
    summary: 'QR·바코드·SKU를 스캔해 창고에 입고합니다.',
    steps: [
      '카메라 스캔을 시작하거나, 아래 입력칸에 바코드건으로 찍습니다.',
      '상품·재고가 뜨면 수량·창고를 확인합니다.',
      '[입고 확정]으로 완료합니다.',
      '오늘 입고 이력에서 결과를 확인합니다.'
    ],
    tips: ['바코드건은 입력칸 포커스 + Enter(접미사) 설정을 권장합니다.', '미등록 바코드는 바코드 관리에서 매핑하세요.'],
    related: [
      { label: '바코드 등록', page: 'barcode', tab: 'register' },
      { label: 'QR 출고', page: 'qr', tab: 'outbound' }
    ]
  },
  'qr:outbound': {
    title: 'QR 출고',
    summary: '스캔으로 창고에서 재고를 출고합니다.',
    steps: [
      'QR/바코드/SKU를 스캔합니다.',
      '수량·창고를 확인하고 [출고 확정]합니다.',
      '재고가 부족하면 진행되지 않습니다.'
    ],
    tips: [],
    related: [{ label: 'QR 입고', page: 'qr', tab: 'inbound' }]
  },
  'qr:sale': {
    title: 'QR 판매',
    summary: '스캔 후 수량·단가로 즉시 판매 처리합니다.',
    steps: [
      '상품을 스캔합니다.',
      '수량·판매 단가·(선택) 고객명을 입력합니다.',
      '[판매 확정]하면 재고가 차감되고 판매가 기록됩니다.'
    ],
    tips: [],
    related: [{ label: '판매 관리', page: 'sales' }]
  },
  'qr:management': {
    title: 'QR 라벨관리',
    summary: '제품별 QR을 생성하고 라벨을 출력합니다.',
    steps: ['제품을 고르고 생성 수량을 입력합니다.', '생성된 코드를 다운로드/인쇄합니다.'],
    tips: ['제품 식별용 1D는 바코드 관리 메뉴를 사용하세요.'],
    related: [{ label: '바코드 라벨', page: 'barcode', tab: 'labels' }]
  },

  // ---------- 바코드 (우선) ----------
  'barcode:dashboard': {
    title: '바코드 현황',
    summary: '바코드 등록률과 미등록 제품을 확인합니다.',
    steps: [
      '등록/미등록 수를 봅니다.',
      '미등록 목록에서 [등록]으로 바로 매핑 화면으로 갑니다.',
      '필요 시 SKU→바코드 복사를 사용합니다.'
    ],
    tips: [],
    related: [{ label: '등록·수정', page: 'barcode', tab: 'register' }]
  },
  'barcode:register': {
    title: '바코드 등록·수정',
    summary: '제품에 바코드를 매핑합니다. 바코드건 입력에 최적화되어 있습니다.',
    steps: [
      '필터(미등록)와 검색으로 제품을 찾습니다.',
      '바코드 칸에 스캔하거나 입력합니다.',
      'Enter 또는 [저장]으로 저장합니다.',
      '선택 후 SKU→바코드 복사도 가능합니다.'
    ],
    tips: ['동일 테넌트 내 바코드 중복은 허용되지 않습니다.'],
    related: [
      { label: '라벨 출력', page: 'barcode', tab: 'labels' },
      { label: 'QR 입고', page: 'qr', tab: 'inbound' }
    ]
  },
  'barcode:labels': {
    title: '바코드 라벨',
    summary: '등록된 바코드를 Code128/EAN으로 미리보기·인쇄합니다.',
    steps: [
      '등록된 제품을 검색·선택합니다.',
      '심볼로지(보통 Code128)와 수량을 정합니다.',
      '미리보기 후 [라벨 인쇄]합니다. (팝업 허용 필요)'
    ],
    tips: ['EAN-13은 자릿수가 맞아야 합니다. 실패 시 Code128을 쓰세요.'],
    related: [{ label: '등록·수정', page: 'barcode', tab: 'register' }]
  }
};

const HELP_HUB_SECTIONS = [
  {
    title: '추천 시나리오',
    items: [
      { key: 'production:schedule', label: '① 일정 배치 → 현장 실행', hint: '생산 일정에서 배치 후 현장실행' },
      { key: 'production:materials', label: '② 부족자재 → 발주 초안', hint: '자재·외주에서 초안 생성' },
      { key: 'qr:inbound', label: '③ 스캔 입고/출고/판매', hint: 'QR 현장 + 바코드건' }
    ]
  },
  {
    title: '제조실행',
    items: [
      { key: 'production:shopfloor', label: '현장 실행' },
      { key: 'production:kpi', label: '제조 현황' },
      { key: 'production:schedule', label: '생산 일정' },
      { key: 'production:masters', label: '기준정보' },
      { key: 'production:work-orders', label: '작업지시' },
      { key: 'production:materials', label: '자재·외주' },
      { key: 'production:trace', label: '현장추적' },
      { key: 'production:quality', label: '품질검사' }
    ]
  },
  {
    title: 'QR · 바코드',
    items: [
      { key: 'qr:dashboard', label: 'QR 현황' },
      { key: 'qr:inbound', label: 'QR 입고' },
      { key: 'qr:outbound', label: 'QR 출고' },
      { key: 'qr:sale', label: 'QR 판매' },
      { key: 'qr:management', label: 'QR 라벨관리' },
      { key: 'barcode:dashboard', label: '바코드 현황' },
      { key: 'barcode:register', label: '바코드 등록' },
      { key: 'barcode:labels', label: '바코드 라벨' }
    ]
  },
  {
    title: '유통·공통',
    items: [
      { key: 'dashboard', label: '대시보드' },
      { key: 'sales:pos', label: '판매(POS)' },
      { key: 'quotations', label: '견적' },
      { key: 'sales:orders', label: '주문 관리' },
      { key: 'sales:claims', label: '클레임' },
      { key: 'outbound:reg', label: '간편 출고' },
      { key: 'outbound:picking', label: '피킹' },
      { key: 'outbound:packing', label: '패킹/송장' },
      { key: 'outbound:hist', label: '출고 이력' },
      { key: 'purchases:purchases', label: '발주 관리' },
      { key: 'purchases:suppliers', label: '공급사' },
      { key: 'stock:movements', label: '재고 이동' },
      { key: 'stock:levels', label: '창고별 재고' },
      { key: 'transaction-statement', label: '거래명세서' },
      { key: 'products', label: '상품' },
      { key: 'product-options', label: '옵션 관리' },
      { key: 'pricing-policy', label: '가격 정책' },
      { key: 'customers', label: '고객' },
      { key: 'settings', label: '설정' }
    ]
  }
];

function helpEsc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function helpNormalizeKey(page, tab) {
  if (!page) return 'dashboard';
  if (page === 'help' || page === 'guide') return 'hub';
  if (page === 'prices') page = 'pricing-policy';
  if (page === 'shopfloor') return 'production:shopfloor';
  if (String(page).startsWith('qr-')) {
    const m = {
      'qr-dashboard': 'dashboard',
      'qr-inbound': 'inbound',
      'qr-outbound': 'outbound',
      'qr-sale': 'sale',
      'qr-management': 'management'
    };
    return `qr:${m[page] || 'dashboard'}`;
  }
  if (String(page).startsWith('barcode-')) {
    const m = {
      'barcode-dashboard': 'dashboard',
      'barcode-register': 'register',
      'barcode-labels': 'labels'
    };
    return `barcode:${m[page] || 'dashboard'}`;
  }
  if (tab) return `${page}:${tab}`;
  return page;
}

function helpResolveGuide(key) {
  if (HELP_GUIDES[key]) return { key, guide: HELP_GUIDES[key] };
  const pageOnly = String(key).split(':')[0];
  if (HELP_GUIDES[pageOnly]) return { key: pageOnly, guide: HELP_GUIDES[pageOnly] };
  return {
    key,
    guide: {
      title: '안내 준비 중',
      summary: '이 메뉴의 상세 안내가 아직 없습니다. 사용안내 허브에서 다른 메뉴를 살펴보세요.',
      steps: ['화면 UI의 버튼 이름대로 진행해 주세요.', '사용안내 허브에서 유사 메뉴를 참고하세요.'],
      tips: [],
      related: [{ label: '사용안내 허브', page: 'help' }]
    }
  };
}

window.setHelpContext = function (page, tab = null) {
  window._helpContext = { page, tab: tab || null };
  const btn = document.getElementById('help-page-btn');
  if (btn) {
    const { guide } = helpResolveGuide(helpNormalizeKey(page, tab));
    btn.title = `사용설명: ${guide.title}`;
  }
};

window.openCurrentHelp = function () {
  const ctx = window._helpContext || {};
  openHelpPanel(helpNormalizeKey(ctx.page, ctx.tab));
};

window.openHelpHub = function () {
  if (typeof loadPage === 'function') loadPage('help');
  else openHelpPanel('hub');
};

window.openHelpPanel = function (key) {
  ensureHelpPanelDom();
  const { key: resolvedKey, guide } = helpResolveGuide(key || 'hub');
  const overlay = document.getElementById('help-overlay');
  const panel = document.getElementById('help-panel');
  const body = document.getElementById('help-panel-body');
  if (!overlay || !panel || !body) return;

  body.innerHTML = renderHelpArticle(resolvedKey, guide, false);
  overlay.classList.remove('hidden');
  requestAnimationFrame(() => {
    panel.classList.remove('translate-x-full');
  });
};

window.closeHelpPanel = function () {
  const overlay = document.getElementById('help-overlay');
  const panel = document.getElementById('help-panel');
  if (panel) panel.classList.add('translate-x-full');
  setTimeout(() => overlay?.classList.add('hidden'), 200);
};

function renderHelpArticle(key, guide, compact) {
  const related = (guide.related || []).map((r) => {
    const tabArg = r.tab != null ? `, '${r.tab}'` : '';
    return `<button type="button" onclick="closeHelpPanel();loadPage('${r.page}'${tabArg})"
      class="text-left px-3 py-2 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50 text-sm text-slate-700">
      ${helpEsc(r.label)} <i class="fas fa-arrow-right text-xs text-slate-400 ml-1"></i>
    </button>`;
  }).join('');

  return `
    <div class="${compact ? '' : 'space-y-4'}">
      <div>
        <div class="text-[11px] font-mono text-slate-400 mb-1">${helpEsc(key)}</div>
        <h3 class="text-lg font-bold text-slate-800">${helpEsc(guide.title)}</h3>
        <p class="text-sm text-slate-600 mt-1 leading-relaxed">${helpEsc(guide.summary)}</p>
      </div>
      ${(guide.steps || []).length ? `
        <div>
          <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">기본 순서</h4>
          <ol class="space-y-2">
            ${guide.steps.map((s, i) => `
              <li class="flex gap-2 text-sm text-slate-700">
                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center">${i + 1}</span>
                <span class="leading-relaxed pt-0.5">${helpEsc(s)}</span>
              </li>`).join('')}
          </ol>
        </div>` : ''}
      ${(guide.tips || []).length ? `
        <div class="rounded-xl bg-amber-50 border border-amber-100 p-3">
          <h4 class="text-xs font-bold text-amber-800 mb-1"><i class="fas fa-lightbulb mr-1"></i>알아두기</h4>
          <ul class="text-sm text-amber-900/90 space-y-1 list-disc list-inside">
            ${guide.tips.map((t) => `<li>${helpEsc(t)}</li>`).join('')}
          </ul>
        </div>` : ''}
      ${related ? `
        <div>
          <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">관련 메뉴</h4>
          <div class="flex flex-col gap-2">${related}</div>
        </div>` : ''}
      <button type="button" onclick="closeHelpPanel();openHelpHub()" class="w-full text-center text-sm text-teal-700 font-semibold py-2 hover:underline">
        사용안내 허브 열기
      </button>
    </div>`;
}

function ensureHelpPanelDom() {
  if (document.getElementById('help-overlay')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div id="help-overlay" class="hidden fixed inset-0 z-[80]">
      <div class="absolute inset-0 bg-black/30" onclick="closeHelpPanel()"></div>
      <aside id="help-panel"
        class="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l border-slate-200 translate-x-full transition-transform duration-200 flex flex-col">
        <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div class="font-bold text-slate-800"><i class="fas fa-circle-question mr-2 text-teal-600"></i>사용설명</div>
          <button type="button" onclick="closeHelpPanel()" class="w-9 h-9 rounded-lg hover:bg-slate-200 text-slate-500">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div id="help-panel-body" class="flex-1 overflow-y-auto p-4"></div>
      </aside>
    </div>`;
  document.body.appendChild(wrap.firstElementChild);
}

window.loadHelpHubPage = async function () {
  const content = document.getElementById('content');
  if (!content) return;
  window.setHelpContext('help');

  content.innerHTML = `
    <div class="max-w-5xl mx-auto">
      <div class="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-slate-800"><i class="fas fa-book-open mr-2 text-teal-600"></i>사용안내</h1>
          <p class="text-sm text-slate-500 mt-1">메뉴별 짧은 설명서입니다. 업무 중에는 헤더의 ? 버튼으로 현재 화면 안내를 여세요.</p>
        </div>
        <button type="button" onclick="startHelpTour(true)"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-teal-200 bg-teal-50 text-teal-800 text-sm font-semibold hover:bg-teal-100">
          <i class="fas fa-route"></i>첫 사용 투어
        </button>
      </div>

      <div class="grid lg:grid-cols-12 gap-6">
        <nav class="lg:col-span-4 space-y-4">
          ${HELP_HUB_SECTIONS.map((sec, si) => `
            <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div class="px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-600">${helpEsc(sec.title)}</div>
              <div class="divide-y divide-slate-100">
                ${sec.items.map((it, ii) => `
                  <button type="button" onclick="helpHubShow('${it.key}')"
                    class="help-hub-item w-full text-left px-4 py-2.5 text-sm hover:bg-teal-50 ${si === 0 && ii === 0 ? 'bg-teal-50 text-teal-800 font-semibold' : 'text-slate-700'}"
                    data-help-key="${it.key}">
                    ${helpEsc(it.label)}
                    ${it.hint ? `<div class="text-[11px] text-slate-400 font-normal mt-0.5">${helpEsc(it.hint)}</div>` : ''}
                  </button>`).join('')}
              </div>
            </div>`).join('')}
        </nav>
        <div class="lg:col-span-8">
          <div id="help-hub-article" class="bg-white border border-slate-200 rounded-xl p-6 min-h-[420px]"></div>
          <div class="mt-4 flex flex-wrap gap-2">
            <button type="button" id="help-hub-go" class="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700">
              해당 메뉴로 이동
            </button>
            <button type="button" onclick="openHelpPanel(window._helpHubKey || 'hub')" class="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50">
              패널로 보기
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  window.helpHubShow(HELP_HUB_SECTIONS[0].items[0].key);
};

window.helpHubShow = function (key) {
  window._helpHubKey = key;
  const { guide } = helpResolveGuide(key);
  const el = document.getElementById('help-hub-article');
  if (el) el.innerHTML = renderHelpArticle(key, guide, true);

  document.querySelectorAll('.help-hub-item').forEach((btn) => {
    if (btn.dataset.helpKey === key) {
      btn.classList.add('bg-teal-50', 'text-teal-800', 'font-semibold');
    } else {
      btn.classList.remove('bg-teal-50', 'text-teal-800', 'font-semibold');
    }
  });

  const go = document.getElementById('help-hub-go');
  if (go) {
    go.onclick = () => {
      if (key === 'hub') return;
      const [page, tab] = key.split(':');
      if (typeof loadPage === 'function') loadPage(page, tab || null);
    };
  }
};

/* ========== 첫 방문 투어 ========== */
const HELP_TOUR_STORAGE_KEY = 'wsm_help_tour_v1';
const HELP_TOUR_SESSION_KEY = 'wsm_help_tour_session_v1';

const HELP_TOUR_STEPS = [
  {
    title: '왼쪽 메뉴',
    body: '유통·제조·QR·바코드 업무가 사이드바에 모여 있습니다. 그룹을 펼쳐 원하는 화면으로 이동하세요.',
    selector: '#sidebar',
    pad: 8
  },
  {
    title: '현재 화면 도움말',
    body: '우측 상단 ? (도움말)을 누르면 지금 보고 있는 메뉴의 짧은 설명서가 열립니다.',
    selector: '#help-page-btn',
    pad: 10
  },
  {
    title: '사용안내 허브',
    body: '시스템 → 사용안내에서 전체 메뉴 설명과 추천 업무 시나리오를 볼 수 있습니다.',
    selector: '#nav-help',
    pad: 8
  },
  {
    title: '제조·현장부터',
    body: '생산 일정을 배치한 뒤 현장 실행으로 스캔·실적을 처리하고, 부족 자재는 자재·외주에서 발주 초안을 만들 수 있습니다.',
    selector: 'a.nav-link[data-page="production"][data-tab="shopfloor"]',
    pad: 8
  }
];

function helpTourIsDismissed() {
  try {
    if (localStorage.getItem(HELP_TOUR_STORAGE_KEY) === 'dismissed') return true;
    if (sessionStorage.getItem(HELP_TOUR_SESSION_KEY) === 'done') return true;
    return false;
  } catch {
    return false;
  }
}

function helpTourMarkDismissed() {
  try {
    localStorage.setItem(HELP_TOUR_STORAGE_KEY, 'dismissed');
  } catch { /* ignore */ }
}

function helpTourMarkSessionDone() {
  try {
    sessionStorage.setItem(HELP_TOUR_SESSION_KEY, 'done');
  } catch { /* ignore */ }
}

function ensureHelpTourDom() {
  if (document.getElementById('help-tour-overlay')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div id="help-tour-overlay" class="hidden fixed inset-0 z-[90]">
      <div id="help-tour-backdrop" class="absolute inset-0 cursor-default"></div>
      <div id="help-tour-spot" class="absolute rounded-xl ring-2 ring-teal-400 pointer-events-none shadow-[0_0_0_9999px_rgba(15,23,42,0.55)] transition-all duration-200 bg-transparent"></div>
      <div id="help-tour-card" class="absolute z-10 w-[min(360px,calc(100vw-2rem))] bg-white rounded-2xl shadow-2xl border border-slate-200 p-4">
        <div class="text-[11px] font-bold text-teal-700 mb-1" id="help-tour-step-label">1 / 4</div>
        <h3 id="help-tour-title" class="text-base font-bold text-slate-800"></h3>
        <p id="help-tour-body" class="text-sm text-slate-600 mt-2 leading-relaxed"></p>
        <label class="mt-3 flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
          <input type="checkbox" id="help-tour-dont-show" class="rounded border-slate-300 text-teal-600 focus:ring-teal-500">
          다시 보지 않기
        </label>
        <div class="mt-4 flex items-center justify-between gap-2">
          <button type="button" id="help-tour-skip" class="text-sm text-slate-500 hover:text-slate-700 px-2 py-1.5">건너뛰기</button>
          <div class="flex gap-2">
            <button type="button" id="help-tour-prev" class="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">이전</button>
            <button type="button" id="help-tour-next" class="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700">다음</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap.firstElementChild);

  document.getElementById('help-tour-backdrop')?.addEventListener('click', () => finishHelpTour(true));
  document.getElementById('help-tour-skip')?.addEventListener('click', () => finishHelpTour(true));
  document.getElementById('help-tour-prev')?.addEventListener('click', () => {
    if (window._helpTourIndex > 0) {
      window._helpTourIndex -= 1;
      renderHelpTourStep();
    }
  });
  document.getElementById('help-tour-next')?.addEventListener('click', () => {
    if (window._helpTourIndex < HELP_TOUR_STEPS.length - 1) {
      window._helpTourIndex += 1;
      renderHelpTourStep();
    } else {
      finishHelpTour(true);
    }
  });
}

function placeHelpTourCard(rect) {
  const card = document.getElementById('help-tour-card');
  if (!card) return;
  const cw = card.offsetWidth || 360;
  const ch = card.offsetHeight || 220;
  const gap = 12;
  let top = rect.bottom + gap;
  let left = Math.min(Math.max(12, rect.left), window.innerWidth - cw - 12);
  if (top + ch > window.innerHeight - 12) {
    top = Math.max(12, rect.top - ch - gap);
  }
  if (top < 12) top = 12;
  card.style.top = `${top}px`;
  card.style.left = `${left}px`;
}

function renderHelpTourStep() {
  const step = HELP_TOUR_STEPS[window._helpTourIndex];
  if (!step) return finishHelpTour(false);

  const title = document.getElementById('help-tour-title');
  const body = document.getElementById('help-tour-body');
  const label = document.getElementById('help-tour-step-label');
  const nextBtn = document.getElementById('help-tour-next');
  const prevBtn = document.getElementById('help-tour-prev');
  const spot = document.getElementById('help-tour-spot');
  if (title) title.textContent = step.title;
  if (body) body.textContent = step.body;
  if (label) label.textContent = `${window._helpTourIndex + 1} / ${HELP_TOUR_STEPS.length}`;
  if (nextBtn) nextBtn.textContent = window._helpTourIndex === HELP_TOUR_STEPS.length - 1 ? '시작하기' : '다음';
  if (prevBtn) prevBtn.disabled = window._helpTourIndex === 0;

  const el = document.querySelector(step.selector);
  const pad = step.pad || 8;
  let rect;
  if (el) {
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    rect = el.getBoundingClientRect();
  } else {
    rect = { top: 80, left: 80, right: 280, bottom: 200, width: 200, height: 120 };
  }
  if (spot) {
    spot.style.top = `${Math.max(0, rect.top - pad)}px`;
    spot.style.left = `${Math.max(0, rect.left - pad)}px`;
    spot.style.width = `${Math.max(40, rect.width + pad * 2)}px`;
    spot.style.height = `${Math.max(40, rect.height + pad * 2)}px`;
  }
  placeHelpTourCard(rect);
}

window.finishHelpTour = function (respectCheckbox) {
  const overlay = document.getElementById('help-tour-overlay');
  overlay?.classList.add('hidden');
  window._helpTourActive = false;
  helpTourMarkSessionDone();
  if (respectCheckbox) {
    const cb = document.getElementById('help-tour-dont-show');
    if (cb?.checked) helpTourMarkDismissed();
  }
  window.removeEventListener('resize', renderHelpTourStep);
};

window.startHelpTour = function (force = false) {
  if (!force && helpTourIsDismissed()) return;
  if (window._helpTourActive) return;
  if (force) {
    try {
      sessionStorage.removeItem(HELP_TOUR_SESSION_KEY);
    } catch { /* ignore */ }
  }
  ensureHelpTourDom();
  window._helpTourActive = true;
  window._helpTourIndex = 0;
  const cb = document.getElementById('help-tour-dont-show');
  if (cb) cb.checked = false;
  document.getElementById('help-tour-overlay')?.classList.remove('hidden');
  window.addEventListener('resize', renderHelpTourStep);
  renderHelpTourStep();
};

window.maybeStartHelpTour = function () {
  if (helpTourIsDismissed()) return;
  if (window._helpTourScheduled) return;
  window._helpTourScheduled = true;
  setTimeout(() => {
    if (!document.getElementById('sidebar')) return;
    startHelpTour(false);
  }, 900);
};
