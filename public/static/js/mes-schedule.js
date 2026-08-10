// 생산 일정판 — 주간 보드 + 드래그 앤 드롭

window._mesSchedule = {
  weekStart: null, // Date (월요일)
  rows: [],
  hideDone: true
};

function msEsc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function msDateKey(d) {
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function msStartOfWeek(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=일
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function msAddDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function msWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => msAddDays(weekStart, i));
}

async function loadMesSchedule() {
  const container = document.getElementById('mes-tab-content');
  if (!container) return;

  if (!window._mesSchedule.weekStart) {
    window._mesSchedule.weekStart = msStartOfWeek(new Date());
  }

  container.innerHTML = `
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
      <div>
        <h2 class="text-lg font-bold text-slate-800">
          <i class="fas fa-calendar-alt mr-2 text-orange-600"></i>생산 일정
        </h2>
        <p class="text-sm text-slate-500 mt-0.5">카드를 날짜 칸으로 끌어 일정을 배치하세요. 미배정 풀에서 끌어오면 됩니다.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" onclick="mesScheduleShiftWeek(-1)" class="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">
          <i class="fas fa-chevron-left"></i>
        </button>
        <button type="button" onclick="mesScheduleGoToday()" class="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">이번 주</button>
        <button type="button" onclick="mesScheduleShiftWeek(1)" class="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">
          <i class="fas fa-chevron-right"></i>
        </button>
        <span id="mes-schedule-range" class="text-sm font-semibold text-slate-700 px-2"></span>
        <label class="inline-flex items-center gap-2 text-sm text-slate-600 ml-1">
          <input type="checkbox" id="mes-schedule-hide-done" ${window._mesSchedule.hideDone ? 'checked' : ''}
            onchange="window._mesSchedule.hideDone=this.checked;mesScheduleRenderBoard()"
            class="rounded border-slate-300 text-orange-600 focus:ring-orange-500">
          완료/취소 숨김
        </label>
        <button type="button" onclick="mesScheduleReload()" class="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700">
          <i class="fas fa-sync-alt mr-1"></i>새로고침
        </button>
      </div>
    </div>

    <div id="mes-schedule-summary" class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"></div>
    <div id="mes-schedule-board" class="text-center py-16 text-slate-400">
      <i class="fas fa-spinner fa-spin text-3xl text-orange-500"></i>
    </div>
  `;

  await mesScheduleReload();
}

window.mesScheduleShiftWeek = function (delta) {
  window._mesSchedule.weekStart = msAddDays(window._mesSchedule.weekStart, delta * 7);
  mesScheduleRenderBoard();
};

window.mesScheduleGoToday = function () {
  window._mesSchedule.weekStart = msStartOfWeek(new Date());
  mesScheduleRenderBoard();
};

window.mesScheduleReload = async function () {
  const board = document.getElementById('mes-schedule-board');
  if (board) {
    board.innerHTML = '<div class="text-center py-16 text-slate-400"><i class="fas fa-spinner fa-spin text-3xl text-orange-500"></i></div>';
  }
  try {
    const res = await axios.get(`${API_BASE}/production/work-orders`);
    window._mesSchedule.rows = res.data.data || [];
    mesScheduleRenderBoard();
  } catch (e) {
    if (board) {
      board.innerHTML = `<div class="text-center py-10 text-rose-600">${msEsc(e.response?.data?.error || e.message)}</div>`;
    }
  }
};

function mesScheduleVisibleRows() {
  let rows = window._mesSchedule.rows || [];
  if (window._mesSchedule.hideDone) {
    rows = rows.filter((w) => !['completed', 'cancelled'].includes(w.status));
  }
  return rows;
}

function mesScheduleCardHtml(wo) {
  const locked = ['completed', 'cancelled'].includes(wo.status);
  const statusCls = (typeof MES_STATUS_CLASS !== 'undefined' && MES_STATUS_CLASS[wo.status]) || 'bg-slate-100 text-slate-700';
  const statusLabel = (typeof MES_STATUS_LABEL !== 'undefined' && MES_STATUS_LABEL[wo.status]) || wo.status;
  const today = msDateKey(new Date());
  const end = (wo.planned_end_date || wo.planned_start_date || '').toString().slice(0, 10);
  const overdue = end && end < today && !['completed', 'cancelled'].includes(wo.status);

  return `
    <div class="mes-sch-card bg-white border ${overdue ? 'border-rose-300' : 'border-slate-200'} rounded-lg p-2.5 shadow-sm cursor-grab active:cursor-grabbing hover:border-orange-300 transition select-none"
      draggable="${locked ? 'false' : 'true'}"
      data-wo-id="${wo.id}"
      ondragstart="mesScheduleDragStart(event, ${wo.id})"
      title="${msEsc(wo.wo_number)} — ${msEsc(wo.product_name || '')}">
      <div class="flex items-start justify-between gap-1 mb-1">
        <div class="font-bold text-xs text-slate-800 truncate">${msEsc(wo.wo_number)}</div>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${statusCls}">${statusLabel}</span>
      </div>
      <div class="text-xs text-slate-600 line-clamp-2 leading-snug">${msEsc(wo.product_name || '')}</div>
      <div class="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
        <span>${Number(wo.completed_qty || 0)}/${Number(wo.planned_qty || 0)}</span>
        ${wo.equipment_name ? `<span class="truncate max-w-[50%]"><i class="fas fa-industry mr-0.5"></i>${msEsc(wo.equipment_name)}</span>` : ''}
      </div>
      ${overdue ? '<div class="mt-1 text-[10px] text-rose-600 font-semibold">납기 지연</div>' : ''}
    </div>`;
}

function mesScheduleRenderBoard() {
  const board = document.getElementById('mes-schedule-board');
  const rangeEl = document.getElementById('mes-schedule-range');
  const summaryEl = document.getElementById('mes-schedule-summary');
  if (!board) return;

  const weekStart = window._mesSchedule.weekStart;
  const days = msWeekDays(weekStart);
  const from = msDateKey(days[0]);
  const to = msDateKey(days[6]);
  if (rangeEl) rangeEl.textContent = `${from} ~ ${to}`;

  const rows = mesScheduleVisibleRows();
  const todayKey = msDateKey(new Date());

  const unscheduled = rows.filter((w) => !w.planned_start_date || !String(w.planned_start_date).trim());
  const byDay = {};
  days.forEach((d) => { byDay[msDateKey(d)] = []; });

  rows.forEach((w) => {
    if (!w.planned_start_date) return;
    const start = String(w.planned_start_date).slice(0, 10);
    // 카드는 시작일 칸에 표시 (멀티데이는 시작 칸)
    if (byDay[start]) byDay[start].push(w);
    else if (start < from && (w.planned_end_date || start) >= from) {
      // 주에 걸쳐 있는 경우 월요일 칸에 표시
      byDay[from].push(w);
    }
  });

  const weekCount = Object.values(byDay).reduce((n, arr) => n + arr.length, 0);
  const overdue = rows.filter((w) => {
    const end = (w.planned_end_date || w.planned_start_date || '').toString().slice(0, 10);
    return end && end < todayKey && !['completed', 'cancelled'].includes(w.status);
  }).length;

  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-xs text-slate-500">미배정</div>
        <div class="text-2xl font-bold text-slate-800">${unscheduled.length}</div>
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-xs text-slate-500">이번 주 배치</div>
        <div class="text-2xl font-bold text-orange-700">${weekCount}</div>
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-xs text-slate-500">진행중</div>
        <div class="text-2xl font-bold text-amber-700">${rows.filter((w) => w.status === 'in_progress').length}</div>
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-xs text-slate-500">납기 지연</div>
        <div class="text-2xl font-bold text-rose-700">${overdue}</div>
      </div>
    `;
  }

  const dayNames = ['월', '화', '수', '목', '금', '토', '일'];

  board.innerHTML = `
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <div class="xl:col-span-2">
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden h-full min-h-[420px] flex flex-col"
          ondragover="mesScheduleAllowDrop(event)" ondrop="mesScheduleDrop(event, null)">
          <div class="px-3 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span class="text-xs font-bold text-slate-700"><i class="fas fa-inbox mr-1 text-slate-400"></i>미배정</span>
            <span class="text-[10px] text-slate-400">${unscheduled.length}</span>
          </div>
          <div class="p-2 space-y-2 flex-1 overflow-y-auto max-h-[70vh]">
            ${unscheduled.length
              ? unscheduled.map(mesScheduleCardHtml).join('')
              : '<div class="text-center text-xs text-slate-400 py-8">미배정 작업이 없습니다</div>'}
          </div>
        </div>
      </div>

      <div class="xl:col-span-10 overflow-x-auto">
        <div class="grid grid-cols-7 gap-2 min-w-[840px]">
          ${days.map((d, i) => {
            const key = msDateKey(d);
            const isToday = key === todayKey;
            const list = byDay[key] || [];
            return `
              <div class="bg-white border ${isToday ? 'border-orange-400 ring-1 ring-orange-200' : 'border-slate-200'} rounded-xl min-h-[420px] flex flex-col"
                ondragover="mesScheduleAllowDrop(event)" ondrop="mesScheduleDrop(event, '${key}')">
                <div class="px-2 py-2 border-b ${isToday ? 'bg-orange-50' : 'bg-slate-50'} rounded-t-xl">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold ${isToday ? 'text-orange-700' : 'text-slate-700'}">${dayNames[i]}</span>
                    <span class="text-[10px] ${isToday ? 'text-orange-600' : 'text-slate-400'}">${key.slice(5)}</span>
                  </div>
                  <div class="text-[10px] text-slate-400 mt-0.5">${list.length}건</div>
                </div>
                <div class="p-1.5 space-y-2 flex-1 overflow-y-auto max-h-[70vh]">
                  ${list.length ? list.map(mesScheduleCardHtml).join('') : '<div class="text-center text-[10px] text-slate-300 py-6">드롭</div>'}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

window.mesScheduleDragStart = function (event, woId) {
  event.dataTransfer.setData('text/plain', String(woId));
  event.dataTransfer.effectAllowed = 'move';
  if (event.currentTarget) event.currentTarget.classList.add('opacity-60');
};

window.mesScheduleAllowDrop = function (event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
};

window.mesScheduleDrop = async function (event, dateKey) {
  event.preventDefault();
  const woId = Number(event.dataTransfer.getData('text/plain'));
  if (!woId) return;

  const wo = (window._mesSchedule.rows || []).find((w) => Number(w.id) === woId);
  if (!wo) return;
  if (['completed', 'cancelled'].includes(wo.status)) {
    showToast('완료/취소된 작업은 일정을 변경할 수 없습니다', 'warning');
    return;
  }

  const payload = dateKey
    ? { planned_start_date: dateKey }
    : { planned_start_date: null, planned_end_date: null };

  try {
    const res = await axios.patch(`${API_BASE}/production/work-orders/${woId}/schedule`, payload);
    const updated = res.data.data;
    if (updated) {
      const idx = window._mesSchedule.rows.findIndex((w) => Number(w.id) === woId);
      if (idx >= 0) {
        window._mesSchedule.rows[idx] = { ...window._mesSchedule.rows[idx], ...updated };
      }
    } else {
      await mesScheduleReload();
      return;
    }
    mesScheduleRenderBoard();
    showToast(dateKey ? `${dateKey}에 배치했습니다` : '미배정으로 이동했습니다', 'success');
  } catch (e) {
    showToast(e.response?.data?.error || e.message, 'error');
    mesScheduleRenderBoard();
  }
};

window.loadMesSchedule = loadMesSchedule;
