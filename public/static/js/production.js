// Phase 1 MES — 작업지시 / BOM / 공정

const MES_STATUS_LABEL = {
  planned: '계획',
  released: '확정',
  in_progress: '진행중',
  completed: '완료',
  cancelled: '취소'
};

const MES_STATUS_CLASS = {
  planned: 'bg-slate-100 text-slate-700',
  released: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700'
};

window.loadProductionPage = async function (initialTab = 'work-orders') {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">
          <i class="fas fa-industry mr-2 text-orange-600"></i>생산 MES
        </h1>
        <p class="text-sm text-slate-500 mt-1">작업지시 · BOM · 공정 · 실적 · 추적 · KPI</p>
      </div>
      <div id="mes-stats" class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm"></div>
    </div>

    <div class="flex mb-6 border-b border-slate-200 overflow-x-auto">
      <button onclick="switchMesTab('work-orders')" id="mes-tab-work-orders" class="px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap">작업지시</button>
      <button onclick="switchMesTab('boms')" id="mes-tab-boms" class="px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap">BOM</button>
      <button onclick="switchMesTab('processes')" id="mes-tab-processes" class="px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap">공정</button>
      <button onclick="switchMesTab('trace')" id="mes-tab-trace" class="px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap">생산 추적</button>
      <button onclick="switchMesTab('kpi')" id="mes-tab-kpi" class="px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap">KPI/리포트</button>
    </div>

    <div id="mes-tab-content"></div>
    <div id="mes-modals"></div>
  `;

  await refreshMesStats();
  switchMesTab(initialTab);
};

async function refreshMesStats() {
  const el = document.getElementById('mes-stats');
  if (!el) return;
  try {
    const res = await axios.get(`${API_BASE}/production/stats`);
    const s = res.data.data || {};
    el.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-lg px-3 py-2"><div class="text-xs text-slate-500">미완료 WO</div><div class="font-bold text-slate-800">${s.open_wo || 0}</div></div>
      <div class="bg-white border border-slate-200 rounded-lg px-3 py-2"><div class="text-xs text-slate-500">진행중</div><div class="font-bold text-amber-700">${s.in_progress_wo || 0}</div></div>
      <div class="bg-white border border-slate-200 rounded-lg px-3 py-2"><div class="text-xs text-slate-500">오늘 양품</div><div class="font-bold text-emerald-700">${s.good_today || 0}</div></div>
      <div class="bg-white border border-slate-200 rounded-lg px-3 py-2"><div class="text-xs text-slate-500">활성 BOM</div><div class="font-bold text-slate-800">${s.active_boms || 0}</div></div>
    `;
  } catch (_) {
    el.innerHTML = '';
  }
}

window.switchMesTab = function (tabName) {
  ['work-orders', 'boms', 'processes', 'trace', 'kpi'].forEach((t) => {
    const btn = document.getElementById(`mes-tab-${t}`);
    if (!btn) return;
    if (t === tabName) {
      btn.classList.add('border-orange-600', 'text-orange-600');
      btn.classList.remove('border-transparent', 'text-slate-500');
    } else {
      btn.classList.remove('border-orange-600', 'text-orange-600');
      btn.classList.add('border-transparent', 'text-slate-500');
    }
  });

  if (tabName === 'work-orders') loadMesWorkOrders();
  else if (tabName === 'boms') loadMesBoms();
  else if (tabName === 'processes') loadMesProcesses();
  else if (tabName === 'trace') loadMesTrace();
  else loadMesKpi();
};

// ---------- 작업지시 ----------
async function loadMesWorkOrders() {
  const container = document.getElementById('mes-tab-content');
  container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-orange-500"></i></div>';

  try {
    const res = await axios.get(`${API_BASE}/production/work-orders`);
    const rows = res.data.data || [];

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div class="flex gap-2">
          <select id="mes-wo-status-filter" onchange="loadMesWorkOrdersFiltered()" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">전체 상태</option>
            <option value="planned">계획</option>
            <option value="released">확정</option>
            <option value="in_progress">진행중</option>
            <option value="completed">완료</option>
            <option value="cancelled">취소</option>
          </select>
          <input id="mes-wo-search" onkeydown="if(event.key==='Enter')loadMesWorkOrdersFiltered()" placeholder="WO번호/상품 검색" class="border border-slate-300 rounded-lg px-3 py-2 text-sm w-48">
        </div>
        <button onclick="showMesWorkOrderModal()" class="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700">
          <i class="fas fa-plus mr-2"></i>작업지시 등록
        </button>
      </div>
      <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-slate-700 uppercase bg-slate-50 border-b">
            <tr>
              <th class="px-4 py-3">WO번호</th>
              <th class="px-4 py-3">완제품</th>
              <th class="px-4 py-3">계획/실적</th>
              <th class="px-4 py-3">상태</th>
              <th class="px-4 py-3">창고</th>
              <th class="px-4 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100" id="mes-wo-tbody">
            ${renderWoRows(rows)}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div class="text-center py-10 text-rose-600">${e.response?.data?.error || e.message}</div>`;
  }
}

window.loadMesWorkOrdersFiltered = async function () {
  const status = document.getElementById('mes-wo-status-filter')?.value || '';
  const search = document.getElementById('mes-wo-search')?.value || '';
  const tbody = document.getElementById('mes-wo-tbody');
  if (!tbody) return;
  try {
    const res = await axios.get(`${API_BASE}/production/work-orders`, { params: { status, search } });
    tbody.innerHTML = renderWoRows(res.data.data || []);
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

function renderWoRows(rows) {
  if (!rows.length) {
    return `<tr><td colspan="6" class="px-4 py-10 text-center text-slate-400">등록된 작업지시가 없습니다.</td></tr>`;
  }
  return rows.map((wo) => `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-3 font-medium text-slate-800">${wo.wo_number}</td>
      <td class="px-4 py-3">
        <div class="font-medium text-slate-800">${wo.product_name || '-'}</div>
        <div class="text-xs text-slate-400">${wo.product_sku || ''}</div>
      </td>
      <td class="px-4 py-3">
        <div>${wo.completed_qty || 0} / ${wo.planned_qty}</div>
        <div class="text-xs text-slate-400">불량 ${wo.scrap_qty || 0}</div>
      </td>
      <td class="px-4 py-3">
        <span class="px-2 py-1 rounded-full text-xs font-medium ${MES_STATUS_CLASS[wo.status] || ''}">${MES_STATUS_LABEL[wo.status] || wo.status}</span>
      </td>
      <td class="px-4 py-3 text-slate-600">${wo.warehouse_name || '-'}</td>
      <td class="px-4 py-3 text-right space-x-2">
        <button onclick="showMesWorkOrderDetail(${wo.id})" class="text-orange-600 hover:underline text-xs">상세/실적</button>
        ${wo.status === 'planned' ? `<button onclick="changeMesWoStatus(${wo.id},'released')" class="text-blue-600 hover:underline text-xs">확정</button>` : ''}
        ${wo.status === 'released' ? `<button onclick="changeMesWoStatus(${wo.id},'in_progress')" class="text-amber-600 hover:underline text-xs">시작</button>` : ''}
        ${['planned', 'released'].includes(wo.status) ? `<button onclick="changeMesWoStatus(${wo.id},'cancelled')" class="text-rose-500 hover:underline text-xs">취소</button>` : ''}
      </td>
    </tr>
  `).join('');
}

window.changeMesWoStatus = async function (id, status) {
  const label = MES_STATUS_LABEL[status] || status;
  if (!confirm(`상태를 "${label}"(으)로 변경할까요?`)) return;
  try {
    await axios.put(`${API_BASE}/production/work-orders/${id}/status`, { status });
    await refreshMesStats();
    loadMesWorkOrdersFiltered();
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

window.showMesWorkOrderModal = async function () {
  const [productsRes, bomsRes, processesRes, whRes] = await Promise.all([
    axios.get(`${API_BASE}/products`, { params: { limit: 500 } }),
    axios.get(`${API_BASE}/production/boms`),
    axios.get(`${API_BASE}/production/processes`, { params: { active: 1 } }),
    axios.get(`${API_BASE}/warehouses`)
  ]);

  const products = productsRes.data.data || productsRes.data || [];
  const boms = bomsRes.data.data || [];
  const processes = processesRes.data.data || [];
  const warehouses = whRes.data.data || whRes.data || [];

  document.getElementById('mes-modals').innerHTML = `
    <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onclick="if(event.target===this)closeMesModal()">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <h3 class="text-lg font-bold mb-4">작업지시 등록</h3>
        <div class="space-y-3">
          <div>
            <label class="text-sm text-slate-600">완제품 *</label>
            <select id="mes-wo-product" class="w-full border rounded-lg px-3 py-2 mt-1" onchange="filterMesBomsByProduct()">
              <option value="">선택</option>
              ${products.map((p) => `<option value="${p.id}">${p.name} (${p.sku})</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-sm text-slate-600">BOM</label>
            <select id="mes-wo-bom" class="w-full border rounded-lg px-3 py-2 mt-1" data-boms='${JSON.stringify(boms).replace(/'/g, '&#39;')}'>
              <option value="">선택 안 함</option>
              ${boms.map((b) => `<option value="${b.id}" data-product="${b.product_id}">${b.name} v${b.version} — ${b.product_name}</option>`).join('')}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm text-slate-600">계획수량 *</label>
              <input id="mes-wo-qty" type="number" min="0.01" step="any" class="w-full border rounded-lg px-3 py-2 mt-1" value="1">
            </div>
            <div>
              <label class="text-sm text-slate-600">창고 *</label>
              <select id="mes-wo-warehouse" class="w-full border rounded-lg px-3 py-2 mt-1">
                <option value="">선택</option>
                ${warehouses.map((w) => `<option value="${w.id}">${w.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div>
            <label class="text-sm text-slate-600">공정</label>
            <select id="mes-wo-process" class="w-full border rounded-lg px-3 py-2 mt-1">
              <option value="">선택 안 함</option>
              ${processes.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm text-slate-600">계획 시작일</label>
              <input id="mes-wo-start" type="date" class="w-full border rounded-lg px-3 py-2 mt-1">
            </div>
            <div>
              <label class="text-sm text-slate-600">계획 종료일</label>
              <input id="mes-wo-end" type="date" class="w-full border rounded-lg px-3 py-2 mt-1">
            </div>
          </div>
          <div>
            <label class="text-sm text-slate-600">메모</label>
            <textarea id="mes-wo-notes" class="w-full border rounded-lg px-3 py-2 mt-1" rows="2"></textarea>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <button onclick="closeMesModal()" class="px-4 py-2 rounded-lg border">취소</button>
          <button onclick="submitMesWorkOrder()" class="px-4 py-2 rounded-lg bg-orange-600 text-white">등록</button>
        </div>
      </div>
    </div>
  `;
};

window.filterMesBomsByProduct = function () {
  const productId = document.getElementById('mes-wo-product')?.value;
  const select = document.getElementById('mes-wo-bom');
  if (!select) return;
  Array.from(select.options).forEach((opt, idx) => {
    if (idx === 0) return;
    const pid = opt.getAttribute('data-product');
    opt.hidden = productId && pid !== productId;
  });
  if (select.selectedOptions[0]?.hidden) select.value = '';
};

window.submitMesWorkOrder = async function () {
  const payload = {
    product_id: Number(document.getElementById('mes-wo-product').value),
    bom_id: document.getElementById('mes-wo-bom').value ? Number(document.getElementById('mes-wo-bom').value) : null,
    planned_qty: Number(document.getElementById('mes-wo-qty').value),
    warehouse_id: document.getElementById('mes-wo-warehouse').value ? Number(document.getElementById('mes-wo-warehouse').value) : null,
    process_id: document.getElementById('mes-wo-process').value ? Number(document.getElementById('mes-wo-process').value) : null,
    planned_start_date: document.getElementById('mes-wo-start').value || null,
    planned_end_date: document.getElementById('mes-wo-end').value || null,
    notes: document.getElementById('mes-wo-notes').value || null
  };
  if (!payload.product_id || !(payload.planned_qty > 0)) {
    alert('완제품과 계획수량을 입력해주세요.');
    return;
  }
  try {
    await axios.post(`${API_BASE}/production/work-orders`, payload);
    closeMesModal();
    await refreshMesStats();
    loadMesWorkOrders();
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

window.showMesWorkOrderDetail = async function (id) {
  try {
    const res = await axios.get(`${API_BASE}/production/work-orders/${id}`);
    const wo = res.data.data;
    const records = wo.records || [];
    const bomItems = wo.bom_items || [];

    document.getElementById('mes-modals').innerHTML = `
      <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onclick="if(event.target===this)closeMesModal()">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-lg font-bold">${wo.wo_number}</h3>
              <p class="text-sm text-slate-500">${wo.product_name} (${wo.product_sku || ''})</p>
            </div>
            <span class="px-2 py-1 rounded-full text-xs font-medium ${MES_STATUS_CLASS[wo.status] || ''}">${MES_STATUS_LABEL[wo.status] || wo.status}</span>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-6">
            <div class="bg-slate-50 rounded-lg p-3"><div class="text-slate-500 text-xs">계획</div><div class="font-bold">${wo.planned_qty}</div></div>
            <div class="bg-slate-50 rounded-lg p-3"><div class="text-slate-500 text-xs">양품</div><div class="font-bold text-emerald-700">${wo.completed_qty}</div></div>
            <div class="bg-slate-50 rounded-lg p-3"><div class="text-slate-500 text-xs">불량</div><div class="font-bold text-rose-600">${wo.scrap_qty}</div></div>
            <div class="bg-slate-50 rounded-lg p-3"><div class="text-slate-500 text-xs">창고</div><div class="font-bold">${wo.warehouse_name || '-'}</div></div>
          </div>

          ${bomItems.length ? `
            <h4 class="font-semibold text-slate-800 mb-2">BOM 자재 (1개 생산 기준)</h4>
            <div class="border rounded-lg overflow-hidden mb-6">
              <table class="w-full text-sm">
                <thead class="bg-slate-50 text-xs"><tr><th class="px-3 py-2 text-left">자재</th><th class="px-3 py-2 text-right">소요량</th><th class="px-3 py-2 text-right">현재고</th></tr></thead>
                <tbody>${bomItems.map((i) => `
                  <tr class="border-t"><td class="px-3 py-2">${i.component_name}<div class="text-xs text-slate-400">${i.component_sku || ''}</div></td>
                  <td class="px-3 py-2 text-right">${i.quantity} ${i.unit || ''}</td>
                  <td class="px-3 py-2 text-right">${i.current_stock ?? '-'}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>` : '<p class="text-sm text-slate-400 mb-6">연결된 BOM이 없습니다. (완제품만 입고됩니다)</p>'}

          ${['released', 'in_progress'].includes(wo.status) ? `
            <div class="border border-orange-200 bg-orange-50 rounded-xl p-4 mb-6">
              <h4 class="font-semibold text-orange-800 mb-3">생산실적 등록</h4>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label class="text-xs text-slate-600">양품 수량</label>
                  <input id="mes-rec-good" type="number" min="0" step="any" value="1" class="w-full border rounded-lg px-3 py-2 mt-1">
                </div>
                <div>
                  <label class="text-xs text-slate-600">불량 수량</label>
                  <input id="mes-rec-scrap" type="number" min="0" step="any" value="0" class="w-full border rounded-lg px-3 py-2 mt-1">
                </div>
                <div class="md:col-span-2 flex items-end">
                  <label class="flex items-center gap-2 text-sm text-slate-700">
                    <input id="mes-rec-stock" type="checkbox" checked class="rounded">
                    재고 연동 (자재차감 + 완제품입고)
                  </label>
                </div>
              </div>
              <div class="flex justify-end mt-3">
                <button onclick="submitMesProductionRecord(${wo.id})" class="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm">
                  실적 확정
                </button>
              </div>
            </div>` : ''}

          <h4 class="font-semibold text-slate-800 mb-2">실적 이력</h4>
          <div class="border rounded-lg overflow-hidden mb-4">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 text-xs">
                <tr><th class="px-3 py-2 text-left">일시</th><th class="px-3 py-2 text-right">양품</th><th class="px-3 py-2 text-right">불량</th><th class="px-3 py-2 text-left">재고</th></tr>
              </thead>
              <tbody>
                ${records.length ? records.map((r) => `
                  <tr class="border-t">
                    <td class="px-3 py-2">${(r.recorded_at || '').replace('T', ' ').slice(0, 19)}</td>
                    <td class="px-3 py-2 text-right text-emerald-700">${r.good_qty}</td>
                    <td class="px-3 py-2 text-right text-rose-600">${r.scrap_qty}</td>
                    <td class="px-3 py-2">${r.stock_applied ? '반영' : '미반영'}</td>
                  </tr>`).join('') : '<tr><td colspan="4" class="px-3 py-6 text-center text-slate-400">실적 없음</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="flex justify-end">
            <button onclick="closeMesModal()" class="px-4 py-2 rounded-lg border">닫기</button>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

window.submitMesProductionRecord = async function (woId) {
  const good_qty = Number(document.getElementById('mes-rec-good').value) || 0;
  const scrap_qty = Number(document.getElementById('mes-rec-scrap').value) || 0;
  const apply_stock = document.getElementById('mes-rec-stock').checked;
  if (!confirm(`양품 ${good_qty}, 불량 ${scrap_qty} 실적을 등록할까요?${apply_stock ? '\\n(재고가 즉시 반영됩니다)' : ''}`)) return;
  try {
    const res = await axios.post(`${API_BASE}/production/work-orders/${woId}/records`, {
      good_qty, scrap_qty, apply_stock
    });
    alert(res.data.message || '등록되었습니다.');
    await refreshMesStats();
    showMesWorkOrderDetail(woId);
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

// ---------- BOM ----------
async function loadMesBoms() {
  const container = document.getElementById('mes-tab-content');
  container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-orange-500"></i></div>';
  try {
    const res = await axios.get(`${API_BASE}/production/boms`);
    const rows = res.data.data || [];
    container.innerHTML = `
      <div class="flex justify-end mb-4">
        <button onclick="showMesBomModal()" class="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700">
          <i class="fas fa-plus mr-2"></i>BOM 등록
        </button>
      </div>
      <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
        <table class="w-full text-sm">
          <thead class="text-xs uppercase bg-slate-50 border-b">
            <tr>
              <th class="px-4 py-3 text-left">BOM명</th>
              <th class="px-4 py-3 text-left">완제품</th>
              <th class="px-4 py-3 text-left">버전</th>
              <th class="px-4 py-3 text-right">구성수</th>
              <th class="px-4 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            ${rows.length ? rows.map((b) => `
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">${b.name}</td>
                <td class="px-4 py-3">${b.product_name}<div class="text-xs text-slate-400">${b.product_sku || ''}</div></td>
                <td class="px-4 py-3">${b.version}</td>
                <td class="px-4 py-3 text-right">${b.item_count || 0}</td>
                <td class="px-4 py-3 text-right space-x-2">
                  <button onclick="showMesBomModal(${b.id})" class="text-orange-600 hover:underline text-xs">수정</button>
                  <button onclick="deactivateMesBom(${b.id})" class="text-rose-500 hover:underline text-xs">비활성</button>
                </td>
              </tr>`).join('') : '<tr><td colspan="5" class="px-4 py-10 text-center text-slate-400">등록된 BOM이 없습니다.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div class="text-center py-10 text-rose-600">${e.response?.data?.error || e.message}</div>`;
  }
}

window.showMesBomModal = async function (bomId = null) {
  const productsRes = await axios.get(`${API_BASE}/products`, { params: { limit: 500 } });
  const products = productsRes.data.data || productsRes.data || [];
  let bom = null;
  if (bomId) {
    const res = await axios.get(`${API_BASE}/production/boms/${bomId}`);
    bom = res.data.data;
  }

  const items = bom?.items?.length
    ? bom.items
    : [{ component_product_id: '', quantity: 1, unit: 'EA' }];

  window._mesBomItems = items.map((i) => ({
    component_product_id: i.component_product_id || '',
    quantity: i.quantity || 1,
    unit: i.unit || 'EA'
  }));

  document.getElementById('mes-modals').innerHTML = `
    <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onclick="if(event.target===this)closeMesModal()">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <h3 class="text-lg font-bold mb-4">${bomId ? 'BOM 수정' : 'BOM 등록'}</h3>
        <div class="space-y-3 mb-4">
          <div>
            <label class="text-sm text-slate-600">완제품 *</label>
            <select id="mes-bom-product" class="w-full border rounded-lg px-3 py-2 mt-1" ${bomId ? 'disabled' : ''}>
              <option value="">선택</option>
              ${products.map((p) => `<option value="${p.id}" ${bom && Number(bom.product_id) === Number(p.id) ? 'selected' : ''}>${p.name} (${p.sku})</option>`).join('')}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm text-slate-600">BOM명 *</label>
              <input id="mes-bom-name" class="w-full border rounded-lg px-3 py-2 mt-1" value="${bom?.name || ''}">
            </div>
            <div>
              <label class="text-sm text-slate-600">버전</label>
              <input id="mes-bom-version" class="w-full border rounded-lg px-3 py-2 mt-1" value="${bom?.version || '1.0'}">
            </div>
          </div>
        </div>
        <div class="flex justify-between items-center mb-2">
          <h4 class="font-semibold text-sm">구성 자재 (완제품 1개당 소요)</h4>
          <button onclick="addMesBomItemRow()" class="text-sm text-orange-600 hover:underline">+ 자재 추가</button>
        </div>
        <div id="mes-bom-items" class="space-y-2 mb-4"></div>
        <div class="flex justify-end gap-2">
          <button onclick="closeMesModal()" class="px-4 py-2 rounded-lg border">취소</button>
          <button onclick="submitMesBom(${bomId || 'null'})" class="px-4 py-2 rounded-lg bg-orange-600 text-white">저장</button>
        </div>
      </div>
    </div>
  `;

  window._mesProductsForBom = products;
  renderMesBomItemRows();
};

function renderMesBomItemRows() {
  const wrap = document.getElementById('mes-bom-items');
  if (!wrap) return;
  const products = window._mesProductsForBom || [];
  wrap.innerHTML = window._mesBomItems.map((item, idx) => `
    <div class="grid grid-cols-12 gap-2 items-center">
      <select class="col-span-6 border rounded-lg px-2 py-2 text-sm" onchange="_mesBomItems[${idx}].component_product_id=this.value">
        <option value="">자재 선택</option>
        ${products.map((p) => `<option value="${p.id}" ${Number(item.component_product_id) === Number(p.id) ? 'selected' : ''}>${p.name} (${p.sku})</option>`).join('')}
      </select>
      <input type="number" min="0.0001" step="any" class="col-span-3 border rounded-lg px-2 py-2 text-sm" value="${item.quantity}"
        onchange="_mesBomItems[${idx}].quantity=this.value" placeholder="소요량">
      <input class="col-span-2 border rounded-lg px-2 py-2 text-sm" value="${item.unit || 'EA'}"
        onchange="_mesBomItems[${idx}].unit=this.value" placeholder="단위">
      <button onclick="removeMesBomItemRow(${idx})" class="col-span-1 text-rose-500"><i class="fas fa-times"></i></button>
    </div>
  `).join('');
}

window.addMesBomItemRow = function () {
  window._mesBomItems.push({ component_product_id: '', quantity: 1, unit: 'EA' });
  renderMesBomItemRows();
};

window.removeMesBomItemRow = function (idx) {
  window._mesBomItems.splice(idx, 1);
  if (!window._mesBomItems.length) window._mesBomItems.push({ component_product_id: '', quantity: 1, unit: 'EA' });
  renderMesBomItemRows();
};

window.submitMesBom = async function (bomId) {
  const payload = {
    product_id: Number(document.getElementById('mes-bom-product').value),
    name: document.getElementById('mes-bom-name').value.trim(),
    version: document.getElementById('mes-bom-version').value.trim() || '1.0',
    items: (window._mesBomItems || []).map((i) => ({
      component_product_id: Number(i.component_product_id),
      quantity: Number(i.quantity),
      unit: i.unit || 'EA'
    }))
  };
  if (!payload.name || (!bomId && !payload.product_id)) {
    alert('필수 항목을 확인해주세요.');
    return;
  }
  try {
    if (bomId) await axios.put(`${API_BASE}/production/boms/${bomId}`, payload);
    else await axios.post(`${API_BASE}/production/boms`, payload);
    closeMesModal();
    await refreshMesStats();
    loadMesBoms();
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

window.deactivateMesBom = async function (id) {
  if (!confirm('이 BOM을 비활성화할까요?')) return;
  try {
    await axios.delete(`${API_BASE}/production/boms/${id}`);
    loadMesBoms();
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

// ---------- 공정 ----------
async function loadMesProcesses() {
  const container = document.getElementById('mes-tab-content');
  container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-orange-500"></i></div>';
  try {
    const res = await axios.get(`${API_BASE}/production/processes`);
    const rows = res.data.data || [];
    container.innerHTML = `
      <div class="flex justify-end mb-4">
        <button onclick="showMesProcessModal()" class="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700">
          <i class="fas fa-plus mr-2"></i>공정 등록
        </button>
      </div>
      <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
        <table class="w-full text-sm">
          <thead class="text-xs uppercase bg-slate-50 border-b">
            <tr>
              <th class="px-4 py-3 text-left">코드</th>
              <th class="px-4 py-3 text-left">공정명</th>
              <th class="px-4 py-3 text-right">표준분</th>
              <th class="px-4 py-3 text-right">정렬</th>
              <th class="px-4 py-3 text-left">상태</th>
              <th class="px-4 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            ${rows.length ? rows.map((p) => `
              <tr>
                <td class="px-4 py-3">${p.code || '-'}</td>
                <td class="px-4 py-3 font-medium">${p.name}</td>
                <td class="px-4 py-3 text-right">${p.standard_minutes || 0}</td>
                <td class="px-4 py-3 text-right">${p.sort_order || 0}</td>
                <td class="px-4 py-3">${p.is_active ? '<span class="text-emerald-600">사용</span>' : '<span class="text-slate-400">비활성</span>'}</td>
                <td class="px-4 py-3 text-right space-x-2">
                  <button onclick="showMesProcessModalById(${p.id})" class="text-orange-600 hover:underline text-xs">수정</button>
                  ${p.is_active ? `<button onclick="deactivateMesProcess(${p.id})" class="text-rose-500 hover:underline text-xs">비활성</button>` : ''}
                </td>
              </tr>`).join('') : '<tr><td colspan="6" class="px-4 py-10 text-center text-slate-400">등록된 공정이 없습니다.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div class="text-center py-10 text-rose-600">${e.response?.data?.error || e.message}</div>`;
  }
}

window.showMesProcessModalById = async function (id) {
  try {
    const res = await axios.get(`${API_BASE}/production/processes`);
    const p = (res.data.data || []).find((x) => Number(x.id) === Number(id));
    if (!p) {
      alert('공정을 찾을 수 없습니다.');
      return;
    }
    showMesProcessModal(p);
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

window.showMesProcessModal = function (process = null) {
  const p = process;
  document.getElementById('mes-modals').innerHTML = `
    <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onclick="if(event.target===this)closeMesModal()">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-lg font-bold mb-4">${p ? '공정 수정' : '공정 등록'}</h3>
        <div class="space-y-3">
          <div><label class="text-sm">공정명 *</label><input id="mes-proc-name" class="w-full border rounded-lg px-3 py-2 mt-1" value="${p?.name || ''}"></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="text-sm">코드</label><input id="mes-proc-code" class="w-full border rounded-lg px-3 py-2 mt-1" value="${p?.code || ''}"></div>
            <div><label class="text-sm">표준 분</label><input id="mes-proc-minutes" type="number" class="w-full border rounded-lg px-3 py-2 mt-1" value="${p?.standard_minutes || 0}"></div>
          </div>
          <div><label class="text-sm">정렬순서</label><input id="mes-proc-sort" type="number" class="w-full border rounded-lg px-3 py-2 mt-1" value="${p?.sort_order || 0}"></div>
          ${p ? `<label class="flex items-center gap-2 text-sm"><input id="mes-proc-active" type="checkbox" ${p.is_active ? 'checked' : ''}> 사용</label>` : ''}
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <button onclick="closeMesModal()" class="px-4 py-2 rounded-lg border">취소</button>
          <button onclick="submitMesProcess(${p ? p.id : 'null'})" class="px-4 py-2 rounded-lg bg-orange-600 text-white">저장</button>
        </div>
      </div>
    </div>
  `;
};

window.submitMesProcess = async function (id) {
  const payload = {
    name: document.getElementById('mes-proc-name').value.trim(),
    code: document.getElementById('mes-proc-code').value.trim() || null,
    standard_minutes: Number(document.getElementById('mes-proc-minutes').value) || 0,
    sort_order: Number(document.getElementById('mes-proc-sort').value) || 0,
    is_active: document.getElementById('mes-proc-active') ? (document.getElementById('mes-proc-active').checked ? 1 : 0) : 1
  };
  if (!payload.name) {
    alert('공정명을 입력해주세요.');
    return;
  }
  try {
    if (id) await axios.put(`${API_BASE}/production/processes/${id}`, payload);
    else await axios.post(`${API_BASE}/production/processes`, payload);
    closeMesModal();
    loadMesProcesses();
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

window.deactivateMesProcess = async function (id) {
  if (!confirm('이 공정을 비활성화할까요?')) return;
  try {
    await axios.delete(`${API_BASE}/production/processes/${id}`);
    loadMesProcesses();
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

window.closeMesModal = function () {
  const el = document.getElementById('mes-modals');
  if (el) el.innerHTML = '';
};

// ---------- 생산 추적 (Phase 2) ----------
const MES_EVENT_LABEL = {
  qr_issue: 'QR 발행',
  material_issue: '자재 투입',
  process_complete: '공정 완료',
  fg_pack: '완제품 포장',
  lookup: '조회'
};

async function loadMesTrace() {
  const container = document.getElementById('mes-tab-content');
  container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-orange-500"></i></div>';

  try {
    const [woRes, lotsRes] = await Promise.all([
      axios.get(`${API_BASE}/production/work-orders`),
      axios.get(`${API_BASE}/production/trace/lots`)
    ]);
    const workOrders = (woRes.data.data || []).filter((w) => !['cancelled'].includes(w.status));
    const lots = lotsRes.data.data || [];

    container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="bg-white border border-slate-200 rounded-xl p-5">
          <h3 class="font-bold text-slate-800 mb-3"><i class="fas fa-search mr-2 text-orange-600"></i>역추적 조회</h3>
          <p class="text-xs text-slate-500 mb-3">완제품/자재 QR을 입력하면 작업지시·투입 자재·이력을 조회합니다.</p>
          <div class="flex gap-2">
            <input id="mes-trace-lookup" class="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="QR 코드 입력 (예: QR-...)">
            <button onclick="lookupMesTrace()" class="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700">조회</button>
          </div>
          <div id="mes-trace-lookup-result" class="mt-4"></div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-5">
          <h3 class="font-bold text-slate-800 mb-3"><i class="fas fa-qrcode mr-2 text-orange-600"></i>현장 스캔 작업</h3>
          <div class="space-y-3 text-sm">
            <div>
              <label class="text-slate-600">작업지시</label>
              <select id="mes-trace-wo" class="w-full border rounded-lg px-3 py-2 mt-1">
                <option value="">선택</option>
                ${workOrders.map((w) => `<option value="${w.id}">${w.wo_number} — ${w.product_name} (${MES_STATUS_LABEL[w.status] || w.status})</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="text-slate-600">QR 코드</label>
              <input id="mes-trace-qr" class="w-full border rounded-lg px-3 py-2 mt-1" placeholder="스캔/입력">
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-slate-600">수량</label>
                <input id="mes-trace-qty" type="number" min="0.01" step="any" value="1" class="w-full border rounded-lg px-3 py-2 mt-1">
              </div>
              <div>
                <label class="text-slate-600">발행 수량</label>
                <input id="mes-trace-gen-qty" type="number" min="1" max="100" value="1" class="w-full border rounded-lg px-3 py-2 mt-1">
              </div>
            </div>
            <div class="flex flex-wrap gap-2 pt-1">
              <button onclick="mesTraceGenerate('fg')" class="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700">완제품 QR 발행</button>
              <button onclick="mesTraceGenerate('material')" class="px-3 py-2 rounded-lg bg-slate-700 text-white text-xs hover:bg-slate-800">자재 QR 발행</button>
              <button onclick="mesTraceMaterialIssue()" class="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700">자재 투입</button>
              <button onclick="mesTraceProcessComplete()" class="px-3 py-2 rounded-lg bg-amber-600 text-white text-xs hover:bg-amber-700">공정 완료</button>
              <button onclick="mesTraceFgPack()" class="px-3 py-2 rounded-lg bg-orange-600 text-white text-xs hover:bg-orange-700">완제품 포장</button>
              <button onclick="mesTraceShowTimeline()" class="px-3 py-2 rounded-lg border text-xs hover:bg-slate-50">타임라인</button>
            </div>
            <div id="mes-trace-action-result" class="text-sm text-slate-600"></div>
          </div>
        </div>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div class="px-4 py-3 border-b bg-slate-50 flex justify-between items-center">
          <h3 class="font-bold text-slate-800 text-sm">Lot 목록</h3>
          <input id="mes-lot-search" onkeydown="if(event.key==='Enter')refreshMesLots()" placeholder="Lot/상품/WO 검색" class="border rounded-lg px-3 py-1.5 text-sm w-52">
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-xs uppercase bg-white border-b">
              <tr>
                <th class="px-4 py-3 text-left">Lot</th>
                <th class="px-4 py-3 text-left">상품</th>
                <th class="px-4 py-3 text-left">WO</th>
                <th class="px-4 py-3 text-right">수량</th>
                <th class="px-4 py-3 text-left">상태</th>
              </tr>
            </thead>
            <tbody id="mes-lots-tbody">${renderMesLotRows(lots)}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div class="text-center py-10 text-rose-600">${e.response?.data?.error || e.message}</div>`;
  }
}

function renderMesLotRows(lots) {
  if (!lots.length) return '<tr><td colspan="5" class="px-4 py-8 text-center text-slate-400">등록된 Lot이 없습니다.</td></tr>';
  return lots.map((l) => `
    <tr class="border-t hover:bg-slate-50">
      <td class="px-4 py-3 font-medium">${l.lot_number}</td>
      <td class="px-4 py-3">${l.product_name}<div class="text-xs text-slate-400">${l.product_sku || ''}</div></td>
      <td class="px-4 py-3">${l.wo_number || '-'}</td>
      <td class="px-4 py-3 text-right">${l.remaining_quantity} / ${l.quantity}</td>
      <td class="px-4 py-3">${l.status}</td>
    </tr>
  `).join('');
}

window.refreshMesLots = async function () {
  const search = document.getElementById('mes-lot-search')?.value || '';
  const tbody = document.getElementById('mes-lots-tbody');
  if (!tbody) return;
  try {
    const res = await axios.get(`${API_BASE}/production/trace/lots`, { params: { search } });
    tbody.innerHTML = renderMesLotRows(res.data.data || []);
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

function mesTraceSelectedWo() {
  return Number(document.getElementById('mes-trace-wo')?.value || 0);
}

function setMesTraceActionResult(html, isError = false) {
  const el = document.getElementById('mes-trace-action-result');
  if (!el) return;
  el.className = `text-sm ${isError ? 'text-rose-600' : 'text-emerald-700'}`;
  el.innerHTML = html;
}

window.lookupMesTrace = async function () {
  const code = document.getElementById('mes-trace-lookup')?.value?.trim();
  const box = document.getElementById('mes-trace-lookup-result');
  if (!code) {
    alert('QR 코드를 입력해주세요.');
    return;
  }
  box.innerHTML = '<div class="text-slate-400 text-sm">조회 중...</div>';
  try {
    const res = await axios.get(`${API_BASE}/production/trace/lookup/${encodeURIComponent(code)}`);
    const d = res.data.data;
    const mats = d.materials || [];
    const used = d.used_in || [];
    const events = d.events || [];
    box.innerHTML = `
      <div class="border rounded-lg p-3 bg-slate-50 text-sm space-y-2">
        <div><span class="text-slate-500">QR</span> <span class="font-mono font-medium">${d.qr.code}</span></div>
        <div><span class="text-slate-500">상품</span> ${d.qr.product_name || '-'} (${d.qr.product_sku || ''})</div>
        <div><span class="text-slate-500">Lot</span> ${d.qr.lot_number || '-'} · <span class="text-slate-500">S/N</span> ${d.qr.serial_number || '-'}</div>
        <div><span class="text-slate-500">작업지시</span> ${d.work_order ? `${d.work_order.wo_number} (${MES_STATUS_LABEL[d.work_order.status] || d.work_order.status})` : '-'}</div>
        ${mats.length ? `<div class="pt-2"><div class="font-semibold mb-1">투입 자재</div>${mats.map((m) => `<div class="text-xs">• ${m.material_name} ${m.quantity}${m.material_qr_code ? ` <span class="text-slate-400">[${m.material_qr_code}]</span>` : ''} Lot:${m.lot_number || '-'}</div>`).join('')}</div>` : ''}
        ${used.length ? `<div class="pt-2"><div class="font-semibold mb-1">사용된 완제품</div>${used.map((u) => `<div class="text-xs">• ${u.finished_name || '-'} <span class="font-mono">${u.finished_qr_code || '(미연결)'}</span></div>`).join('')}</div>` : ''}
        <div class="pt-2"><div class="font-semibold mb-1">최근 이벤트</div>
          ${events.length ? events.slice(0, 8).map((e) => `<div class="text-xs text-slate-600">${(e.created_at || '').replace('T', ' ').slice(0, 19)} · ${MES_EVENT_LABEL[e.event_type] || e.event_type}${e.process_name ? ` (${e.process_name})` : ''}</div>`).join('') : '<div class="text-xs text-slate-400">없음</div>'}
        </div>
      </div>
    `;
  } catch (e) {
    box.innerHTML = `<div class="text-rose-600 text-sm">${e.response?.data?.error || e.message}</div>`;
  }
};

window.mesTraceGenerate = async function (kind) {
  const work_order_id = mesTraceSelectedWo();
  if (!work_order_id) {
    alert('작업지시를 선택해주세요.');
    return;
  }
  const quantity = Number(document.getElementById('mes-trace-gen-qty').value) || 1;
  const payload = { work_order_id, quantity, type: kind === 'material' ? 'material' : 'fg' };

  if (kind === 'material') {
    try {
      const woRes = await axios.get(`${API_BASE}/production/work-orders/${work_order_id}`);
      const items = woRes.data.data?.bom_items || [];
      if (!items.length) {
        alert('이 작업지시에 BOM 자재가 없습니다. 먼저 BOM을 연결해주세요.');
        return;
      }
      const options = items.map((i, idx) => `${idx + 1}. ${i.component_name} (ID:${i.component_product_id})`).join('\n');
      const pick = prompt(`자재 번호를 선택하세요:\n${options}`, '1');
      if (!pick) return;
      const item = items[Number(pick) - 1];
      if (!item) {
        alert('잘못된 선택입니다.');
        return;
      }
      payload.product_id = Number(item.component_product_id);
    } catch (e) {
      setMesTraceActionResult(e.response?.data?.error || e.message, true);
      return;
    }
  }

  try {
    const res = await axios.post(`${API_BASE}/production/trace/generate`, payload);
    const codes = res.data.data?.codes || [];
    setMesTraceActionResult(`발행 완료: ${codes.map((c) => c.code).join(', ')}<br>Lot: ${res.data.data?.lot_number || ''}`);
    if (codes[0]) document.getElementById('mes-trace-qr').value = codes[0].code;
    refreshMesLots();
  } catch (e) {
    setMesTraceActionResult(e.response?.data?.error || e.message, true);
  }
};

window.mesTraceMaterialIssue = async function () {
  const work_order_id = mesTraceSelectedWo();
  const qr_code = document.getElementById('mes-trace-qr')?.value?.trim();
  const quantity = Number(document.getElementById('mes-trace-qty').value) || 1;
  if (!work_order_id || !qr_code) {
    alert('작업지시와 QR을 입력해주세요.');
    return;
  }
  try {
    const res = await axios.post(`${API_BASE}/production/trace/material-issue`, { work_order_id, qr_code, quantity });
    setMesTraceActionResult(res.data.message + ` — ${res.data.data?.product_name || ''}`);
  } catch (e) {
    setMesTraceActionResult(e.response?.data?.error || e.message, true);
  }
};

window.mesTraceProcessComplete = async function () {
  const work_order_id = mesTraceSelectedWo();
  if (!work_order_id) {
    alert('작업지시를 선택해주세요.');
    return;
  }
  const qr_code = document.getElementById('mes-trace-qr')?.value?.trim() || null;
  const quantity = Number(document.getElementById('mes-trace-qty').value) || 1;
  try {
    const res = await axios.post(`${API_BASE}/production/trace/process-complete`, { work_order_id, qr_code, quantity });
    setMesTraceActionResult(res.data.message);
  } catch (e) {
    setMesTraceActionResult(e.response?.data?.error || e.message, true);
  }
};

window.mesTraceFgPack = async function () {
  const work_order_id = mesTraceSelectedWo();
  if (!work_order_id) {
    alert('작업지시를 선택해주세요.');
    return;
  }
  const qr_code = document.getElementById('mes-trace-qr')?.value?.trim() || null;
  const quantity = Number(document.getElementById('mes-trace-qty').value) || 1;
  try {
    const res = await axios.post(`${API_BASE}/production/trace/fg-pack`, {
      work_order_id,
      qr_code,
      quantity,
      create_qr: !qr_code
    });
    setMesTraceActionResult(`${res.data.message}<br>QR: ${res.data.data?.qr_code || ''} · Lot: ${res.data.data?.lot_number || ''}`);
    if (res.data.data?.qr_code) document.getElementById('mes-trace-qr').value = res.data.data.qr_code;
    refreshMesLots();
  } catch (e) {
    setMesTraceActionResult(e.response?.data?.error || e.message, true);
  }
};

window.mesTraceShowTimeline = async function () {
  const work_order_id = mesTraceSelectedWo();
  if (!work_order_id) {
    alert('작업지시를 선택해주세요.');
    return;
  }
  try {
    const res = await axios.get(`${API_BASE}/production/trace/work-orders/${work_order_id}/timeline`);
    const d = res.data.data;
    const events = d.events || [];
    const codes = d.qr_codes || [];
    const pending = d.pending_materials || [];

    document.getElementById('mes-modals').innerHTML = `
      <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onclick="if(event.target===this)closeMesModal()">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
          <h3 class="text-lg font-bold mb-1">${d.work_order.wo_number} 추적 타임라인</h3>
          <p class="text-sm text-slate-500 mb-4">${d.work_order.product_name}</p>

          <h4 class="font-semibold text-sm mb-2">이벤트</h4>
          <div class="border rounded-lg divide-y mb-4 max-h-64 overflow-y-auto">
            ${events.length ? events.map((e) => `
              <div class="px-3 py-2 text-sm">
                <div class="flex justify-between gap-2">
                  <span class="font-medium">${MES_EVENT_LABEL[e.event_type] || e.event_type}</span>
                  <span class="text-xs text-slate-400">${(e.created_at || '').replace('T', ' ').slice(0, 19)}</span>
                </div>
                <div class="text-xs text-slate-600">${e.product_name || ''} ${e.qr_code ? `· ${e.qr_code}` : ''} ${e.lot_number ? `· Lot ${e.lot_number}` : ''} ${e.process_name ? `· ${e.process_name}` : ''}</div>
                ${e.notes ? `<div class="text-xs text-slate-400">${e.notes}</div>` : ''}
              </div>`).join('') : '<div class="px-3 py-6 text-center text-slate-400 text-sm">이벤트 없음</div>'}
          </div>

          <h4 class="font-semibold text-sm mb-2">연결 QR (${codes.length})</h4>
          <div class="text-xs font-mono text-slate-600 mb-4 space-y-1">
            ${codes.length ? codes.map((c) => `<div>${c.code} · ${c.type} · ${c.lot_number || '-'}</div>`).join('') : '<div class="text-slate-400">없음</div>'}
          </div>

          <h4 class="font-semibold text-sm mb-2">미연결 자재 투입</h4>
          <div class="text-xs text-slate-600 mb-4">
            ${pending.length ? pending.map((p) => `<div>• ${p.material_name} ${p.quantity} ${p.material_qr_code || ''}</div>`).join('') : '<div class="text-slate-400">없음</div>'}
          </div>

          <div class="flex justify-end"><button onclick="closeMesModal()" class="px-4 py-2 rounded-lg border">닫기</button></div>
        </div>
      </div>
    `;
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

// ---------- KPI / 리포트 (Phase 3) ----------
function mesKpiDefaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

async function loadMesKpi() {
  const container = document.getElementById('mes-tab-content');
  const range = window._mesKpiRange || mesKpiDefaultRange();
  window._mesKpiRange = range;

  container.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label class="text-xs text-slate-500">시작일</label>
          <input id="mes-kpi-from" type="date" value="${range.from}" class="block border rounded-lg px-3 py-2 text-sm mt-1">
        </div>
        <div>
          <label class="text-xs text-slate-500">종료일</label>
          <input id="mes-kpi-to" type="date" value="${range.to}" class="block border rounded-lg px-3 py-2 text-sm mt-1">
        </div>
        <button onclick="refreshMesKpi()" class="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700">
          <i class="fas fa-sync-alt mr-1"></i>조회
        </button>
      </div>
      <div class="flex gap-2">
        <button onclick="printMesKpiReport()" class="px-4 py-2 rounded-lg border text-sm hover:bg-slate-50"><i class="fas fa-print mr-1"></i>인쇄</button>
        <button onclick="exportMesKpiExcel()" class="px-4 py-2 rounded-lg border text-sm hover:bg-slate-50"><i class="fas fa-file-excel mr-1"></i>엑셀</button>
      </div>
    </div>
    <div id="mes-kpi-body" class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-orange-500"></i></div>
  `;

  await refreshMesKpi();
}

window.refreshMesKpi = async function () {
  const from = document.getElementById('mes-kpi-from')?.value || mesKpiDefaultRange().from;
  const to = document.getElementById('mes-kpi-to')?.value || mesKpiDefaultRange().to;
  window._mesKpiRange = { from, to };
  const body = document.getElementById('mes-kpi-body');
  if (!body) return;
  body.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-orange-500"></i></div>';

  try {
    const params = { from, to };
    const [summaryRes, trendRes, productRes, processRes, varianceRes] = await Promise.all([
      axios.get(`${API_BASE}/production/kpi/summary`, { params }),
      axios.get(`${API_BASE}/production/kpi/trend`, { params }),
      axios.get(`${API_BASE}/production/kpi/by-product`, { params }),
      axios.get(`${API_BASE}/production/kpi/by-process`, { params }),
      axios.get(`${API_BASE}/production/kpi/material-variance`, { params })
    ]);

    const s = summaryRes.data.data || {};
    const trend = trendRes.data.data?.production || [];
    const products = productRes.data.data?.items || [];
    const processes = processRes.data.data?.items || [];
    const variance = varianceRes.data.data?.items || [];
    window._mesKpiCache = { s, trend, products, processes, variance, from, to };

    body.innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        ${mesKpiCard('계획 달성률', s.plan_achievement_rate + '%', `${s.completed_qty}/${s.planned_qty}`, 'text-orange-700')}
        ${mesKpiCard('수율', s.yield_rate + '%', `양품 ${s.record_good_qty}`, 'text-emerald-700')}
        ${mesKpiCard('불량률', s.scrap_rate + '%', `불량 ${s.record_scrap_qty}`, 'text-rose-600')}
        ${mesKpiCard('납기 준수율', s.on_time_rate + '%', `완료 WO ${s.completed_wo}`, 'text-blue-700')}
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        ${mesKpiCard('미완료 WO', s.open_wo, `진행중 ${s.in_progress_wo}`, 'text-slate-800')}
        ${mesKpiCard('오늘 양품', s.today_good_qty, `불량 ${s.today_scrap_qty}`, 'text-emerald-700')}
        ${mesKpiCard('자재 스캔', s.material_scans, `공정완료 ${s.process_completes}`, 'text-slate-800')}
        ${mesKpiCard('완제품 포장', s.fg_packs, `실적건수 ${s.record_count}`, 'text-slate-800')}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="bg-white border rounded-xl p-4">
          <h3 class="font-bold text-sm mb-3">일별 생산 추이</h3>
          <canvas id="mesKpiTrendChart" height="220"></canvas>
        </div>
        <div class="bg-white border rounded-xl p-4">
          <h3 class="font-bold text-sm mb-3">제품별 실적 Top</h3>
          <canvas id="mesKpiProductChart" height="220"></canvas>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="bg-white border rounded-xl overflow-hidden">
          <div class="px-4 py-3 border-b bg-slate-50 font-bold text-sm">제품별 상세</div>
          <div class="overflow-x-auto max-h-80">
            <table class="w-full text-sm">
              <thead class="text-xs bg-white sticky top-0 border-b"><tr>
                <th class="px-3 py-2 text-left">제품</th><th class="px-3 py-2 text-right">계획</th>
                <th class="px-3 py-2 text-right">양품</th><th class="px-3 py-2 text-right">달성%</th><th class="px-3 py-2 text-right">수율%</th>
              </tr></thead>
              <tbody>${products.length ? products.map((p) => `
                <tr class="border-t"><td class="px-3 py-2">${p.product_name}<div class="text-xs text-slate-400">${p.product_sku || ''}</div></td>
                <td class="px-3 py-2 text-right">${p.planned_qty}</td><td class="px-3 py-2 text-right">${p.completed_qty}</td>
                <td class="px-3 py-2 text-right">${p.plan_achievement_rate}</td><td class="px-3 py-2 text-right">${p.yield_rate}</td></tr>`).join('')
                : '<tr><td colspan="5" class="px-3 py-8 text-center text-slate-400">데이터 없음</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
        <div class="bg-white border rounded-xl overflow-hidden">
          <div class="px-4 py-3 border-b bg-slate-50 font-bold text-sm">자재 소요 차이 (이론 vs 투입스캔)</div>
          <div class="overflow-x-auto max-h-80">
            <table class="w-full text-sm">
              <thead class="text-xs bg-white sticky top-0 border-b"><tr>
                <th class="px-3 py-2 text-left">자재</th><th class="px-3 py-2 text-right">이론</th>
                <th class="px-3 py-2 text-right">실투입</th><th class="px-3 py-2 text-right">차이</th>
              </tr></thead>
              <tbody>${variance.length ? variance.map((v) => `
                <tr class="border-t"><td class="px-3 py-2">${v.product_name}<div class="text-xs text-slate-400">${v.product_sku || ''}</div></td>
                <td class="px-3 py-2 text-right">${v.theoretical_qty}</td><td class="px-3 py-2 text-right">${v.actual_qty}</td>
                <td class="px-3 py-2 text-right ${v.variance_qty > 0 ? 'text-rose-600' : v.variance_qty < 0 ? 'text-blue-600' : ''}">${v.variance_qty}</td></tr>`).join('')
                : '<tr><td colspan="4" class="px-3 py-8 text-center text-slate-400">데이터 없음 (실적·투입 후 표시)</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="bg-white border rounded-xl overflow-hidden">
        <div class="px-4 py-3 border-b bg-slate-50 font-bold text-sm">공정별 완료 이벤트</div>
        <div class="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          ${processes.length ? processes.map((p) => `
            <div class="border rounded-lg p-3"><div class="text-xs text-slate-500">${p.process_name}</div>
            <div class="font-bold text-lg">${p.event_count}</div>
            <div class="text-xs text-slate-400">수량합 ${p.quantity}</div></div>`).join('')
            : '<div class="text-slate-400 text-sm col-span-full">공정 완료 이벤트 없음</div>'}
        </div>
      </div>
    `;

    renderMesKpiCharts(trend, products);
  } catch (e) {
    body.innerHTML = `<div class="text-center py-10 text-rose-600">${e.response?.data?.error || e.message}</div>`;
  }
};

function mesKpiCard(title, value, sub, valueClass = 'text-slate-800') {
  return `<div class="bg-white border border-slate-200 rounded-xl p-4">
    <div class="text-xs text-slate-500 mb-1">${title}</div>
    <div class="text-2xl font-bold ${valueClass}">${value}</div>
    <div class="text-xs text-slate-400 mt-1">${sub}</div>
  </div>`;
}

function renderMesKpiCharts(trend, products) {
  if (typeof Chart === 'undefined') return;

  const trendCtx = document.getElementById('mesKpiTrendChart');
  if (trendCtx) {
    if (window._mesKpiTrendChart) window._mesKpiTrendChart.destroy();
    window._mesKpiTrendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: trend.map((t) => t.date),
        datasets: [
          { label: '양품', data: trend.map((t) => t.good_qty), borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.1)', tension: 0.3, fill: true },
          { label: '불량', data: trend.map((t) => t.scrap_qty), borderColor: '#e11d48', backgroundColor: 'rgba(225,29,72,0.08)', tension: 0.3, fill: true }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
    });
  }

  const prodCtx = document.getElementById('mesKpiProductChart');
  if (prodCtx) {
    if (window._mesKpiProductChart) window._mesKpiProductChart.destroy();
    const top = products.slice(0, 8);
    window._mesKpiProductChart = new Chart(prodCtx, {
      type: 'bar',
      data: {
        labels: top.map((p) => p.product_name),
        datasets: [
          { label: '계획', data: top.map((p) => p.planned_qty), backgroundColor: '#cbd5e1' },
          { label: '양품', data: top.map((p) => p.completed_qty), backgroundColor: '#f97316' }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
    });
  }
}

window.printMesKpiReport = async function () {
  const from = window._mesKpiRange?.from;
  const to = window._mesKpiRange?.to;
  try {
    const res = await axios.get(`${API_BASE}/production/kpi/report`, { params: { from, to } });
    const d = res.data.data;
    const s = d.summary || {};
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>제조 KPI 리포트</title>
      <style>body{font-family:sans-serif;padding:24px;color:#0f172a} h1{font-size:20px} table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}
      th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left} th{background:#f8fafc} .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0}
      .card{border:1px solid #e2e8f0;padding:10px;border-radius:8px} .v{font-size:18px;font-weight:700}</style></head><body>
      <h1>제조 KPI 성과 리포트</h1>
      <div>기간: ${d.from} ~ ${d.to} · 생성: ${(d.generated_at || '').replace('T',' ').slice(0,19)}</div>
      <div class="grid">
        <div class="card">계획달성<div class="v">${s.plan_achievement_rate || 0}%</div></div>
        <div class="card">수율<div class="v">${s.yield_rate || 0}%</div></div>
        <div class="card">불량률<div class="v">${s.scrap_rate || 0}%</div></div>
        <div class="card">완료 WO<div class="v">${s.completed_wo || 0}</div></div>
      </div>
      <h2>제품별</h2>
      <table><thead><tr><th>제품</th><th>SKU</th><th>계획</th><th>양품</th><th>불량</th><th>WO수</th></tr></thead>
      <tbody>${(d.by_product || []).map((p) => `<tr><td>${p.product_name}</td><td>${p.product_sku || ''}</td><td>${p.planned_qty}</td><td>${p.completed_qty}</td><td>${p.scrap_qty}</td><td>${p.wo_count}</td></tr>`).join('') || '<tr><td colspan="6">없음</td></tr>'}
      </tbody></table>
      <h2>최근 실적</h2>
      <table><thead><tr><th>일시</th><th>WO</th><th>제품</th><th>양품</th><th>불량</th><th>작업자</th></tr></thead>
      <tbody>${(d.recent_records || []).map((r) => `<tr><td>${(r.recorded_at || '').replace('T',' ').slice(0,19)}</td><td>${r.wo_number}</td><td>${r.product_name}</td><td>${r.good_qty}</td><td>${r.scrap_qty}</td><td>${r.worker_name || ''}</td></tr>`).join('') || '<tr><td colspan="6">없음</td></tr>'}
      </tbody></table>
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

window.exportMesKpiExcel = async function () {
  if (typeof XLSX === 'undefined') {
    alert('엑셀 라이브러리를 불러올 수 없습니다.');
    return;
  }
  const from = window._mesKpiRange?.from;
  const to = window._mesKpiRange?.to;
  try {
    const res = await axios.get(`${API_BASE}/production/kpi/report`, { params: { from, to } });
    const d = res.data.data;
    const s = d.summary || {};
    const wb = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['제조 KPI 리포트'],
      ['기간', `${d.from} ~ ${d.to}`],
      [],
      ['지표', '값'],
      ['총 WO', s.total_wo],
      ['완료 WO', s.completed_wo],
      ['미완료 WO', s.open_wo],
      ['계획수량', s.planned_qty],
      ['양품수량', s.completed_qty],
      ['불량수량', s.scrap_qty],
      ['계획달성률(%)', s.plan_achievement_rate],
      ['수율(%)', s.yield_rate],
      ['불량률(%)', s.scrap_rate]
    ]);
    XLSX.utils.book_append_sheet(wb, summarySheet, '요약');

    const prodRows = [['제품', 'SKU', '계획', '양품', '불량', 'WO수']].concat(
      (d.by_product || []).map((p) => [p.product_name, p.product_sku, p.planned_qty, p.completed_qty, p.scrap_qty, p.wo_count])
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prodRows), '제품별');

    const recRows = [['일시', 'WO', '제품', '양품', '불량', '작업자']].concat(
      (d.recent_records || []).map((r) => [r.recorded_at, r.wo_number, r.product_name, r.good_qty, r.scrap_qty, r.worker_name])
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(recRows), '실적이력');

    XLSX.writeFile(wb, `mes-kpi-${d.from}_${d.to}.xlsx`);
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};
