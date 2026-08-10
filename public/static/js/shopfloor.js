// 현장 실행 — MES 공통 셸 내부 탭 (다른 MES 페이지와 동일 디자인)

const SF_STATUS_LABEL = {
  planned: '계획',
  released: '확정',
  in_progress: '진행중',
  completed: '완료',
  cancelled: '취소'
};

const SF_STATUS_CLASS = {
  planned: 'bg-slate-100 text-slate-700',
  released: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700'
};

const SF_EVENT_LABEL = {
  material_issue: '자재 투입',
  process_complete: '공정 완료',
  fg_pack: '완제품 포장',
  qr_generate: 'QR 발행',
  production_record: '생산실적'
};

const SF_ACTIONS = [
  { id: 'issue', label: '자재 투입', icon: 'fa-box-open', color: 'bg-blue-600 hover:bg-blue-700' },
  { id: 'process', label: '공정 완료', icon: 'fa-cogs', color: 'bg-amber-600 hover:bg-amber-700' },
  { id: 'pack', label: '완제품 포장', icon: 'fa-cube', color: 'bg-violet-600 hover:bg-violet-700' },
  { id: 'record', label: '실적 등록', icon: 'fa-check-double', color: 'bg-emerald-600 hover:bg-emerald-700' }
];

window._sfState = {
  filter: 'active',
  selectedWo: null,
  action: 'issue',
  processes: [],
  scanner: null
};

window.loadShopfloorPage = async function () {
  // MES 탭 안으로 렌더 (없으면 content — 하위 호환)
  const content = document.getElementById('mes-tab-content') || document.getElementById('content');
  if (!content) return;

  content.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <div>
        <h2 class="text-lg font-bold text-slate-800">
          <i class="fas fa-hard-hat mr-2 text-orange-600"></i>현장 실행
        </h2>
        <p class="text-sm text-slate-500 mt-0.5">작업지시 선택 → QR 스캔 → 투입 / 공정 / 포장 / 실적</p>
      </div>
      <div class="flex flex-wrap gap-2 items-center">
        <select id="sf-filter" onchange="sfSetFilter(this.value)"
          class="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="active">오늘 작업 (확정·진행)</option>
          <option value="in_progress">진행중</option>
          <option value="released">확정</option>
          <option value="all">전체</option>
        </select>
        <button type="button" onclick="sfLoadWorkOrders()"
          class="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
          <i class="fas fa-sync-alt mr-1"></i>새로고침
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div class="lg:col-span-5">
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-700"><i class="fas fa-clipboard-list mr-2 text-orange-600"></i>작업지시</h3>
            <span id="sf-wo-count" class="text-xs text-slate-400"></span>
          </div>
          <div id="sf-wo-list" class="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
            <div class="text-center py-12 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-7" id="sf-view-detail">
        ${sfEmptyDetailHtml()}
      </div>
    </div>
  `;

  const filterEl = document.getElementById('sf-filter');
  if (filterEl) filterEl.value = window._sfState.filter || 'active';

  try {
    const procRes = await axios.get(`${API_BASE}/production/processes`);
    window._sfState.processes = (procRes.data.data || []).filter((p) => p.is_active !== 0);
  } catch (_) {
    window._sfState.processes = [];
  }

  await sfLoadWorkOrders();

  if (window._sfState.selectedWo?.id) {
    await sfOpenWorkOrder(window._sfState.selectedWo.id);
  }
};

function sfEmptyDetailHtml() {
  return `
    <div class="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center min-h-[420px] flex flex-col items-center justify-center">
      <div class="w-14 h-14 rounded-xl bg-orange-50 flex items-center justify-center mb-3">
        <i class="fas fa-hand-pointer text-xl text-orange-500"></i>
      </div>
      <p class="font-bold text-slate-700">작업지시를 선택하세요</p>
      <p class="text-sm text-slate-500 mt-1">왼쪽 목록에서 WO를 고르면 스캔·실행 패널이 열립니다</p>
    </div>`;
}

window.sfSetFilter = function (filter) {
  window._sfState.filter = filter;
  const el = document.getElementById('sf-filter');
  if (el && el.value !== filter) el.value = filter;
  sfLoadWorkOrders();
};

async function sfLoadWorkOrders() {
  const list = document.getElementById('sf-wo-list');
  if (!list) return;
  list.innerHTML = '<div class="text-center py-12 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>';

  try {
    const res = await axios.get(`${API_BASE}/production/work-orders`);
    let rows = res.data.data || [];
    const filter = window._sfState.filter;

    if (filter === 'active') {
      rows = rows.filter((w) => ['released', 'in_progress'].includes(w.status));
    } else if (filter === 'in_progress' || filter === 'released') {
      rows = rows.filter((w) => w.status === filter);
    }

    const countEl = document.getElementById('sf-wo-count');
    if (countEl) countEl.textContent = `${rows.length}건`;

    if (!rows.length) {
      list.innerHTML = `
        <div class="p-8 text-center">
          <i class="fas fa-clipboard-list text-3xl text-slate-300 mb-3"></i>
          <p class="text-slate-500 text-sm">표시할 작업지시가 없습니다.</p>
          <p class="text-xs text-slate-400 mt-1">작업지시 탭에서 확정(released)해 주세요.</p>
        </div>`;
      return;
    }

    const selectedId = window._sfState.selectedWo?.id;
    list.innerHTML = rows.map((w) => {
      const pct = w.planned_qty > 0
        ? Math.min(100, Math.round((Number(w.completed_qty || 0) / Number(w.planned_qty)) * 100))
        : 0;
      const active = Number(selectedId) === Number(w.id);
      return `
        <button type="button" onclick="sfOpenWorkOrder(${w.id})"
          class="w-full text-left px-4 py-3 hover:bg-orange-50/60 transition ${active ? 'bg-orange-50 border-l-4 border-orange-500' : 'border-l-4 border-transparent'}">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="font-bold text-slate-800 text-sm">${escapeHtml(w.wo_number)}</div>
              <div class="text-sm text-slate-600 mt-0.5 truncate">${escapeHtml(w.product_name || '')}</div>
              <div class="text-xs text-slate-400 mt-1 truncate">${escapeHtml(w.product_sku || '')}${w.process_name ? ` · ${escapeHtml(w.process_name)}` : ''}</div>
            </div>
            <span class="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${SF_STATUS_CLASS[w.status] || 'bg-slate-100'}">${SF_STATUS_LABEL[w.status] || w.status}</span>
          </div>
          <div class="mt-2">
            <div class="flex justify-between text-xs text-slate-500 mb-1">
              <span>${Number(w.completed_qty || 0)} / ${Number(w.planned_qty || 0)}</span>
              <span>${pct}%</span>
            </div>
            <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full bg-orange-500 rounded-full" style="width:${pct}%"></div>
            </div>
          </div>
        </button>`;
    }).join('');
  } catch (e) {
    list.innerHTML = `<div class="text-center py-10 text-rose-600 text-sm px-4">${escapeHtml(e.response?.data?.error || e.message)}</div>`;
  }
}
window.sfLoadWorkOrders = sfLoadWorkOrders;

window.sfOpenWorkOrder = async function (woId) {
  await sfStopScan();
  const detail = document.getElementById('sf-view-detail');
  if (!detail) return;

  detail.innerHTML = '<div class="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>';

  try {
    const res = await axios.get(`${API_BASE}/production/work-orders/${woId}`);
    const wo = res.data.data;
    window._sfState.selectedWo = wo;
    if (!window._sfState.action) window._sfState.action = 'issue';
    // 목록 선택 강조 갱신
    await sfLoadWorkOrders();
    await sfRenderDetail();
  } catch (e) {
    detail.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-xl p-6">
        <div class="text-rose-600 text-sm">${escapeHtml(e.response?.data?.error || e.message)}</div>
      </div>`;
  }
};

window.sfBackToList = async function () {
  await sfStopScan();
  window._sfState.selectedWo = null;
  const detail = document.getElementById('sf-view-detail');
  if (detail) detail.innerHTML = sfEmptyDetailHtml();
  await sfLoadWorkOrders();
};

async function sfRenderDetail() {
  const wo = window._sfState.selectedWo;
  const detail = document.getElementById('sf-view-detail');
  if (!wo || !detail) return;

  const action = window._sfState.action || 'issue';
  const pct = wo.planned_qty > 0
    ? Math.min(100, Math.round((Number(wo.completed_qty || 0) / Number(wo.planned_qty)) * 100))
    : 0;
  const processes = window._sfState.processes || [];

  detail.innerHTML = `
    <div class="space-y-4">
      <div class="bg-white border border-slate-200 rounded-xl p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="font-bold text-lg text-slate-800">${escapeHtml(wo.wo_number)}</h3>
              <span class="text-xs px-2 py-1 rounded-full font-medium ${SF_STATUS_CLASS[wo.status] || ''}">${SF_STATUS_LABEL[wo.status] || wo.status}</span>
            </div>
            <div class="text-sm text-slate-600 mt-1">${escapeHtml(wo.product_name || '')}</div>
            <div class="mt-2 text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
              <span>계획 ${Number(wo.planned_qty || 0)}</span>
              <span>완료 ${Number(wo.completed_qty || 0)} (${pct}%)</span>
              ${wo.warehouse_name ? `<span>창고 ${escapeHtml(wo.warehouse_name)}</span>` : ''}
              ${wo.equipment_name ? `<span>설비 ${escapeHtml(wo.equipment_name)}</span>` : ''}
            </div>
          </div>
          ${wo.status === 'released' ? `
            <button type="button" onclick="sfStartWorkOrder(${wo.id})"
              class="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold">
              <i class="fas fa-play mr-1"></i>작업 시작
            </button>` : ''}
        </div>
        <div class="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full bg-orange-500 rounded-full" style="width:${pct}%"></div>
        </div>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl p-5">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          ${SF_ACTIONS.map((a) => `
            <button type="button" onclick="sfSelectAction('${a.id}')"
              class="py-2.5 px-2 rounded-lg text-sm font-semibold text-white ${a.color} ${action === a.id ? 'ring-2 ring-offset-2 ring-slate-400' : 'opacity-90'}">
              <i class="fas ${a.icon} mr-1"></i>${a.label}
            </button>`).join('')}
        </div>

        <div class="border-t border-slate-100 pt-4 space-y-3">
          <div class="text-sm font-bold text-slate-700">
            ${SF_ACTIONS.find((a) => a.id === action)?.label || '작업'}
          </div>

          ${action !== 'record' ? `
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">QR / 바코드</label>
              <div class="flex gap-2">
                <input id="sf-qr" type="text" autocomplete="off"
                  class="flex-1 border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="스캔 또는 직접 입력"
                  onkeydown="if(event.key==='Enter'){event.preventDefault();sfApplyManualQr();}">
                <button type="button" onclick="sfApplyManualQr()" class="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50">적용</button>
              </div>
            </div>

            <div id="sf-reader-wrap" class="rounded-lg overflow-hidden bg-slate-900 relative min-h-[180px] border border-slate-700">
              <div id="sf-qr-reader" class="w-full"></div>
              <div id="sf-scan-idle" class="absolute inset-0 flex flex-col items-center justify-center text-slate-300 text-sm p-4">
                <i class="fas fa-camera text-3xl mb-2 opacity-60"></i>
                카메라로 QR/바코드를 스캔하세요
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" id="sf-start-scan" onclick="sfStartScan()"
                class="py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium">
                <i class="fas fa-qrcode mr-1"></i>카메라 스캔
              </button>
              <button type="button" id="sf-stop-scan" onclick="sfStopScan()" class="hidden py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium">
                스캔 중지
              </button>
            </div>
          ` : ''}

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">${action === 'record' ? '양품 수량' : '수량'}</label>
              <input id="sf-qty" type="number" min="1" value="1"
                class="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
            </div>
            ${action === 'record' ? `
              <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1">불량 수량</label>
                <input id="sf-scrap" type="number" min="0" value="0"
                  class="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
              </div>` : `
              <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1">공정 (선택)</label>
                <select id="sf-process" class="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white">
                  <option value="">기본/없음</option>
                  ${processes.map((p) => `<option value="${p.id}" ${Number(wo.process_id) === Number(p.id) ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
                </select>
              </div>`}
          </div>

          ${action === 'record' ? `
            <label class="flex items-center gap-2 text-sm text-slate-700">
              <input id="sf-apply-stock" type="checkbox" checked class="rounded border-slate-300 text-orange-600 focus:ring-orange-500">
              재고 즉시 반영 (자재 차감 + 완제품 입고)
            </label>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">공정 (선택)</label>
              <select id="sf-process" class="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white">
                <option value="">기본/없음</option>
                ${processes.map((p) => `<option value="${p.id}" ${Number(wo.process_id) === Number(p.id) ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
              </select>
            </div>
          ` : ''}

          ${action === 'issue' ? `
            <p class="text-xs text-slate-500">자재 QR을 스캔한 뒤 투입합니다. 필요 시 자재 QR을 먼저 발행하세요.</p>
            <button type="button" onclick="sfGenerateMaterialQr()" class="w-full py-2.5 rounded-lg border border-blue-300 text-blue-700 text-sm font-medium hover:bg-blue-50">
              <i class="fas fa-plus mr-1"></i>자재 QR 빠른 발행
            </button>
          ` : ''}

          ${action === 'pack' ? `
            <p class="text-xs text-slate-500">완제품 QR이 없으면 포장 시 자동 생성됩니다.</p>
          ` : ''}

          <button type="button" onclick="sfSubmitAction()"
            class="w-full py-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold">
            <i class="fas fa-check mr-2"></i>확인 · 실행
          </button>

          <div id="sf-action-result" class="hidden text-sm rounded-lg px-3 py-2"></div>
        </div>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold text-slate-700"><i class="fas fa-stream mr-2 text-slate-400"></i>최근 타임라인</h3>
          <button type="button" onclick="sfRefreshTimeline()" class="text-xs text-orange-600 font-semibold hover:underline">새로고침</button>
        </div>
        <div id="sf-timeline" class="space-y-2 max-h-64 overflow-y-auto text-sm">
          <div class="text-slate-400 text-center py-4 text-xs">불러오는 중...</div>
        </div>
      </div>
    </div>
  `;

  await sfRefreshTimeline();
}

window.sfSelectAction = async function (actionId) {
  await sfStopScan();
  window._sfState.action = actionId;
  await sfRenderDetail();
};

window.sfApplyManualQr = function () {
  const el = document.getElementById('sf-qr');
  if (!el?.value?.trim()) {
    showToast('QR 코드를 입력해 주세요', 'warning');
    return;
  }
  showToast('QR 코드가 적용되었습니다', 'success');
};

window.sfStartScan = async function () {
  if (typeof Html5Qrcode === 'undefined') {
    showToast('카메라 라이브러리를 불러오지 못했습니다', 'error');
    return;
  }
  if (window._sfState.scanner) {
    showToast('이미 스캔 중입니다', 'warning');
    return;
  }

  const idle = document.getElementById('sf-scan-idle');
  const startBtn = document.getElementById('sf-start-scan');
  const stopBtn = document.getElementById('sf-stop-scan');

  try {
    const scanner = new Html5Qrcode('sf-qr-reader');
    window._sfState.scanner = scanner;

    const formats = [];
    if (typeof Html5QrcodeSupportedFormats !== 'undefined') {
      const F = Html5QrcodeSupportedFormats;
      [F.QR_CODE, F.CODE_128, F.EAN_13, F.EAN_8, F.CODE_39, F.UPC_A].forEach((f) => {
        if (f != null) formats.push(f);
      });
    }
    const config = {
      fps: 12,
      qrbox: (w, h) => ({ width: Math.min(300, Math.floor(w * 0.9)), height: Math.min(140, Math.floor(h * 0.35)) })
    };
    if (formats.length) config.formatsToSupport = formats;

    await scanner.start(
      { facingMode: 'environment' },
      config,
      async (decodedText) => {
        const qrEl = document.getElementById('sf-qr');
        if (qrEl) qrEl.value = decodedText;
        await sfStopScan();
        showToast('스캔 완료', 'success');
      },
      () => {}
    );
    if (idle) idle.classList.add('hidden');
    if (startBtn) startBtn.classList.add('hidden');
    if (stopBtn) stopBtn.classList.remove('hidden');
  } catch (e) {
    console.error(e);
    window._sfState.scanner = null;
    showToast('카메라 접근에 실패했습니다. 권한을 확인해 주세요', 'error');
  }
};

async function sfStopScan() {
  const scanner = window._sfState.scanner;
  if (scanner) {
    try {
      await scanner.stop();
      await scanner.clear();
    } catch (_) {}
    window._sfState.scanner = null;
  }
  const idle = document.getElementById('sf-scan-idle');
  const startBtn = document.getElementById('sf-start-scan');
  const stopBtn = document.getElementById('sf-stop-scan');
  if (idle) idle.classList.remove('hidden');
  if (startBtn) startBtn.classList.remove('hidden');
  if (stopBtn) stopBtn.classList.add('hidden');
}
window.sfStopScan = sfStopScan;

window.sfStartWorkOrder = async function (woId) {
  try {
    await axios.put(`${API_BASE}/production/work-orders/${woId}/status`, { status: 'in_progress' });
    showToast('작업을 시작했습니다', 'success');
    await sfOpenWorkOrder(woId);
  } catch (e) {
    showToast(e.response?.data?.error || e.message, 'error');
  }
};

window.sfGenerateMaterialQr = async function () {
  const wo = window._sfState.selectedWo;
  if (!wo) return;

  const bomItems = wo.bom_items || [];
  let productId = null;
  if (bomItems.length === 1) {
    productId = bomItems[0].component_product_id;
  } else if (bomItems.length > 1) {
    const options = bomItems.map((b, i) => `${i + 1}. ${b.component_name} (${b.component_sku || b.component_product_id})`).join('\n');
    const pick = prompt(`자재 QR을 발행할 구성품 번호를 입력하세요:\n${options}`, '1');
    const idx = Number(pick) - 1;
    if (!bomItems[idx]) {
      showToast('선택이 올바르지 않습니다', 'warning');
      return;
    }
    productId = bomItems[idx].component_product_id;
  } else {
    showToast('BOM 구성품이 없습니다. 관리 화면에서 BOM을 등록해 주세요', 'warning');
    return;
  }

  try {
    const res = await axios.post(`${API_BASE}/production/trace/generate`, {
      work_order_id: wo.id,
      type: 'material',
      product_id: productId,
      quantity: 1
    });
    const code = res.data.data?.codes?.[0]?.code;
    if (code) {
      const qrEl = document.getElementById('sf-qr');
      if (qrEl) qrEl.value = code;
    }
    sfSetResult(`자재 QR 발행: ${code || ''}`, false);
    showToast('자재 QR이 발행되었습니다', 'success');
    await sfRefreshTimeline();
  } catch (e) {
    sfSetResult(e.response?.data?.error || e.message, true);
  }
};

window.sfSubmitAction = async function () {
  const wo = window._sfState.selectedWo;
  if (!wo) return;

  const action = window._sfState.action || 'issue';
  const qty = Number(document.getElementById('sf-qty')?.value) || 1;
  const processId = document.getElementById('sf-process')?.value || null;
  const qr = document.getElementById('sf-qr')?.value?.trim() || '';

  try {
    if (action === 'issue') {
      if (!qr) {
        showToast('자재 QR을 스캔하거나 입력해 주세요', 'warning');
        return;
      }
      const res = await axios.post(`${API_BASE}/production/trace/material-issue`, {
        work_order_id: wo.id,
        qr_code: qr,
        quantity: qty
      });
      sfSetResult(`${res.data.message || '투입 완료'} — ${res.data.data?.product_name || ''}`, false);
      showToast('자재 투입 완료', 'success');
    } else if (action === 'process') {
      const res = await axios.post(`${API_BASE}/production/trace/process-complete`, {
        work_order_id: wo.id,
        qr_code: qr || null,
        quantity: qty,
        process_id: processId ? Number(processId) : undefined
      });
      sfSetResult(res.data.message || '공정 완료 기록됨', false);
      showToast('공정 완료', 'success');
    } else if (action === 'pack') {
      const res = await axios.post(`${API_BASE}/production/trace/fg-pack`, {
        work_order_id: wo.id,
        qr_code: qr || null,
        quantity: qty,
        create_qr: !qr
      });
      const code = res.data.data?.qr_code || '';
      if (code) {
        const qrEl = document.getElementById('sf-qr');
        if (qrEl) qrEl.value = code;
      }
      sfSetResult(`${res.data.message || '포장 완료'}<br>QR: ${code} · Lot: ${res.data.data?.lot_number || ''}`, false);
      showToast('완제품 포장 완료', 'success');
    } else if (action === 'record') {
      const scrap = Number(document.getElementById('sf-scrap')?.value) || 0;
      const apply_stock = !!document.getElementById('sf-apply-stock')?.checked;
      if (!confirm(`양품 ${qty}, 불량 ${scrap} 실적을 등록할까요?${apply_stock ? '\n(재고가 즉시 반영됩니다)' : ''}`)) return;
      const res = await axios.post(`${API_BASE}/production/work-orders/${wo.id}/records`, {
        good_qty: qty,
        scrap_qty: scrap,
        apply_stock,
        process_id: processId ? Number(processId) : undefined
      });
      sfSetResult(res.data.message || '실적 등록 완료', false);
      showToast('실적 등록 완료', 'success');
      await sfOpenWorkOrder(wo.id);
      return;
    }

    await sfRefreshTimeline();
  } catch (e) {
    sfSetResult(e.response?.data?.error || e.message, true);
    showToast(e.response?.data?.error || e.message, 'error');
  }
};

function sfSetResult(html, isError) {
  const el = document.getElementById('sf-action-result');
  if (!el) return;
  el.classList.remove('hidden', 'bg-rose-50', 'text-rose-700', 'bg-emerald-50', 'text-emerald-800');
  el.classList.add(isError ? 'bg-rose-50' : 'bg-emerald-50', isError ? 'text-rose-700' : 'text-emerald-800');
  el.innerHTML = html;
}

window.sfRefreshTimeline = async function () {
  const wo = window._sfState.selectedWo;
  const el = document.getElementById('sf-timeline');
  if (!wo || !el) return;

  try {
    const res = await axios.get(`${API_BASE}/production/trace/work-orders/${wo.id}/timeline`);
    const events = res.data.data?.events || [];
    if (!events.length) {
      el.innerHTML = '<div class="text-center text-slate-400 text-xs py-4">아직 현장 이벤트가 없습니다</div>';
      return;
    }
    el.innerHTML = events.slice(0, 30).map((e) => `
      <div class="border border-slate-100 rounded-lg px-3 py-2 bg-slate-50/50">
        <div class="flex justify-between gap-2">
          <span class="font-medium text-slate-700">${SF_EVENT_LABEL[e.event_type] || e.event_type}</span>
          <span class="text-[11px] text-slate-400">${(e.created_at || '').replace('T', ' ').slice(0, 19)}</span>
        </div>
        <div class="text-xs text-slate-500 mt-0.5">
          ${escapeHtml(e.product_name || '')}
          ${e.qr_code ? ` · ${escapeHtml(e.qr_code)}` : ''}
          ${e.lot_number ? ` · Lot ${escapeHtml(e.lot_number)}` : ''}
          ${e.process_name ? ` · ${escapeHtml(e.process_name)}` : ''}
          ${e.quantity != null ? ` · qty ${e.quantity}` : ''}
        </div>
      </div>`).join('');
  } catch (e) {
    el.innerHTML = `<div class="text-rose-600 text-xs">${escapeHtml(e.response?.data?.error || e.message)}</div>`;
  }
};

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
