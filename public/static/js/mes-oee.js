/**
 * MES — 설비 상태 / OEE / WIP
 */

const MES_EQ_STATUS = {
  running: { label: '가동', cls: 'bg-emerald-100 text-emerald-800' },
  idle: { label: '대기', cls: 'bg-slate-100 text-slate-700' },
  stop: { label: '정지', cls: 'bg-amber-100 text-amber-800' },
  breakdown: { label: '고장', cls: 'bg-rose-100 text-rose-800' },
  maintenance: { label: '보전', cls: 'bg-indigo-100 text-indigo-800' }
};

function mesEqBadge(status) {
  const m = MES_EQ_STATUS[status] || { label: status || '-', cls: 'bg-slate-100 text-slate-600' };
  return `<span class="text-[10px] font-bold px-2 py-0.5 rounded ${m.cls}">${m.label}</span>`;
}

function mesPctBar(pct, color = 'bg-teal-500') {
  const w = Math.max(0, Math.min(100, Number(pct) || 0));
  return `
    <div class="flex items-center gap-2">
      <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div class="${color} h-full rounded-full" style="width:${w}%"></div>
      </div>
      <span class="text-xs font-bold w-12 text-right">${w}%</span>
    </div>`;
}

/** 설비 상태 — 실시간 상태 + 이벤트 기록 */
window.loadMesEquipmentPage = async function loadMesEquipmentPage() {
  const content = document.getElementById('content');
  if (!content) return;
  if (typeof window.setHelpContext === 'function') window.setHelpContext('mes-equipment');

  content.innerHTML = `
    <div class="flex flex-col h-full">
      ${window.renderPageHeader({
        title: '설비 상태',
        subtitle: '가동/정지/고장/보전 이벤트를 기록하면 OEE에 반영됩니다',
        icon: 'fa-cogs',
        accent: 'orange',
        actionsHtml: `
          <button type="button" onclick="loadPage('mes-oee')" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">OEE 보기</button>
          <button type="button" onclick="loadPage('production','masters')" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">설비 마스터</button>
          <button type="button" onclick="reloadMesEquipment()" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"><i class="fas fa-sync-alt"></i></button>`
      })}
      <div class="space-y-4 flex-1">
      <div id="mesEqSummary" class="grid grid-cols-2 lg:grid-cols-4 gap-3"></div>
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div id="mesEqTable" class="p-4 text-center text-slate-400"><i class="fas fa-spinner fa-spin"></i></div>
      </div>
      </div>
    </div>
  `;
  await reloadMesEquipment();
};

window.reloadMesEquipment = async function reloadMesEquipment() {
  const table = document.getElementById('mesEqTable');
  const summary = document.getElementById('mesEqSummary');
  if (!table) return;
  try {
    const res = await axios.get(`${API_BASE}/production/ops/equipment`);
    const rows = (res.data.data || []).filter((e) => e.is_active !== 0);
    const counts = { running: 0, idle: 0, breakdown: 0, maintenance: 0 };
    for (const r of rows) {
      if (r.status === 'running') counts.running++;
      else if (r.status === 'breakdown') counts.breakdown++;
      else if (r.status === 'maintenance') counts.maintenance++;
      else counts.idle++;
    }
    if (summary) {
      summary.innerHTML = `
        <div class="rounded-xl border bg-emerald-50 border-emerald-200 p-4"><div class="text-xs font-bold text-emerald-700">가동</div><div class="text-2xl font-bold text-emerald-900">${counts.running}</div></div>
        <div class="rounded-xl border bg-slate-50 border-slate-200 p-4"><div class="text-xs font-bold text-slate-600">대기/정지</div><div class="text-2xl font-bold">${counts.idle}</div></div>
        <div class="rounded-xl border bg-rose-50 border-rose-200 p-4"><div class="text-xs font-bold text-rose-700">고장</div><div class="text-2xl font-bold text-rose-900">${counts.breakdown}</div></div>
        <div class="rounded-xl border bg-indigo-50 border-indigo-200 p-4"><div class="text-xs font-bold text-indigo-700">보전</div><div class="text-2xl font-bold text-indigo-900">${counts.maintenance}</div></div>`;
    }
    if (!rows.length) {
      table.innerHTML = '<div class="py-12 text-slate-400 text-sm">등록된 설비가 없습니다. 기준정보 → BOM·공정·설비에서 추가하세요.</div>';
      return;
    }
    table.innerHTML = `
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-xs text-slate-500 uppercase">
          <tr>
            <th class="px-3 py-2 text-left">설비</th>
            <th class="px-3 py-2 text-left">공정</th>
            <th class="px-3 py-2 text-left">위치</th>
            <th class="px-3 py-2 text-center">상태</th>
            <th class="px-3 py-2 text-right">이벤트</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${rows.map((r) => `
            <tr class="hover:bg-slate-50">
              <td class="px-3 py-3">
                <div class="font-semibold text-slate-800">${r.name}</div>
                <div class="text-xs text-slate-400 font-mono">${r.code || '#' + r.id}</div>
              </td>
              <td class="px-3 py-3 text-slate-600">${r.process_name || '-'}</td>
              <td class="px-3 py-3 text-slate-500 text-xs">${r.location || '-'}</td>
              <td class="px-3 py-3 text-center">${mesEqBadge(r.status)}</td>
              <td class="px-3 py-3 text-right space-x-1">
                <button type="button" onclick="mesEqEvent(${r.id},'run')" class="text-[11px] font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100">가동</button>
                <button type="button" onclick="mesEqEvent(${r.id},'stop')" class="text-[11px] font-bold px-2 py-1 rounded bg-amber-50 text-amber-800 hover:bg-amber-100">정지</button>
                <button type="button" onclick="mesEqEvent(${r.id},'breakdown')" class="text-[11px] font-bold px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100">고장</button>
                <button type="button" onclick="mesEqEvent(${r.id},'maintenance')" class="text-[11px] font-bold px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100">보전</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    table.innerHTML = `<div class="py-8 text-rose-600 text-sm">${e.response?.data?.error || e.message}</div>`;
  }
};

window.mesEqEvent = async function mesEqEvent(id, event_type) {
  const notes = prompt(`이벤트(${event_type}) 비고 (선택, 취소=중단)`, '');
  if (notes === null) return;
  try {
    await axios.post(`${API_BASE}/production/ops/equipment/${id}/events`, {
      event_type,
      notes: notes || undefined
    });
    await reloadMesEquipment();
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

/** OEE 대시보드 */
window.loadMesOeePage = async function loadMesOeePage() {
  const content = document.getElementById('content');
  if (!content) return;
  if (typeof window.setHelpContext === 'function') window.setHelpContext('mes-oee');

  content.innerHTML = `
    <div class="flex flex-col h-full">
      ${window.renderPageHeader({
        title: 'OEE 대시보드',
        subtitle: '가동률(Availability) × 성능 × 품질 — 성능은 이상사이클 미설정 시 100%',
        icon: 'fa-tachometer-alt',
        accent: 'orange',
        actionsHtml: `
          <select id="mesOeeDays" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="1">오늘</option>
            <option value="7" selected>7일</option>
            <option value="30">30일</option>
          </select>
          <button type="button" onclick="loadPage('mes-equipment')" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">설비 상태</button>
          <button type="button" onclick="reloadMesOee()" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"><i class="fas fa-sync-alt"></i></button>`
      })}
      <div class="space-y-4 flex-1">
      <div id="mesOeeSummary" class="grid grid-cols-2 lg:grid-cols-4 gap-3"></div>
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div id="mesOeeTable" class="p-4 text-center text-slate-400"><i class="fas fa-spinner fa-spin"></i></div>
      </div>
      <div class="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        OEE = 가동시간 / (가동+정지+고장+보전) × 성능 × (양품/(양품+불량)).
        설비 상태 화면에서 이벤트를 기록해야 수치가 쌓입니다.
      </div>
      </div>
    </div>
  `;
  document.getElementById('mesOeeDays')?.addEventListener('change', () => reloadMesOee());
  await reloadMesOee();
};

window.reloadMesOee = async function reloadMesOee() {
  const days = document.getElementById('mesOeeDays')?.value || '7';
  const summaryEl = document.getElementById('mesOeeSummary');
  const tableEl = document.getElementById('mesOeeTable');
  if (!tableEl) return;
  try {
    const res = await axios.get(`${API_BASE}/production/ops/oee`, { params: { days } });
    if (!res.data?.success) throw new Error(res.data?.error || '조회 실패');
    const { summary, equipment } = res.data.data || {};
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="rounded-xl border border-teal-200 bg-teal-50 p-4">
          <div class="text-xs font-bold text-teal-700">평균 OEE</div>
          <div class="text-2xl font-bold text-teal-900 mt-1">${summary?.avg_oee ?? 0}%</div>
        </div>
        <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div class="text-xs font-bold text-emerald-700">가동률 A</div>
          <div class="text-2xl font-bold text-emerald-900 mt-1">${summary?.avg_availability ?? 0}%</div>
        </div>
        <div class="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <div class="text-xs font-bold text-indigo-700">성능 P</div>
          <div class="text-2xl font-bold text-indigo-900 mt-1">${summary?.avg_performance ?? 0}%</div>
        </div>
        <div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div class="text-xs font-bold text-amber-700">품질 Q</div>
          <div class="text-2xl font-bold text-amber-900 mt-1">${summary?.avg_quality ?? 0}%</div>
        </div>`;
    }
    const rows = equipment || [];
    if (!rows.length) {
      tableEl.innerHTML = '<div class="py-12 text-slate-400 text-sm">활성 설비가 없습니다.</div>';
      return;
    }
    tableEl.innerHTML = `
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-xs text-slate-500 uppercase">
          <tr>
            <th class="px-3 py-2 text-left">설비</th>
            <th class="px-3 py-2 text-center">상태</th>
            <th class="px-3 py-2 text-left min-w-[120px]">OEE</th>
            <th class="px-3 py-2 text-right">가동분</th>
            <th class="px-3 py-2 text-right">정지/고장</th>
            <th class="px-3 py-2 text-right">A%</th>
            <th class="px-3 py-2 text-right">Q%</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${rows.map((r) => `
            <tr class="hover:bg-slate-50">
              <td class="px-3 py-3">
                <div class="font-semibold">${r.name}</div>
                <div class="text-xs text-slate-400">${r.process_name || r.code || ''}</div>
              </td>
              <td class="px-3 py-3 text-center">${mesEqBadge(r.status)}</td>
              <td class="px-3 py-3">${mesPctBar(r.oee, r.oee >= 85 ? 'bg-teal-500' : r.oee >= 60 ? 'bg-amber-500' : 'bg-rose-500')}</td>
              <td class="px-3 py-3 text-right">${r.minutes?.run ?? 0}</td>
              <td class="px-3 py-3 text-right text-slate-500">${(r.minutes?.stop || 0) + (r.minutes?.breakdown || 0)}</td>
              <td class="px-3 py-3 text-right font-semibold">${r.availability}%</td>
              <td class="px-3 py-3 text-right">${r.quality}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    tableEl.innerHTML = `<div class="py-8 text-rose-600 text-sm">${e.response?.data?.error || e.message}</div>`;
  }
};

/** WIP 현황 */
window.loadMesWipPage = async function loadMesWipPage() {
  const content = document.getElementById('content');
  if (!content) return;
  if (typeof window.setHelpContext === 'function') window.setHelpContext('mes-wip');

  content.innerHTML = `
    <div class="flex flex-col h-full">
      ${window.renderPageHeader({
        title: 'WIP 현황',
        subtitle: '계획·확정·진행 중인 작업지시의 잔량(재공)',
        icon: 'fa-stream',
        accent: 'orange',
        actionsHtml: `
          <button type="button" onclick="loadPage('production','work-orders')" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">작업지시</button>
          <button type="button" onclick="loadPage('production','shopfloor')" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">현장 실행</button>
          <button type="button" onclick="reloadMesWip()" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"><i class="fas fa-sync-alt"></i></button>`
      })}
      <div class="space-y-4 flex-1">
      <div id="mesWipSummary" class="grid grid-cols-3 gap-3"></div>
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div id="mesWipTable" class="p-4 text-center text-slate-400"><i class="fas fa-spinner fa-spin"></i></div>
      </div>
      </div>
    </div>
  `;
  await reloadMesWip();
};

window.reloadMesWip = async function reloadMesWip() {
  const table = document.getElementById('mesWipTable');
  const summary = document.getElementById('mesWipSummary');
  if (!table) return;
  try {
    const res = await axios.get(`${API_BASE}/production/ops/wip`);
    if (!res.data?.success) throw new Error(res.data?.error || '조회 실패');
    const rows = res.data.data || [];
    const s = res.data.summary || {};
    if (summary) {
      summary.innerHTML = `
        <div class="rounded-xl border bg-white p-4"><div class="text-xs font-bold text-slate-500">WIP 건수</div><div class="text-2xl font-bold">${s.count || 0}</div></div>
        <div class="rounded-xl border bg-orange-50 border-orange-200 p-4"><div class="text-xs font-bold text-orange-700">진행중</div><div class="text-2xl font-bold text-orange-900">${s.in_progress || 0}</div></div>
        <div class="rounded-xl border bg-indigo-50 border-indigo-200 p-4"><div class="text-xs font-bold text-indigo-700">잔량 합</div><div class="text-2xl font-bold text-indigo-900">${s.remaining_qty || 0}</div></div>`;
    }
    if (!rows.length) {
      table.innerHTML = '<div class="py-12 text-slate-400 text-sm">열린 작업지시가 없습니다.</div>';
      return;
    }
    const statusLabel = {
      planned: '계획', released: '확정', confirmed: '확정', in_progress: '진행'
    };
    table.innerHTML = `
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-xs text-slate-500 uppercase">
          <tr>
            <th class="px-3 py-2 text-left">WO</th>
            <th class="px-3 py-2 text-left">제품</th>
            <th class="px-3 py-2 text-left">공정/설비</th>
            <th class="px-3 py-2 text-center">상태</th>
            <th class="px-3 py-2 text-right">계획</th>
            <th class="px-3 py-2 text-right">완료</th>
            <th class="px-3 py-2 text-right">잔량</th>
            <th class="px-3 py-2 text-left min-w-[100px]">진척</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${rows.map((r) => `
            <tr class="hover:bg-slate-50">
              <td class="px-3 py-2 font-mono text-xs font-bold">${r.wo_number}</td>
              <td class="px-3 py-2">${r.product_name || '-'}<div class="text-xs text-slate-400">${r.sku || ''}</div></td>
              <td class="px-3 py-2 text-xs text-slate-600">${r.process_name || '-'} / ${r.equipment_name || '-'}</td>
              <td class="px-3 py-2 text-center"><span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100">${statusLabel[r.status] || r.status}</span></td>
              <td class="px-3 py-2 text-right">${r.planned_qty}</td>
              <td class="px-3 py-2 text-right">${r.completed_qty ?? r.produced_qty}</td>
              <td class="px-3 py-2 text-right font-semibold text-indigo-700">${r.remaining_qty}</td>
              <td class="px-3 py-2">${mesPctBar(r.progress_pct, 'bg-indigo-500')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    table.innerHTML = `<div class="py-8 text-rose-600 text-sm">${e.response?.data?.error || e.message}</div>`;
  }
};
