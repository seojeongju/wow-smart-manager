/**
 * ERP Phase 2 — 입고·검수 / 단가 / 공급사평가 / 예약재고 / 발주제안
 */

function scmWon(n) {
  return (Number(n) || 0).toLocaleString('ko-KR') + '원';
}

/** 입고 · 검수 */
window.loadProcReceivePage = async function loadProcReceivePage() {
  const content = document.getElementById('content');
  if (!content) return;
  if (typeof window.setHelpContext === 'function') window.setHelpContext('proc-receive');

  content.innerHTML = `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold text-slate-800">입고 · 검수</h2>
          <p class="text-sm text-slate-500">발주 대기/부분입고 건을 선택해 창고별 입고합니다</p>
        </div>
        <button type="button" onclick="reloadProcReceive()" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
          <i class="fas fa-sync-alt"></i>
        </button>
      </div>
      <div class="grid lg:grid-cols-5 gap-4">
        <div class="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="px-4 py-3 bg-slate-50 border-b text-sm font-bold text-slate-700">입고 대기 발주</div>
          <div id="procReceiveList" class="p-3 text-center text-slate-400 text-sm"><i class="fas fa-spinner fa-spin"></i></div>
        </div>
        <div class="lg:col-span-3 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div id="procReceiveDetail" class="p-8 text-center text-slate-400 text-sm">왼쪽에서 발주를 선택하세요</div>
        </div>
      </div>
    </div>
  `;
  await reloadProcReceive();
};

window.reloadProcReceive = async function reloadProcReceive() {
  const el = document.getElementById('procReceiveList');
  if (!el) return;
  try {
    const res = await axios.get(`${API_BASE}/purchases`);
    const all = res.data.data || [];
    const rows = all.filter((o) => ['ORDERED', 'PARTIAL', 'DRAFT'].includes(String(o.status || '').toUpperCase()));
    if (!rows.length) {
      el.innerHTML = '<div class="py-8 text-slate-400">입고 대기 발주가 없습니다.</div>';
      return;
    }
    el.innerHTML = rows.map((o) => `
      <button type="button" onclick="openProcReceiveDetail(${o.id})"
        class="w-full text-left px-3 py-3 mb-2 rounded-lg border border-slate-100 hover:border-teal-300 hover:bg-teal-50/50 transition">
        <div class="flex justify-between gap-2">
          <span class="font-mono text-xs font-bold text-slate-800">${o.code || '#' + o.id}</span>
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100">${o.status}</span>
        </div>
        <div class="text-sm text-slate-600 mt-1">${o.supplier_name || '-'}</div>
        <div class="text-xs text-slate-400 mt-0.5">${scmWon(o.total_amount)}</div>
      </button>
    `).join('');
  } catch (e) {
    el.innerHTML = `<div class="text-rose-600 text-sm py-6">${e.message || e}</div>`;
  }
};

window.openProcReceiveDetail = async function openProcReceiveDetail(poId) {
  const el = document.getElementById('procReceiveDetail');
  if (!el) return;
  el.innerHTML = '<div class="p-8 text-center text-slate-400"><i class="fas fa-spinner fa-spin"></i></div>';
  try {
    const [poRes, whRes] = await Promise.all([
      axios.get(`${API_BASE}/purchases/${poId}`),
      axios.get(`${API_BASE}/warehouses`)
    ]);
    const po = poRes.data.data;
    const warehouses = whRes.data.data || [];
    const items = po.items || po.purchase_items || [];
    window._procReceivePoId = poId;
    window._procReceiveWh = warehouses[0]?.id || '';

    el.innerHTML = `
      <div class="p-5 border-b border-slate-100 flex flex-wrap justify-between gap-2">
        <div>
          <div class="font-bold text-slate-800">${po.code || '#' + po.id} · ${po.supplier_name || ''}</div>
          <div class="text-xs text-slate-500 mt-1">검수 메모는 입고 사유에 반영되며, 단가 이력이 자동 기록됩니다.</div>
        </div>
        <div>
          <label class="text-xs font-bold text-slate-500">입고 창고</label>
          <select id="procReceiveWarehouse" class="ml-2 border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
            ${warehouses.map((w) => `<option value="${w.id}">${w.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th class="px-3 py-2 text-left">품목</th>
              <th class="px-3 py-2 text-right">발주</th>
              <th class="px-3 py-2 text-right">기입고</th>
              <th class="px-3 py-2 text-right">잔량</th>
              <th class="px-3 py-2 text-right">이번 입고</th>
              <th class="px-3 py-2 text-center">검수</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${items.map((it) => {
              const remain = Math.max(0, Number(it.quantity) - Number(it.received_quantity || 0));
              return `
                <tr>
                  <td class="px-3 py-2">${it.product_name || it.product_id}<div class="text-xs text-slate-400">${scmWon(it.unit_price)}</div></td>
                  <td class="px-3 py-2 text-right">${it.quantity}</td>
                  <td class="px-3 py-2 text-right">${it.received_quantity || 0}</td>
                  <td class="px-3 py-2 text-right font-semibold">${remain}</td>
                  <td class="px-3 py-2 text-right">
                    <input type="number" min="0" max="${remain}" value="${remain > 0 ? remain : 0}"
                      data-item-id="${it.id}" class="proc-recv-qty w-24 border border-indigo-200 rounded px-2 py-1 text-right font-bold text-indigo-700" ${remain <= 0 ? 'disabled' : ''}>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <select class="proc-recv-qc border border-slate-200 rounded px-2 py-1 text-xs" ${remain <= 0 ? 'disabled' : ''}>
                      <option value="pass">합격</option>
                      <option value="hold">보류</option>
                    </select>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="p-5 border-t border-slate-100 space-y-3">
        <div>
          <label class="text-xs font-bold text-slate-500">검수 메모 (선택)</label>
          <input id="procReceiveNote" type="text" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="외관/수량 확인 등">
        </div>
        <button type="button" onclick="submitProcReceive()" class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-lg">
          입고 확정
        </button>
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<div class="p-8 text-rose-600 text-sm">${e.response?.data?.error || e.message || e}</div>`;
  }
};

window.submitProcReceive = async function submitProcReceive() {
  const poId = window._procReceivePoId;
  if (!poId) return;
  const wh = document.getElementById('procReceiveWarehouse')?.value;
  const rows = Array.from(document.querySelectorAll('.proc-recv-qty'));
  const items = [];
  for (const input of rows) {
    const qty = Number(input.value) || 0;
    const qc = input.closest('tr')?.querySelector('.proc-recv-qc')?.value;
    if (qty <= 0) continue;
    if (qc === 'hold') {
      alert('보류 품목이 있습니다. 합격으로 바꾸거나 수량을 0으로 두세요.');
      return;
    }
    items.push({ id: Number(input.dataset.itemId), quantity: qty, warehouse_id: wh ? Number(wh) : undefined });
  }
  if (!items.length) {
    alert('입고 수량을 입력하세요.');
    return;
  }
  try {
    await axios.post(`${API_BASE}/purchases/${poId}/receive`, { items });
    alert('입고가 완료되었습니다.');
    await reloadProcReceive();
    await openProcReceiveDetail(poId);
  } catch (e) {
    alert(e.response?.data?.error || e.message || '입고 실패');
  }
};

/** 단가 관리 */
window.loadProcPricePage = async function loadProcPricePage() {
  const content = document.getElementById('content');
  if (!content) return;
  if (typeof window.setHelpContext === 'function') window.setHelpContext('proc-price');

  content.innerHTML = `
    <div class="space-y-4">
      <div class="flex flex-wrap justify-between gap-3 items-end">
        <div>
          <h2 class="text-lg font-bold text-slate-800">구매 단가 관리</h2>
          <p class="text-sm text-slate-500">공급사×품목 단가 이력 (입고 시 자동 기록 + 수동 등록)</p>
        </div>
        <div class="flex flex-wrap gap-2 items-end">
          <div>
            <label class="text-xs font-bold text-slate-500">공급사</label>
            <select id="procPriceSupplier" class="block mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[160px]"></select>
          </div>
          <button type="button" onclick="reloadProcPrices()" class="px-3 py-2 text-sm border rounded-lg hover:bg-slate-50"><i class="fas fa-sync-alt"></i></button>
        </div>
      </div>
      <div class="grid lg:grid-cols-3 gap-4">
        <div class="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <h3 class="font-bold text-slate-800 text-sm">단가 등록</h3>
          <div>
            <label class="text-xs font-bold text-slate-500">품목</label>
            <select id="procPriceProduct" class="w-full mt-1 border rounded-lg px-3 py-2 text-sm"></select>
          </div>
          <div>
            <label class="text-xs font-bold text-slate-500">단가</label>
            <input id="procPriceAmount" type="number" min="0" class="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
          </div>
          <div>
            <label class="text-xs font-bold text-slate-500">적용일</label>
            <input id="procPriceDate" type="date" class="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
          </div>
          <div>
            <label class="text-xs font-bold text-slate-500">메모</label>
            <input id="procPriceNotes" type="text" class="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
          </div>
          <button type="button" onclick="submitProcPrice()" class="w-full bg-teal-600 text-white font-bold py-2 rounded-lg">등록</button>
        </div>
        <div class="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div id="procPriceTable" class="p-4 text-center text-slate-400 text-sm"><i class="fas fa-spinner fa-spin"></i></div>
        </div>
      </div>
    </div>
  `;

  const dateEl = document.getElementById('procPriceDate');
  if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);

  const [supRes, prodRes] = await Promise.all([
    axios.get(`${API_BASE}/suppliers`),
    axios.get(`${API_BASE}/products?limit=500`)
  ]);
  const suppliers = supRes.data.data || [];
  const products = prodRes.data.data || [];
  const selS = document.getElementById('procPriceSupplier');
  const selP = document.getElementById('procPriceProduct');
  selS.innerHTML = suppliers.map((s) => `<option value="${s.id}">${s.name}</option>`).join('') || '<option value="">없음</option>';
  selP.innerHTML = products.map((p) => `<option value="${p.id}">${p.name}${p.sku ? ' (' + p.sku + ')' : ''}</option>`).join('');
  selS.addEventListener('change', () => reloadProcPrices());
  await reloadProcPrices();
};

window.reloadProcPrices = async function reloadProcPrices() {
  const sid = document.getElementById('procPriceSupplier')?.value;
  const el = document.getElementById('procPriceTable');
  if (!el || !sid) {
    if (el) el.innerHTML = '<div class="py-8 text-slate-400">공급사를 선택하세요.</div>';
    return;
  }
  try {
    const res = await axios.get(`${API_BASE}/suppliers/${sid}/prices`);
    const rows = res.data.data || [];
    if (!rows.length) {
      el.innerHTML = '<div class="py-10 text-slate-400">단가 이력이 없습니다.</div>';
      return;
    }
    el.innerHTML = `
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-xs text-slate-500 uppercase">
          <tr>
            <th class="px-3 py-2 text-left">품목</th>
            <th class="px-3 py-2 text-right">단가</th>
            <th class="px-3 py-2 text-left">적용일</th>
            <th class="px-3 py-2 text-left">출처</th>
            <th class="px-3 py-2 text-left">메모</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${rows.map((r) => `
            <tr>
              <td class="px-3 py-2">${r.product_name || r.product_id}<div class="text-xs text-slate-400">${r.sku || ''}</div></td>
              <td class="px-3 py-2 text-right font-semibold">${scmWon(r.unit_price)}</td>
              <td class="px-3 py-2 text-xs">${r.effective_from || ''}</td>
              <td class="px-3 py-2 text-xs">${r.source_type || '-'}</td>
              <td class="px-3 py-2 text-xs text-slate-500">${r.notes || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="py-8 text-rose-600 text-sm">${e.response?.data?.error || e.message}</div>`;
  }
};

window.submitProcPrice = async function submitProcPrice() {
  const sid = document.getElementById('procPriceSupplier')?.value;
  const product_id = Number(document.getElementById('procPriceProduct')?.value);
  const unit_price = Number(document.getElementById('procPriceAmount')?.value);
  const effective_from = document.getElementById('procPriceDate')?.value;
  const notes = document.getElementById('procPriceNotes')?.value;
  if (!sid || !product_id || !Number.isFinite(unit_price)) {
    alert('공급사·품목·단가를 확인하세요.');
    return;
  }
  try {
    await axios.post(`${API_BASE}/suppliers/${sid}/prices`, { product_id, unit_price, effective_from, notes });
    document.getElementById('procPriceAmount').value = '';
    await reloadProcPrices();
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

/** 공급사 평가 */
window.loadProcEvalPage = async function loadProcEvalPage() {
  const content = document.getElementById('content');
  if (!content) return;
  if (typeof window.setHelpContext === 'function') window.setHelpContext('proc-eval');

  content.innerHTML = `
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-lg font-bold text-slate-800">공급사 평가</h2>
          <p class="text-sm text-slate-500">납기·품질·가격(각 0–10) 평균으로 등급화</p>
        </div>
        <button type="button" onclick="reloadProcEval()" class="px-3 py-2 text-sm border rounded-lg"><i class="fas fa-sync-alt"></i></button>
      </div>
      <div class="grid lg:grid-cols-3 gap-4">
        <div class="bg-white border rounded-xl p-4 space-y-3">
          <h3 class="font-bold text-sm">평가 등록</h3>
          <select id="procEvalSupplier" class="w-full border rounded-lg px-3 py-2 text-sm"></select>
          <input id="procEvalPeriod" type="text" placeholder="기간 예: 2026-Q1" class="w-full border rounded-lg px-3 py-2 text-sm">
          <div class="grid grid-cols-3 gap-2">
            <div><label class="text-[10px] font-bold text-slate-500">납기</label><input id="procEvalDel" type="number" min="0" max="10" value="8" class="w-full border rounded px-2 py-1.5 text-sm"></div>
            <div><label class="text-[10px] font-bold text-slate-500">품질</label><input id="procEvalQual" type="number" min="0" max="10" value="8" class="w-full border rounded px-2 py-1.5 text-sm"></div>
            <div><label class="text-[10px] font-bold text-slate-500">가격</label><input id="procEvalPrice" type="number" min="0" max="10" value="8" class="w-full border rounded px-2 py-1.5 text-sm"></div>
          </div>
          <textarea id="procEvalNotes" rows="2" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="메모"></textarea>
          <button type="button" onclick="submitProcEval()" class="w-full bg-teal-600 text-white font-bold py-2 rounded-lg">저장</button>
        </div>
        <div class="lg:col-span-2 bg-white border rounded-xl overflow-hidden">
          <div id="procEvalTable" class="p-4 text-center text-slate-400"><i class="fas fa-spinner fa-spin"></i></div>
        </div>
      </div>
    </div>
  `;

  const supRes = await axios.get(`${API_BASE}/suppliers`);
  const suppliers = supRes.data.data || [];
  document.getElementById('procEvalSupplier').innerHTML =
    suppliers.map((s) => `<option value="${s.id}">${s.name}</option>`).join('') || '<option value="">없음</option>';
  await reloadProcEval();
};

window.reloadProcEval = async function reloadProcEval() {
  const el = document.getElementById('procEvalTable');
  if (!el) return;
  try {
    const res = await axios.get(`${API_BASE}/suppliers/evaluations/summary`);
    const rows = res.data.data || [];
    if (!rows.length) {
      el.innerHTML = '<div class="py-10 text-slate-400">공급사가 없습니다.</div>';
      return;
    }
    el.innerHTML = `
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-xs text-slate-500 uppercase">
          <tr>
            <th class="px-3 py-2 text-left">공급사</th>
            <th class="px-3 py-2 text-center">납기</th>
            <th class="px-3 py-2 text-center">품질</th>
            <th class="px-3 py-2 text-center">가격</th>
            <th class="px-3 py-2 text-center">종합</th>
            <th class="px-3 py-2 text-left">기간</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${rows.map((r) => `
            <tr>
              <td class="px-3 py-2 font-medium">${r.supplier_name}</td>
              <td class="px-3 py-2 text-center">${r.score_delivery ?? '-'}</td>
              <td class="px-3 py-2 text-center">${r.score_quality ?? '-'}</td>
              <td class="px-3 py-2 text-center">${r.score_price ?? '-'}</td>
              <td class="px-3 py-2 text-center font-bold ${r.score_total != null ? 'text-teal-700' : 'text-slate-400'}">${r.score_total ?? '미평가'}</td>
              <td class="px-3 py-2 text-xs text-slate-500">${r.period_label || ''}<div>${String(r.evaluated_at || '').slice(0, 10)}</div></td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="py-8 text-rose-600 text-sm">${e.response?.data?.error || e.message}</div>`;
  }
};

window.submitProcEval = async function submitProcEval() {
  const sid = document.getElementById('procEvalSupplier')?.value;
  if (!sid) return;
  try {
    await axios.post(`${API_BASE}/suppliers/${sid}/evaluations`, {
      period_label: document.getElementById('procEvalPeriod')?.value,
      score_delivery: Number(document.getElementById('procEvalDel')?.value),
      score_quality: Number(document.getElementById('procEvalQual')?.value),
      score_price: Number(document.getElementById('procEvalPrice')?.value),
      notes: document.getElementById('procEvalNotes')?.value
    });
    await reloadProcEval();
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

/** 예약 재고 */
window.loadScmReservePage = async function loadScmReservePage() {
  const content = document.getElementById('content');
  if (!content) return;
  if (typeof window.setHelpContext === 'function') window.setHelpContext('scm-reserve');

  content.innerHTML = `
    <div class="space-y-4">
      <div class="flex flex-wrap justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold text-slate-800">예약 재고</h2>
          <p class="text-sm text-slate-500">견적 등 soft allocation 현황 · 수동 해제</p>
        </div>
        <div class="flex gap-2">
          <select id="scmReserveStatus" class="border rounded-lg px-3 py-2 text-sm">
            <option value="active">활성</option>
            <option value="released">해제</option>
            <option value="consumed">소진</option>
            <option value="all">전체</option>
          </select>
          <button type="button" onclick="reloadScmReserve()" class="px-3 py-2 border rounded-lg text-sm"><i class="fas fa-sync-alt"></i></button>
        </div>
      </div>
      <div class="bg-white border rounded-xl overflow-hidden">
        <div id="scmReserveTable" class="p-4 text-center text-slate-400"><i class="fas fa-spinner fa-spin"></i></div>
      </div>
    </div>
  `;
  document.getElementById('scmReserveStatus')?.addEventListener('change', () => reloadScmReserve());
  await reloadScmReserve();
};

window.reloadScmReserve = async function reloadScmReserve() {
  const el = document.getElementById('scmReserveTable');
  const status = document.getElementById('scmReserveStatus')?.value || 'active';
  if (!el) return;
  try {
    const res = await axios.get(`${API_BASE}/stock/reservations`, { params: { status, limit: 150 } });
    const rows = res.data.data || [];
    if (!rows.length) {
      el.innerHTML = '<div class="py-12 text-slate-400 text-sm">예약이 없습니다. 견적에서 재고 예약을 켜면 여기에 표시됩니다.</div>';
      return;
    }
    el.innerHTML = `
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-xs text-slate-500 uppercase">
          <tr>
            <th class="px-3 py-2 text-left">품목</th>
            <th class="px-3 py-2 text-right">수량</th>
            <th class="px-3 py-2 text-left">출처</th>
            <th class="px-3 py-2 text-left">창고</th>
            <th class="px-3 py-2 text-left">만료</th>
            <th class="px-3 py-2 text-center">상태</th>
            <th class="px-3 py-2 text-right">처리</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${rows.map((r) => `
            <tr>
              <td class="px-3 py-2">${r.product_name || r.product_id}<div class="text-xs text-slate-400">${r.sku || ''}</div></td>
              <td class="px-3 py-2 text-right font-semibold">${r.quantity}</td>
              <td class="px-3 py-2 text-xs">${r.source_type} #${r.source_id}</td>
              <td class="px-3 py-2 text-xs">${r.warehouse_name || '-'}</td>
              <td class="px-3 py-2 text-xs">${r.expires_at ? String(r.expires_at).slice(0, 10) : '-'}</td>
              <td class="px-3 py-2 text-center text-xs">${r.status}</td>
              <td class="px-3 py-2 text-right">
                ${r.status === 'active' ? `<button type="button" onclick="releaseScmReserve(${r.id})" class="text-xs text-rose-700 bg-rose-50 px-2 py-1 rounded font-semibold">해제</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="py-8 text-rose-600 text-sm">${e.response?.data?.error || e.message}</div>`;
  }
};

window.releaseScmReserve = async function releaseScmReserve(id) {
  if (!confirm('이 예약을 해제할까요?')) return;
  try {
    await axios.post(`${API_BASE}/stock/reservations/release`, { id });
    await reloadScmReserve();
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

/** 적정재고 · 발주제안 */
window.loadScmReorderPage = async function loadScmReorderPage() {
  const content = document.getElementById('content');
  if (!content) return;
  if (typeof window.setHelpContext === 'function') window.setHelpContext('scm-reorder');

  content.innerHTML = `
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-lg font-bold text-slate-800">적정재고 · 발주제안</h2>
          <p class="text-sm text-slate-500">가용재고(물리−예약) &lt; 최소재고(min_stock_alert) 품목</p>
        </div>
        <button type="button" onclick="reloadScmReorder()" class="px-3 py-2 border rounded-lg text-sm"><i class="fas fa-sync-alt"></i></button>
      </div>
      <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900">
        최소재고는 품목 정보의 재고 알림 수량으로 설정합니다. 부족분은 발주 관리에서 수동으로 작성하세요.
      </div>
      <div class="bg-white border rounded-xl overflow-hidden">
        <div id="scmReorderTable" class="p-4 text-center text-slate-400"><i class="fas fa-spinner fa-spin"></i></div>
      </div>
    </div>
  `;
  await reloadScmReorder();
};

window.reloadScmReorder = async function reloadScmReorder() {
  const el = document.getElementById('scmReorderTable');
  if (!el) return;
  try {
    const res = await axios.get(`${API_BASE}/stock/reorder-suggestions`);
    const rows = res.data.data || [];
    if (!rows.length) {
      el.innerHTML = '<div class="py-12 text-slate-400 text-sm">부족한 품목이 없습니다. (최소재고가 설정된 품목만 대상)</div>';
      return;
    }
    el.innerHTML = `
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-xs text-slate-500 uppercase">
          <tr>
            <th class="px-3 py-2 text-left">품목</th>
            <th class="px-3 py-2 text-right">물리</th>
            <th class="px-3 py-2 text-right">예약</th>
            <th class="px-3 py-2 text-right">가용</th>
            <th class="px-3 py-2 text-right">최소</th>
            <th class="px-3 py-2 text-right">제안수량</th>
            <th class="px-3 py-2 text-right">예상매입</th>
            <th class="px-3 py-2 text-right"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${rows.map((r) => `
            <tr>
              <td class="px-3 py-2">${r.name}<div class="text-xs text-slate-400">${r.sku || ''}</div></td>
              <td class="px-3 py-2 text-right">${r.physical}</td>
              <td class="px-3 py-2 text-right">${r.reserved}</td>
              <td class="px-3 py-2 text-right font-semibold text-rose-700">${r.available}</td>
              <td class="px-3 py-2 text-right">${r.min_stock_alert}</td>
              <td class="px-3 py-2 text-right font-bold text-indigo-700">${r.suggest_qty}</td>
              <td class="px-3 py-2 text-right text-xs">${scmWon((r.purchase_price || 0) * (r.suggest_qty || 0))}</td>
              <td class="px-3 py-2 text-right">
                <button type="button" onclick="loadPage('purchases','purchases')" class="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded">발주 작성</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="py-8 text-rose-600 text-sm">${e.response?.data?.error || e.message}</div>`;
  }
};
