// 바코드 관리 — 현황 / 등록·수정 / 라벨 출력

window._bcState = {
  tab: 'dashboard',
  filter: 'all',
  search: '',
  products: [],
  selectedIds: new Set()
};

function bcEsc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.loadBarcodePage = async function (initialTab = 'dashboard') {
  const alias = {
    dashboard: 'dashboard',
    register: 'register',
    labels: 'labels',
    'barcode-dashboard': 'dashboard',
    'barcode-register': 'register',
    'barcode-labels': 'labels'
  };
  const tab = alias[initialTab] || 'dashboard';
  window._bcState.tab = tab;
  window._bcState.selectedIds = new Set();

  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">
          <i class="fas fa-barcode mr-2 text-indigo-600"></i>바코드 관리
        </h1>
        <p class="text-sm text-slate-500 mt-1">현황 → 등록·수정 → 라벨 출력 (현장 스캔은 QR 입고/출고/판매에서 사용)</p>
      </div>
      <div id="bc-stats-mini" class="grid grid-cols-3 gap-2 text-sm"></div>
    </div>

    <div class="flex mb-6 border-b border-slate-200 overflow-x-auto">
      <button onclick="switchBarcodeTab('dashboard')" id="bc-tab-dashboard" class="px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap">1.현황</button>
      <button onclick="switchBarcodeTab('register')" id="bc-tab-register" class="px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap">2.등록·수정</button>
      <button onclick="switchBarcodeTab('labels')" id="bc-tab-labels" class="px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap">3.라벨 출력</button>
    </div>

    <div id="bc-tab-content"></div>
  `;

  await bcRefreshMiniStats();
  switchBarcodeTab(tab);
};

window.switchBarcodeTab = function (tabName) {
  window._bcState.tab = tabName;
  ['dashboard', 'register', 'labels'].forEach((t) => {
    const btn = document.getElementById(`bc-tab-${t}`);
    if (!btn) return;
    if (t === tabName) {
      btn.classList.add('border-indigo-600', 'text-indigo-600');
      btn.classList.remove('border-transparent', 'text-slate-500');
    } else {
      btn.classList.remove('border-indigo-600', 'text-indigo-600');
      btn.classList.add('border-transparent', 'text-slate-500');
    }
  });

  const titles = {
    dashboard: ['바코드 현황', '등록·미등록 제품 현황'],
    register: ['바코드 등록·수정', '제품별 바코드 매핑'],
    labels: ['바코드 라벨', 'Code128 / EAN 라벨 미리보기·출력']
  };
  const [title, desc] = titles[tabName] || titles.dashboard;
  if (typeof updatePageTitle === 'function') updatePageTitle(title, desc);
  if (typeof window.syncSidebarNav === 'function') {
    window.syncSidebarNav('barcode', tabName);
  }

  if (tabName === 'dashboard') renderBarcodeDashboard();
  else if (tabName === 'register') renderBarcodeRegister();
  else renderBarcodeLabels();
};

async function bcRefreshMiniStats() {
  const el = document.getElementById('bc-stats-mini');
  if (!el) return;
  try {
    const res = await axios.get(`${API_BASE}/barcode/stats`);
    const s = res.data.data || {};
    el.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-lg px-3 py-2"><div class="text-xs text-slate-500">대상 제품</div><div class="font-bold text-slate-800">${s.total_products || 0}</div></div>
      <div class="bg-white border border-slate-200 rounded-lg px-3 py-2"><div class="text-xs text-slate-500">등록</div><div class="font-bold text-indigo-700">${s.registered || 0}</div></div>
      <div class="bg-white border border-slate-200 rounded-lg px-3 py-2"><div class="text-xs text-slate-500">미등록</div><div class="font-bold text-amber-700">${s.unregistered || 0}</div></div>
    `;
  } catch (_) {
    el.innerHTML = '';
  }
}

async function renderBarcodeDashboard() {
  const container = document.getElementById('bc-tab-content');
  container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-indigo-500"></i></div>';

  try {
    const [statsRes, listRes] = await Promise.all([
      axios.get(`${API_BASE}/barcode/stats`),
      axios.get(`${API_BASE}/barcode/products`, { params: { filter: 'unregistered', limit: 20 } })
    ]);
    const s = statsRes.data.data || {};
    const unreg = listRes.data.data || [];
    const rate = s.total_products
      ? Math.round((Number(s.registered || 0) / Number(s.total_products)) * 100)
      : 0;

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white border border-slate-200 rounded-xl p-5">
          <div class="text-xs text-slate-500 mb-1">대상 제품</div>
          <div class="text-2xl font-bold text-slate-800">${s.total_products || 0}</div>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-5">
          <div class="text-xs text-slate-500 mb-1">바코드 등록</div>
          <div class="text-2xl font-bold text-indigo-700">${s.registered || 0}</div>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-5">
          <div class="text-xs text-slate-500 mb-1">미등록</div>
          <div class="text-2xl font-bold text-amber-700">${s.unregistered || 0}</div>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-5">
          <div class="text-xs text-slate-500 mb-1">등록률</div>
          <div class="text-2xl font-bold text-emerald-700">${rate}%</div>
          <div class="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full bg-indigo-500 rounded-full" style="width:${rate}%"></div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white border border-slate-200 rounded-xl p-5">
          <h3 class="font-bold text-slate-800 mb-3"><i class="fas fa-bolt mr-2 text-indigo-600"></i>빠른 작업</h3>
          <div class="space-y-2">
            <button onclick="switchBarcodeTab('register')" class="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition">
              <div class="font-semibold text-slate-800 text-sm">바코드 등록·수정</div>
              <div class="text-xs text-slate-500">제품에 바코드를 매핑합니다</div>
            </button>
            <button onclick="switchBarcodeTab('labels')" class="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition">
              <div class="font-semibold text-slate-800 text-sm">라벨 출력</div>
              <div class="text-xs text-slate-500">Code128 / EAN 라벨을 인쇄합니다</div>
            </button>
            <button onclick="bcCopySkuToBarcode()" class="w-full text-left px-4 py-3 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition">
              <div class="font-semibold text-amber-900 text-sm">미등록 제품 SKU → 바코드 복사</div>
              <div class="text-xs text-amber-700">최대 200건 (중복 SKU는 스킵)</div>
            </button>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 class="font-bold text-slate-800 text-sm"><i class="fas fa-exclamation-circle mr-2 text-amber-500"></i>미등록 제품 (최근)</h3>
            <button onclick="window._bcState.filter='unregistered';switchBarcodeTab('register')" class="text-xs text-indigo-600 font-semibold hover:underline">전체 보기</button>
          </div>
          <div class="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            ${unreg.length ? unreg.map((p) => `
              <div class="px-5 py-3 flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="font-medium text-slate-800 text-sm truncate">${bcEsc(p.name)}</div>
                  <div class="text-xs text-slate-400 font-mono">${bcEsc(p.sku)}</div>
                </div>
                <button onclick="window._bcState.filter='unregistered';window._bcState.search='${String(p.sku || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}';switchBarcodeTab('register')"
                  class="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 whitespace-nowrap">등록</button>
              </div>
            `).join('') : '<div class="p-8 text-center text-slate-400 text-sm">미등록 제품이 없습니다</div>'}
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div class="text-center py-10 text-rose-600">${bcEsc(e.response?.data?.error || e.message)}</div>`;
  }
}

async function renderBarcodeRegister() {
  const container = document.getElementById('bc-tab-content');
  const filter = window._bcState.filter || 'all';
  const search = window._bcState.search || '';

  container.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <div class="flex flex-wrap gap-2">
        <select id="bc-filter" onchange="window._bcState.filter=this.value;bcLoadProducts()" class="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="all" ${filter === 'all' ? 'selected' : ''}>전체</option>
          <option value="unregistered" ${filter === 'unregistered' ? 'selected' : ''}>미등록</option>
          <option value="registered" ${filter === 'registered' ? 'selected' : ''}>등록됨</option>
        </select>
        <input id="bc-search" value="${bcEsc(search)}" placeholder="상품명 / SKU / 바코드 검색"
          onkeydown="if(event.key==='Enter'){window._bcState.search=this.value;bcLoadProducts()}"
          class="border border-slate-300 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <button onclick="window._bcState.search=document.getElementById('bc-search').value;bcLoadProducts()"
          class="px-3 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-900">검색</button>
      </div>
      <button onclick="bcCopySkuToBarcode(true)" class="px-3 py-2 border border-amber-300 text-amber-800 rounded-lg text-sm hover:bg-amber-50">
        <i class="fas fa-copy mr-1"></i>선택 항목 SKU→바코드
      </button>
    </div>
    <div id="bc-product-list" class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div class="text-center py-10 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>
    </div>
  `;

  await bcLoadProducts();
}

window.bcLoadProducts = async function () {
  const list = document.getElementById('bc-product-list');
  if (!list) return;
  list.innerHTML = '<div class="text-center py-10 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>';

  try {
    const res = await axios.get(`${API_BASE}/barcode/products`, {
      params: {
        filter: window._bcState.filter || 'all',
        search: window._bcState.search || '',
        limit: 200
      }
    });
    const rows = res.data.data || [];
    window._bcState.products = rows;
    const total = res.data.pagination?.total || rows.length;

    if (!rows.length) {
      list.innerHTML = '<div class="p-10 text-center text-slate-400 text-sm">조회된 제품이 없습니다</div>';
      return;
    }

    list.innerHTML = `
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
            <tr>
              <th class="px-4 py-3 w-10"><input type="checkbox" onchange="bcToggleAll(this.checked)" class="rounded border-slate-300"></th>
              <th class="px-4 py-3">제품</th>
              <th class="px-4 py-3">SKU</th>
              <th class="px-4 py-3">바코드</th>
              <th class="px-4 py-3">재고</th>
              <th class="px-4 py-3 text-right">저장</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${rows.map((p) => `
              <tr class="hover:bg-slate-50/80">
                <td class="px-4 py-3">
                  <input type="checkbox" class="bc-row-check rounded border-slate-300" value="${p.id}"
                    onchange="bcToggleSelect(${p.id}, this.checked)"
                    ${window._bcState.selectedIds.has(Number(p.id)) ? 'checked' : ''}>
                </td>
                <td class="px-4 py-3">
                  <div class="font-medium text-slate-800">${bcEsc(p.name)}</div>
                  <div class="text-xs text-slate-400">${bcEsc(p.category || '')}</div>
                </td>
                <td class="px-4 py-3 font-mono text-xs text-slate-600">${bcEsc(p.sku)}</td>
                <td class="px-4 py-3">
                  <input id="bc-input-${p.id}" type="text" value="${bcEsc(p.barcode || '')}"
                    class="w-44 border border-slate-300 rounded-lg px-2 py-1.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="바코드 입력/스캔"
                    onkeydown="if(event.key==='Enter'){event.preventDefault();bcSaveBarcode(${p.id})}">
                </td>
                <td class="px-4 py-3">${Number(p.current_stock || 0)}</td>
                <td class="px-4 py-3 text-right space-x-1">
                  <button onclick="bcSaveBarcode(${p.id})" class="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700">저장</button>
                  ${p.barcode ? `<button onclick="bcClearBarcode(${p.id})" class="px-2 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs hover:bg-slate-50">삭제</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">${rows.length}건 표시 / 전체 ${total}건</div>
    `;
  } catch (e) {
    list.innerHTML = `<div class="p-8 text-center text-rose-600 text-sm">${bcEsc(e.response?.data?.error || e.message)}</div>`;
  }
};

window.bcToggleAll = function (checked) {
  document.querySelectorAll('.bc-row-check').forEach((el) => {
    el.checked = checked;
    bcToggleSelect(Number(el.value), checked);
  });
};

window.bcToggleSelect = function (id, checked) {
  if (checked) window._bcState.selectedIds.add(Number(id));
  else window._bcState.selectedIds.delete(Number(id));
};

window.bcSaveBarcode = async function (productId) {
  const input = document.getElementById(`bc-input-${productId}`);
  const barcode = input?.value?.trim() || null;
  try {
    await axios.put(`${API_BASE}/barcode/products/${productId}`, { barcode });
    showToast(barcode ? '바코드가 저장되었습니다' : '바코드가 삭제되었습니다', 'success');
    await bcRefreshMiniStats();
    await bcLoadProducts();
  } catch (e) {
    showToast(e.response?.data?.error || e.message, 'error');
  }
};

window.bcClearBarcode = async function (productId) {
  if (!confirm('이 제품의 바코드를 삭제할까요?')) return;
  const input = document.getElementById(`bc-input-${productId}`);
  if (input) input.value = '';
  await bcSaveBarcode(productId);
};

window.bcCopySkuToBarcode = async function (selectedOnly = false) {
  const ids = selectedOnly ? Array.from(window._bcState.selectedIds) : [];
  if (selectedOnly && !ids.length) {
    showToast('복사할 제품을 선택하세요', 'warning');
    return;
  }
  const msg = selectedOnly
    ? `선택한 ${ids.length}건에 SKU를 바코드로 복사할까요?`
    : '미등록 제품(최대 200건)에 SKU를 바코드로 복사할까요?';
  if (!confirm(msg)) return;

  try {
    const res = await axios.post(`${API_BASE}/barcode/copy-sku`, selectedOnly ? { product_ids: ids } : {});
    showToast(res.data.message || '완료', 'success');
    await bcRefreshMiniStats();
    if (window._bcState.tab === 'register') await bcLoadProducts();
    else if (window._bcState.tab === 'dashboard') await renderBarcodeDashboard();
  } catch (e) {
    showToast(e.response?.data?.error || e.message, 'error');
  }
};

async function renderBarcodeLabels() {
  const container = document.getElementById('bc-tab-content');
  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div class="lg:col-span-5 space-y-4">
        <div class="bg-white border border-slate-200 rounded-xl p-5">
          <h3 class="font-bold text-slate-800 mb-3"><i class="fas fa-search mr-2 text-indigo-600"></i>라벨 대상 선택</h3>
          <input id="bc-label-search" type="text" placeholder="상품명 / SKU / 바코드"
            class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onkeydown="if(event.key==='Enter')bcSearchLabelProducts()">
          <button onclick="bcSearchLabelProducts()" class="w-full py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 mb-3">검색</button>
          <div id="bc-label-list" class="border border-slate-100 rounded-lg max-h-80 overflow-y-auto divide-y divide-slate-100">
            <div class="p-6 text-center text-slate-400 text-sm">바코드가 등록된 제품을 검색하세요</div>
          </div>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 class="font-bold text-slate-800"><i class="fas fa-cog mr-2 text-slate-400"></i>출력 옵션</h3>
          <div>
            <label class="text-xs font-semibold text-slate-500 mb-1 block">심볼로지</label>
            <select id="bc-label-format" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="CODE128">Code128 (권장)</option>
              <option value="EAN13">EAN-13 (13자리)</option>
              <option value="EAN8">EAN-8 (8자리)</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-500 mb-1 block">수량</label>
            <input id="bc-label-qty" type="number" min="1" max="50" value="1" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
          </div>
          <button onclick="bcPreviewLabel()" class="w-full py-2.5 rounded-lg border border-indigo-300 text-indigo-700 text-sm font-semibold hover:bg-indigo-50">미리보기</button>
          <button onclick="bcPrintLabels()" class="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">
            <i class="fas fa-print mr-1"></i>라벨 인쇄
          </button>
        </div>
      </div>
      <div class="lg:col-span-7">
        <div class="bg-white border border-slate-200 rounded-xl p-5 min-h-[420px]">
          <h3 class="font-bold text-slate-800 mb-3"><i class="fas fa-eye mr-2 text-indigo-600"></i>미리보기</h3>
          <div id="bc-label-preview" class="flex flex-col items-center justify-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl min-h-[320px]">
            제품을 선택하고 미리보기를 눌러주세요
          </div>
        </div>
      </div>
    </div>
  `;

  // 등록된 제품 일부 미리 로드
  try {
    const res = await axios.get(`${API_BASE}/barcode/products`, { params: { filter: 'registered', limit: 30 } });
    bcRenderLabelList(res.data.data || []);
  } catch (_) {}
}

window.bcSearchLabelProducts = async function () {
  const q = document.getElementById('bc-label-search')?.value?.trim() || '';
  try {
    const res = await axios.get(`${API_BASE}/barcode/products`, {
      params: { filter: 'registered', search: q, limit: 50 }
    });
    bcRenderLabelList(res.data.data || []);
  } catch (e) {
    showToast(e.response?.data?.error || e.message, 'error');
  }
};

function bcRenderLabelList(rows) {
  const el = document.getElementById('bc-label-list');
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = '<div class="p-6 text-center text-slate-400 text-sm">등록된 바코드가 없습니다</div>';
    return;
  }
  el.innerHTML = rows.map((p) => `
    <label class="flex items-start gap-3 px-3 py-2.5 hover:bg-indigo-50/50 cursor-pointer">
      <input type="radio" name="bc-label-product" value="${p.id}"
        data-barcode="${bcEsc(p.barcode || '')}"
        data-name="${bcEsc(p.name || '')}"
        data-sku="${bcEsc(p.sku || '')}"
        class="mt-1 border-slate-300 text-indigo-600 focus:ring-indigo-500"
        onchange="bcPreviewLabel()">
      <div class="min-w-0">
        <div class="text-sm font-medium text-slate-800 truncate">${bcEsc(p.name)}</div>
        <div class="text-xs text-slate-400 font-mono">${bcEsc(p.sku)} · ${bcEsc(p.barcode)}</div>
      </div>
    </label>
  `).join('');
}

async function bcEnsureJsBarcode() {
  if (window.JsBarcode) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function bcSelectedLabelProduct() {
  const radio = document.querySelector('input[name="bc-label-product"]:checked');
  if (!radio) return null;
  return {
    id: radio.value,
    barcode: radio.dataset.barcode,
    name: radio.dataset.name,
    sku: radio.dataset.sku
  };
}

window.bcPreviewLabel = async function () {
  const product = bcSelectedLabelProduct();
  const preview = document.getElementById('bc-label-preview');
  if (!preview) return;
  if (!product?.barcode) {
    showToast('바코드가 있는 제품을 선택하세요', 'warning');
    return;
  }

  try {
    await bcEnsureJsBarcode();
    const format = document.getElementById('bc-label-format')?.value || 'CODE128';
    preview.innerHTML = `
      <div class="w-full max-w-md mx-auto bg-white border border-slate-300 rounded-lg p-6 text-center shadow-sm">
        <div class="text-sm font-bold text-slate-800 mb-1 truncate">${bcEsc(product.name)}</div>
        <div class="text-xs text-slate-400 font-mono mb-3">${bcEsc(product.sku)}</div>
        <svg id="bc-preview-svg" class="mx-auto"></svg>
        <div class="text-xs font-mono text-slate-600 mt-2">${bcEsc(product.barcode)}</div>
      </div>
    `;
    window.JsBarcode('#bc-preview-svg', product.barcode, {
      format,
      width: 2,
      height: 70,
      displayValue: true,
      fontSize: 14,
      margin: 8
    });
  } catch (e) {
    console.error(e);
    preview.innerHTML = `<div class="text-rose-600 text-sm p-6">바코드 생성 실패: ${bcEsc(e.message || e)}<br><span class="text-xs text-slate-500">EAN은 자릿수가 맞아야 합니다. Code128을 사용해 보세요.</span></div>`;
  }
};

window.bcPrintLabels = async function () {
  const product = bcSelectedLabelProduct();
  if (!product?.barcode) {
    showToast('바코드가 있는 제품을 선택하세요', 'warning');
    return;
  }

  const qty = Math.min(50, Math.max(1, parseInt(document.getElementById('bc-label-qty')?.value || '1', 10) || 1));
  const format = document.getElementById('bc-label-format')?.value || 'CODE128';

  try {
    await bcEnsureJsBarcode();
    const canvas = document.createElement('canvas');
    window.JsBarcode(canvas, product.barcode, {
      format,
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 14,
      margin: 6
    });
    const dataUrl = canvas.toDataURL('image/png');

    const win = window.open('', '_blank');
    if (!win) {
      showToast('팝업이 차단되었습니다. 팝업을 허용해 주세요', 'warning');
      return;
    }

    const labels = Array.from({ length: qty }).map(() => `
      <div class="label">
        <div class="name">${bcEsc(product.name)}</div>
        <div class="sku">${bcEsc(product.sku)}</div>
        <img src="${dataUrl}" alt="barcode">
      </div>
    `).join('');

    win.document.write(`<!DOCTYPE html><html><head><title>바코드 라벨</title>
      <style>
        @page { size: 80mm 50mm; margin: 2mm; }
        body { font-family: sans-serif; margin: 0; }
        .label { width: 76mm; height: 46mm; border: 1px solid #ccc; page-break-after: always;
          display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; padding: 3mm; }
        .name { font-size: 11px; font-weight: 700; text-align: center; max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        .sku { font-size: 9px; color: #666; margin: 2px 0 4px; font-family: monospace; }
        img { max-width: 70mm; height: auto; }
      </style></head><body>${labels}<script>window.onload=function(){window.print();}</script></body></html>`);
    win.document.close();
  } catch (e) {
    showToast(e.message || '라벨 출력에 실패했습니다', 'error');
  }
};
