/**
 * MES Phase 2 — 예방보전(PM) / SPC / 능력·부하 계획
 */

function mes2WonHours(n) {
  return (Math.round((Number(n) || 0) * 10) / 10).toLocaleString('ko-KR');
}

function mes2StatusBadge(status) {
  const map = {
    scheduled: { label: '예정', cls: 'bg-slate-100 text-slate-700' },
    overdue: { label: '지연', cls: 'bg-rose-100 text-rose-800' },
    in_progress: { label: '진행', cls: 'bg-amber-100 text-amber-800' },
    done: { label: '완료', cls: 'bg-emerald-100 text-emerald-800' },
    skipped: { label: '건너뜀', cls: 'bg-slate-100 text-slate-500' },
    open: { label: '대기', cls: 'bg-slate-100 text-slate-700' }
  };
  const m = map[status] || { label: status || '-', cls: 'bg-slate-100 text-slate-600' };
  return `<span class="text-[10px] font-bold px-2 py-0.5 rounded ${m.cls}">${m.label}</span>`;
}

async function mes2LoadEquipmentOptions() {
  const res = await axios.get(`${API_BASE}/production/ops/equipment`);
  return (res.data.data || []).filter((e) => e.is_active !== 0);
}

/* ========== PM ========== */
window.loadMesPmPage = async function loadMesPmPage() {
  const content = document.getElementById('content');
  if (!content) return;
  if (typeof window.setHelpContext === 'function') window.setHelpContext('mes-pm');

  content.innerHTML = `
    <div class="flex flex-col h-full">
      ${window.renderPageHeader({
        title: '예방보전 (PM)',
        subtitle: '설비별 주기 계획 · 일정 · 보전 작업 — 시작 시 설비 상태가 보전으로 기록됩니다',
        icon: 'fa-tools',
        accent: 'orange',
        actionsHtml: `
          <button type="button" onclick="loadPage('mes-equipment')" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">설비 상태</button>
          <button type="button" onclick="reloadMesPm()" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"><i class="fas fa-sync-alt"></i></button>`
      })}
      <div class="space-y-4 flex-1">
        <div id="mesPmSummary" class="grid grid-cols-2 lg:grid-cols-4 gap-3"></div>
        <div class="grid lg:grid-cols-5 gap-4">
          <div class="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 class="font-bold text-slate-800 text-sm">보전 계획 등록</h3>
            <div>
              <label class="text-xs font-bold text-slate-500">설비</label>
              <select id="pmPlanEquipment" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"></select>
            </div>
            <div>
              <label class="text-xs font-bold text-slate-500">계획명</label>
              <input id="pmPlanName" type="text" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="예: 월간 정기보전">
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-xs font-bold text-slate-500">주기(일)</label>
                <input id="pmPlanInterval" type="number" min="1" value="30" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
              </div>
              <div>
                <label class="text-xs font-bold text-slate-500">예상(분)</label>
                <input id="pmPlanMinutes" type="number" min="1" value="60" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
              </div>
            </div>
            <div>
              <label class="text-xs font-bold text-slate-500">체크리스트 (줄바꿈)</label>
              <textarea id="pmPlanChecklist" rows="3" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">육안 점검
윤활
이상음/진동 확인</textarea>
            </div>
            <button type="button" onclick="submitMesPmPlan()" class="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded-lg">계획 등록 + 일정 생성</button>
          </div>
          <div class="lg:col-span-3 space-y-4">
            <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div class="px-4 py-3 bg-slate-50 border-b flex justify-between items-center">
                <span class="text-sm font-bold text-slate-700">보전 일정</span>
                <select id="pmScheduleFilter" class="border border-slate-300 rounded-lg px-2 py-1 text-xs">
                  <option value="">예정·지연·진행</option>
                  <option value="overdue">지연만</option>
                  <option value="all">전체</option>
                </select>
              </div>
              <div id="mesPmSchedules" class="p-4 text-center text-slate-400 text-sm"><i class="fas fa-spinner fa-spin"></i></div>
            </div>
            <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div class="px-4 py-3 bg-slate-50 border-b text-sm font-bold text-slate-700">최근 보전 작업</div>
              <div id="mesPmWorkOrders" class="p-4 text-center text-slate-400 text-sm"><i class="fas fa-spinner fa-spin"></i></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const eqs = await mes2LoadEquipmentOptions();
  document.getElementById('pmPlanEquipment').innerHTML =
    eqs.map((e) => `<option value="${e.id}">${e.name}${e.code ? ` (${e.code})` : ''}</option>`).join('')
    || '<option value="">설비 없음</option>';

  document.getElementById('pmScheduleFilter')?.addEventListener('change', () => reloadMesPmSchedules());
  await reloadMesPm();
};

window.reloadMesPm = async function reloadMesPm() {
  await Promise.all([reloadMesPmSummary(), reloadMesPmSchedules(), reloadMesPmWorkOrders()]);
};

async function reloadMesPmSummary() {
  const el = document.getElementById('mesPmSummary');
  if (!el) return;
  try {
    const res = await axios.get(`${API_BASE}/production/ops/pm/dashboard`);
    const d = res.data.data || {};
    el.innerHTML = `
      <div class="rounded-xl border border-slate-200 bg-white p-4"><div class="text-xs text-slate-500">활성 계획</div><div class="text-xl font-bold text-slate-800">${d.active_plans || 0}</div></div>
      <div class="rounded-xl border border-rose-200 bg-rose-50 p-4"><div class="text-xs text-rose-700">지연</div><div class="text-xl font-bold text-rose-800">${d.overdue || 0}</div></div>
      <div class="rounded-xl border border-amber-200 bg-amber-50 p-4"><div class="text-xs text-amber-800">7일 내 예정</div><div class="text-xl font-bold text-amber-900">${d.due_week || 0}</div></div>
      <div class="rounded-xl border border-orange-200 bg-orange-50 p-4"><div class="text-xs text-orange-800">진행 작업</div><div class="text-xl font-bold text-orange-900">${d.open_wo || 0}</div></div>
    `;
  } catch {
    el.innerHTML = '';
  }
}

window.reloadMesPmSchedules = async function reloadMesPmSchedules() {
  const el = document.getElementById('mesPmSchedules');
  if (!el) return;
  const status = document.getElementById('pmScheduleFilter')?.value || '';
  try {
    const res = await axios.get(`${API_BASE}/production/ops/pm/schedules`, { params: { status: status || undefined } });
    const rows = res.data.data || [];
    if (!rows.length) {
      el.innerHTML = '<div class="py-8 text-slate-400">표시할 일정이 없습니다. 계획을 등록하세요.</div>';
      return;
    }
    el.innerHTML = `
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-xs text-slate-500">
          <tr>
            <th class="px-3 py-2 text-left">예정일</th>
            <th class="px-3 py-2 text-left">설비</th>
            <th class="px-3 py-2 text-left">계획</th>
            <th class="px-3 py-2 text-left">상태</th>
            <th class="px-3 py-2 text-right">액션</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${rows.map((r) => `
            <tr>
              <td class="px-3 py-2 font-medium">${r.due_date || '-'}</td>
              <td class="px-3 py-2">${r.equipment_name || ''}</td>
              <td class="px-3 py-2 text-slate-600">${r.plan_name || ''}</td>
              <td class="px-3 py-2">${mes2StatusBadge(r.status)}</td>
              <td class="px-3 py-2 text-right space-x-1">
                ${['scheduled', 'overdue'].includes(r.status)
                  ? `<button type="button" onclick="startMesPmSchedule(${r.id})" class="text-xs px-2 py-1 rounded bg-orange-600 text-white hover:bg-orange-700">시작</button>
                     <button type="button" onclick="skipMesPmSchedule(${r.id})" class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">건너뛰기</button>`
                  : r.status === 'in_progress' && r.work_order_id
                    ? `<button type="button" onclick="completeMesPmWo(${r.work_order_id})" class="text-xs px-2 py-1 rounded bg-emerald-600 text-white">완료</button>`
                    : '-'}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="py-6 text-rose-600 text-sm">${e.response?.data?.error || e.message}</div>`;
  }
};

window.reloadMesPmWorkOrders = async function reloadMesPmWorkOrders() {
  const el = document.getElementById('mesPmWorkOrders');
  if (!el) return;
  try {
    const res = await axios.get(`${API_BASE}/production/ops/pm/work-orders`, { params: { status: 'all' } });
    const rows = (res.data.data || []).slice(0, 20);
    if (!rows.length) {
      el.innerHTML = '<div class="py-6 text-slate-400">보전 작업 이력이 없습니다.</div>';
      return;
    }
    el.innerHTML = `
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-xs text-slate-500">
          <tr>
            <th class="px-3 py-2 text-left">번호</th>
            <th class="px-3 py-2 text-left">설비</th>
            <th class="px-3 py-2 text-left">상태</th>
            <th class="px-3 py-2 text-left">시작</th>
            <th class="px-3 py-2 text-right">액션</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${rows.map((r) => `
            <tr>
              <td class="px-3 py-2 font-mono text-xs">${r.pm_number}</td>
              <td class="px-3 py-2">${r.equipment_name || ''}</td>
              <td class="px-3 py-2">${mes2StatusBadge(r.status)}</td>
              <td class="px-3 py-2 text-xs text-slate-500">${(r.started_at || '').replace('T', ' ').slice(0, 16)}</td>
              <td class="px-3 py-2 text-right">
                ${r.status === 'in_progress'
                  ? `<button type="button" onclick="completeMesPmWo(${r.id})" class="text-xs px-2 py-1 rounded bg-emerald-600 text-white">완료</button>`
                  : '-'}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="py-6 text-rose-600 text-sm">${e.response?.data?.error || e.message}</div>`;
  }
};

window.submitMesPmPlan = async function submitMesPmPlan() {
  const equipment_id = Number(document.getElementById('pmPlanEquipment')?.value);
  const name = document.getElementById('pmPlanName')?.value?.trim();
  const checklist = (document.getElementById('pmPlanChecklist')?.value || '')
    .split('\n').map((s) => s.trim()).filter(Boolean);
  try {
    const res = await axios.post(`${API_BASE}/production/ops/pm/plans`, {
      equipment_id,
      name,
      interval_days: Number(document.getElementById('pmPlanInterval')?.value) || 30,
      estimated_minutes: Number(document.getElementById('pmPlanMinutes')?.value) || 60,
      checklist
    });
    alert(`계획이 등록되었습니다. 일정 ${res.data.data?.schedules_created || 0}건 생성.`);
    document.getElementById('pmPlanName').value = '';
    await reloadMesPm();
  } catch (e) {
    alert(e.response?.data?.error || e.message || '등록 실패');
  }
};

window.startMesPmSchedule = async function startMesPmSchedule(id) {
  if (!confirm('보전을 시작하면 설비 상태가 「보전」으로 기록됩니다. 진행할까요?')) return;
  try {
    await axios.post(`${API_BASE}/production/ops/pm/schedules/${id}/start`, {});
    await reloadMesPm();
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

window.skipMesPmSchedule = async function skipMesPmSchedule(id) {
  if (!confirm('이 일정을 건너뛸까요?')) return;
  try {
    await axios.post(`${API_BASE}/production/ops/pm/schedules/${id}/skip`, {});
    await reloadMesPm();
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

window.completeMesPmWo = async function completeMesPmWo(id) {
  if (!confirm('보전을 완료하면 설비 상태를 대기로 되돌립니다. 완료할까요?')) return;
  try {
    await axios.post(`${API_BASE}/production/ops/pm/work-orders/${id}/complete`, {});
    alert('보전이 완료되었습니다.');
    await reloadMesPm();
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

/* ========== SPC ========== */
window.loadMesSpcPage = async function loadMesSpcPage() {
  const content = document.getElementById('content');
  if (!content) return;
  if (typeof window.setHelpContext === 'function') window.setHelpContext('mes-spc');

  content.innerHTML = `
    <div class="flex flex-col h-full">
      ${window.renderPageHeader({
        title: 'SPC 관리도',
        subtitle: '측정 특성 등록 · 개체관리도(평균±3σ) · 규격(USL/LSL) 이탈 표시',
        icon: 'fa-chart-line',
        accent: 'orange',
        actionsHtml: `
          <button type="button" onclick="loadPage('production','quality')" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">검사 · NCR</button>
          <button type="button" onclick="reloadMesSpc()" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"><i class="fas fa-sync-alt"></i></button>`
      })}
      <div class="space-y-4 flex-1">
        <div class="grid lg:grid-cols-5 gap-4">
          <div class="lg:col-span-2 space-y-4">
            <div class="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 class="font-bold text-sm text-slate-800">측정 특성 등록</h3>
              <input id="spcCharName" type="text" placeholder="특성명 (예: 외경)" class="w-full border rounded-lg px-3 py-2 text-sm">
              <div class="grid grid-cols-3 gap-2">
                <div><label class="text-[10px] font-bold text-slate-500">단위</label><input id="spcCharUnit" class="w-full border rounded px-2 py-1.5 text-sm" placeholder="mm"></div>
                <div><label class="text-[10px] font-bold text-slate-500">목표</label><input id="spcCharTarget" type="number" step="any" class="w-full border rounded px-2 py-1.5 text-sm"></div>
                <div><label class="text-[10px] font-bold text-slate-500">설비</label><select id="spcCharEq" class="w-full border rounded px-2 py-1.5 text-sm"></select></div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div><label class="text-[10px] font-bold text-slate-500">USL</label><input id="spcCharUsl" type="number" step="any" class="w-full border rounded px-2 py-1.5 text-sm"></div>
                <div><label class="text-[10px] font-bold text-slate-500">LSL</label><input id="spcCharLsl" type="number" step="any" class="w-full border rounded px-2 py-1.5 text-sm"></div>
              </div>
              <button type="button" onclick="submitMesSpcChar()" class="w-full bg-orange-600 text-white font-bold py-2 rounded-lg">등록</button>
            </div>
            <div class="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 class="font-bold text-sm text-slate-800">측정값 입력</h3>
              <select id="spcMeasChar" class="w-full border rounded-lg px-3 py-2 text-sm"></select>
              <input id="spcMeasValue" type="number" step="any" placeholder="측정값" class="w-full border rounded-lg px-3 py-2 text-sm">
              <input id="spcMeasLot" type="text" placeholder="Lot (선택)" class="w-full border rounded-lg px-3 py-2 text-sm">
              <button type="button" onclick="submitMesSpcMeas()" class="w-full bg-teal-600 text-white font-bold py-2 rounded-lg">기록</button>
            </div>
          </div>
          <div class="lg:col-span-3 space-y-4">
            <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div class="px-4 py-3 bg-slate-50 border-b text-sm font-bold">특성 목록</div>
              <div id="mesSpcChars" class="p-4 text-sm text-slate-400"><i class="fas fa-spinner fa-spin"></i></div>
            </div>
            <div class="bg-white border border-slate-200 rounded-xl p-4">
              <div class="flex justify-between items-center mb-3">
                <h3 class="font-bold text-sm text-slate-800">관리도</h3>
                <span id="mesSpcStats" class="text-xs text-slate-500"></span>
              </div>
              <div id="mesSpcChart" class="min-h-[200px] flex items-end gap-0.5 border-b border-l border-slate-200 px-2 pb-1"></div>
              <p class="text-xs text-slate-400 mt-2">점: 최근 측정값 · 빨간 점=관리한계(UCL/LCL) 이탈 · 보라 테=규격 이탈</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const eqs = await mes2LoadEquipmentOptions();
  document.getElementById('spcCharEq').innerHTML =
    '<option value="">(선택)</option>' + eqs.map((e) => `<option value="${e.id}">${e.name}</option>`).join('');
  await reloadMesSpc();
};

window.reloadMesSpc = async function reloadMesSpc() {
  const el = document.getElementById('mesSpcChars');
  const sel = document.getElementById('spcMeasChar');
  try {
    const res = await axios.get(`${API_BASE}/production/ops/spc/characteristics`);
    const rows = res.data.data || [];
    if (sel) {
      sel.innerHTML = rows.map((r) => `<option value="${r.id}">${r.name}${r.unit ? ` (${r.unit})` : ''}</option>`).join('')
        || '<option value="">없음</option>';
    }
    if (!el) return;
    if (!rows.length) {
      el.innerHTML = '<div class="py-6 text-slate-400">등록된 특성이 없습니다.</div>';
      document.getElementById('mesSpcChart').innerHTML = '';
      return;
    }
    el.innerHTML = `
      <table class="min-w-full text-sm">
        <thead class="text-xs text-slate-500 bg-slate-50"><tr>
          <th class="px-3 py-2 text-left">특성</th>
          <th class="px-3 py-2 text-right">표본</th>
          <th class="px-3 py-2 text-right">최근값</th>
          <th class="px-3 py-2 text-right"></th>
        </tr></thead>
        <tbody class="divide-y">
          ${rows.map((r) => `
            <tr>
              <td class="px-3 py-2"><div class="font-medium">${r.name}</div>
                <div class="text-[11px] text-slate-400">규격 ${r.lsl ?? '-'} ~ ${r.usl ?? '-'}</div></td>
              <td class="px-3 py-2 text-right">${r.sample_count || 0}</td>
              <td class="px-3 py-2 text-right font-mono">${r.last_value != null ? r.last_value : '-'}</td>
              <td class="px-3 py-2 text-right"><button type="button" onclick="loadMesSpcChart(${r.id})" class="text-xs text-orange-700 font-semibold hover:underline">차트</button></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
    await loadMesSpcChart(rows[0].id);
  } catch (e) {
    if (el) el.innerHTML = `<div class="text-rose-600">${e.response?.data?.error || e.message}</div>`;
  }
};

window.submitMesSpcChar = async function submitMesSpcChar() {
  try {
    await axios.post(`${API_BASE}/production/ops/spc/characteristics`, {
      name: document.getElementById('spcCharName')?.value?.trim(),
      unit: document.getElementById('spcCharUnit')?.value || null,
      target: document.getElementById('spcCharTarget')?.value || null,
      usl: document.getElementById('spcCharUsl')?.value || null,
      lsl: document.getElementById('spcCharLsl')?.value || null,
      equipment_id: document.getElementById('spcCharEq')?.value || null
    });
    document.getElementById('spcCharName').value = '';
    await reloadMesSpc();
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

window.submitMesSpcMeas = async function submitMesSpcMeas() {
  try {
    await axios.post(`${API_BASE}/production/ops/spc/measurements`, {
      characteristic_id: Number(document.getElementById('spcMeasChar')?.value),
      value: Number(document.getElementById('spcMeasValue')?.value),
      lot_number: document.getElementById('spcMeasLot')?.value || null
    });
    document.getElementById('spcMeasValue').value = '';
    await reloadMesSpc();
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};

window.loadMesSpcChart = async function loadMesSpcChart(id) {
  const chart = document.getElementById('mesSpcChart');
  const statsEl = document.getElementById('mesSpcStats');
  if (!chart) return;
  try {
    const res = await axios.get(`${API_BASE}/production/ops/spc/characteristics/${id}/chart`, { params: { limit: 40 } });
    const { points, stats } = res.data.data || {};
    if (statsEl && stats) {
      statsEl.textContent = `n=${stats.count} · μ=${stats.mean} · σ=${stats.stdev} · OOC ${stats.ooc_count} · OOS ${stats.oos_count}`;
    }
    if (!points?.length) {
      chart.innerHTML = '<div class="text-slate-400 text-sm p-8">측정값이 없습니다.</div>';
      return;
    }
    const vals = points.map((p) => p.value);
    const min = Math.min(...vals, stats.lcl, stats.ucl);
    const max = Math.max(...vals, stats.lcl, stats.ucl);
    const span = max - min || 1;
    chart.innerHTML = points.map((p) => {
      const h = Math.max(4, Math.round(((p.value - min) / span) * 160));
      const color = p.ooc ? 'bg-rose-500' : 'bg-orange-400';
      const ring = p.oos ? 'ring-2 ring-violet-500' : '';
      return `<div class="flex-1 flex flex-col justify-end items-center group relative" title="${p.measured_at}: ${p.value}">
        <div class="w-full max-w-[14px] ${color} ${ring} rounded-t" style="height:${h}px"></div>
      </div>`;
    }).join('');
  } catch (e) {
    chart.innerHTML = `<div class="text-rose-600 text-sm">${e.response?.data?.error || e.message}</div>`;
  }
};

/* ========== Capacity ========== */
window.loadMesCapaPage = async function loadMesCapaPage() {
  const content = document.getElementById('content');
  if (!content) return;
  if (typeof window.setHelpContext === 'function') window.setHelpContext('mes-capa');

  content.innerHTML = `
    <div class="flex flex-col h-full">
      ${window.renderPageHeader({
        title: '능력 · 부하 계획',
        subtitle: '설비 일일 능력 대비 열린 작업지시 부하(표준공수×잔량)',
        icon: 'fa-chart-area',
        accent: 'orange',
        actionsHtml: `
          <select id="capaDays" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="7">7일</option>
            <option value="14">14일</option>
            <option value="30">30일</option>
          </select>
          <button type="button" onclick="loadPage('production','schedule')" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">생산 일정</button>
          <button type="button" onclick="reloadMesCapa()" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"><i class="fas fa-sync-alt"></i></button>`
      })}
      <div class="space-y-4 flex-1">
        <div id="mesCapaSummary" class="grid grid-cols-2 lg:grid-cols-4 gap-3"></div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900">
          부하는 열린 WO의 잔여 수량 × 공정 표준분(standard_minutes)으로 계산합니다. 표준분이 없으면 수량당 1시간으로 가정합니다.
        </div>
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div id="mesCapaTable" class="p-4 text-center text-slate-400"><i class="fas fa-spinner fa-spin"></i></div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('capaDays')?.addEventListener('change', () => reloadMesCapa());
  await reloadMesCapa();
};

window.reloadMesCapa = async function reloadMesCapa() {
  const days = document.getElementById('capaDays')?.value || '7';
  const table = document.getElementById('mesCapaTable');
  const summary = document.getElementById('mesCapaSummary');
  try {
    const res = await axios.get(`${API_BASE}/production/ops/capa/load`, { params: { days } });
    const rows = res.data.data || [];
    const s = res.data.summary || {};
    if (summary) {
      summary.innerHTML = `
        <div class="rounded-xl border bg-white p-4"><div class="text-xs text-slate-500">설비</div><div class="text-xl font-bold">${s.equipment_count || 0}</div></div>
        <div class="rounded-xl border bg-white p-4"><div class="text-xs text-slate-500">평균 가동부하</div><div class="text-xl font-bold">${s.avg_utilization || 0}%</div></div>
        <div class="rounded-xl border border-rose-200 bg-rose-50 p-4"><div class="text-xs text-rose-700">과부하</div><div class="text-xl font-bold text-rose-800">${s.overload_count || 0}</div></div>
        <div class="rounded-xl border bg-white p-4"><div class="text-xs text-slate-500">기간</div><div class="text-xl font-bold">${s.days || days}일</div></div>`;
    }
    if (!table) return;
    if (!rows.length) {
      table.innerHTML = '<div class="py-10 text-slate-400">활성 설비가 없습니다. 설비 마스터를 등록하세요.</div>';
      return;
    }
    table.innerHTML = `
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-xs text-slate-500">
          <tr>
            <th class="px-3 py-2 text-left">설비</th>
            <th class="px-3 py-2 text-left">공정</th>
            <th class="px-3 py-2 text-right">능력(h)</th>
            <th class="px-3 py-2 text-right">부하(h)</th>
            <th class="px-3 py-2 text-right">가동부하</th>
            <th class="px-3 py-2 text-right">열린 WO</th>
            <th class="px-3 py-2 text-right">일일능력(h)</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          ${rows.map((r) => {
            const barColor = r.level === 'overload' ? 'bg-rose-500' : r.level === 'high' ? 'bg-amber-500' : 'bg-emerald-500';
            const pct = Math.min(100, r.utilization_pct);
            return `<tr>
              <td class="px-3 py-2 font-medium">${r.name}<div class="text-[11px] text-slate-400">${r.code || ''}</div></td>
              <td class="px-3 py-2 text-slate-600">${r.process_name || '-'}</td>
              <td class="px-3 py-2 text-right">${mes2WonHours(r.capacity_hours)}</td>
              <td class="px-3 py-2 text-right">${mes2WonHours(r.load_hours)}</td>
              <td class="px-3 py-2">
                <div class="flex items-center gap-2 justify-end">
                  <div class="w-24 h-2 bg-slate-100 rounded-full overflow-hidden"><div class="${barColor} h-full" style="width:${pct}%"></div></div>
                  <span class="text-xs font-bold w-12 text-right">${r.utilization_pct}%</span>
                </div>
              </td>
              <td class="px-3 py-2 text-right">${r.open_wo}</td>
              <td class="px-3 py-2 text-right">
                <input type="number" min="0.5" max="24" step="0.5" value="${(r.capacity_hours / Number(days)).toFixed(1)}"
                  class="w-16 border rounded px-1 py-0.5 text-right text-xs"
                  onchange="updateMesCapaHours(${r.equipment_id}, this.value)">
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    if (table) table.innerHTML = `<div class="py-8 text-rose-600">${e.response?.data?.error || e.message}</div>`;
  }
};

window.updateMesCapaHours = async function updateMesCapaHours(id, hours) {
  try {
    await axios.put(`${API_BASE}/production/ops/capa/equipment/${id}`, {
      capacity_hours_per_day: Number(hours)
    });
    await reloadMesCapa();
  } catch (e) {
    alert(e.response?.data?.error || e.message);
  }
};
