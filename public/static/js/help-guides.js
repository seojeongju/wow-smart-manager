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
      '상품 등록에서 SKU·판매가를 입력합니다.',
      '바코드가 있으면 바코드 칸에 스캔/입력합니다.',
      '수정 시 SKU는 변경되지 않습니다.'
    ],
    tips: ['바코드만 대량으로 다루려면 바코드 관리 메뉴를 쓰세요.'],
    related: [
      { label: '바코드 등록', page: 'barcode', tab: 'register' },
      { label: '재고', page: 'stock' }
    ]
  },
  stock: {
    title: '재고 관리',
    summary: '입고·출고·조정을 통해 창고별 재고를 맞춥니다.',
    steps: [
      '입고/출고 유형을 선택합니다.',
      '상품·창고·수량을 입력 후 확정합니다.',
      '이력에서 이동 내역을 확인합니다.'
    ],
    tips: ['QR/바코드 현장 스캔 입고는 QR 현장 메뉴가 더 빠르습니다.'],
    related: [{ label: 'QR 입고', page: 'qr', tab: 'inbound' }]
  },
  sales: {
    title: '판매 관리',
    summary: '판매 전표 등록과 이력을 관리합니다.',
    steps: [
      '고객·상품·수량을 넣어 판매를 등록합니다.',
      '목록에서 이력을 조회합니다.'
    ],
    tips: ['스캔 판매는 QR 현장 → 판매를 이용하세요.'],
    related: [{ label: 'QR 판매', page: 'qr', tab: 'sale' }]
  },
  customers: {
    title: '고객 관리',
    summary: '고객 연락처·주소·등급 정보를 관리합니다.',
    steps: ['고객을 등록/수정합니다.', '판매·출고 시 고객을 연결할 수 있습니다.'],
    tips: [],
    related: [{ label: '판매', page: 'sales' }]
  },
  outbound: {
    title: '출고 관리',
    summary: '거래처 출고 주문과 배송 추적을 관리합니다.',
    steps: ['출고를 등록하고 품목을 담습니다.', '출고 확정 후 송장/추적을 입력합니다.'],
    tips: ['Lot/QR과 연계된 출고는 QR 출고·현장추적을 함께 보세요.'],
    related: [{ label: 'QR 출고', page: 'qr', tab: 'outbound' }]
  },
  purchases: {
    title: '입고/발주',
    summary: '공급사 발주서 작성·입고 처리 화면입니다.',
    steps: [
      '발주서를 작성하거나 MES에서 만든 초안을 확인합니다.',
      '상태가 초안(DRAFT)이면 발주확정 후 입고합니다.',
      '입고 처리 시 재고가 반영됩니다.'
    ],
    tips: ['부족 자재는 제조실행 → 자재·외주에서 초안을 만들 수 있습니다.'],
    related: [{ label: '자재·외주', page: 'production', tab: 'materials' }]
  },
  prices: {
    title: '가격 정책',
    summary: '등급·고객별 특수 단가를 관리합니다.',
    steps: ['등급 단가 또는 고객 단가를 등록합니다.', '판매 시 적용됩니다.'],
    tips: [],
    related: [{ label: '고객', page: 'customers' }]
  },
  settings: {
    title: '설정',
    summary: '회사·사용자·권한 등 시스템 설정을 다룹니다.',
    steps: ['회사 정보·로고를 확인합니다.', '필요 시 멤버를 초대하고 역할을 지정합니다.'],
    tips: [],
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
      { key: 'products', label: '상품' },
      { key: 'stock', label: '재고' },
      { key: 'sales', label: '판매' },
      { key: 'purchases', label: '입고/발주' },
      { key: 'outbound', label: '출고' },
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
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-slate-800"><i class="fas fa-book-open mr-2 text-teal-600"></i>사용안내</h1>
        <p class="text-sm text-slate-500 mt-1">메뉴별 짧은 설명서입니다. 업무 중에는 헤더의 ? 버튼으로 현재 화면 안내를 여세요.</p>
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
