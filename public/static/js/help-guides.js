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

  // ---------- ERP 스텁 (Phase 0 골격) ----------
  'erp-stub': {
    title: 'ERP 준비중 메뉴',
    summary: '사이드바 ERP 모듈 골격이 잡혀 있으며, 아직 기능 구현 전인 항목입니다.',
    steps: [
      '준비중 뱃지 메뉴를 누르면 예정 Phase와 요약이 표시됩니다.',
      '관련 메뉴로 이동해 현재 가능한 업무를 진행합니다.'
    ],
    tips: ['구현 순서: 재무(Phase 1) → 구매·재고 → 영업 CRM → 인사.'],
    related: [{ label: '대시보드', page: 'dashboard' }]
  },
  'crm-pipeline': {
    title: '영업 기회',
    summary: '리드부터 수주까지 파이프라인 보드로 영업 기회를 관리합니다.',
    steps: [
      '기회명·고객·예상 금액을 등록합니다.',
      '카드를 드래그해 단계(리드→검증→제안→협상→수주/실주)를 바꿉니다.',
      '상세에서 견적을 연결하거나 견적 관리로 이동합니다.',
      '수주 표시 후 견적 수주 변환으로 판매를 확정합니다.'
    ],
    tips: ['가중 예상 금액 = Σ(금액 × 확률) 입니다.'],
    related: [
      { label: '견적 관리', page: 'quotations' },
      { label: '고객', page: 'customers' },
      { label: '주문/배송', page: 'sales', tab: 'orders' }
    ]
  },
  'erp-stub:crm-pipeline': {
    title: '영업 기회',
    summary: '구현됨 — ERP → 영업 · CRM → 영업 기회 메뉴를 이용하세요.',
    steps: [],
    tips: [],
    related: [{ label: '영업 기회 열기', page: 'crm-pipeline' }]
  },
  'erp-stub:proc-receive': {
    title: '입고 · 검수',
    summary: 'ERP → 구매 → 입고 · 검수 메뉴로 이동하세요.',
    steps: [],
    tips: [],
    related: [{ label: '입고 · 검수', page: 'proc-receive' }]
  },
  'erp-stub:proc-price': {
    title: '단가 관리',
    summary: 'ERP → 구매 → 단가 관리 메뉴로 이동하세요.',
    steps: [],
    tips: [],
    related: [{ label: '단가 관리', page: 'proc-price' }]
  },
  'erp-stub:proc-eval': {
    title: '공급사 평가',
    summary: 'ERP → 구매 → 공급사 평가 메뉴로 이동하세요.',
    steps: [],
    tips: [],
    related: [{ label: '공급사 평가', page: 'proc-eval' }]
  },
  'erp-stub:scm-reserve': {
    title: '예약 재고',
    summary: 'ERP → 재고 · SCM → 예약 재고 메뉴로 이동하세요.',
    steps: [],
    tips: [],
    related: [{ label: '예약 재고', page: 'scm-reserve' }]
  },
  'erp-stub:scm-reorder': {
    title: '적정재고 · 발주제안',
    summary: 'ERP → 재고 · SCM → 적정재고 · 발주제안 메뉴로 이동하세요.',
    steps: [],
    tips: [],
    related: [{ label: '발주제안', page: 'scm-reorder' }]
  },
  'proc-receive': {
    title: '입고 · 검수',
    summary: '발주 대기 건을 선택해 창고별 입고·검수합니다.',
    steps: [
      '왼쪽 목록에서 발주를 선택합니다.',
      '입고 창고를 고르고 이번 입고 수량을 입력합니다.',
      '검수 보류면 수량을 0으로 두거나 합격으로 바꾼 뒤 [입고 확정]합니다.'
    ],
    tips: ['입고 시 매입채무 전표·단가 이력이 자동 기록됩니다.'],
    related: [
      { label: '발주 관리', page: 'purchases', tab: 'purchases' },
      { label: '단가 관리', page: 'proc-price' }
    ]
  },
  'proc-price': {
    title: '구매 단가',
    summary: '공급사×품목 단가 이력을 조회·등록합니다.',
    steps: [
      '공급사를 선택해 이력을 확인합니다.',
      '품목·단가·적용일을 입력해 수동 등록할 수 있습니다.'
    ],
    tips: ['입고 확정 시에도 이력이 쌓입니다.'],
    related: [{ label: '입고 · 검수', page: 'proc-receive' }]
  },
  'proc-eval': {
    title: '공급사 평가',
    summary: '납기·품질·가격 점수로 공급사를 평가합니다.',
    steps: [
      '공급사와 기간을 입력합니다.',
      '각 항목 0–10점을 넣고 저장합니다.'
    ],
    tips: ['종합 점수는 세 항목 평균입니다.'],
    related: [{ label: '공급사', page: 'purchases', tab: 'suppliers' }]
  },
  'scm-reserve': {
    title: '예약 재고',
    summary: '활성 soft allocation을 조회하고 해제합니다.',
    steps: [
      '활성 예약을 확인합니다.',
      '필요 없으면 [해제]로 가용재고를 되돌립니다.'
    ],
    tips: ['견적에서 재고 예약을 켠 경우 여기에 나타납니다.'],
    related: [
      { label: '견적', page: 'quotations' },
      { label: '발주제안', page: 'scm-reorder' }
    ]
  },
  'scm-reorder': {
    title: '적정재고 · 발주제안',
    summary: '가용재고가 최소재고보다 낮은 품목을 제안합니다.',
    steps: [
      '부족 품목·제안 수량을 확인합니다.',
      '[발주 작성]으로 발주 관리로 이동합니다.'
    ],
    tips: ['최소재고는 품목의 재고 알림 수량을 사용합니다.'],
    related: [
      { label: '창고별 재고', page: 'stock', tab: 'levels' },
      { label: '발주 관리', page: 'purchases', tab: 'purchases' }
    ]
  },
  'erp-stub:fin-ar': {
    title: '매출채권 AR',
    summary: 'ERP → 재무 · 회계 → 매출채권 메뉴로 이동하세요.',
    steps: [],
    tips: [],
    related: [{ label: '매출채권', page: 'finance-ar' }]
  },
  'erp-stub:fin-ap': {
    title: '매입채무 AP',
    summary: 'ERP → 재무 · 회계 → 매입채무 메뉴로 이동하세요.',
    steps: [],
    tips: [],
    related: [{ label: '매입채무', page: 'finance-ap' }]
  },
  'erp-stub:fin-voucher': {
    title: '전표',
    summary: 'ERP → 재무 · 회계 → 전표 메뉴로 이동하세요.',
    steps: [],
    tips: [],
    related: [{ label: '전표', page: 'finance-vouchers' }]
  },
  'finance-ar': {
    title: '매출채권 (AR)',
    summary: '외상·부분입금 판매의 미수 잔액을 조회하고 입금 처리합니다.',
    steps: [
      '미수 필터로 미결제·부분입금 건을 조회합니다.',
      '연령 카드(0–30 / 31–60 / 61–90 / 90+)로 회수 우선순위를 봅니다.',
      '[전액입금] 또는 [부분입금]으로 결제 상태를 갱신합니다.'
    ],
    tips: ['입금 시 전표(매출수금)가 자동 생성됩니다.', 'POS에서 외상(credit)으로 등록한 판매가 여기에 나타납니다.'],
    related: [
      { label: '주문 관리', page: 'sales', tab: 'orders' },
      { label: '전표', page: 'finance-vouchers' }
    ]
  },
  'finance-ap': {
    title: '매입채무 (AP)',
    summary: '입고된 발주의 미지급 잔액을 조회하고 지급 처리합니다.',
    steps: [
      '입고(부분/전량)된 발주만 채무로 표시됩니다.',
      '[전액지급] 또는 [부분지급]으로 상태를 갱신합니다.'
    ],
    tips: ['입고 시 매입채무 전표, 지급 시 매입지급 전표가 생성됩니다.'],
    related: [
      { label: '발주 관리', page: 'purchases', tab: 'purchases' },
      { label: '전표', page: 'finance-vouchers' }
    ]
  },
  'finance-vouchers': {
    title: '전표',
    summary: '매출·매입·입금·지급 이벤트에서 자동 생성된 전표를 조회합니다.',
    steps: [
      '유형 필터로 매출채권/수금/매입채무/지급을 걸러봅니다.',
      '적요·거래처·금액으로 기장 이력을 확인합니다.'
    ],
    tips: ['복식원장·계정과목은 이후 Phase에서 확장됩니다.'],
    related: [
      { label: '매출채권', page: 'finance-ar' },
      { label: '매입채무', page: 'finance-ap' }
    ]
  },
  'erp-stub:fin-cash': {
    title: '자금 관리 (준비중)',
    summary: '계좌·현금흐름. Phase 6 예정.',
    steps: [],
    tips: [],
    related: []
  },
  'erp-stub:fin-close': {
    title: '결산 · 재무제표 (준비중)',
    summary: '결산·재무제표. Phase 6 예정.',
    steps: [],
    tips: [],
    related: []
  },
  'erp-stub:fin-tax': {
    title: '세무 (준비중)',
    summary: '세무 신고 지원. Phase 6 예정.',
    steps: [],
    tips: [],
    related: []
  },
  'hr-org': {
    title: '조직 · 사원',
    summary: '부서·사원 마스터와 로그인 계정 연결을 관리합니다.',
    steps: [
      '부서를 먼저 등록합니다.',
      '사원명·부서·직위·입사일을 입력해 사원을 등록합니다.',
      '필요 시 로그인 계정을 연결합니다.',
      '근태 메뉴에서 출퇴근·휴가를 기록합니다.'
    ],
    tips: ['사번은 자동 채번(EMP-…)됩니다.', '근태 이력이 있는 사원 삭제는 퇴직 처리됩니다.'],
    related: [
      { label: '근태', page: 'hr-attendance' },
      { label: '급여', page: 'hr-payroll' },
      { label: '설정(사용자)', page: 'settings' }
    ]
  },
  'hr-attendance': {
    title: '근태',
    summary: '사원별 출퇴근·휴가·연장근로를 기록합니다.',
    steps: [
      '사원과 근무일을 선택합니다.',
      '상태(출근/지각/결근/휴가 등)·출퇴근 시각을 입력합니다.',
      '동일 사원·날짜 재저장 시 기존 기록이 갱신됩니다.',
      '기간·부서로 조회해 연장 합계를 확인합니다.'
    ],
    tips: ['급여 메뉴에서 월별 근태·연장을 반영한 급여대장을 생성할 수 있습니다.'],
    related: [
      { label: '조직 · 사원', page: 'hr-org' },
      { label: '급여', page: 'hr-payroll' }
    ]
  },
  'hr-payroll': {
    title: '급여',
    summary: '월별 급여대장 초안 생성·항목 수정·확정을 처리합니다.',
    steps: [
      '조직·사원에서 기본급을 입력합니다.',
      '해당 월 근태(연장 포함)를 먼저 정리합니다.',
      '급여에서 연월을 고르고 초안을 생성합니다.',
      '항목을 수정한 뒤 확정합니다. 확정 후 수정·삭제 불가입니다.'
    ],
    tips: [
      '공제 요율은 간이 값이며 실제 세무 대체가 아닙니다.',
      '재계산하면 수동 수정분이 덮어씌워집니다.'
    ],
    related: [
      { label: '조직 · 사원', page: 'hr-org' },
      { label: '근태', page: 'hr-attendance' }
    ]
  },
  'erp-stub:hr-org': {
    title: '조직 · 사원',
    summary: '구현됨 — 조직 · 사원 메뉴를 이용하세요.',
    steps: [],
    tips: [],
    related: [{ label: '조직 · 사원 열기', page: 'hr-org' }]
  },
  'erp-stub:hr-attendance': {
    title: '근태',
    summary: '구현됨 — 근태 메뉴를 이용하세요.',
    steps: [],
    tips: [],
    related: [{ label: '근태 열기', page: 'hr-attendance' }]
  },
  'erp-stub:hr-payroll': {
    title: '급여',
    summary: '구현됨 — 급여 메뉴를 이용하세요.',
    steps: [],
    tips: [],
    related: [{ label: '급여 열기', page: 'hr-payroll' }]
  },
  'erp-stub:hr-talent': {
    title: '채용 · 평가 · 교육 (준비중)',
    summary: '채용·평가·교육. Phase 5 추후.',
    steps: [],
    tips: [],
    related: [{ label: '조직 · 사원', page: 'hr-org' }]
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
  'mes-equipment': {
    title: '설비 상태',
    summary: '설비가동·정지·고장·보전 이벤트를 실시간 기록합니다.',
    steps: [
      '설비 카드를 확인하고 현재 상태를 봅니다.',
      '[가동]/[정지]/[고장]/[보전]으로 상태 전환 이벤트를 기록합니다.'
    ],
    tips: ['이벤트 시간은 OEE 가동률 계산에 사용됩니다.'],
    related: [
      { label: 'OEE', page: 'mes-oee' },
      { label: '설비 마스터', page: 'production', tab: 'masters' }
    ]
  },
  'mes-oee': {
    title: 'OEE 대시보드',
    summary: '종합설비효율(가동률×성능×품질)을 설비별로 확인합니다.',
    steps: [
      '조회 기간(오늘/7일/30일)을 고릅니다.',
      '평균 OEE와 설비별 A/P/Q를 확인합니다.'
    ],
    tips: ['성능(P)은 이상 사이클 미정의 시 100%로 계산됩니다.', '설비 상태에서 이벤트를 먼저 쌓으세요.'],
    related: [
      { label: '설비 상태', page: 'mes-equipment' },
      { label: '예방보전', page: 'mes-pm' },
      { label: '제조 KPI', page: 'production', tab: 'kpi' }
    ]
  },
  'mes-pm': {
    title: '예방보전 (PM)',
    summary: '설비별 주기 보전 계획을 만들고 일정·작업을 처리합니다.',
    steps: [
      '설비를 골라 주기(일)·체크리스트를 등록합니다.',
      '생성된 일정에서 [시작]하면 설비 상태가 보전으로 기록됩니다.',
      '[완료]하면 대기 상태로 돌아가고 다음 일정이 생성됩니다.'
    ],
    tips: ['지연된 일정은 대시보드의 지연 건수로 확인하세요.'],
    related: [
      { label: '설비 상태', page: 'mes-equipment' },
      { label: 'OEE', page: 'mes-oee' }
    ]
  },
  'mes-spc': {
    title: 'SPC 관리도',
    summary: '측정 특성을 등록하고 개체관리도(평균±3σ)·규격 이탈을 봅니다.',
    steps: [
      '특성명·USL/LSL을 등록합니다.',
      '측정값을 기록합니다.',
      '차트에서 관리한계·규격 이탈을 확인합니다.'
    ],
    tips: ['상세 합부 검사는 검사·NCR 메뉴를 함께 사용하세요.'],
    related: [
      { label: '검사 · NCR', page: 'production', tab: 'quality' }
    ]
  },
  'mes-capa': {
    title: '능력 · 부하 계획',
    summary: '설비 일일 능력 대비 열린 작업지시 부하를 비교합니다.',
    steps: [
      '기간(7/14/30일)을 고릅니다.',
      '가동부하가 100%를 넘는 설비를 확인합니다.',
      '일일 능력을 조정하거나 생산 일정을 재배치합니다.'
    ],
    tips: ['표준공수(공정 표준분)가 정확할수록 부하가 현실적입니다.'],
    related: [
      { label: '생산 일정', page: 'production', tab: 'schedule' },
      { label: '작업지시', page: 'production', tab: 'work-orders' }
    ]
  },
  'mes-wip': {
    title: 'WIP 현황',
    summary: '계획·확정·진행 작업지시의 재공(잔량)을 한눈에 봅니다.',
    steps: [
      '진행중 건수·잔량 합을 확인합니다.',
      '필요 시 작업지시·현장 실행으로 이동합니다.'
    ],
    tips: [],
    related: [
      { label: '작업지시', page: 'production', tab: 'work-orders' },
      { label: '현장 실행', page: 'production', tab: 'shopfloor' }
    ]
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
    title: 'MES (MESA)',
    items: [
      { key: 'production:masters', label: 'BOM · 공정 · 설비' },
      { key: 'production:schedule', label: '생산 일정' },
      { key: 'production:work-orders', label: '작업지시' },
      { key: 'production:shopfloor', label: '현장 실행' },
      { key: 'mes-equipment', label: '설비 상태' },
      { key: 'mes-oee', label: 'OEE 대시보드' },
      { key: 'mes-pm', label: '예방보전 (PM)' },
      { key: 'production:quality', label: '검사 · NCR' },
      { key: 'mes-spc', label: 'SPC 관리도' },
      { key: 'production:materials', label: '자재 · 외주' },
      { key: 'mes-wip', label: 'WIP 현황' },
      { key: 'mes-capa', label: '능력 · 부하 계획' },
      { key: 'production:trace', label: 'Lot · 역추적' },
      { key: 'production:kpi', label: '제조 KPI · 원가' }
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
    title: 'ERP',
    items: [
      { key: 'crm-pipeline', label: '영업 기회' },
      { key: 'hr-org', label: '조직 · 사원' },
      { key: 'hr-attendance', label: '근태' },
      { key: 'hr-payroll', label: '급여' },
      { key: 'dashboard', label: '대시보드' },
      { key: 'sales:pos', label: '판매(POS)' },
      { key: 'quotations', label: '견적' },
      { key: 'sales:orders', label: '주문 관리' },
      { key: 'sales:claims', label: '클레임' },
      { key: 'customers', label: '고객' },
      { key: 'transaction-statement', label: '거래명세서' },
      { key: 'outbound:reg', label: '간편 출고' },
      { key: 'outbound:picking', label: '피킹' },
      { key: 'outbound:packing', label: '패킹/송장' },
      { key: 'outbound:hist', label: '출고 이력' },
      { key: 'purchases:purchases', label: '발주 관리' },
      { key: 'purchases:suppliers', label: '공급사' },
      { key: 'proc-receive', label: '입고 · 검수' },
      { key: 'proc-price', label: '단가 관리' },
      { key: 'proc-eval', label: '공급사 평가' },
      { key: 'stock:movements', label: '재고 이동' },
      { key: 'stock:levels', label: '창고별 재고' },
      { key: 'scm-reserve', label: '예약 재고' },
      { key: 'scm-reorder', label: '발주제안' },
      { key: 'products', label: '품목' },
      { key: 'product-options', label: '옵션 관리' },
      { key: 'pricing-policy', label: '가격 정책' },
      { key: 'finance-ar', label: '매출채권 AR' },
      { key: 'finance-ap', label: '매입채무 AP' },
      { key: 'finance-vouchers', label: '전표' },
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

function helpNormalizeQuery(q) {
  return String(q || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function helpMatchesQuery(blob, query) {
  if (!query) return true;
  const tokens = query.split(' ').filter(Boolean);
  const text = String(blob || '').toLowerCase();
  return tokens.every((t) => text.includes(t));
}

/** 제목 + 본문(요약·단계·팁·관련) + 네비 라벨 검색용 텍스트 */
function helpGuideSearchBlob(key, itemLabel, hint, sectionTitle) {
  const { guide } = helpResolveGuide(key);
  return [
    key,
    sectionTitle,
    itemLabel,
    hint,
    guide.title,
    guide.summary,
    ...(guide.steps || []),
    ...(guide.tips || []),
    ...(guide.related || []).map((r) => r.label)
  ].filter(Boolean).join('\n');
}

function helpHubFilteredSections(query) {
  const q = helpNormalizeQuery(query);
  return HELP_HUB_SECTIONS.map((sec, si) => {
    const sectionHit = q && helpMatchesQuery(sec.title, q);
    const items = sec.items.filter((it) => {
      if (!q) return true;
      if (sectionHit) return true;
      return helpMatchesQuery(
        helpGuideSearchBlob(it.key, it.label, it.hint, sec.title),
        q
      );
    });
    return { sec, si, items, sectionHit };
  }).filter((row) => row.items.length > 0);
}

function helpUpdateSearchMeta(total, query) {
  const countEl = document.getElementById('help-hub-search-count');
  const emptyEl = document.getElementById('help-hub-search-empty');
  const clearBtn = document.getElementById('help-hub-search-clear');
  const q = helpNormalizeQuery(query);
  if (countEl) {
    countEl.textContent = q ? `${total}건` : '';
  }
  if (clearBtn) {
    clearBtn.classList.toggle('hidden', !q);
  }
  if (emptyEl) {
    emptyEl.classList.toggle('hidden', !(q && total === 0));
  }
}

window.onHelpHubSearchInput = function onHelpHubSearchInput(val) {
  clearTimeout(window._helpHubSearchTimer);
  window._helpHubSearchTimer = setTimeout(() => {
    window.applyHelpHubSearch(val);
  }, 160);
};

window.clearHelpHubSearch = function clearHelpHubSearch() {
  const input = document.getElementById('help-hub-search');
  if (input) input.value = '';
  window.applyHelpHubSearch('');
  input?.focus();
};

window.applyHelpHubSearch = function applyHelpHubSearch(val) {
  const q = helpNormalizeQuery(val);
  window._helpHubQuery = q;

  const rows = helpHubFilteredSections(q);
  const total = rows.reduce((n, r) => n + r.items.length, 0);
  helpUpdateSearchMeta(total, q);

  if (q) {
    window._helpHubOpenSections = new Set(rows.map((r) => r.si));
  } else if (!window._helpHubOpenSections || window._helpHubOpenSections.size === 0) {
    window._helpHubOpenSections = new Set([0]);
  }

  const activeStill = rows.some((r) => r.items.some((it) => it.key === window._helpHubKey));
  if (q && !activeStill && rows[0]?.items?.[0]) {
    window.helpHubShow(rows[0].items[0].key, rows[0].si);
    return;
  }

  window.renderHelpHubNav(window._helpHubKey);
};

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
  window._helpHubOpenSections = new Set([0]); // 첫 메인메뉴만 펼침
  window._helpHubQuery = '';

  const headerHtml = typeof window.renderPageHeader === 'function'
    ? window.renderPageHeader({
      title: '사용안내',
      subtitle: '메인 메뉴를 펼쳐 하위 안내를 선택하세요. 제목·본문에서 검색할 수 있습니다.',
      icon: 'fa-book-open',
      actionsHtml: `
        <button type="button" onclick="startHelpTour(true)"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-teal-200 bg-teal-50 text-teal-800 text-sm font-semibold hover:bg-teal-100">
          <i class="fas fa-route"></i>첫 사용 투어
        </button>`
    })
    : `
      <div class="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-slate-800"><i class="fas fa-book-open mr-2 text-teal-600"></i>사용안내</h1>
          <p class="text-sm text-slate-500 mt-1">메인 메뉴를 펼쳐 하위 안내를 선택하세요. 제목·본문에서 검색할 수 있습니다.</p>
        </div>
        <button type="button" onclick="startHelpTour(true)"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-teal-200 bg-teal-50 text-teal-800 text-sm font-semibold hover:bg-teal-100">
          <i class="fas fa-route"></i>첫 사용 투어
        </button>
      </div>`;

  content.innerHTML = `
    <div class="flex flex-col h-full max-w-5xl mx-auto w-full">
      ${headerHtml}

      <div class="relative mb-4">
        <i class="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
        <input id="help-hub-search" type="search" autocomplete="off"
          placeholder="제목·본문 검색 (예: 발주, OEE, 입고, 피킹)"
          class="w-full pl-10 pr-24 py-2.5 border border-slate-300 rounded-xl bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          oninput="onHelpHubSearchInput(this.value)"
          onkeydown="if(event.key==='Escape'){clearHelpHubSearch();}">
        <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <span id="help-hub-search-count" class="text-xs font-semibold text-slate-400 tabular-nums px-1"></span>
          <button type="button" id="help-hub-search-clear" onclick="clearHelpHubSearch()"
            class="hidden w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="검색 지우기">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <div id="help-hub-search-empty" class="hidden mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        검색 결과가 없습니다. 다른 키워드로 시도해 보세요.
      </div>

      <div class="grid lg:grid-cols-12 gap-6 flex-1 min-h-0">
        <nav id="help-hub-nav" class="lg:col-span-4 space-y-2 lg:overflow-y-auto lg:max-h-[calc(100vh-16rem)]"></nav>
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

  window.renderHelpHubNav();
  window.helpHubShow(HELP_HUB_SECTIONS[0].items[0].key);
};

window.renderHelpHubNav = function renderHelpHubNav(activeKey) {
  const nav = document.getElementById('help-hub-nav');
  if (!nav) return;
  const openSet = window._helpHubOpenSections || new Set([0]);
  const key = activeKey || window._helpHubKey || '';
  const query = window._helpHubQuery || '';
  const rows = helpHubFilteredSections(query);
  const total = rows.reduce((n, r) => n + r.items.length, 0);
  helpUpdateSearchMeta(total, query);

  if (!rows.length) {
    nav.innerHTML = `
      <div class="bg-white border border-dashed border-slate-200 rounded-xl px-4 py-8 text-center text-sm text-slate-400">
        일치하는 안내가 없습니다
      </div>`;
    return;
  }

  nav.innerHTML = rows.map(({ sec, si, items }) => {
    const isOpen = openSet.has(si);
    return `
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden" data-help-section="${si}">
        <button type="button"
          onclick="toggleHelpHubSection(${si})"
          class="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${isOpen ? 'bg-slate-50 border-b border-slate-100' : ''}"
          aria-expanded="${isOpen ? 'true' : 'false'}">
          <span class="flex items-center gap-2 min-w-0">
            <span class="w-1.5 h-1.5 rounded-full flex-shrink-0 ${si === 0 ? 'bg-teal-500' : si === 1 ? 'bg-orange-500' : si === 2 ? 'bg-indigo-500' : 'bg-blue-500'}"></span>
            <span class="text-sm font-bold text-slate-800 truncate">${helpEsc(sec.title)}</span>
            <span class="text-[10px] font-semibold text-slate-400">${items.length}${query ? `/${sec.items.length}` : ''}</span>
          </span>
          <i class="fas fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}"></i>
        </button>
        <div class="help-hub-submenu divide-y divide-slate-100 ${isOpen ? '' : 'hidden'}">
          ${items.map((it) => {
            const active = it.key === key;
            return `
              <button type="button" onclick="helpHubShow('${it.key}', ${si})"
                class="help-hub-item w-full text-left px-4 py-2.5 pl-7 text-sm hover:bg-teal-50 ${active ? 'bg-teal-50 text-teal-800 font-semibold' : 'text-slate-700'}"
                data-help-key="${it.key}">
                ${helpEsc(it.label)}
                ${it.hint ? `<div class="text-[11px] text-slate-400 font-normal mt-0.5">${helpEsc(it.hint)}</div>` : ''}
              </button>`;
          }).join('')}
        </div>
      </div>`;
  }).join('');
};

window.toggleHelpHubSection = function toggleHelpHubSection(si) {
  if (!window._helpHubOpenSections) window._helpHubOpenSections = new Set([0]);
  if (window._helpHubOpenSections.has(si)) {
    window._helpHubOpenSections.delete(si);
  } else {
    window._helpHubOpenSections.add(si);
  }
  window.renderHelpHubNav(window._helpHubKey);
};

window.helpHubShow = function (key, sectionIndex) {
  window._helpHubKey = key;

  // 선택된 항목의 메인메뉴가 닫혀 있으면 펼침
  if (!window._helpHubOpenSections) window._helpHubOpenSections = new Set([0]);
  let si = sectionIndex;
  if (si == null || Number.isNaN(Number(si))) {
    si = HELP_HUB_SECTIONS.findIndex((sec) => sec.items.some((it) => it.key === key));
  }
  if (si >= 0) window._helpHubOpenSections.add(si);

  window.renderHelpHubNav(key);

  const { guide } = helpResolveGuide(key);
  const el = document.getElementById('help-hub-article');
  if (el) el.innerHTML = renderHelpArticle(key, guide, true);

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
