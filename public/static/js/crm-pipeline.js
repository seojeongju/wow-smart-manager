/**
 * ERP Phase 3 — 영업 기회 (CRM Pipeline)
 */

const CRM_STAGES = [
  { key: 'lead', label: '리드', color: 'border-slate-300' },
  { key: 'qualified', label: '검증', color: 'border-sky-300' },
  { key: 'proposal', label: '제안', color: 'border-indigo-300' },
  { key: 'negotiation', label: '협상', color: 'border-amber-300' },
  { key: 'won', label: '수주', color: 'border-emerald-300' },
  { key: 'lost', label: '실주', color: 'border-rose-300' }
];

function crmWon(n) {
  return (Number(n) || 0).toLocaleString('ko-KR') + '원';
}

function crmEsc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.loadCrmPipelinePage = async function loadCrmPipelinePage() {
  const content = document.getElementById('content');
  if (!content) return;
  if (typeof window.setHelpContext === 'function') window.setHelpContext('crm-pipeline');

  content.innerHTML = `
    <div class="flex flex-col h-full">
      ${window.renderPageHeader({
        title: '영업 기회',
        subtitle: '파이프라인 보드 · 단계 이동 · 견적/고객 연결',
        icon: 'fa-filter',
        actionsHtml: `
          <button type="button" onclick="loadPage('quotations')" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">견적 관리</button>
          <button type="button" onclick="loadPage('customers')" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">고객</button>
          <button type="button" onclick="reloadCrmPipeline()" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"><i class="fas fa-sync-alt"></i></button>`
      })}

      <div class="space-y-4 flex-1 min-h-0 flex flex-col">
        <div id="crmSummary" class="grid grid-cols-2 lg:grid-cols-4 gap-3"></div>

        <div class="grid lg:grid-cols-12 gap-4 items-start">
          <div class="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 class="text-sm font-bold text-slate-800">기회 등록</h3>
            <div>
              <label class="text-xs font-bold text-slate-500">기회명 *</label>
              <input id="crmTitle" type="text" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="예: A사 설비 공급">
            </div>
            <div>
              <label class="text-xs font-bold text-slate-500">고객</label>
              <select id="crmCustomer" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="">미지정</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-xs font-bold text-slate-500">예상 금액</label>
                <input id="crmAmount" type="number" min="0" value="0" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
              </div>
              <div>
                <label class="text-xs font-bold text-slate-500">단계</label>
                <select id="crmStage" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  ${CRM_STAGES.filter((s) => !['won', 'lost'].includes(s.key)).map((s) =>
                    `<option value="${s.key}">${s.label}</option>`).join('')}
                </select>
              </div>
            </div>
            <div>
              <label class="text-xs font-bold text-slate-500">예상 수주일</label>
              <input id="crmClose" type="date" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
              <label class="text-xs font-bold text-slate-500">메모</label>
              <textarea id="crmNotes" rows="2" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"></textarea>
            </div>
            <button type="button" onclick="submitCrmOpportunity()" class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-lg">등록</button>
          </div>

          <div class="lg:col-span-9 min-w-0 flex flex-col gap-3">
            <div class="flex flex-wrap gap-2 items-center">
              <div class="relative flex-1 min-w-[180px]">
                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input id="crmSearch" type="search" placeholder="기회·고객 검색"
                  class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
                  oninput="onCrmSearchInput(this.value)">
              </div>
              <span id="crmDragHint" class="text-xs text-slate-400">카드를 다른 열로 드래그해 단계를 변경하세요</span>
            </div>
            <div id="crmBoard" class="flex gap-3 overflow-x-auto pb-2 min-h-[420px]"></div>
          </div>
        </div>
      </div>

      <div id="crmDetailModal" class="hidden fixed inset-0 z-50">
        <div class="absolute inset-0 bg-black/40" onclick="closeCrmDetail()"></div>
        <div class="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          <div class="px-4 py-3 border-b bg-slate-50 flex justify-between items-center">
            <div class="font-bold text-slate-800">기회 상세</div>
            <button type="button" onclick="closeCrmDetail()" class="w-9 h-9 rounded-lg hover:bg-slate-200 text-slate-500"><i class="fas fa-times"></i></button>
          </div>
          <div id="crmDetailBody" class="flex-1 overflow-y-auto p-4 space-y-3"></div>
        </div>
      </div>
    </div>
  `;

  try {
    const custRes = await axios.get(`${API_BASE}/customers`, { params: { limit: 200 } });
    const customers = custRes.data.data || [];
    document.getElementById('crmCustomer').innerHTML =
      '<option value="">미지정</option>' +
      customers.map((c) => `<option value="${c.id}">${crmEsc(c.name)}${c.company ? ` · ${crmEsc(c.company)}` : ''}</option>`).join('');
  } catch (_) { /* ignore */ }

  const d = new Date();
  d.setDate(d.getDate() + 30);
  const closeEl = document.getElementById('crmClose');
  if (closeEl) closeEl.value = d.toISOString().slice(0, 10);

  await reloadCrmPipeline();
};

let _crmSearchTimer = null;
window.onCrmSearchInput = function onCrmSearchInput(val) {
  clearTimeout(_crmSearchTimer);
  _crmSearchTimer = setTimeout(() => reloadCrmPipeline(val), 180);
};

window.reloadCrmPipeline = async function reloadCrmPipeline(q) {
  const board = document.getElementById('crmBoard');
  const summary = document.getElementById('crmSummary');
  if (!board) return;
  const query = q != null ? q : (document.getElementById('crmSearch')?.value || '');
  try {
    const res = await axios.get(`${API_BASE}/opportunities/pipeline`, { params: { q: query || undefined } });
    const { columns, summary: sum } = res.data.data || {};
    window._crmColumns = columns || {};

    if (summary && sum) {
      summary.innerHTML = `
        <div class="rounded-xl border bg-white p-4"><div class="text-xs text-slate-500">진행 중</div><div class="text-xl font-bold text-slate-800">${sum.open_count || 0}</div></div>
        <div class="rounded-xl border bg-white p-4"><div class="text-xs text-slate-500">파이프라인</div><div class="text-lg font-bold text-slate-800">${crmWon(sum.pipeline_amount)}</div></div>
        <div class="rounded-xl border border-teal-200 bg-teal-50 p-4"><div class="text-xs text-teal-800">가중 예상</div><div class="text-lg font-bold text-teal-900">${crmWon(sum.weighted_amount)}</div></div>
        <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div class="text-xs text-emerald-800">수주 ${sum.won_count || 0}건</div><div class="text-lg font-bold text-emerald-900">${crmWon(sum.won_amount)}</div></div>`;
    }

    board.innerHTML = CRM_STAGES.map((st) => {
      const items = (columns && columns[st.key]) || [];
      const colSum = items.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      return `
        <div class="flex-shrink-0 w-64 bg-slate-50 border ${st.color} rounded-xl flex flex-col max-h-[70vh]"
             data-stage="${st.key}"
             ondragover="event.preventDefault(); this.classList.add('ring-2','ring-teal-400')"
             ondragleave="this.classList.remove('ring-2','ring-teal-400')"
             ondrop="onCrmDrop(event, '${st.key}')">
          <div class="px-3 py-2 border-b border-slate-200 bg-white/80 rounded-t-xl sticky top-0">
            <div class="flex justify-between items-center">
              <span class="text-sm font-bold text-slate-800">${st.label}</span>
              <span class="text-[10px] font-bold text-slate-400">${items.length}</span>
            </div>
            <div class="text-[11px] text-slate-500 mt-0.5">${crmWon(colSum)}</div>
          </div>
          <div class="p-2 space-y-2 overflow-y-auto flex-1">
            ${items.length ? items.map((o) => crmCardHtml(o)).join('') : '<div class="text-center text-xs text-slate-400 py-6">비어 있음</div>'}
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    board.innerHTML = `<div class="p-8 text-rose-600 text-sm">${e.response?.data?.error || e.message}</div>`;
  }
};

function crmCardHtml(o) {
  return `
    <div class="bg-white border border-slate-200 rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-teal-300"
         draggable="true"
         data-id="${o.id}"
         ondragstart="onCrmDragStart(event, ${o.id})"
         onclick="openCrmDetail(${o.id})">
      <div class="text-[10px] font-mono text-slate-400 mb-0.5">${crmEsc(o.opportunity_number)}</div>
      <div class="text-sm font-bold text-slate-800 leading-snug">${crmEsc(o.title)}</div>
      <div class="text-xs text-slate-500 mt-1">${crmEsc(o.customer_name || '고객 미지정')}</div>
      <div class="flex justify-between items-center mt-2">
        <span class="text-xs font-bold text-teal-700">${crmWon(o.amount)}</span>
        <span class="text-[10px] text-slate-400">${o.probability ?? 0}%</span>
      </div>
      ${o.quote_number ? `<div class="mt-1 text-[10px] text-indigo-600"><i class="fas fa-file-signature mr-1"></i>${crmEsc(o.quote_number)}</div>` : ''}
      ${o.expected_close ? `<div class="mt-1 text-[10px] text-slate-400"><i class="far fa-calendar mr-1"></i>${crmEsc(o.expected_close)}</div>` : ''}
    </div>`;
}

window.onCrmDragStart = function onCrmDragStart(e, id) {
  e.dataTransfer.setData('text/plain', String(id));
  e.dataTransfer.effectAllowed = 'move';
  e.stopPropagation();
};

window.onCrmDrop = async function onCrmDrop(e, stage) {
  e.preventDefault();
  e.currentTarget?.classList?.remove('ring-2', 'ring-teal-400');
  const id = Number(e.dataTransfer.getData('text/plain'));
  if (!id) return;

  let lost_reason = null;
  if (stage === 'lost') {
    lost_reason = prompt('실주 사유 (선택)') || null;
  }
  try {
    await axios.post(`${API_BASE}/opportunities/${id}/stage`, { stage, lost_reason });
    if (stage === 'won') {
      const go = confirm('수주로 표시했습니다. 연결된 견적/견적 관리로 이동할까요?');
      if (go) {
        const detail = await axios.get(`${API_BASE}/opportunities/${id}`);
        const qid = detail.data.data?.quotation_id;
        loadPage('quotations');
        return;
      }
    }
    await reloadCrmPipeline();
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  }
};

window.submitCrmOpportunity = async function submitCrmOpportunity() {
  const title = document.getElementById('crmTitle')?.value?.trim();
  try {
    await axios.post(`${API_BASE}/opportunities`, {
      title,
      customer_id: document.getElementById('crmCustomer')?.value || null,
      amount: Number(document.getElementById('crmAmount')?.value) || 0,
      stage: document.getElementById('crmStage')?.value || 'lead',
      expected_close: document.getElementById('crmClose')?.value || null,
      notes: document.getElementById('crmNotes')?.value || null
    });
    document.getElementById('crmTitle').value = '';
    document.getElementById('crmAmount').value = '0';
    document.getElementById('crmNotes').value = '';
    await reloadCrmPipeline();
  } catch (e) {
    alert(e.response?.data?.error || e.message || '등록 실패');
  }
};

window.openCrmDetail = async function openCrmDetail(id) {
  const modal = document.getElementById('crmDetailModal');
  const body = document.getElementById('crmDetailBody');
  if (!modal || !body) return;
  modal.classList.remove('hidden');
  body.innerHTML = '<div class="text-center py-10 text-slate-400"><i class="fas fa-spinner fa-spin"></i></div>';

  try {
    const [oppRes, quoteRes] = await Promise.all([
      axios.get(`${API_BASE}/opportunities/${id}`),
      axios.get(`${API_BASE}/quotations`, { params: { limit: 50 } }).catch(() => ({ data: { data: [] } }))
    ]);
    const o = oppRes.data.data;
    window._crmDetail = o;
    const quotes = quoteRes.data.data || [];

    body.innerHTML = `
      <div>
        <div class="text-[11px] font-mono text-slate-400">${crmEsc(o.opportunity_number)}</div>
        <input id="crmEditTitle" class="w-full mt-1 border rounded-lg px-3 py-2 text-sm font-bold" value="${crmEsc(o.title)}">
      </div>
      <div>
        <label class="text-xs font-bold text-slate-500">고객</label>
        <div class="text-sm mt-1">${crmEsc(o.customer_name || '미지정')}${o.customer_company ? ` · ${crmEsc(o.customer_company)}` : ''}</div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-xs font-bold text-slate-500">금액</label>
          <input id="crmEditAmount" type="number" min="0" class="w-full mt-1 border rounded-lg px-3 py-2 text-sm" value="${Number(o.amount) || 0}">
        </div>
        <div>
          <label class="text-xs font-bold text-slate-500">확률 %</label>
          <input id="crmEditProb" type="number" min="0" max="100" class="w-full mt-1 border rounded-lg px-3 py-2 text-sm" value="${Number(o.probability) || 0}">
        </div>
      </div>
      <div>
        <label class="text-xs font-bold text-slate-500">단계</label>
        <select id="crmEditStage" class="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
          ${CRM_STAGES.map((s) => `<option value="${s.key}" ${o.stage === s.key ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="text-xs font-bold text-slate-500">예상 수주일</label>
        <input id="crmEditClose" type="date" class="w-full mt-1 border rounded-lg px-3 py-2 text-sm" value="${crmEsc(o.expected_close || '')}">
      </div>
      <div>
        <label class="text-xs font-bold text-slate-500">메모</label>
        <textarea id="crmEditNotes" rows="3" class="w-full mt-1 border rounded-lg px-3 py-2 text-sm">${crmEsc(o.notes || '')}</textarea>
      </div>
      <div class="border-t pt-3 space-y-2">
        <label class="text-xs font-bold text-slate-500">견적 연결</label>
        ${o.quote_number
          ? `<div class="text-sm text-indigo-700 font-medium"><i class="fas fa-link mr-1"></i>${crmEsc(o.quote_number)} (${crmWon(o.quote_total)})</div>
             <button type="button" onclick="loadPage('quotations')" class="text-xs text-teal-700 font-semibold hover:underline">견적 관리 열기</button>`
          : `<select id="crmLinkQuote" class="w-full border rounded-lg px-3 py-2 text-sm">
               <option value="">견적 선택</option>
               ${quotes.map((q) => `<option value="${q.id}">${crmEsc(q.quote_number)} · ${crmEsc(q.customer_name || '-')} · ${crmWon(q.total_amount)}</option>`).join('')}
             </select>
             <button type="button" onclick="linkCrmQuotation(${o.id})" class="w-full px-3 py-2 text-sm border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50">견적 연결</button>
             <button type="button" onclick="loadPage('quotations')" class="w-full px-3 py-2 text-sm border rounded-lg hover:bg-slate-50">새 견적 작성</button>`}
      </div>
      ${o.stage === 'lost' || document.getElementById('crmEditStage')?.value === 'lost' ? `
        <div>
          <label class="text-xs font-bold text-slate-500">실주 사유</label>
          <input id="crmEditLost" class="w-full mt-1 border rounded-lg px-3 py-2 text-sm" value="${crmEsc(o.lost_reason || '')}">
        </div>` : `
        <div>
          <label class="text-xs font-bold text-slate-500">실주 사유 (실주 시)</label>
          <input id="crmEditLost" class="w-full mt-1 border rounded-lg px-3 py-2 text-sm" value="${crmEsc(o.lost_reason || '')}">
        </div>`}
      <div class="flex flex-col gap-2 pt-2">
        <button type="button" onclick="saveCrmDetail(${o.id})" class="w-full bg-teal-600 text-white font-bold py-2 rounded-lg">저장</button>
        <button type="button" onclick="markCrmWon(${o.id})" class="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg">수주 표시</button>
        <button type="button" onclick="deleteCrmOpportunity(${o.id})" class="w-full border border-rose-300 text-rose-700 py-2 rounded-lg hover:bg-rose-50">삭제</button>
      </div>
    `;
  } catch (e) {
    body.innerHTML = `<div class="text-rose-600 text-sm">${e.response?.data?.error || e.message}</div>`;
  }
};

window.closeCrmDetail = function closeCrmDetail() {
  document.getElementById('crmDetailModal')?.classList.add('hidden');
};

window.saveCrmDetail = async function saveCrmDetail(id) {
  try {
    await axios.put(`${API_BASE}/opportunities/${id}`, {
      title: document.getElementById('crmEditTitle')?.value,
      amount: Number(document.getElementById('crmEditAmount')?.value) || 0,
      probability: Number(document.getElementById('crmEditProb')?.value) || 0,
      stage: document.getElementById('crmEditStage')?.value,
      expected_close: document.getElementById('crmEditClose')?.value || null,
      notes: document.getElementById('crmEditNotes')?.value || null,
      lost_reason: document.getElementById('crmEditLost')?.value || null
    });
    closeCrmDetail();
    await reloadCrmPipeline();
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

window.linkCrmQuotation = async function linkCrmQuotation(id) {
  const quotation_id = Number(document.getElementById('crmLinkQuote')?.value);
  if (!quotation_id) return alert('견적을 선택하세요.');
  try {
    await axios.post(`${API_BASE}/opportunities/${id}/link-quotation`, { quotation_id });
    await openCrmDetail(id);
    await reloadCrmPipeline();
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

window.markCrmWon = async function markCrmWon(id) {
  if (!confirm('이 기회를 수주로 표시할까요?')) return;
  try {
    const res = await axios.post(`${API_BASE}/opportunities/${id}/mark-won`, {});
    closeCrmDetail();
    await reloadCrmPipeline();
    if (res.data.data?.quotation_id && confirm('연결된 견적이 있습니다. 견적 관리로 이동할까요?')) {
      loadPage('quotations');
    }
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

window.deleteCrmOpportunity = async function deleteCrmOpportunity(id) {
  if (!confirm('이 영업 기회를 삭제할까요?')) return;
  try {
    await axios.delete(`${API_BASE}/opportunities/${id}`);
    closeCrmDetail();
    await reloadCrmPipeline();
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};
