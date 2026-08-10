// QR MES 모듈
// QR 코드 기반 제조실행시스템 페이지 렌더링 함수

// ================================================
// QR MES 대시보드
// ================================================
async function renderQRDashboardPage(container) {
  container.innerHTML = `
    <div class="space-y-6">
      <!-- 헤더 카드 -->
      <div class="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-8 text-white">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <i class="fas fa-chart-line text-3xl"></i>
            </div>
            <div>
              <h2 class="text-3xl font-bold">MES 대시보드</h2>
              <p class="text-purple-100 mt-1">실시간 QR 작업 현황 및 통계</p>
            </div>
          </div>
          <button onclick="refreshQRDashboard()" 
                  class="px-6 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-xl transition-all font-semibold flex items-center gap-2">
            <i class="fas fa-sync-alt"></i>
            <span>새로고침</span>
          </button>
        </div>
      </div>

      <!-- 통계 카드 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- 오늘의 입고 -->
        <div class="stat-card bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
          <div class="flex items-center justify-between mb-4">
            <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <i class="fas fa-qrcode text-2xl"></i>
            </div>
            <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold">입고</span>
          </div>
          <div>
            <h3 class="text-4xl font-bold mb-2" id="today-inbound-count">
              <span class="loading-shimmer">0</span>
            </h3>
            <p class="text-blue-100 text-sm font-medium">오늘의 입고 건수</p>
          </div>
          <div class="mt-4 pt-4 border-t border-white/20">
            <p class="text-xs text-blue-100">
              <i class="fas fa-arrow-up mr-1"></i>
              실시간 업데이트
            </p>
          </div>
        </div>

        <!-- 오늘의 출고 -->
        <div class="stat-card bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
          <div class="flex items-center justify-between mb-4">
            <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <i class="fas fa-dolly text-2xl"></i>
            </div>
            <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold">출고</span>
          </div>
          <div>
            <h3 class="text-4xl font-bold mb-2" id="today-outbound-count">
              <span class="loading-shimmer">0</span>
            </h3>
            <p class="text-orange-100 text-sm font-medium">오늘의 출고 건수</p>
          </div>
          <div class="mt-4 pt-4 border-t border-white/20">
            <p class="text-xs text-orange-100">
              <i class="fas fa-arrow-down mr-1"></i>
              실시간 업데이트
            </p>
          </div>
        </div>

        <!-- 오늘의 판매 -->
        <div class="stat-card bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
          <div class="flex items-center justify-between mb-4">
            <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <i class="fas fa-cash-register text-2xl"></i>
            </div>
            <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold">판매</span>
          </div>
          <div>
            <h3 class="text-4xl font-bold mb-2" id="today-sale-count">
              <span class="loading-shimmer">0</span>
            </h3>
            <p class="text-green-100 text-sm font-medium">오늘의 판매 건수</p>
          </div>
          <div class="mt-4 pt-4 border-t border-white/20">
            <p class="text-xs text-green-100">
              <i class="fas fa-check-circle mr-1"></i>
              실시간 업데이트
            </p>
          </div>
        </div>

        <!-- 활성 QR 코드 -->
        <div class="stat-card bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
          <div class="flex items-center justify-between mb-4">
            <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <i class="fas fa-barcode text-2xl"></i>
            </div>
            <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold">활성</span>
          </div>
          <div>
            <h3 class="text-4xl font-bold mb-2" id="active-qr-count">
              <span class="loading-shimmer">0</span>
            </h3>
            <p class="text-purple-100 text-sm font-medium">활성 QR 코드</p>
          </div>
          <div class="mt-4 pt-4 border-t border-white/20">
            <p class="text-xs text-purple-100">
              <i class="fas fa-database mr-1"></i>
              전체 등록 코드
            </p>
          </div>
        </div>
      </div>

      <!-- 최근 활동 -->
      <div class="bg-white rounded-2xl shadow-sm border-2 border-slate-200 overflow-hidden">
        <div class="bg-gradient-to-r from-slate-50 to-slate-100 px-8 py-6 border-b-2 border-slate-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                <i class="fas fa-history text-white"></i>
              </div>
              <div>
                <h3 class="text-xl font-bold text-slate-800">최근 QR 트랜잭션</h3>
                <p class="text-sm text-slate-500">오늘의 입출고 및 판매 활동</p>
              </div>
            </div>
            <span class="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
              <i class="fas fa-circle animate-pulse mr-2"></i>
              실시간
            </span>
          </div>
        </div>
        <div class="p-6">
          <div id="recent-qr-transactions" class="space-y-3">
            <p class="text-center text-slate-400 py-8">
              <i class="fas fa-spinner fa-spin text-2xl mb-2"></i><br/>
              데이터를 불러오는 중...
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- CSS 애니메이션 -->
    <style>
      @keyframes shimmer {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
      }
      
      .loading-shimmer {
        animation: shimmer 1.5s ease-in-out infinite;
      }

      .stat-card {
        position: relative;
        overflow: hidden;
      }

      .stat-card::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        transform: rotate(45deg);
        pointer-events: none;
      }
    </style>
  `;

  // 데이터 로드
  await loadQRDashboardData();
}

// ================================================
// QR 입고 페이지
// ================================================
// ================================================
// QR 입고 / 출고 / 판매 — 통합 현장 UX
// ================================================

const QR_OPS = {
  inbound: {
    type: 'inbound',
    title: '입고 스캔',
    subtitle: 'QR·바코드·SKU 스캔 → 수량·창고 확인 → 입고 확정',
    icon: 'fa-sign-in-alt',
    accent: 'teal',
    confirmLabel: '입고 확정',
    confirmFn: 'confirmQRInbound()',
    historyTitle: '오늘 입고',
    historyRefresh: 'loadInboundHistory()',
    readerId: 'qr-reader',
    startBtnId: 'start-scan-btn',
    stopBtnId: 'stop-scan-btn',
    guideId: 'scan-guide',
    manualId: 'manual-qr-input',
    waitingId: 'scan-waiting',
    resultId: 'qr-scan-result',
    historyId: 'qr-inbound-history',
    needsWarehouse: true
  },
  outbound: {
    type: 'outbound',
    title: '출고 스캔',
    subtitle: 'QR·바코드·SKU 스캔 → 수량·창고 확인 → 출고 확정',
    icon: 'fa-dolly',
    accent: 'amber',
    confirmLabel: '출고 확정',
    confirmFn: 'confirmQROutbound()',
    historyTitle: '오늘 출고',
    historyRefresh: 'loadOutboundHistory()',
    readerId: 'qr-reader-outbound',
    startBtnId: 'start-scan-btn-outbound',
    stopBtnId: 'stop-scan-btn-outbound',
    guideId: 'scan-guide-outbound',
    manualId: 'manual-qr-input-outbound',
    waitingId: 'scan-waiting-outbound',
    resultId: 'qr-outbound-result',
    historyId: 'qr-outbound-history',
    needsWarehouse: true
  },
  sale: {
    type: 'sale',
    title: '판매 스캔',
    subtitle: 'QR·바코드·SKU 스캔 → 수량·단가 확인 → 판매 확정',
    icon: 'fa-cash-register',
    accent: 'emerald',
    confirmLabel: '판매 확정',
    confirmFn: 'confirmQRSale()',
    historyTitle: '오늘 판매',
    historyRefresh: 'loadSaleHistory()',
    readerId: 'qr-reader-sale',
    startBtnId: 'start-scan-btn-sale',
    stopBtnId: 'stop-scan-btn-sale',
    guideId: 'scan-guide-sale',
    manualId: 'manual-qr-input-sale',
    waitingId: 'scan-waiting-sale',
    resultId: 'qr-sale-result',
    historyId: 'qr-sale-history',
    needsWarehouse: false
  }
};

const QR_ACCENT = {
  teal: {
    bar: 'bg-teal-600',
    soft: 'bg-teal-50 border-teal-200',
    text: 'text-teal-700',
    btn: 'bg-teal-600 hover:bg-teal-700',
    ring: 'focus:ring-teal-500 border-teal-300',
    chip: 'bg-teal-100 text-teal-800',
    cam: 'border-teal-500'
  },
  amber: {
    bar: 'bg-amber-600',
    soft: 'bg-amber-50 border-amber-200',
    text: 'text-amber-800',
    btn: 'bg-amber-600 hover:bg-amber-700',
    ring: 'focus:ring-amber-500 border-amber-300',
    chip: 'bg-amber-100 text-amber-900',
    cam: 'border-amber-500'
  },
  emerald: {
    bar: 'bg-emerald-600',
    soft: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-800',
    btn: 'bg-emerald-600 hover:bg-emerald-700',
    ring: 'focus:ring-emerald-500 border-emerald-300',
    chip: 'bg-emerald-100 text-emerald-900',
    cam: 'border-emerald-500'
  }
};

function renderQROpsWorkspace(container, type) {
  const op = QR_OPS[type];
  const a = QR_ACCENT[op.accent];

  container.innerHTML = `
    <div class="max-w-6xl mx-auto space-y-4">
      <!-- 상단: 작업 요약 -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 ${a.bar} rounded-xl flex items-center justify-center text-white">
            <i class="fas ${op.icon}"></i>
          </div>
          <div>
            <h2 class="text-xl font-bold text-slate-800">${op.title}</h2>
            <p class="text-sm text-slate-500">${op.subtitle}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <span class="px-2.5 py-1 rounded-full ${a.chip} font-semibold">1. 스캔</span>
          <i class="fas fa-chevron-right text-slate-300"></i>
          <span class="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">2. 확인</span>
          <i class="fas fa-chevron-right text-slate-300"></i>
          <span class="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">3. 확정</span>
        </div>
      </div>

      <div class="grid lg:grid-cols-12 gap-4">
        <!-- 스캔 패널 -->
        <section class="lg:col-span-5 space-y-3">
          <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span class="text-sm font-bold text-slate-700"><i class="fas fa-camera mr-2 ${a.text}"></i>카메라 스캔</span>
              <span id="qr-scan-live-${type}" class="text-xs text-slate-400">대기</span>
            </div>
            <div class="relative bg-slate-900 ${a.cam} border-b-4">
              <div id="${op.guideId}" class="absolute inset-0 z-10 pointer-events-none hidden">
                <div class="absolute inset-0 bg-black/50"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="w-52 h-52 border-2 border-white/80 rounded-xl relative">
                    <div class="absolute inset-x-3 top-1/2 h-0.5 bg-white/80 animate-pulse"></div>
                  </div>
                </div>
              </div>
              <div id="${op.readerId}" class="min-h-[240px] sm:min-h-[280px] flex items-center justify-center text-slate-300 text-sm p-6 text-center">
                <div>
                  <i class="fas fa-barcode text-4xl mb-2 opacity-40"></i>
                  <p>QR / 바코드 스캔을 시작하세요</p>
                </div>
              </div>
            </div>
            <div class="p-3 grid grid-cols-2 gap-2">
              <button id="${op.startBtnId}" onclick="startQRScan('${type}')"
                class="py-3 rounded-xl text-white text-sm font-bold ${a.btn}">
                <i class="fas fa-play mr-1"></i>스캔 시작
              </button>
              <button id="${op.stopBtnId}" onclick="stopQRScan('${type}')"
                class="hidden py-3 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-sm font-bold">
                <i class="fas fa-stop mr-1"></i>중지
              </button>
            </div>
          </div>

          <div class="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
            <label class="text-xs font-bold text-slate-500 mb-1.5 block">수동 입력 / 바코드건</label>
            <div class="flex gap-2">
              <input id="${op.manualId}" type="text" autocomplete="off" autofocus
                placeholder="QR·바코드·SKU 입력 후 Enter"
                class="flex-1 border border-slate-300 rounded-xl px-3 py-3 text-sm font-mono ${a.ring} focus:outline-none focus:ring-2"
                onkeydown="if(event.key==='Enter'){event.preventDefault();handleManualQRInput('${type}')}">
              <button onclick="handleManualQRInput('${type}')"
                class="px-4 py-3 rounded-xl ${a.btn} text-white text-sm font-bold whitespace-nowrap">조회</button>
            </div>
            <p class="text-[11px] text-slate-400 mt-2">USB 바코드건은 이 칸에 포커스 후 스캔하세요.</p>
          </div>
        </section>

        <!-- 결과 / 확정 패널 -->
        <section class="lg:col-span-7 space-y-3">
          <div id="${op.waitingId}" class="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center min-h-[280px] flex flex-col items-center justify-center">
            <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <i class="fas ${op.icon} text-2xl text-slate-400"></i>
            </div>
            <p class="font-bold text-slate-700">스캔 대기</p>
            <p class="text-sm text-slate-500 mt-1">QR·바코드·SKU를 스캔하면 상품·수량 입력창이 열립니다</p>
          </div>
          <div id="${op.resultId}" class="hidden"></div>

          <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 class="text-sm font-bold text-slate-700"><i class="fas fa-history mr-2 text-slate-400"></i>${op.historyTitle}</h3>
              <button onclick="${op.historyRefresh}" class="text-xs ${a.text} font-semibold hover:underline">새로고침</button>
            </div>
            <div id="${op.historyId}" class="max-h-64 overflow-y-auto divide-y divide-slate-100">
              <p class="text-center text-slate-400 text-sm py-8">불러오는 중...</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;

  // 바코드건 입력을 위해 수동 입력창에 포커스
  setTimeout(() => {
    const input = document.getElementById(op.manualId);
    if (input) input.focus();
  }, 50);
}

async function renderQRInboundPage(container) {
  renderQROpsWorkspace(container, 'inbound');
  await loadInboundHistory();
}

async function renderQROutboundPage(container) {
  renderQROpsWorkspace(container, 'outbound');
  await loadOutboundHistory();
}

async function renderQRSalePage(container) {
  renderQROpsWorkspace(container, 'sale');
  await loadSaleHistory();
}

function qrQtyStepper(id, maxAttr, onChangeAttr) {
  return `
    <div class="flex items-center gap-2">
      <button type="button" onclick="qrAdjustQty('${id}', -1)" class="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg">−</button>
      <input type="number" id="${id}" value="1" min="1" ${maxAttr}
        class="flex-1 border border-slate-300 rounded-xl px-3 py-3 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-slate-400"
        ${onChangeAttr}>
      <button type="button" onclick="qrAdjustQty('${id}', 1)" class="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-lg">+</button>
    </div>`;
}

window.qrAdjustQty = function (id, delta) {
  const input = document.getElementById(id);
  if (!input) return;
  let v = (parseInt(input.value, 10) || 1) + delta;
  const max = input.max ? parseInt(input.max, 10) : null;
  if (v < 1) v = 1;
  if (max != null && !Number.isNaN(max) && v > max) v = max;
  input.value = v;
  if (id === 'sale-quantity' && typeof updateTotalAmount === 'function') updateTotalAmount();
};

function buildQRResultPanel(type, data) {
  const op = QR_OPS[type];
  const a = QR_ACCENT[op.accent];
  const stock = Number(data.current_stock) || 0;
  const stockClass = stock > 0 ? 'text-emerald-600' : 'text-rose-600';
  const price = Number(data.product_price) || 0;
  const disabled = (type !== 'inbound' && stock <= 0);
  const sourceMap = { qr: 'QR', barcode: '바코드', sku: 'SKU' };
  const sourceLabel = sourceMap[data.scan_source] || '스캔';

  let extraFields = '';
  if (type === 'sale') {
    extraFields = `
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-bold text-slate-500 mb-1 block">판매 단가</label>
          <input type="number" id="sale-price" value="${price}" min="0" step="100"
            class="w-full border border-slate-300 rounded-xl px-3 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            oninput="updateTotalAmount()">
        </div>
        <div>
          <label class="text-xs font-bold text-slate-500 mb-1 block">합계</label>
          <div id="total-amount" class="rounded-xl ${a.soft} border px-3 py-3 text-center">
            <span class="text-2xl font-bold ${a.text}">${price.toLocaleString()}</span>
            <span class="text-sm ${a.text} ml-1">원</span>
          </div>
        </div>
      </div>
      <div>
        <label class="text-xs font-bold text-slate-500 mb-1 block">고객명 (선택)</label>
        <input type="text" id="customer-name" placeholder="미입력 가능"
          class="w-full border border-slate-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
      </div>
      <div>
        <label class="text-xs font-bold text-slate-500 mb-1 block">메모 (선택)</label>
        <input type="text" id="sale-notes" placeholder="판매 메모"
          class="w-full border border-slate-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
      </div>`;
  } else {
    const whId = type === 'inbound' ? 'inbound-warehouse' : 'outbound-warehouse';
    const notesId = type === 'inbound' ? 'inbound-notes' : 'outbound-notes';
    extraFields = `
      <div>
        <label class="text-xs font-bold text-slate-500 mb-1 block">창고</label>
        <select id="${whId}" class="w-full border border-slate-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 ${a.ring}">
          <option value="">창고 선택</option>
        </select>
      </div>
      <div>
        <label class="text-xs font-bold text-slate-500 mb-1 block">메모 (선택)</label>
        <input type="text" id="${notesId}" placeholder="간단 메모"
          class="w-full border border-slate-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 ${a.ring}">
      </div>`;
  }

  const qtyId = type === 'inbound' ? 'inbound-quantity' : type === 'outbound' ? 'outbound-quantity' : 'sale-quantity';
  const maxAttr = type === 'inbound' ? '' : `max="${stock}"`;
  const onChange = type === 'sale' ? 'oninput="updateTotalAmount()"' : '';

  return `
    <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div class="px-4 py-3 ${a.bar} text-white flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <i class="fas fa-check-circle"></i>
          <span class="font-bold truncate">스캔 완료 — 정보 확인 후 확정</span>
          <span class="text-[10px] bg-white/20 px-2 py-0.5 rounded-full whitespace-nowrap">${sourceLabel}</span>
        </div>
        <span class="text-xs bg-white/20 px-2 py-0.5 rounded-full font-mono truncate max-w-[40%]">${escapeQrHtml(data.qr_code || '')}</span>
      </div>
      <div class="p-4 space-y-4">
        <div class="flex items-start gap-3 p-3 rounded-xl ${a.soft} border">
          <div class="w-12 h-12 rounded-xl bg-white flex items-center justify-center ${a.text}">
            <i class="fas fa-box text-xl"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-slate-900 text-lg leading-snug">${escapeQrHtml(data.product_name || '-')}</div>
            <div class="mt-1 flex flex-wrap gap-3 text-sm">
              <span>재고 <strong class="${stockClass}">${stock}</strong></span>
              ${type === 'sale' ? `<span>기준가 <strong>${price.toLocaleString()}원</strong></span>` : ''}
              ${data.sku ? `<span class="text-slate-500 font-mono text-xs">SKU ${escapeQrHtml(data.sku)}</span>` : ''}
              ${data.barcode ? `<span class="text-slate-500 font-mono text-xs"><i class="fas fa-barcode mr-1"></i>${escapeQrHtml(data.barcode)}</span>` : ''}
            </div>
            ${stock === 0 && type !== 'inbound' ? '<p class="text-xs text-rose-600 mt-1 font-semibold">재고가 없어 처리할 수 없습니다</p>' : ''}
          </div>
        </div>

        <div>
          <label class="text-xs font-bold text-slate-500 mb-1 block">수량</label>
          ${qrQtyStepper(qtyId, maxAttr, onChange)}
          ${type !== 'inbound' ? `<p class="text-xs text-slate-400 mt-1">최대 ${stock}개</p>` : ''}
        </div>

        ${extraFields}

        <div class="grid grid-cols-3 gap-2 pt-1">
          <button type="button" onclick="cancelQRScan()"
            class="col-span-1 py-3.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-50">
            취소
          </button>
          <button type="button" onclick="${op.confirmFn}" ${disabled ? 'disabled' : ''}
            class="col-span-2 py-3.5 rounded-xl text-white font-bold text-base ${disabled ? 'bg-slate-300 cursor-not-allowed' : a.btn}">
            <i class="fas fa-check mr-2"></i>${op.confirmLabel}
          </button>
        </div>
      </div>
    </div>`;
}

function escapeQrHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderQRHistoryList(containerId, transactions, accent) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const a = QR_ACCENT[accent] || QR_ACCENT.teal;

  if (!transactions || !transactions.length) {
    container.innerHTML = '<p class="text-center text-slate-400 text-sm py-8">오늘 이력이 없습니다</p>';
    return;
  }

  container.innerHTML = transactions.map((tx) => {
    const time = tx.created_at ? new Date(tx.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
    const amount = tx.total_amount != null || tx.sale_price != null
      ? `<span class="font-semibold ${a.text}">${Number(tx.total_amount || (tx.sale_price * tx.quantity) || 0).toLocaleString()}원</span>`
      : '';
    return `
      <div class="px-4 py-3 flex items-center gap-3 hover:bg-slate-50">
        <div class="w-9 h-9 rounded-lg ${a.soft} border flex items-center justify-center ${a.text} text-sm font-bold shrink-0">
          ${tx.quantity}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-slate-800 text-sm truncate">${escapeQrHtml(tx.product_name || '')}</div>
          <div class="text-xs text-slate-500 truncate">
            ${tx.warehouse_name ? escapeQrHtml(tx.warehouse_name) + ' · ' : ''}${time}${tx.customer_name ? ' · ' + escapeQrHtml(tx.customer_name) : ''}
          </div>
        </div>
        <div class="text-right shrink-0 text-xs text-slate-500">
          ${amount || `<i class="fas fa-check ${a.text}"></i>`}
        </div>
      </div>`;
  }).join('');
}


// ================================================
// QR 관리 페이지
// ================================================
async function renderQRManagementPage(container) {
  container.innerHTML = `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <i class="fas fa-cogs text-purple-600"></i>
          QR 코드 관리
        </h2>
        <p class="text-slate-500 mt-1">QR 코드 생성, 출력 및 관리</p>
      </div>

      <!-- QR 생성 섹션 -->
      <div class="bg-purple-50 rounded-xl p-6 border border-purple-200 mb-6">
        <h3 class="text-lg font-bold text-purple-900 mb-4">QR 코드 생성</h3>
        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">제품 선택</label>
            <select id="qr-product-select" class="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500">
              <option value="">제품을 선택하세요</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">생성 수량</label>
            <input type="number" id="qr-generate-quantity" value="1" min="1" max="100"
                   class="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500">
          </div>
        </div>
        <button onclick="generateQRCodes()" class="mt-4 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold">
          <i class="fas fa-qrcode mr-2"></i>QR 코드 생성
        </button>
      </div>

      <!-- QR 코드 목록 -->
      <div>
        <h3 class="text-lg font-bold text-slate-800 mb-4">생성된 QR 코드 목록</h3>
        <div id="qr-code-list" class="space-y-2">
          <p class="text-center text-slate-400 py-8">생성된 QR 코드가 없습니다</p>
        </div>
      </div>
    </div>
  `;

  // 제품 목록 로드
  await loadProductsForQR();
}

// ================================================
// 유틸리티 함수들
// ================================================

// QR 대시보드 데이터 로드
async function loadQRDashboardData() {
  try {
    // 통계 데이터 조회
    const statsRes = await fetch('/api/qr/stats', {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!statsRes.ok) throw new Error('Failed to load stats');

    const statsData = await statsRes.json();

    // 통계 카드 업데이트
    const todayStats = statsData.today_stats || {};
    const qrStats = statsData.qr_stats || {};

    document.getElementById('today-inbound-count').textContent = todayStats.today_inbound_count || '0';
    document.getElementById('today-outbound-count').textContent = todayStats.today_outbound_count || '0';
    document.getElementById('today-sale-count').textContent = todayStats.today_sale_count || '0';
    document.getElementById('active-qr-count').textContent = qrStats.active_codes || '0';

    // 최근 트랜잭션 조회
    const today = new Date().toISOString().split('T')[0];
    const transRes = await fetch(`/api/qr/transactions/all?date=${today}&limit=10`, {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!transRes.ok) throw new Error('Failed to load transactions');

    const transData = await transRes.json();
    renderRecentTransactions(transData.transactions || []);

  } catch (error) {
    console.error('QR 대시보드 데이터 로드 실패:', error);
    // 에러 시 기본값 표시
    document.getElementById('today-inbound-count').textContent = '0';
    document.getElementById('today-outbound-count').textContent = '0';
    document.getElementById('today-sale-count').textContent = '0';
    document.getElementById('active-qr-count').textContent = '0';

    const container = document.getElementById('recent-qr-transactions');
    if (container) {
      container.innerHTML = '<p class="text-center text-slate-400 py-8">데이터를 불러올 수 없습니다</p>';
    }
  }
}

// 최근 트랜잭션 렌더링
function renderRecentTransactions(transactions) {
  const container = document.getElementById('recent-qr-transactions');
  if (!container) return;

  if (!transactions || transactions.length === 0) {
    container.innerHTML = '<p class="text-center text-slate-400 py-8">오늘 트랜잭션이 없습니다</p>';
    return;
  }

  const typeConfig = {
    inbound: { color: 'blue', icon: 'fa-qrcode', label: '입고' },
    outbound: { color: 'orange', icon: 'fa-dolly', label: '출고' },
    sale: { color: 'green', icon: 'fa-cash-register', label: '판매' }
  };

  container.innerHTML = transactions.map(tx => {
    const config = typeConfig[tx.transaction_type] || { color: 'slate', icon: 'fa-box', label: '기타' };
    const timeAgo = getTimeAgo(tx.created_at);

    return `
      <div class="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-${config.color}-300 transition-colors">
        <div class="w-12 h-12 bg-${config.color}-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <i class="fas ${config.icon} text-${config.color}-600 text-xl"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-1 bg-${config.color}-100 text-${config.color}-700 rounded text-xs font-bold">${config.label}</span>
            <span class="text-xs text-slate-500">${timeAgo}</span>
          </div>
          <h4 class="font-semibold text-slate-900 truncate">${tx.product_name || 'Unknown'}</h4>
          <p class="text-sm text-slate-600">
            수량: <span class="font-semibold">${tx.quantity}개</span> 
            ${tx.warehouse_name ? `| 창고: ${tx.warehouse_name}` : ''}
            ${tx.user_name ? `| 담당: ${tx.user_name}` : ''}
          </p>
        </div>
      </div>
    `;
  }).join('');
}

// 시간 경과 표시 헬퍼 함수
function getTimeAgo(dateString) {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;

  return past.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// 창고 목록 로드
async function loadWarehousesForQR(selectId) {
  try {
    const res = await fetch('/api/warehouses', {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });
    const payload = await res.json();
    const warehouses = Array.isArray(payload) ? payload : (payload.data || []);

    const select = document.getElementById(selectId);
    if (!select) return;

    const current = select.value;
    select.innerHTML = '<option value="">창고 선택</option>';
    warehouses.forEach((wh) => {
      const option = document.createElement('option');
      option.value = wh.id;
      option.textContent = wh.name;
      select.appendChild(option);
    });
    if (current) select.value = current;
    // 창고 1개면 자동 선택
    if (!select.value && warehouses.length === 1) {
      select.value = String(warehouses[0].id);
    }
  } catch (error) {
    console.error('창고 목록 로드 실패:', error);
  }
}

// 제품 목록 로드 (QR 관리용)
async function loadProductsForQR() {
  try {
    const res = await fetch('/api/products', {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!res.ok) throw new Error('Failed to load products');

    const products = await res.json();

    const select = document.getElementById('qr-product-select');
    if (select) {
      select.innerHTML = '<option value="">제품을 선택하세요</option>';
      products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.name} (${product.code})`;
        select.appendChild(option);
      });
    }

    // 기존 QR 코드 목록도 로드
    await loadQRCodeList();
  } catch (error) {
    console.error('제품 목록 로드 실패:', error);
    showToast('제품 목록 로드에 실패했습니다', 'error');
  }
}

// QR 코드 목록 로드
async function loadQRCodeList() {
  try {
    const res = await fetch('/api/qr/codes?limit=50', {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!res.ok) throw new Error('Failed to load QR codes');

    const data = await res.json();
    renderQRCodeList(data.codes);
  } catch (error) {
    console.error('QR 코드 목록 로드 실패:', error);
  }
}

// QR 코드 목록 렌더링
function renderQRCodeList(codes) {
  const container = document.getElementById('qr-code-list');
  if (!container) return;

  if (!codes || codes.length === 0) {
    container.innerHTML = '<p class="text-center text-slate-400 py-8">생성된 QR 코드가 없습니다</p>';
    return;
  }

  container.innerHTML = codes.map(code => `
    <div class="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-purple-300 transition-colors">
      <div class="flex items-center gap-4 flex-1">
        <div class="w-16 h-16 bg-white rounded-lg flex items-center justify-center border-2 border-purple-200">
          <canvas id="qr-canvas-${code.id}" class="w-full h-full"></canvas>
        </div>
        <div class="flex-1">
          <h4 class="font-semibold text-slate-800">${code.product_name}</h4>
          <p class="text-sm text-slate-500">코드: ${code.code}</p>
          <p class="text-xs text-slate-400">생성일: ${new Date(code.created_at).toLocaleDateString('ko-KR')}</p>
        </div>
        <div class="text-right">
          <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold ${code.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
    }">
            ${code.status === 'active' ? '활성' : '비활성'}
          </span>
          <p class="text-xs text-slate-500 mt-1">배치: ${code.batch_number || 'N/A'}</p>
        </div>
      </div>
      <div class="flex gap-2 ml-4">
        <button onclick="downloadQRCode('${code.code}', '${code.product_name}')" 
                class="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
          <i class="fas fa-download mr-1"></i>다운로드
        </button>
        <button onclick="printQRLabel('${code.code}', '${code.product_name}')" 
                class="px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 text-sm">
          <i class="fas fa-print mr-1"></i>출력
        </button>
      </div>
    </div>
  `).join('');

  // QR 코드 이미지 생성 (qrcode 라이브러리 사용)
  codes.forEach(code => {
    const canvas = document.getElementById(`qr-canvas-${code.id}`);
    if (canvas && window.QRCode) {
      try {
        window.QRCode.toCanvas(canvas, code.code, {
          width: 64,
          margin: 1,
          color: {
            dark: '#4c1d95',  // 보라색
            light: '#ffffff'
          }
        });
      } catch (error) {
        console.error('QR 코드 생성 실패:', error);
      }
    }
  });
}

// ================================================
// QR 스캔 헬퍼 함수들
// ================================================

// 수량 증가
function increaseQuantity() {
  const input = document.getElementById('inbound-quantity');
  if (input) {
    input.value = parseInt(input.value || 1) + 1;
  }
}

// 수량 감소
function decreaseQuantity() {
  const input = document.getElementById('inbound-quantity');
  if (input) {
    const currentValue = parseInt(input.value || 1);
    if (currentValue > 1) {
      input.value = currentValue - 1;
    }
  }
}

// 출고 수량 증가
function increaseOutboundQuantity(maxStock) {
  const input = document.getElementById('outbound-quantity');
  if (input) {
    const currentValue = parseInt(input.value || 1);
    if (currentValue < maxStock) {
      input.value = currentValue + 1;
    }
  }
}

// 출고 수량 감소
function decreaseOutboundQuantity() {
  const input = document.getElementById('outbound-quantity');
  if (input) {
    const currentValue = parseInt(input.value || 1);
    if (currentValue > 1) {
      input.value = currentValue - 1;
    }
  }
}

// 판매 수량 증가
function increaseSaleQuantity(maxStock) {
  const input = document.getElementById('sale-quantity');
  if (input) {
    const currentValue = parseInt(input.value || 1);
    if (currentValue < maxStock) {
      input.value = currentValue + 1;
      updateTotalAmount();
    }
  }
}

// 판매 수량 감소
function decreaseSaleQuantity() {
  const input = document.getElementById('sale-quantity');
  if (input) {
    const currentValue = parseInt(input.value || 1);
    if (currentValue > 1) {
      input.value = currentValue - 1;
      updateTotalAmount();
    }
  }
}

// 총 판매금액 업데이트
function updateTotalAmount() {
  const quantityInput = document.getElementById('sale-quantity');
  const priceInput = document.getElementById('sale-price');
  const totalDisplay = document.getElementById('total-amount');

  if (quantityInput && priceInput && totalDisplay) {
    const quantity = parseInt(quantityInput.value || 0);
    const price = parseInt(priceInput.value || 0);
    const total = quantity * price;

    totalDisplay.innerHTML = `<span class="text-2xl font-bold text-emerald-800">${total.toLocaleString()}</span><span class="text-sm text-emerald-700 ml-1">원</span>`;
  }
}

// 스캔 가이드 표시/숨기기
function toggleScanGuide(show, type = 'inbound') {
  const guideId = type === 'inbound' ? 'scan-guide'
    : type === 'outbound' ? 'scan-guide-outbound'
      : 'scan-guide-sale';
  const guide = document.getElementById(guideId);
  const live = document.getElementById('qr-scan-live-' + type);
  if (guide) {
    if (show) guide.classList.remove('hidden');
    else guide.classList.add('hidden');
  }
  if (live) live.textContent = show ? '스캔 중' : '대기';
}

// 대기 상태 표시 (입고/출고/판매 공통)
function showScanWaiting(show, type = 'inbound') {
  const op = typeof QR_OPS !== 'undefined' ? QR_OPS[type] : null;
  const waitingId = op?.waitingId || (type === 'inbound' ? 'scan-waiting' : 'scan-waiting-' + type);
  const resultId = op?.resultId || (type === 'inbound' ? 'qr-scan-result' : 'qr-' + type + '-result');
  const waiting = document.getElementById(waitingId);
  const result = document.getElementById(resultId);
  if (show) {
    if (waiting) waiting.classList.remove('hidden');
    if (result) {
      result.classList.add('hidden');
      result.innerHTML = '';
    }
  } else if (waiting) {
    waiting.classList.add('hidden');
  }
}

// 전역 스캔 상태
let html5QrcodeScanner = null;
let currentScannedData = null;

// QR 스캔 시작
async function startQRScan(type) {
  let readerId = 'qr-reader';
  let startBtnId = 'start-scan-btn';
  let stopBtnId = 'stop-scan-btn';

  if (type === 'outbound') {
    readerId = 'qr-reader-outbound';
    startBtnId = 'start-scan-btn-outbound';
    stopBtnId = 'stop-scan-btn-outbound';
  } else if (type === 'sale') {
    readerId = 'qr-reader-sale';
    startBtnId = 'start-scan-btn-sale';
    stopBtnId = 'stop-scan-btn-sale';
  }

  const startBtn = document.getElementById(startBtnId);
  const stopBtn = document.getElementById(stopBtnId);

  if (html5QrcodeScanner) {
    showToast('이미 스캔이 진행 중입니다', 'warning');
    return;
  }

  try {
    html5QrcodeScanner = new Html5Qrcode(readerId);

    const formats = [];
    if (typeof Html5QrcodeSupportedFormats !== 'undefined') {
      const F = Html5QrcodeSupportedFormats;
      [
        F.QR_CODE, F.CODE_128, F.CODE_39, F.CODE_93,
        F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.ITF, F.CODABAR
      ].forEach((f) => { if (f != null) formats.push(f); });
    }

    const config = {
      fps: 12,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const w = Math.floor(Math.min(viewfinderWidth * 0.92, 360));
        const h = Math.floor(Math.min(viewfinderHeight * 0.38, 160));
        return { width: Math.max(220, w), height: Math.max(100, h) };
      },
      aspectRatio: 1.777
    };
    if (formats.length) config.formatsToSupport = formats;

    await html5QrcodeScanner.start(
      { facingMode: 'environment' },
      config,
      async (decodedText) => {
        console.log(`스캔 성공: ${decodedText}`);
        await stopQRScan(type);
        await processScannedQR(decodedText, type);
      },
      () => { /* 프레임 단위 미인식 — 무시 */ }
    );

    if (startBtn) startBtn.classList.add('hidden');
    if (stopBtn) stopBtn.classList.remove('hidden');

    // 스캔 가이드 표시 (type 전달)
    toggleScanGuide(true, type);

    showToast('스캔 시작 — QR 또는 바코드를 비춰주세요', 'info');

  } catch (error) {
    console.error('스캔 시작 실패:', error);
    showToast('❌ 카메라 접근에 실패했습니다. 권한을 확인해주세요', 'error');
    html5QrcodeScanner = null;
  }
}

// QR 스캔 중지
async function stopQRScan(type = 'inbound') {
  if (html5QrcodeScanner) {
    try {
      await html5QrcodeScanner.stop();
    } catch (error) {
      console.error('QR 스캔 중지 실패:', error);
    }
    html5QrcodeScanner = null;
  }

  let startBtnId = 'start-scan-btn';
  let stopBtnId = 'stop-scan-btn';

  if (type === 'outbound') {
    startBtnId = 'start-scan-btn-outbound';
    stopBtnId = 'stop-scan-btn-outbound';
  } else if (type === 'sale') {
    startBtnId = 'start-scan-btn-sale';
    stopBtnId = 'stop-scan-btn-sale';
  }

  const startBtn = document.getElementById(startBtnId);
  const stopBtn = document.getElementById(stopBtnId);
  if (startBtn) startBtn.classList.remove('hidden');
  if (stopBtn) stopBtn.classList.add('hidden');

  // 스캔 가이드 숨기기 (type 전달)
  toggleScanGuide(false, type);
}

// 스캔된 QR/바코드/SKU 처리
async function processScannedQR(qrCode, type) {
  try {
    const encoded = encodeURIComponent(String(qrCode).trim());
    const res = await fetch(`/api/qr/scan/${encoded}`, {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || '코드 조회 실패');
    }

    const data = await res.json();
    const payload = data.qr_code || {};

    currentScannedData = {
      ...payload,
      qr_code: payload.qr_code || qrCode,
      type
    };
    displayScannedResult(currentScannedData, type);

    const sourceMap = { qr: 'QR', barcode: '바코드', sku: 'SKU' };
    const src = sourceMap[payload.scan_source] || '스캔';
    showToast(`✅ ${src} 인식 성공`, 'success');

  } catch (error) {
    console.error('스캔 처리 실패:', error);
    showToast(error.message || '스캔 처리에 실패했습니다', 'error');
    // 실패 시 바코드건 재입력을 위해 포커스 복구
    const op = QR_OPS[type];
    const input = document.getElementById(op?.manualId);
    if (input) {
      input.focus();
      input.select();
    }
  }
}

// 스캔 결과 표시
function displayScannedResult(data, type) {
  const op = QR_OPS[type];
  if (!op) return;
  const resultContainer = document.getElementById(op.resultId);
  if (!resultContainer) return;

  showScanWaiting(false, type);
  resultContainer.innerHTML = buildQRResultPanel(type, data);
  resultContainer.classList.remove('hidden');

  if (type === 'inbound' || type === 'outbound') {
    const whId = type === 'inbound' ? 'inbound-warehouse' : 'outbound-warehouse';
    loadWarehousesForQR(whId);
  }

  resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 수동 QR 입력
async function handleManualQRInput(type) {
  const op = QR_OPS[type];
  const input = document.getElementById(op?.manualId || 'manual-qr-input');
  const qrCode = input?.value?.trim();

  if (!qrCode) {
    showToast('QR·바코드·SKU를 입력하세요', 'error');
    return;
  }

  await processScannedQR(qrCode, type);
  if (input) {
    input.value = '';
    input.focus();
  }
}

async function confirmQRInbound() {
  if (!currentScannedData) {
    showToast('먼저 QR 코드를 스캔하세요', 'error');
    return;
  }

  const quantity = parseInt(document.getElementById('inbound-quantity')?.value || '0');
  const warehouseId = document.getElementById('inbound-warehouse')?.value;
  const notes = document.getElementById('inbound-notes')?.value?.trim();

  if (!quantity || quantity < 1) {
    showToast('올바른 수량을 입력하세요', 'error');
    return;
  }

  if (!warehouseId) {
    showToast('창고를 선택하세요', 'error');
    return;
  }

  try {
    const res = await fetch('/api/qr/inbound', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.authToken}`
      },
      body: JSON.stringify({
        qr_code: currentScannedData.qr_code,
        quantity,
        warehouse_id: parseInt(warehouseId),
        notes
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || '입고 처리 실패');
    }

    const data = await res.json();

    showToast(`✅ 입고 완료! ${data.transaction.product_name} (${quantity}개)`, 'success');

    // 폼 초기화
    currentScannedData = null;
    showScanWaiting(true, 'inbound');
    // 입고 이력 새로고침
    await loadInboundHistory();

  } catch (error) {
    console.error('QR 입고 확정 실패:', error);
    showToast(error.message || '입고 처리에 실패했습니다', 'error');
  }
}

// QR 출고 확정
async function confirmQROutbound() {
  if (!currentScannedData) {
    showToast('먼저 QR 코드를 스캔하세요', 'error');
    return;
  }

  const quantity = parseInt(document.getElementById('outbound-quantity')?.value || '0');
  const warehouseId = document.getElementById('outbound-warehouse')?.value;
  const notes = document.getElementById('outbound-notes')?.value?.trim();

  if (!quantity || quantity < 1) {
    showToast('올바른 수량을 입력하세요', 'error');
    return;
  }

  if (!warehouseId) {
    showToast('창고를 선택하세요', 'error');
    return;
  }

  try {
    const res = await fetch('/api/qr/outbound', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.authToken}`
      },
      body: JSON.stringify({
        qr_code: currentScannedData.qr_code,
        quantity,
        warehouse_id: parseInt(warehouseId),
        notes
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || '출고 처리 실패');
    }

    const data = await res.json();

    showToast(`✅ 출고 완료! ${data.transaction.product_name} (${quantity}개)`, 'success');

    // 폼 초기화
    currentScannedData = null;
    showScanWaiting(true, 'outbound');
    // 출고 이력 새로고침
    await loadOutboundHistory();

  } catch (error) {
    console.error('QR 출고 확정 실패:', error);
    showToast(error.message || '출고 처리에 실패했습니다', 'error');
  }
}

// 입고 이력 로드
async function loadInboundHistory() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/qr/transactions/inbound?date=${today}&limit=10`, {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!res.ok) throw new Error('Failed to load history');

    const data = await res.json();
    renderInboundHistory(data.transactions);
  } catch (error) {
    console.error('입고 이력 로드 실패:', error);
  }
}

// 입고 이력 렌더링
function renderInboundHistory(transactions) {
  renderQRHistoryList('qr-inbound-history', transactions, 'teal');
}

// 출고 이력 로드
async function loadOutboundHistory() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/qr/transactions/outbound?date=${today}&limit=10`, {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!res.ok) throw new Error('Failed to load history');

    const data = await res.json();
    renderOutboundHistory(data.transactions);
  } catch (error) {
    console.error('출고 이력 로드 실패:', error);
  }
}

// 출고 이력 렌더링
function renderOutboundHistory(transactions) {
  renderQRHistoryList('qr-outbound-history', transactions, 'amber');
}

// QR 스캔 취소
function cancelQRScan() {
  currentScannedData = null;
  ['inbound', 'outbound', 'sale'].forEach((t) => showScanWaiting(true, t));
}

// QR 판매 확정
async function confirmQRSale() {
  if (!currentScannedData) {
    showToast('먼저 QR 코드를 스캔하세요', 'error');
    return;
  }

  const quantity = parseInt(document.getElementById('sale-quantity')?.value || '0');
  const salePrice = parseInt(document.getElementById('sale-price')?.value || '0');
  const customerName = document.getElementById('customer-name')?.value?.trim();
  const notes = document.getElementById('sale-notes')?.value?.trim();

  if (!quantity || quantity < 1) {
    showToast('올바른 수량을 입력하세요', 'error');
    return;
  }

  if (salePrice < 0) {
    showToast('올바른 판매가를 입력하세요', 'error');
    return;
  }

  try {
    const res = await fetch('/api/qr/sale', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.authToken}`
      },
      body: JSON.stringify({
        qr_code: currentScannedData.qr_code,
        quantity,
        sale_price: salePrice,
        customer_name: customerName,
        notes
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || '판매 처리 실패');
    }

    const data = await res.json();

    showToast(`✅ 판매 완료! ${data.transaction.product_name} (${quantity}개)`, 'success');

    // 폼 초기화
    cancelQRScan(); // 스캔 상태 초기화 및 대기 화면 표시

    // 판매 이력 새로고침
    await loadSaleHistory();

  } catch (error) {
    console.error('QR 판매 확정 실패:', error);
    showToast(error.message || '판매 처리에 실패했습니다', 'error');
  }
}

// 판매 이력 로드
async function loadSaleHistory() {
  const historyContainer = document.getElementById('qr-sale-history');
  if (!historyContainer) return;

  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/qr/transactions/sale?date=${today}`, {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!res.ok) throw new Error('Failed to load history');

    const data = await res.json();
    renderSaleHistory(data.transactions);
  } catch (error) {
    console.error('판매 이력 로드 실패:', error);
    historyContainer.innerHTML = '<p class="text-center text-red-500 py-4">이력을 불러오는데 실패했습니다</p>';
  }
}

// 판매 이력 렌더링
function renderSaleHistory(transactions) {
  renderQRHistoryList('qr-sale-history', transactions, 'emerald');
}


// QR 코드 생성
async function generateQRCodes() {
  const productId = document.getElementById('qr-product-select')?.value;
  const quantity = parseInt(document.getElementById('qr-generate-quantity')?.value || '1');

  if (!productId) {
    showToast('제품을 선택하세요', 'error');
    return;
  }

  if (quantity < 1 || quantity > 100) {
    showToast('수량은 1-100 사이여야 합니다', 'error');
    return;
  }

  try {
    const res = await fetch('/api/qr/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.authToken}`
      },
      body: JSON.stringify({
        product_id: parseInt(productId),
        quantity: quantity,
        type: 'product'
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'QR 코드 생성 실패');
    }

    showToast(`✅ ${data.codes.length}개의 QR 코드가 생성되었습니다!`, 'success');

    // 목록 새로고침
    await loadQRCodeList();

    // 폼 초기화
    document.getElementById('qr-product-select').value = '';
    document.getElementById('qr-generate-quantity').value = '1';

  } catch (error) {
    console.error('QR 코드 생성 실패:', error);
    showToast(error.message || 'QR 코드 생성에 실패했습니다', 'error');
  }
}

// QR 코드 다운로드
async function downloadQRCode(qrCode, productName) {
  try {
    const canvas = document.createElement('canvas');

    // 고해상도 QR 코드 생성
    await window.QRCode.toCanvas(canvas, qrCode, {
      width: 512,
      margin: 2,
      color: {
        dark: '#4c1d95',
        light: '#ffffff'
      }
    });

    // 캔버스를 이미지로 변환하여 다운로드
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR-${productName.replace(/\s+/g, '_')}-${qrCode}.png`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('QR 코드가 다운로드되었습니다', 'success');
    });
  } catch (error) {
    console.error('QR 코드 다운로드 실패:', error);
    showToast('QR 코드 다운로드에 실패했습니다', 'error');
  }
}

// QR 코드 라벨 출력 (PDF)
async function printQRLabel(qrCode, productName) {
  try {
    // jsPDF 로드 체크
    if (!window.jspdf) {
      showToast('PDF 라이브러리를 로드 중입니다...', 'info');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [80, 50] // 라벨 용지 크기 (80mm x 50mm)
    });

    // QR 코드 생성
    const canvas = document.createElement('canvas');
    await window.QRCode.toCanvas(canvas, qrCode, {
      width: 200,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    });
    const qrDataUrl = canvas.toDataURL('image/png');

    // PDF 디자인
    doc.setLineWidth(0.5);
    doc.rect(2, 2, 76, 46); // 테두리

    // QR 이미지
    doc.addImage(qrDataUrl, 'PNG', 4, 10, 30, 30);

    // 텍스트 정보
    doc.setFontSize(10);
    doc.text("Product Info", 36, 12);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(qrCode, 36, 20);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${new Date().toLocaleDateString('en-US')}`, 36, 28);

    doc.setFontSize(8);
    doc.text("WOW3D Stock Manager", 36, 42);

    // 자동 인쇄 및 열기
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');

  } catch (error) {
    console.error('라벨 출력 실패:', error);
    showToast('라벨 생성 중 오류가 발생했습니다', 'error');
  }
}

// 동적 스크립트 로드 헬퍼
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// QR 대시보드 새로고침
async function refreshQRDashboard() {
  await loadQRDashboardData();
  showToast('대시보드를 새로고침했습니다', 'success');
}

// ================================================
// QR 현장 — 탭 셸 (제조실행과 동일한 메뉴 트리 패턴)
// ================================================
window.loadQRFieldPage = async function (initialTab = 'dashboard') {
  const alias = {
    'qr-dashboard': 'dashboard',
    'qr-inbound': 'inbound',
    'qr-outbound': 'outbound',
    'qr-sale': 'sale',
    'qr-management': 'management'
  };
  const tab = alias[initialTab] || initialTab || 'dashboard';

  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">
          <i class="fas fa-qrcode mr-2 text-violet-600"></i>QR 현장
        </h1>
        <p class="text-sm text-slate-500 mt-1">현황 → 입고 → 출고 → 판매 → 라벨관리</p>
      </div>
    </div>

    <div class="flex mb-6 border-b border-slate-200 overflow-x-auto">
      <button onclick="switchQrTab('dashboard')" id="qr-tab-dashboard" class="px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap">1.현황</button>
      <button onclick="switchQrTab('inbound')" id="qr-tab-inbound" class="px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap">2.입고</button>
      <button onclick="switchQrTab('outbound')" id="qr-tab-outbound" class="px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap">3.출고</button>
      <button onclick="switchQrTab('sale')" id="qr-tab-sale" class="px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap">4.판매</button>
      <button onclick="switchQrTab('management')" id="qr-tab-management" class="px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap">5.라벨관리</button>
    </div>

    <div id="qr-tab-content"></div>
  `;

  await switchQrTab(tab);
};

window.switchQrTab = async function (tabName) {
  const tabs = ['dashboard', 'inbound', 'outbound', 'sale', 'management'];
  tabs.forEach((t) => {
    const btn = document.getElementById(`qr-tab-${t}`);
    if (!btn) return;
    if (t === tabName) {
      btn.classList.add('border-violet-600', 'text-violet-600');
      btn.classList.remove('border-transparent', 'text-slate-500');
    } else {
      btn.classList.remove('border-violet-600', 'text-violet-600');
      btn.classList.add('border-transparent', 'text-slate-500');
    }
  });

  // 사이드바 active 동기화
  if (typeof window.syncSidebarNav === 'function') {
    window.syncSidebarNav('qr', tabName);
  } else {
    document.querySelectorAll('.nav-link').forEach((link) => {
      const page = link.getAttribute('data-page');
      const tab = link.getAttribute('data-tab');
      if (page === 'qr' && tab === tabName) link.classList.add('active');
      else if (page === 'qr') link.classList.remove('active');
    });
  }
  if (typeof window.setHelpContext === 'function') {
    window.setHelpContext('qr', tabName);
  }

  const titles = {
    dashboard: ['QR 현황', '실시간 QR 작업 현황 및 통계'],
    inbound: ['QR 입고', 'QR 스캔으로 간편 입고'],
    outbound: ['QR 출고', 'QR 스캔으로 간편 출고'],
    sale: ['QR 판매', 'QR 스캔으로 즉시 판매'],
    management: ['라벨관리', 'QR 코드 생성 및 라벨 출력']
  };
  if (typeof updatePageTitle === 'function') {
    const [title, desc] = titles[tabName] || titles.dashboard;
    updatePageTitle(title, desc);
  }

  const container = document.getElementById('qr-tab-content');
  if (!container) return;
  container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-violet-500"></i></div>';

  try {
    if (tabName === 'dashboard') await renderQRDashboardPage(container);
    else if (tabName === 'inbound') await renderQRInboundPage(container);
    else if (tabName === 'outbound') await renderQROutboundPage(container);
    else if (tabName === 'sale') await renderQRSalePage(container);
    else await renderQRManagementPage(container);
  } catch (e) {
    console.error(e);
    container.innerHTML = `<div class="text-center py-10 text-rose-600">${e.message || '페이지 로드 실패'}</div>`;
  }
};

// 전역으로 내보내기
window.renderQRDashboardPage = renderQRDashboardPage;
window.renderQRInboundPage = renderQRInboundPage;
window.renderQROutboundPage = renderQROutboundPage;
window.renderQRSalePage = renderQRSalePage;
window.renderQRManagementPage = renderQRManagementPage;
window.generateQRCodes = generateQRCodes;
window.downloadQRCode = downloadQRCode;
window.printQRLabel = printQRLabel;
window.startQRScan = startQRScan;
window.stopQRScan = stopQRScan;
window.handleManualQRInput = handleManualQRInput;
window.confirmQRInbound = confirmQRInbound;
window.confirmQROutbound = confirmQROutbound;
window.cancelQRScan = cancelQRScan;
window.refreshQRDashboard = refreshQRDashboard;
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;
window.increaseOutboundQuantity = increaseOutboundQuantity;
window.decreaseOutboundQuantity = decreaseOutboundQuantity;
window.increaseSaleQuantity = increaseSaleQuantity;
window.decreaseSaleQuantity = decreaseSaleQuantity;
window.confirmQRSale = confirmQRSale;
window.loadSaleHistory = loadSaleHistory;

console.log('✅ QR MES 모듈 로드 완료');
