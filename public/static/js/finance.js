/**
 * ERP 재무 — 매출채권(AR) / 매입채무(AP) / 전표
 */

function financeWon(n) {
  return (Number(n) || 0).toLocaleString('ko-KR') + '원';
}

function financeAgingCards(summary) {
  const aging = summary?.aging || {};
  const items = [
    { key: '0-30', label: '0–30일', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
    { key: '31-60', label: '31–60일', color: 'bg-amber-50 border-amber-200 text-amber-800' },
    { key: '61-90', label: '61–90일', color: 'bg-orange-50 border-orange-200 text-orange-800' },
    { key: '90+', label: '90일+', color: 'bg-rose-50 border-rose-200 text-rose-800' }
  ];
  return `
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      ${items.map((it) => `
        <div class="rounded-xl border p-4 ${it.color}">
          <div class="text-xs font-bold opacity-80">${it.label}</div>
          <div class="text-lg font-bold mt-1">${financeWon(aging[it.key] || 0)}</div>
        </div>
      `).join('')}
    </div>
    <div class="flex flex-wrap items-center gap-4 mb-4 text-sm text-slate-600">
      <span>건수 <strong class="text-slate-900">${summary?.count || 0}</strong></span>
      <span>잔액 합계 <strong class="text-slate-900">${financeWon(summary?.total_balance || 0)}</strong></span>
    </div>
  `;
}

window.loadFinanceArPage = async function loadFinanceArPage() {
  const content = document.getElementById('content');
  if (!content) return;
  if (typeof window.setHelpContext === 'function') window.setHelpContext('finance-ar');

  content.innerHTML = `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold text-slate-800">매출채권 (AR)</h2>
          <p class="text-sm text-slate-500">외상·부분입금 판매의 미수 잔액과 연령 분석</p>
        </div>
        <div class="flex items-center gap-2">
          <select id="arStatusFilter" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="open">미수 (미결제/부분)</option>
            <option value="paid">완납</option>
            <option value="all">전체</option>
          </select>
          <button type="button" onclick="reloadFinanceAr()" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
            <i class="fas fa-sync-alt"></i>
          </button>
        </div>
      </div>
      <div id="arSummary"></div>
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div id="arTable" class="overflow-x-auto p-4 text-center text-slate-400">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
      </div>
    </div>
  `;

  document.getElementById('arStatusFilter')?.addEventListener('change', () => reloadFinanceAr());
  await reloadFinanceAr();
};

window.reloadFinanceAr = async function reloadFinanceAr() {
  const status = document.getElementById('arStatusFilter')?.value || 'open';
  const summaryEl = document.getElementById('arSummary');
  const tableEl = document.getElementById('arTable');
  if (!tableEl) return;

  try {
    const res = await axios.get(`${API_BASE}/finance/ar`, { params: { status, limit: 150 } });
    if (!res.data?.success) throw new Error(res.data?.error || '조회 실패');
    const rows = res.data.data || [];
    const summary = res.data.summary || {};
    if (summaryEl) summaryEl.innerHTML = financeAgingCards(summary);

    if (!rows.length) {
      tableEl.innerHTML = '<div class="py-12 text-slate-400 text-sm">표시할 채권이 없습니다.</div>';
      return;
    }

    tableEl.innerHTML = `
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-xs uppercase">
          <tr>
            <th class="px-3 py-2 text-left">판매#</th>
            <th class="px-3 py-2 text-left">고객</th>
            <th class="px-3 py-2 text-left">일자</th>
            <th class="px-3 py-2 text-right">판매액</th>
            <th class="px-3 py-2 text-right">입금액</th>
            <th class="px-3 py-2 text-right">잔액</th>
            <th class="px-3 py-2 text-center">연령</th>
            <th class="px-3 py-2 text-center">상태</th>
            <th class="px-3 py-2 text-right">처리</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${rows.map((r) => `
            <tr class="hover:bg-slate-50">
              <td class="px-3 py-2 font-mono text-xs">#${r.id}</td>
              <td class="px-3 py-2">${r.customer_name || '<span class="text-slate-400">비회원</span>'}</td>
              <td class="px-3 py-2 text-slate-500 text-xs">${String(r.created_at || '').slice(0, 16)}</td>
              <td class="px-3 py-2 text-right">${financeWon(r.final_amount)}</td>
              <td class="px-3 py-2 text-right">${financeWon(r.paid_amount)}</td>
              <td class="px-3 py-2 text-right font-semibold ${r.balance > 0 ? 'text-rose-700' : 'text-slate-700'}">${financeWon(r.balance)}</td>
              <td class="px-3 py-2 text-center"><span class="text-xs font-bold px-2 py-0.5 rounded bg-slate-100">${r.aging}</span></td>
              <td class="px-3 py-2 text-center text-xs">${r.payment_status || '-'}</td>
              <td class="px-3 py-2 text-right space-x-1">
                ${r.balance > 0 ? `
                  <button type="button" onclick="financeMarkSalePaid(${r.id})" class="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded">전액입금</button>
                  <button type="button" onclick="financePartialSalePay(${r.id}, ${Number(r.paid_amount) || 0}, ${Number(r.final_amount) || 0})" class="text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded">부분입금</button>
                ` : '<span class="text-xs text-slate-400">완납</span>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    tableEl.innerHTML = `<div class="py-10 text-rose-600 text-sm">${e.message || e}</div>`;
  }
};

window.financeMarkSalePaid = async function financeMarkSalePaid(saleId) {
  if (!confirm(`판매 #${saleId} 전액 입금 처리할까요?`)) return;
  try {
    await axios.put(`${API_BASE}/sales/${saleId}/payment`, { payment_status: 'paid' });
    await reloadFinanceAr();
  } catch (e) {
    alert(e.response?.data?.error || e.message || '입금 처리 실패');
  }
};

window.financePartialSalePay = async function financePartialSalePay(saleId, prevPaid, finalAmt) {
  const remain = Math.max(0, finalAmt - prevPaid);
  const input = prompt(`부분 입금 후 누적 입금액 (현재 ${prevPaid.toLocaleString()} / 잔액 ${remain.toLocaleString()})`, String(prevPaid + remain));
  if (input == null) return;
  const paid = Number(input);
  if (!Number.isFinite(paid) || paid < 0) {
    alert('올바른 금액을 입력하세요.');
    return;
  }
  const status = paid >= finalAmt ? 'paid' : paid <= 0 ? 'unpaid' : 'partial';
  try {
    await axios.put(`${API_BASE}/sales/${saleId}/payment`, {
      payment_status: status,
      paid_amount: Math.min(paid, finalAmt)
    });
    await reloadFinanceAr();
  } catch (e) {
    alert(e.response?.data?.error || e.message || '입금 처리 실패');
  }
};

window.loadFinanceApPage = async function loadFinanceApPage() {
  const content = document.getElementById('content');
  if (!content) return;
  if (typeof window.setHelpContext === 'function') window.setHelpContext('finance-ap');

  content.innerHTML = `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold text-slate-800">매입채무 (AP)</h2>
          <p class="text-sm text-slate-500">입고된 발주의 미지급 잔액과 연령 분석</p>
        </div>
        <div class="flex items-center gap-2">
          <select id="apStatusFilter" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="open">미지급</option>
            <option value="paid">지급완료</option>
            <option value="all">전체</option>
          </select>
          <button type="button" onclick="reloadFinanceAp()" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
            <i class="fas fa-sync-alt"></i>
          </button>
        </div>
      </div>
      <div id="apSummary"></div>
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div id="apTable" class="overflow-x-auto p-4 text-center text-slate-400">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
      </div>
    </div>
  `;

  document.getElementById('apStatusFilter')?.addEventListener('change', () => reloadFinanceAp());
  await reloadFinanceAp();
};

window.reloadFinanceAp = async function reloadFinanceAp() {
  const status = document.getElementById('apStatusFilter')?.value || 'open';
  const summaryEl = document.getElementById('apSummary');
  const tableEl = document.getElementById('apTable');
  if (!tableEl) return;

  try {
    const res = await axios.get(`${API_BASE}/finance/ap`, { params: { status, limit: 150 } });
    if (!res.data?.success) throw new Error(res.data?.error || '조회 실패');
    const rows = res.data.data || [];
    const summary = res.data.summary || {};
    if (summaryEl) summaryEl.innerHTML = financeAgingCards(summary);

    if (!rows.length) {
      tableEl.innerHTML = '<div class="py-12 text-slate-400 text-sm">표시할 채무가 없습니다. (입고 완료된 발주만 표시)</div>';
      return;
    }

    tableEl.innerHTML = `
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-xs uppercase">
          <tr>
            <th class="px-3 py-2 text-left">발주코드</th>
            <th class="px-3 py-2 text-left">공급사</th>
            <th class="px-3 py-2 text-left">입고일</th>
            <th class="px-3 py-2 text-right">발주액</th>
            <th class="px-3 py-2 text-right">지급액</th>
            <th class="px-3 py-2 text-right">잔액</th>
            <th class="px-3 py-2 text-center">연령</th>
            <th class="px-3 py-2 text-center">상태</th>
            <th class="px-3 py-2 text-right">처리</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${rows.map((r) => `
            <tr class="hover:bg-slate-50">
              <td class="px-3 py-2 font-mono text-xs">${r.code || '#' + r.id}</td>
              <td class="px-3 py-2">${r.supplier_name || '-'}</td>
              <td class="px-3 py-2 text-slate-500 text-xs">${String(r.received_at || r.created_at || '').slice(0, 16)}</td>
              <td class="px-3 py-2 text-right">${financeWon(r.total_amount)}</td>
              <td class="px-3 py-2 text-right">${financeWon(r.paid_amount)}</td>
              <td class="px-3 py-2 text-right font-semibold ${r.balance > 0 ? 'text-rose-700' : 'text-slate-700'}">${financeWon(r.balance)}</td>
              <td class="px-3 py-2 text-center"><span class="text-xs font-bold px-2 py-0.5 rounded bg-slate-100">${r.aging}</span></td>
              <td class="px-3 py-2 text-center text-xs">${r.payment_status || '-'} / ${r.po_status || ''}</td>
              <td class="px-3 py-2 text-right space-x-1">
                ${r.balance > 0 ? `
                  <button type="button" onclick="financeMarkPoPaid(${r.id})" class="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded">전액지급</button>
                  <button type="button" onclick="financePartialPoPay(${r.id}, ${Number(r.paid_amount) || 0}, ${Number(r.total_amount) || 0})" class="text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded">부분지급</button>
                ` : '<span class="text-xs text-slate-400">완납</span>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    tableEl.innerHTML = `<div class="py-10 text-rose-600 text-sm">${e.message || e}</div>`;
  }
};

window.financeMarkPoPaid = async function financeMarkPoPaid(poId) {
  if (!confirm(`발주 #${poId} 전액 지급 처리할까요?`)) return;
  try {
    await axios.put(`${API_BASE}/purchases/${poId}/payment`, { payment_status: 'paid' });
    await reloadFinanceAp();
  } catch (e) {
    alert(e.response?.data?.error || e.message || '지급 처리 실패');
  }
};

window.financePartialPoPay = async function financePartialPoPay(poId, prevPaid, totalAmt) {
  const remain = Math.max(0, totalAmt - prevPaid);
  const input = prompt(`부분 지급 후 누적 지급액 (현재 ${prevPaid.toLocaleString()} / 잔액 ${remain.toLocaleString()})`, String(prevPaid + remain));
  if (input == null) return;
  const paid = Number(input);
  if (!Number.isFinite(paid) || paid < 0) {
    alert('올바른 금액을 입력하세요.');
    return;
  }
  const status = paid >= totalAmt ? 'paid' : paid <= 0 ? 'unpaid' : 'partial';
  try {
    await axios.put(`${API_BASE}/purchases/${poId}/payment`, {
      payment_status: status,
      paid_amount: Math.min(paid, totalAmt)
    });
    await reloadFinanceAp();
  } catch (e) {
    alert(e.response?.data?.error || e.message || '지급 처리 실패');
  }
};

const VOUCHER_TYPE_LABEL = {
  AR_INVOICE: '매출채권',
  AR_RECEIPT: '매출수금',
  AP_INVOICE: '매입채무',
  AP_PAYMENT: '매입지급',
  ADJUST: '조정'
};

window.loadFinanceVouchersPage = async function loadFinanceVouchersPage() {
  const content = document.getElementById('content');
  if (!content) return;
  if (typeof window.setHelpContext === 'function') window.setHelpContext('finance-vouchers');

  content.innerHTML = `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold text-slate-800">전표</h2>
          <p class="text-sm text-slate-500">매출·매입·입금·지급에서 자동 생성된 회계 전표</p>
        </div>
        <div class="flex items-center gap-2">
          <select id="voucherTypeFilter" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">전체 유형</option>
            <option value="AR_INVOICE">매출채권</option>
            <option value="AR_RECEIPT">매출수금</option>
            <option value="AP_INVOICE">매입채무</option>
            <option value="AP_PAYMENT">매입지급</option>
          </select>
          <button type="button" onclick="reloadFinanceVouchers()" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
            <i class="fas fa-sync-alt"></i>
          </button>
        </div>
      </div>
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div id="voucherTable" class="overflow-x-auto p-4 text-center text-slate-400">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
      </div>
    </div>
  `;

  document.getElementById('voucherTypeFilter')?.addEventListener('change', () => reloadFinanceVouchers());
  await reloadFinanceVouchers();
};

window.reloadFinanceVouchers = async function reloadFinanceVouchers() {
  const type = document.getElementById('voucherTypeFilter')?.value || '';
  const tableEl = document.getElementById('voucherTable');
  if (!tableEl) return;

  try {
    const res = await axios.get(`${API_BASE}/finance/vouchers`, { params: { type: type || undefined, limit: 150 } });
    if (!res.data?.success) throw new Error(res.data?.error || '조회 실패');
    const rows = res.data.data || [];

    if (!rows.length) {
      tableEl.innerHTML = '<div class="py-12 text-slate-400 text-sm">전표가 없습니다. 외상판매·입금·입고·지급 시 자동 생성됩니다.</div>';
      return;
    }

    tableEl.innerHTML = `
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-xs uppercase">
          <tr>
            <th class="px-3 py-2 text-left">전표번호</th>
            <th class="px-3 py-2 text-left">유형</th>
            <th class="px-3 py-2 text-left">일자</th>
            <th class="px-3 py-2 text-left">거래처</th>
            <th class="px-3 py-2 text-left">적요</th>
            <th class="px-3 py-2 text-right">금액</th>
            <th class="px-3 py-2 text-center">상태</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${rows.map((r) => `
            <tr class="hover:bg-slate-50">
              <td class="px-3 py-2 font-mono text-xs">${r.voucher_no}</td>
              <td class="px-3 py-2"><span class="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">${VOUCHER_TYPE_LABEL[r.voucher_type] || r.voucher_type}</span></td>
              <td class="px-3 py-2 text-xs text-slate-500">${r.voucher_date || ''}</td>
              <td class="px-3 py-2">${r.partner_name || '-'}</td>
              <td class="px-3 py-2 text-slate-600">${r.description || ''}</td>
              <td class="px-3 py-2 text-right font-semibold">${financeWon(r.amount)}</td>
              <td class="px-3 py-2 text-center text-xs">${r.status || 'posted'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    tableEl.innerHTML = `<div class="py-10 text-rose-600 text-sm">${e.message || e}</div>`;
  }
};
