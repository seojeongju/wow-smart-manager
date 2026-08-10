/**
 * 견적 관리 — 작성 / 재고예약 / 수주 변환
 */

window.loadQuotationsPage = async function loadQuotationsPage() {
  const content = document.getElementById('content');
  if (!content) return;
  if (typeof window.setHelpContext === 'function') window.setHelpContext('quotations');

  content.innerHTML = `
    <div class="flex flex-col h-full">
      ${window.renderPageHeader({
        title: '견적 관리',
        subtitle: '견적 작성 · 재고예약 · 수주 변환',
        icon: 'fa-file-signature',
        actionsHtml: `
          <button type="button" onclick="reloadQuotations()" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
            <i class="fas fa-sync-alt"></i>
          </button>`
      })}
    <div class="flex flex-col lg:flex-row gap-6 flex-1">
      <div class="lg:w-5/12 space-y-4">
        <div class="bg-white border border-slate-200 rounded-xl p-5">
          <h2 class="text-sm font-bold text-slate-700 mb-4">견적 작성</h2>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-bold text-slate-500">고객 (선택)</label>
              <select id="quoteCustomer" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="">비회원 / 미지정</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-bold text-slate-500">유효일</label>
                <input type="date" id="quoteValidUntil" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
              </div>
              <div>
                <label class="text-xs font-bold text-slate-500">할인액</label>
                <input type="number" id="quoteDiscount" value="0" min="0" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
              </div>
            </div>
            <label class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" id="quoteReserve" class="rounded border-slate-300 text-teal-600" checked>
              재고 예약 (soft allocation)
            </label>
            <div>
              <label class="text-xs font-bold text-slate-500">메모</label>
              <textarea id="quoteNotes" rows="2" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"></textarea>
            </div>
          </div>

          <div class="mt-4 border-t border-slate-100 pt-4">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-bold text-slate-700">품목</h3>
              <button type="button" onclick="addQuoteLine()" class="text-xs text-teal-700 font-semibold hover:underline">+ 품목 추가</button>
            </div>
            <div id="quoteLines" class="space-y-2"></div>
          </div>

          <button type="button" onclick="submitQuotation()" class="mt-4 w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-lg">
            견적 저장
          </button>
        </div>
      </div>

      <div class="lg:w-7/12">
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h2 class="font-bold text-slate-800">견적 목록</h2>
            <button type="button" onclick="reloadQuotations()" class="text-sm text-slate-500 hover:text-teal-700"><i class="fas fa-sync-alt"></i></button>
          </div>
          <div id="quoteList" class="p-4">
            <div class="text-center py-10 text-slate-400"><i class="fas fa-spinner fa-spin"></i></div>
          </div>
        </div>
      </div>
    </div>
    </div>
  `;

  window._quoteLines = [];
  window._quoteProducts = [];

  const valid = document.getElementById('quoteValidUntil');
  if (valid) {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    valid.value = d.toISOString().slice(0, 10);
  }

  try {
    const [custRes, prodRes] = await Promise.all([
      axios.get(`${API_BASE}/customers?limit=200`),
      axios.get(`${API_BASE}/products?limit=500`)
    ]);
    const customers = custRes.data.data || [];
    window._quoteProducts = prodRes.data.data || [];
    const sel = document.getElementById('quoteCustomer');
    sel.innerHTML = '<option value="">비회원 / 미지정</option>' +
      customers.map(c => `<option value="${c.id}">${c.name}${c.phone ? ` (${c.phone})` : ''}</option>`).join('');
  } catch (e) {
    console.error(e);
  }

  addQuoteLine();
  await reloadQuotations();
};

function addQuoteLine() {
  if (!window._quoteLines) window._quoteLines = [];
  window._quoteLines.push({ product_id: '', quantity: 1, unit_price: '' });
  renderQuoteLines();
}
window.addQuoteLine = addQuoteLine;

function removeQuoteLine(idx) {
  window._quoteLines.splice(idx, 1);
  if (!window._quoteLines.length) addQuoteLine();
  else renderQuoteLines();
}
window.removeQuoteLine = removeQuoteLine;

function renderQuoteLines() {
  const el = document.getElementById('quoteLines');
  if (!el) return;
  const products = window._quoteProducts || [];
  el.innerHTML = window._quoteLines.map((line, idx) => `
    <div class="grid grid-cols-12 gap-2 items-center">
      <select class="col-span-6 border rounded-lg px-2 py-1.5 text-sm" onchange="onQuoteProductChange(${idx}, this.value)">
        <option value="">상품 선택</option>
        ${products.map(p => `<option value="${p.id}" ${String(line.product_id) === String(p.id) ? 'selected' : ''}>${p.name} (${p.sku})</option>`).join('')}
      </select>
      <input type="number" min="1" value="${line.quantity}" class="col-span-2 border rounded-lg px-2 py-1.5 text-sm text-right"
        onchange="window._quoteLines[${idx}].quantity=Number(this.value)||1">
      <input type="number" min="0" placeholder="단가" value="${line.unit_price}" class="col-span-3 border rounded-lg px-2 py-1.5 text-sm text-right"
        onchange="window._quoteLines[${idx}].unit_price=this.value===''?'':Number(this.value)">
      <button type="button" onclick="removeQuoteLine(${idx})" class="col-span-1 text-rose-500 hover:text-rose-700"><i class="fas fa-times"></i></button>
    </div>
  `).join('');
}

function onQuoteProductChange(idx, productId) {
  window._quoteLines[idx].product_id = productId;
  const p = (window._quoteProducts || []).find(x => String(x.id) === String(productId));
  if (p && (window._quoteLines[idx].unit_price === '' || window._quoteLines[idx].unit_price == null)) {
    window._quoteLines[idx].unit_price = Number(p.selling_price) || 0;
    renderQuoteLines();
  }
}
window.onQuoteProductChange = onQuoteProductChange;

async function submitQuotation() {
  const items = (window._quoteLines || [])
    .filter(l => l.product_id && Number(l.quantity) > 0)
    .map(l => ({
      product_id: Number(l.product_id),
      quantity: Number(l.quantity),
      unit_price: l.unit_price === '' || l.unit_price == null ? undefined : Number(l.unit_price)
    }));
  if (!items.length) return alert('품목을 추가하세요.');

  const payload = {
    customer_id: document.getElementById('quoteCustomer').value || null,
    valid_until: document.getElementById('quoteValidUntil').value || null,
    discount_amount: Number(document.getElementById('quoteDiscount').value) || 0,
    notes: document.getElementById('quoteNotes').value || null,
    reserve_stock: !!document.getElementById('quoteReserve').checked,
    items
  };

  try {
    const res = await axios.post(`${API_BASE}/quotations`, payload);
    alert(res.data.message || '저장되었습니다.');
    window._quoteLines = [];
    addQuoteLine();
    document.getElementById('quoteDiscount').value = 0;
    document.getElementById('quoteNotes').value = '';
    await reloadQuotations();
  } catch (e) {
    alert('저장 실패: ' + (e.response?.data?.error || e.message));
  }
}
window.submitQuotation = submitQuotation;

async function reloadQuotations() {
  const box = document.getElementById('quoteList');
  if (!box) return;
  box.innerHTML = '<div class="text-center py-10 text-slate-400"><i class="fas fa-spinner fa-spin"></i></div>';
  try {
    const res = await axios.get(`${API_BASE}/quotations?limit=100`);
    const rows = res.data.data || [];
    if (!rows.length) {
      box.innerHTML = '<div class="text-center py-12 text-slate-400">등록된 견적이 없습니다.</div>';
      return;
    }
    const statusLabel = {
      draft: '작성', sent: '발송', accepted: '수락', converted: '수주완료', cancelled: '취소', expired: '만료'
    };
    const statusCls = {
      draft: 'bg-slate-100 text-slate-700',
      sent: 'bg-blue-100 text-blue-700',
      accepted: 'bg-emerald-100 text-emerald-700',
      converted: 'bg-teal-100 text-teal-800',
      cancelled: 'bg-rose-100 text-rose-700',
      expired: 'bg-amber-100 text-amber-800'
    };
    box.innerHTML = `
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th class="px-3 py-2 text-left">번호</th>
              <th class="px-3 py-2 text-left">고객</th>
              <th class="px-3 py-2 text-right">금액</th>
              <th class="px-3 py-2 text-center">예약</th>
              <th class="px-3 py-2 text-center">상태</th>
              <th class="px-3 py-2 text-right">관리</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${rows.map(q => `
              <tr class="hover:bg-slate-50">
                <td class="px-3 py-2.5 font-mono text-xs">${q.quote_number}</td>
                <td class="px-3 py-2.5">${q.customer_name || '-'}</td>
                <td class="px-3 py-2.5 text-right font-semibold">${Number(q.total_amount || 0).toLocaleString()}원</td>
                <td class="px-3 py-2.5 text-center">${q.reserve_stock ? '<span class="text-teal-700 text-xs font-bold">예약</span>' : '-'}</td>
                <td class="px-3 py-2.5 text-center">
                  <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${statusCls[q.status] || 'bg-slate-100'}">${statusLabel[q.status] || q.status}</span>
                </td>
                <td class="px-3 py-2.5 text-right space-x-1 whitespace-nowrap">
                  ${q.status !== 'converted' && q.status !== 'cancelled' ? `
                    <button onclick="convertQuotation(${q.id})" class="text-xs px-2 py-1 rounded bg-teal-50 text-teal-800 font-semibold hover:bg-teal-100">수주변환</button>
                    <button onclick="cancelQuotation(${q.id})" class="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200">취소</button>
                  ` : q.converted_sale_id ? `<span class="text-xs text-slate-500">판매 #${q.converted_sale_id}</span>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (e) {
    box.innerHTML = `<div class="text-center py-10 text-rose-500">${e.response?.data?.error || e.message}</div>`;
  }
}
window.reloadQuotations = reloadQuotations;

async function convertQuotation(id) {
  if (!confirm('이 견적을 수주(배송출고 판매 + 출고지시)로 변환할까요?')) return;
  try {
    const res = await axios.post(`${API_BASE}/quotations/${id}/convert`, {
      payment_status: 'unpaid',
      payment_method: 'credit'
    });
    alert(res.data.message || '변환되었습니다.');
    await reloadQuotations();
  } catch (e) {
    alert('변환 실패: ' + (e.response?.data?.error || e.message));
  }
}
window.convertQuotation = convertQuotation;

async function cancelQuotation(id) {
  if (!confirm('견적을 취소하고 예약을 해제할까요?')) return;
  try {
    await axios.put(`${API_BASE}/quotations/${id}`, { status: 'cancelled' });
    await reloadQuotations();
  } catch (e) {
    alert('취소 실패: ' + (e.response?.data?.error || e.message));
  }
}
window.cancelQuotation = cancelQuotation;
