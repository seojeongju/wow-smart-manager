/**
 * ERP Phase 5 — 조직·사원 / 근태
 */

const HR_EMP_TYPE_LABEL = {
  full_time: '정규직',
  contract: '계약직',
  part_time: '파트타임',
  intern: '인턴'
};

const HR_EMP_STATUS_LABEL = {
  active: '재직',
  leave: '휴직',
  resigned: '퇴직'
};

const HR_ATT_STATUS_LABEL = {
  present: '출근',
  late: '지각',
  absent: '결근',
  leave: '휴가',
  half_day: '반차',
  holiday: '휴무'
};

const HR_LEAVE_LABEL = {
  annual: '연차',
  sick: '병가',
  unpaid: '무급',
  other: '기타'
};

let hrMetaCache = null;

function hrEsc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hrToday() {
  return new Date().toISOString().slice(0, 10);
}

function hrDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function hrLoadMeta(force = false) {
  if (hrMetaCache && !force) return hrMetaCache;
  const res = await axios.get(`${API_BASE}/hr/meta`);
  if (!res.data?.success) throw new Error(res.data?.error || '메타 조회 실패');
  hrMetaCache = res.data.data;
  return hrMetaCache;
}

function hrDeptOptions(depts, selected = '', includeEmpty = true) {
  const list = (depts || []).filter((d) => d.is_active !== 0);
  return [
    includeEmpty ? '<option value="">부서 미지정</option>' : '',
    ...list.map((d) =>
      `<option value="${d.id}" ${String(selected) === String(d.id) ? 'selected' : ''}>${hrEsc(d.name)}</option>`
    )
  ].join('');
}

function hrUserOptions(users, selected = '') {
  return [
    '<option value="">로그인 계정 미연결</option>',
    ...(users || []).map((u) =>
      `<option value="${u.id}" ${String(selected) === String(u.id) ? 'selected' : ''}>${hrEsc(u.name)} (${hrEsc(u.email)})</option>`
    )
  ].join('');
}

function hrEmpOptions(employees, selected = '') {
  return [
    '<option value="">사원 선택</option>',
    ...(employees || []).map((e) =>
      `<option value="${e.id}" ${String(selected) === String(e.id) ? 'selected' : ''}>${hrEsc(e.name)} (${hrEsc(e.employee_number)})</option>`
    )
  ].join('');
}

// ---------- 조직 · 사원 ----------

window.loadHrOrgPage = async function loadHrOrgPage() {
  const content = document.getElementById('content');
  if (!content) return;
  if (typeof window.setHelpContext === 'function') window.setHelpContext('hr-org');

  content.innerHTML = `
    <div class="flex flex-col h-full">
      ${window.renderPageHeader({
        title: '조직 · 사원',
        subtitle: '부서 마스터 · 사원 등록 · 계정 연결',
        icon: 'fa-sitemap',
        actionsHtml: `
          <button type="button" onclick="loadPage('hr-attendance')" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">근태</button>
          <button type="button" onclick="reloadHrOrg()" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"><i class="fas fa-sync-alt"></i></button>`
      })}

      <div class="grid lg:grid-cols-12 gap-4 flex-1 min-h-0">
        <div class="lg:col-span-4 space-y-4">
          <div class="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 class="text-sm font-bold text-slate-800">부서 등록</h3>
            <div>
              <label class="text-xs font-bold text-slate-500">부서명 *</label>
              <input id="hrDeptName" type="text" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="예: 영업팀">
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-xs font-bold text-slate-500">코드</label>
                <input id="hrDeptCode" type="text" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="SALES">
              </div>
              <div>
                <label class="text-xs font-bold text-slate-500">정렬</label>
                <input id="hrDeptSort" type="number" value="0" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
              </div>
            </div>
            <button type="button" onclick="submitHrDepartment()" class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-lg">부서 추가</button>
          </div>
          <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div class="px-4 py-3 border-b border-slate-100 text-sm font-bold text-slate-700">부서 목록</div>
            <div id="hrDeptList" class="p-3 text-sm text-slate-400">로딩...</div>
          </div>
        </div>

        <div class="lg:col-span-8 space-y-4">
          <div class="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="text-sm font-bold text-slate-800">사원 등록</h3>
              <div class="flex flex-wrap gap-2">
                <input id="hrEmpSearch" type="search" placeholder="이름·사번 검색" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <select id="hrEmpStatusFilter" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="active">재직</option>
                  <option value="leave">휴직</option>
                  <option value="resigned">퇴직</option>
                  <option value="all">전체</option>
                </select>
                <select id="hrEmpDeptFilter" class="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">전체 부서</option>
                </select>
              </div>
            </div>
            <div class="grid md:grid-cols-3 gap-2">
              <div>
                <label class="text-xs font-bold text-slate-500">사원명 *</label>
                <input id="hrEmpName" type="text" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
              </div>
              <div>
                <label class="text-xs font-bold text-slate-500">부서</label>
                <select id="hrEmpDept" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"></select>
              </div>
              <div>
                <label class="text-xs font-bold text-slate-500">직위</label>
                <input id="hrEmpPosition" type="text" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="대리">
              </div>
              <div>
                <label class="text-xs font-bold text-slate-500">고용형태</label>
                <select id="hrEmpType" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="full_time">정규직</option>
                  <option value="contract">계약직</option>
                  <option value="part_time">파트타임</option>
                  <option value="intern">인턴</option>
                </select>
              </div>
              <div>
                <label class="text-xs font-bold text-slate-500">입사일</label>
                <input id="hrEmpHire" type="date" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
              </div>
              <div>
                <label class="text-xs font-bold text-slate-500">로그인 계정</label>
                <select id="hrEmpUser" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"></select>
              </div>
              <div>
                <label class="text-xs font-bold text-slate-500">이메일</label>
                <input id="hrEmpEmail" type="email" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
              </div>
              <div>
                <label class="text-xs font-bold text-slate-500">연락처</label>
                <input id="hrEmpPhone" type="text" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
              </div>
              <div class="flex items-end">
                <button type="button" onclick="submitHrEmployee()" class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-lg">사원 등록</button>
              </div>
            </div>
          </div>

          <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div id="hrEmpTable" class="overflow-x-auto p-4 text-center text-slate-400">
              <i class="fas fa-spinner fa-spin"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('hrEmpSearch')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') reloadHrOrg();
  });
  document.getElementById('hrEmpStatusFilter')?.addEventListener('change', () => reloadHrOrg());
  document.getElementById('hrEmpDeptFilter')?.addEventListener('change', () => reloadHrOrg());
  await reloadHrOrg();
};

window.reloadHrOrg = async function reloadHrOrg() {
  const deptList = document.getElementById('hrDeptList');
  const tableEl = document.getElementById('hrEmpTable');
  if (!tableEl) return;

  try {
    const meta = await hrLoadMeta(true);
    const deptSel = document.getElementById('hrEmpDept');
    const deptFilter = document.getElementById('hrEmpDeptFilter');
    const userSel = document.getElementById('hrEmpUser');
    if (deptSel) deptSel.innerHTML = hrDeptOptions(meta.departments, deptSel.value);
    if (deptFilter) {
      const cur = deptFilter.value;
      deptFilter.innerHTML = '<option value="">전체 부서</option>' +
        (meta.departments || []).map((d) =>
          `<option value="${d.id}" ${String(cur) === String(d.id) ? 'selected' : ''}>${hrEsc(d.name)}</option>`
        ).join('');
    }
    if (userSel) userSel.innerHTML = hrUserOptions(meta.users, userSel.value);

    const [deptRes, empRes] = await Promise.all([
      axios.get(`${API_BASE}/hr/departments`, { params: { active: '0' } }),
      axios.get(`${API_BASE}/hr/employees`, {
        params: {
          q: document.getElementById('hrEmpSearch')?.value || undefined,
          status: document.getElementById('hrEmpStatusFilter')?.value || 'active',
          department_id: document.getElementById('hrEmpDeptFilter')?.value || undefined
        }
      })
    ]);

    const depts = deptRes.data?.data || [];
    if (deptList) {
      if (!depts.length) {
        deptList.innerHTML = '<p class="text-slate-400 px-1">등록된 부서가 없습니다.</p>';
      } else {
        deptList.innerHTML = `<ul class="divide-y divide-slate-100">${depts.map((d) => `
          <li class="py-2.5 px-1 flex items-start justify-between gap-2 ${d.is_active ? '' : 'opacity-50'}">
            <div>
              <div class="font-semibold text-slate-800 text-sm">${hrEsc(d.name)}
                ${d.code ? `<span class="text-xs text-slate-400 ml-1">${hrEsc(d.code)}</span>` : ''}
              </div>
              <div class="text-xs text-slate-500 mt-0.5">소속 ${d.employee_count || 0}명${d.is_active ? '' : ' · 비활성'}</div>
            </div>
            <button type="button" onclick="deleteHrDepartment(${d.id})" class="text-xs text-rose-600 hover:underline shrink-0">삭제</button>
          </li>
        `).join('')}</ul>`;
      }
    }

    const emps = empRes.data?.data || [];
    if (!emps.length) {
      tableEl.innerHTML = '<p class="text-slate-400 py-6">조건에 맞는 사원이 없습니다.</p>';
      return;
    }

    tableEl.innerHTML = `
      <table class="min-w-full text-sm text-left">
        <thead class="bg-slate-50 text-slate-600 text-xs uppercase">
          <tr>
            <th class="px-3 py-2">사번</th>
            <th class="px-3 py-2">이름</th>
            <th class="px-3 py-2">부서</th>
            <th class="px-3 py-2">직위</th>
            <th class="px-3 py-2">고용</th>
            <th class="px-3 py-2">상태</th>
            <th class="px-3 py-2">계정</th>
            <th class="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${emps.map((e) => `
            <tr class="hover:bg-slate-50">
              <td class="px-3 py-2 font-mono text-xs">${hrEsc(e.employee_number)}</td>
              <td class="px-3 py-2 font-semibold text-slate-800">${hrEsc(e.name)}</td>
              <td class="px-3 py-2">${hrEsc(e.department_name || '-')}</td>
              <td class="px-3 py-2">${hrEsc(e.position || '-')}</td>
              <td class="px-3 py-2">${HR_EMP_TYPE_LABEL[e.employment_type] || e.employment_type}</td>
              <td class="px-3 py-2">${HR_EMP_STATUS_LABEL[e.status] || e.status}</td>
              <td class="px-3 py-2 text-xs text-slate-500">${hrEsc(e.user_name || '-')}</td>
              <td class="px-3 py-2 text-right whitespace-nowrap">
                <button type="button" onclick="editHrEmployee(${e.id})" class="text-teal-600 hover:underline text-xs mr-2">수정</button>
                <button type="button" onclick="deleteHrEmployee(${e.id})" class="text-rose-600 hover:underline text-xs">삭제</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    tableEl.innerHTML = `<p class="text-rose-600 py-4">${hrEsc(err.response?.data?.error || err.message)}</p>`;
  }
};

window.submitHrDepartment = async function submitHrDepartment() {
  const name = document.getElementById('hrDeptName')?.value?.trim();
  if (!name) return alert('부서명을 입력하세요.');
  try {
    await axios.post(`${API_BASE}/hr/departments`, {
      name,
      code: document.getElementById('hrDeptCode')?.value?.trim() || null,
      sort_order: Number(document.getElementById('hrDeptSort')?.value) || 0
    });
    document.getElementById('hrDeptName').value = '';
    document.getElementById('hrDeptCode').value = '';
    await reloadHrOrg();
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  }
};

window.deleteHrDepartment = async function deleteHrDepartment(id) {
  if (!confirm('부서를 삭제(또는 비활성)할까요?')) return;
  try {
    const res = await axios.delete(`${API_BASE}/hr/departments/${id}`);
    if (res.data?.message) alert(res.data.message);
    await reloadHrOrg();
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  }
};

window.submitHrEmployee = async function submitHrEmployee() {
  const name = document.getElementById('hrEmpName')?.value?.trim();
  if (!name) return alert('사원명을 입력하세요.');
  try {
    await axios.post(`${API_BASE}/hr/employees`, {
      name,
      department_id: document.getElementById('hrEmpDept')?.value || null,
      position: document.getElementById('hrEmpPosition')?.value || null,
      employment_type: document.getElementById('hrEmpType')?.value || 'full_time',
      hire_date: document.getElementById('hrEmpHire')?.value || null,
      user_id: document.getElementById('hrEmpUser')?.value || null,
      email: document.getElementById('hrEmpEmail')?.value || null,
      phone: document.getElementById('hrEmpPhone')?.value || null
    });
    ['hrEmpName', 'hrEmpPosition', 'hrEmpEmail', 'hrEmpPhone'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    await reloadHrOrg();
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  }
};

window.editHrEmployee = async function editHrEmployee(id) {
  try {
    const detailRes = await axios.get(`${API_BASE}/hr/employees/${id}`);
    const e = detailRes.data?.data;
    if (!e) return alert('사원을 찾을 수 없습니다.');

    const name = prompt('사원명', e.name);
    if (name == null) return;
    const position = prompt('직위', e.position || '');
    if (position == null) return;
    const status = prompt('상태 (active/leave/resigned)', e.status);
    if (status == null) return;

    await axios.put(`${API_BASE}/hr/employees/${id}`, {
      name: name.trim(),
      position,
      status,
      department_id: e.department_id,
      employment_type: e.employment_type,
      hire_date: e.hire_date,
      leave_date: e.leave_date,
      user_id: e.user_id,
      email: e.email,
      phone: e.phone,
      notes: e.notes
    });
    await reloadHrOrg();
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  }
};

window.deleteHrEmployee = async function deleteHrEmployee(id) {
  if (!confirm('사원을 삭제(또는 퇴직 처리)할까요?')) return;
  try {
    const res = await axios.delete(`${API_BASE}/hr/employees/${id}`);
    if (res.data?.message) alert(res.data.message);
    await reloadHrOrg();
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  }
};

// ---------- 근태 ----------

window.loadHrAttendancePage = async function loadHrAttendancePage() {
  const content = document.getElementById('content');
  if (!content) return;
  if (typeof window.setHelpContext === 'function') window.setHelpContext('hr-attendance');

  content.innerHTML = `
    <div class="flex flex-col h-full">
      ${window.renderPageHeader({
        title: '근태',
        subtitle: '출퇴근 · 휴가 · 연장근로 기록',
        icon: 'fa-user-clock',
        actionsHtml: `
          <button type="button" onclick="loadPage('hr-org')" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">조직 · 사원</button>
          <button type="button" onclick="reloadHrAttendance()" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"><i class="fas fa-sync-alt"></i></button>`
      })}

      <div class="grid lg:grid-cols-12 gap-4 flex-1 min-h-0">
        <div class="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <h3 class="text-sm font-bold text-slate-800">근태 등록</h3>
          <div>
            <label class="text-xs font-bold text-slate-500">사원 *</label>
            <select id="hrAttEmp" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"></select>
          </div>
          <div>
            <label class="text-xs font-bold text-slate-500">근무일 *</label>
            <input id="hrAttDate" type="date" value="${hrToday()}" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
          </div>
          <div>
            <label class="text-xs font-bold text-slate-500">상태</label>
            <select id="hrAttStatus" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
              ${Object.entries(HR_ATT_STATUS_LABEL).map(([k, v]) =>
                `<option value="${k}">${v}</option>`).join('')}
            </select>
          </div>
          <div id="hrAttLeaveWrap" class="hidden">
            <label class="text-xs font-bold text-slate-500">휴가 유형</label>
            <select id="hrAttLeave" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
              ${Object.entries(HR_LEAVE_LABEL).map(([k, v]) =>
                `<option value="${k}">${v}</option>`).join('')}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs font-bold text-slate-500">출근</label>
              <input id="hrAttIn" type="time" value="09:00" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
              <label class="text-xs font-bold text-slate-500">퇴근</label>
              <input id="hrAttOut" type="time" value="18:00" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
            </div>
          </div>
          <div>
            <label class="text-xs font-bold text-slate-500">연장(분)</label>
            <input id="hrAttOt" type="number" min="0" value="0" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
          </div>
          <div>
            <label class="text-xs font-bold text-slate-500">메모</label>
            <textarea id="hrAttNotes" rows="2" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"></textarea>
          </div>
          <button type="button" onclick="submitHrAttendance()" class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-lg">저장</button>
          <p class="text-xs text-slate-400">동일 사원·날짜가 있으면 덮어씁니다.</p>
        </div>

        <div class="lg:col-span-8 space-y-4">
          <div class="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-2 items-end">
            <div>
              <label class="text-xs font-bold text-slate-500">From</label>
              <input id="hrAttFrom" type="date" value="${hrDaysAgo(14)}" class="block mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
              <label class="text-xs font-bold text-slate-500">To</label>
              <input id="hrAttTo" type="date" value="${hrToday()}" class="block mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
              <label class="text-xs font-bold text-slate-500">부서</label>
              <select id="hrAttDeptFilter" class="block mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="">전체</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-bold text-slate-500">상태</label>
              <select id="hrAttStatusFilter" class="block mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="">전체</option>
                ${Object.entries(HR_ATT_STATUS_LABEL).map(([k, v]) =>
                  `<option value="${k}">${v}</option>`).join('')}
              </select>
            </div>
            <button type="button" onclick="reloadHrAttendance()" class="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg">조회</button>
          </div>

          <div id="hrAttSummary" class="grid grid-cols-2 lg:grid-cols-4 gap-3"></div>
          <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div id="hrAttTable" class="overflow-x-auto p-4 text-center text-slate-400">
              <i class="fas fa-spinner fa-spin"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('hrAttStatus')?.addEventListener('change', () => {
    const wrap = document.getElementById('hrAttLeaveWrap');
    if (wrap) wrap.classList.toggle('hidden', document.getElementById('hrAttStatus')?.value !== 'leave');
  });

  await reloadHrAttendance();
};

window.reloadHrAttendance = async function reloadHrAttendance() {
  const tableEl = document.getElementById('hrAttTable');
  const summaryEl = document.getElementById('hrAttSummary');
  if (!tableEl) return;

  try {
    const meta = await hrLoadMeta(true);
    const empRes = await axios.get(`${API_BASE}/hr/employees`, { params: { status: 'active', limit: 300 } });
    const employees = empRes.data?.data || [];

    const empSel = document.getElementById('hrAttEmp');
    if (empSel) empSel.innerHTML = hrEmpOptions(employees, empSel.value);

    const deptFilter = document.getElementById('hrAttDeptFilter');
    if (deptFilter) {
      const cur = deptFilter.value;
      deptFilter.innerHTML = '<option value="">전체</option>' +
        (meta.departments || []).filter((d) => d.is_active !== 0).map((d) =>
          `<option value="${d.id}" ${String(cur) === String(d.id) ? 'selected' : ''}>${hrEsc(d.name)}</option>`
        ).join('');
    }

    const res = await axios.get(`${API_BASE}/hr/attendance`, {
      params: {
        from: document.getElementById('hrAttFrom')?.value || undefined,
        to: document.getElementById('hrAttTo')?.value || undefined,
        department_id: document.getElementById('hrAttDeptFilter')?.value || undefined,
        status: document.getElementById('hrAttStatusFilter')?.value || undefined
      }
    });
    if (!res.data?.success) throw new Error(res.data?.error || '조회 실패');

    const rows = res.data.data || [];
    const s = res.data.summary || {};
    if (summaryEl) {
      summaryEl.innerHTML = [
        { label: '건수', value: s.total || 0 },
        { label: '출근/지각', value: `${s.present || 0} / ${s.late || 0}` },
        { label: '결근/휴가', value: `${s.absent || 0} / ${s.leave || 0}` },
        { label: '연장(분)', value: s.overtime_minutes || 0 }
      ].map((it) => `
        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <div class="text-xs font-bold text-slate-500">${it.label}</div>
          <div class="text-lg font-bold text-slate-900 mt-1">${it.value}</div>
        </div>
      `).join('');
    }

    if (!rows.length) {
      tableEl.innerHTML = '<p class="text-slate-400 py-6">기간 내 근태 기록이 없습니다.</p>';
      return;
    }

    tableEl.innerHTML = `
      <table class="min-w-full text-sm text-left">
        <thead class="bg-slate-50 text-slate-600 text-xs uppercase">
          <tr>
            <th class="px-3 py-2">일자</th>
            <th class="px-3 py-2">사원</th>
            <th class="px-3 py-2">부서</th>
            <th class="px-3 py-2">상태</th>
            <th class="px-3 py-2">출근</th>
            <th class="px-3 py-2">퇴근</th>
            <th class="px-3 py-2">연장</th>
            <th class="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${rows.map((r) => `
            <tr class="hover:bg-slate-50">
              <td class="px-3 py-2 whitespace-nowrap">${hrEsc(r.work_date)}</td>
              <td class="px-3 py-2 font-semibold">${hrEsc(r.employee_name)}
                <span class="block text-xs text-slate-400 font-normal">${hrEsc(r.employee_number)}</span>
              </td>
              <td class="px-3 py-2">${hrEsc(r.department_name || '-')}</td>
              <td class="px-3 py-2">${HR_ATT_STATUS_LABEL[r.status] || r.status}
                ${r.leave_type ? `<span class="text-xs text-slate-400">(${HR_LEAVE_LABEL[r.leave_type] || r.leave_type})</span>` : ''}
              </td>
              <td class="px-3 py-2">${hrEsc(r.clock_in || '-')}</td>
              <td class="px-3 py-2">${hrEsc(r.clock_out || '-')}</td>
              <td class="px-3 py-2">${Number(r.overtime_minutes) || 0}분</td>
              <td class="px-3 py-2 text-right">
                <button type="button" onclick="deleteHrAttendance(${r.id})" class="text-rose-600 hover:underline text-xs">삭제</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    tableEl.innerHTML = `<p class="text-rose-600 py-4">${hrEsc(err.response?.data?.error || err.message)}</p>`;
  }
};

window.submitHrAttendance = async function submitHrAttendance() {
  const employee_id = document.getElementById('hrAttEmp')?.value;
  const work_date = document.getElementById('hrAttDate')?.value;
  if (!employee_id || !work_date) return alert('사원과 근무일을 선택하세요.');
  const status = document.getElementById('hrAttStatus')?.value || 'present';
  try {
    await axios.post(`${API_BASE}/hr/attendance`, {
      employee_id: Number(employee_id),
      work_date,
      status,
      leave_type: status === 'leave' ? document.getElementById('hrAttLeave')?.value : null,
      clock_in: document.getElementById('hrAttIn')?.value || null,
      clock_out: document.getElementById('hrAttOut')?.value || null,
      overtime_minutes: Number(document.getElementById('hrAttOt')?.value) || 0,
      notes: document.getElementById('hrAttNotes')?.value || null
    });
    await reloadHrAttendance();
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  }
};

window.deleteHrAttendance = async function deleteHrAttendance(id) {
  if (!confirm('이 근태 기록을 삭제할까요?')) return;
  try {
    await axios.delete(`${API_BASE}/hr/attendance/${id}`);
    await reloadHrAttendance();
  } catch (err) {
    alert(err.response?.data?.error || err.message);
  }
};
