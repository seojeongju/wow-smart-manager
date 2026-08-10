/**
 * 거래명세서 출력 및 관리 모듈
 */

async function renderTransactionStatementPage(container) {
  container.innerHTML = `
    <div class="max-w-6xl mx-auto space-y-6 no-print">
      <!-- 상단 액션 바 -->
      <div class="flex flex-col md:flex-row gap-4 items-end bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div class="flex-1 w-full space-y-2">
          <label class="text-xs font-bold text-slate-500 uppercase ml-1">고객 선택</label>
          <div class="relative">
            <input type="text" id="tsCustomerSearch" placeholder="고객명 또는 연락처 검색..." 
                   class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                   oninput="searchTSCustomer(this.value)">
            <div id="tsCustomerResults" class="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl hidden max-h-60 overflow-y-auto"></div>
            <input type="hidden" id="tsCustomerId">
          </div>
          <div id="tsSelectedCustomer" class="hidden flex items-center gap-2 p-2 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium">
            <i class="fas fa-user-check"></i>
            <span id="tsSelectedCustomerLabel"></span>
            <button onclick="clearTSCustomer()" class="ml-auto hover:text-teal-900"><i class="fas fa-times"></i></button>
          </div>
        </div>

        <div class="w-full md:w-48 space-y-2">
          <label class="text-xs font-bold text-slate-500 uppercase ml-1">시작일</label>
          <input type="date" id="tsStartDate" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all">
        </div>

        <div class="w-full md:w-48 space-y-2">
          <label class="text-xs font-bold text-slate-500 uppercase ml-1">종료일</label>
          <input type="date" id="tsEndDate" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all">
        </div>

        <div class="h-full flex items-center pb-1">
            <div class="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 h-[46px]">
                <input type="checkbox" id="tsApplyVat" class="w-5 h-5 text-teal-600 rounded focus:ring-teal-500 border-gray-300 transition-all cursor-pointer">
                <label for="tsApplyVat" class="text-sm font-bold text-slate-600 cursor-pointer select-none whitespace-nowrap">VAT 별도 (10%)</label>
            </div>
        </div>

        <div class="flex-1 w-full space-y-2">
            <label class="text-xs font-bold text-slate-500 uppercase ml-1">명세서 메모 (Note)</label>
            <textarea id="tsNote" rows="2" placeholder="하단에 출력될 메모를 입력하세요... (줄바꿈 가능)" 
                   class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-y min-h-[46px]"></textarea>
        </div>

        <button onclick="loadTSData()" class="px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all font-bold flex items-center gap-2 shadow-lg shadow-slate-200">
          <i class="fas fa-search"></i>
          내역 조회
        </button>
      </div>

      <!-- 조회 결과 리스트 -->
      <div id="tsResultsContainer" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        <div class="flex flex-col items-center justify-center py-20 text-slate-400">
          <i class="fas fa-file-invoice text-5xl mb-4 opacity-20"></i>
          <p>고객과 기간을 선택하여 내역을 조회해주세요.</p>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 class="font-bold text-slate-800"><i class="fas fa-history mr-2 text-teal-600"></i>저장된 거래명세서</h3>
          <button type="button" onclick="loadTSHistory()" class="text-sm text-slate-500 hover:text-teal-700"><i class="fas fa-sync-alt"></i></button>
        </div>
        <div id="tsHistoryList" class="p-4 text-sm text-slate-500">고객을 선택하면 이력이 표시됩니다.</div>
      </div>
    </div>

    <!-- 인쇄용 숨겨진 영역 -->
    <div id="tsPrintArea" class="print-only bg-white text-black p-0"></div>
  `;

  // 기본 날짜 설정 (최근 1개월)
  const now = new Date();
  const lastMonth = new Date();
  lastMonth.setMonth(now.getMonth() - 1);

  document.getElementById('tsEndDate').value = now.toISOString().split('T')[0];
  document.getElementById('tsStartDate').value = lastMonth.toISOString().split('T')[0];
}

async function searchTSCustomer(query) {
  const resDiv = document.getElementById('tsCustomerResults');
  if (!query) { resDiv.classList.add('hidden'); return; }

  try {
    const res = await axios.get(`${API_BASE}/customers`, { params: { search: query, limit: 5 } });
    const customers = res.data.data;

    if (customers.length === 0) {
      resDiv.innerHTML = '<div class="p-4 text-sm text-slate-400 text-center">검색 결과가 없습니다.</div>';
    } else {
      resDiv.innerHTML = customers.map(c => `
        <div class="p-3 hover:bg-teal-50 cursor-pointer border-b border-slate-50 transition-colors" 
             onclick="selectTSCustomer(${c.id}, '${c.name}', '${c.phone}')">
          <div class="text-sm font-bold text-slate-800">${c.name}</div>
          <div class="text-[11px] text-slate-500">${c.phone} | ${c.address || '주소 정보 없음'}</div>
        </div>
      `).join('');
    }
    resDiv.classList.remove('hidden');
  } catch (e) {
    console.error('고객 검색 실패', e);
  }
}

function selectTSCustomer(id, name, phone) {
  document.getElementById('tsCustomerId').value = id;
  document.getElementById('tsSelectedCustomerLabel').textContent = `${name} (${phone})`;
  document.getElementById('tsCustomerSearch').classList.add('hidden');
  document.getElementById('tsSelectedCustomer').classList.remove('hidden');
  document.getElementById('tsCustomerResults').classList.add('hidden');
  loadTSHistory();
}

function clearTSCustomer() {
  document.getElementById('tsCustomerId').value = '';
  document.getElementById('tsCustomerSearch').value = '';
  document.getElementById('tsCustomerSearch').classList.remove('hidden');
  document.getElementById('tsSelectedCustomer').classList.add('hidden');
  const hist = document.getElementById('tsHistoryList');
  if (hist) hist.textContent = '고객을 선택하면 이력이 표시됩니다.';
}

async function loadTSData() {
  const customerId = document.getElementById('tsCustomerId').value;
  const startDate = document.getElementById('tsStartDate').value;
  const endDate = document.getElementById('tsEndDate').value;
  const container = document.getElementById('tsResultsContainer');

  if (!customerId) {
    showToast('고객을 먼저 선택해주세요.', 'warning');
    return;
  }

  container.innerHTML = '<div class="flex justify-center py-20"><i class="fas fa-spinner fa-spin text-3xl text-teal-500"></i></div>';

  try {
    // 판매 목록 조회 (해당 고객, 기간)
    const res = await axios.get(`${API_BASE}/sales`, {
      params: { customerId, startDate, endDate, status: 'all', limit: 200 }
    });
    const sales = (res.data.data || []).filter(s =>
      ['completed', 'pending_shipment', 'shipped', 'delivered'].includes(s.status)
    );

    if (sales.length === 0) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 text-slate-400">
          <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
          <p>선택한 기간에 완료된 판매 내역이 없습니다.</p>
        </div>
      `;
      return;
    }

    renderTSResults(sales);
  } catch (e) {
    console.error(e);
    container.innerHTML = '<div class="text-center py-20 text-rose-500 font-bold">내역 로드 중 오류가 발생했습니다.</div>';
  }
}

// 전체 선택 토글
function toggleAllTSItems(source) {
  const checkboxes = document.querySelectorAll('.ts-item-checkbox');
  checkboxes.forEach(cb => cb.checked = source.checked);
}

// 공통 데이터 로드 함수
async function fetchTSData(selectedIds = null) {
  const customerId = document.getElementById('tsCustomerId').value;
  const startDate = document.getElementById('tsStartDate').value;
  const endDate = document.getElementById('tsEndDate').value;

  if (!customerId) {
    showToast('고객을 먼저 선택해주세요.', 'warning');
    return null;
  }

  try {
    // 1. 기초 정보 로드 (회사 기본 + 회사 상세 설정 + 고객 정보 + 판매 검색)
    const [companyRes, settingsRes, customerRes, salesRes] = await Promise.all([
      axios.get(`${API_BASE}/settings/company`),
      axios.get(`${API_BASE}/settings/system`),
      axios.get(`${API_BASE}/customers/${customerId}`),
      axios.get(`${API_BASE}/sales`, { params: { customerId, startDate, endDate, status: 'completed', limit: 1000 } })
    ]);

    // 회사 정보 병합
    const companyBasic = companyRes.data.data;
    const settings = settingsRes.data.data || [];
    const findVal = (key) => settings.find(s => s.setting_key === key)?.setting_value || '';

    // settings fallback
    const company = {
      name: companyBasic.name,
      logo_url: companyBasic.logo_url,
      owner_name: findVal('company_owner'),
      business_number: findVal('company_biz_no'),
      phone: findVal('company_phone'),
      address: findVal('company_address'),
      bank_account: findVal('company_bank_account')
    };

    const customer = customerRes.data.data;
    let sales = salesRes.data.data;

    // 선택된 ID가 있다면 필터링
    if (selectedIds) {
      sales = sales.filter(s => selectedIds.map(Number).includes(Number(s.id)));
    }

    if (sales.length === 0) {
      // 필터링 결과가 없으면(혹은 전체가 없으면) 빈 배열
    }

    // 2. 모든 판매 내역의 상세 품목들을 병합하여 가져오기
    const allDetailedItems = [];
    const detailPromises = sales.map(s => axios.get(`${API_BASE}/sales/${s.id}`).then(res => ({ sale: s, items: res.data.data.items })));
    const detailsResults = await Promise.all(detailPromises);

    detailsResults.forEach(({ sale, items }) => {
      items.forEach(item => {
        allDetailedItems.push({
          ...item,
          sale_date: sale.created_at
        });
      });
    });

    // 날짜순 정렬
    allDetailedItems.sort((a, b) => new Date(a.sale_date) - new Date(b.sale_date));

    return { company, customer, items: allDetailedItems, start: startDate, end: endDate };

  } catch (e) {
    console.error('데이터 로드 실패', e);
    showToast('데이터를 불러오는데 실패했습니다.', 'error');
    return null;
  }
}

async function prepareTSPrint() {
  const checkboxes = document.querySelectorAll('.ts-item-checkbox:checked');
  if (checkboxes.length === 0) {
    showToast('출력할 내역을 선택해주세요.', 'warning');
    return;
  }
  const selectedIds = Array.from(checkboxes).map(cb => cb.value);

  showToast('거래명세서를 생성 중입니다...', 'info');

  const data = await fetchTSData(selectedIds);
  if (!data) return;

  const { company, customer, items, start, end } = data;
  const applyVat = document.getElementById('tsApplyVat').checked;

  // 세액 계산
  items.forEach(item => {
    item.tax = applyVat ? Math.floor(item.subtotal * 0.1) : 0;
  });

  // 3. 인쇄 레이아웃 생성
  const tsNote = document.getElementById('tsNote').value;
  renderTSPrintLayout(company, customer, items, start, end, tsNote);

  // 4. 인쇄 실행
  setTimeout(() => {
    // 인쇄 전 토스트 메시지 강제 제거
    const toasts = document.querySelectorAll('.fixed.bottom-5.right-5');
    toasts.forEach(t => t.remove());

    window.print();
  }, 500);
}

// 엑셀 다운로드 함수
async function downloadTSExcel() {
  const checkboxes = document.querySelectorAll('.ts-item-checkbox:checked');
  if (checkboxes.length === 0) {
    showToast('다운로드할 내역을 선택해주세요.', 'warning');
    return;
  }
  const selectedIds = Array.from(checkboxes).map(cb => cb.value);

  showToast('엑셀 파일을 생성 중입니다...', 'info');

  const data = await fetchTSData(selectedIds);
  if (!data) return;

  const { company, customer, items, start, end } = data;
  const applyVat = document.getElementById('tsApplyVat').checked;
  const tsNote = document.getElementById('tsNote').value;

  // 세액 계산
  items.forEach(item => {
    item.tax = applyVat ? Math.floor(item.subtotal * 0.1) : 0;
  });

  const totalSupply = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const totalTax = items.reduce((sum, item) => sum + (item.tax || 0), 0);
  const grandTotal = totalSupply + totalTax;

  // 엑셀 데이터 구성 (Array of Arrays)
  const ws_data = [
    ["거래명세표", "", "", "", "", "", "", "", "", ""], // Row 0: Title
    ["", "", "", "", "", "", "", "", "", ""], // Row 1: Spacer
    [`거래일자 : ${start} ~ ${end}`, "", "", "", "", "", "페이지 : 1 / 1", "", "", ""], // Row 2: Date
    ["", "", "", "", "", "", "", "", "", ""], // Row 3: Spacer
    // Row 4: Info Header
    ["공급자", "", "등록번호", company.business_number || "", "", "공급받는자", "", "등록번호", "", ""],
    ["", "", "상호(법인명)", company.name, "", "", "", "상호(법인명)", customer.name, ""],
    ["", "", "성명", company.owner_name || "", "", "", "", "성명", "", ""],
    ["", "", "사업장주소", company.address || "", "", "", "", "사업장주소", customer.address || "", ""],
    ["", "", "전화번호", company.phone || "", "", "", "", "전화번호", customer.phone, ""],
    ["", "", "", "", "", "", "", "", "", ""], // Row 9: Spacer
    [`합계금액 : ${toKoreanCurrency(grandTotal)} 정`, "", "", "", "", "", `₩ ${grandTotal.toLocaleString()}`, "", "", ""], // Row 10: Total
    ["", "", "", "", "", "", "", "", "", ""], // Row 11: Spacer
    // Row 12: Items Header
    ["월", "일", "품목 / 규격", "단위", "수량", "단가", "공급가액", "세액", "비고"]
  ];

  // 품목 데이터 추가
  let currentRow = 13;
  items.forEach(item => {
    const date = new Date(item.sale_date);
    ws_data.push([
      date.getMonth() + 1,
      date.getDate(),
      item.product_name,
      "EA",
      item.quantity,
      item.unit_price,
      item.subtotal,
      item.tax, // 세액 적용
      ""
    ]);
    currentRow++;
  });

  // 빈 행 채우기 (최소 15줄)
  const emptyRows = Math.max(0, 15 - items.length);
  for (let i = 0; i < emptyRows; i++) {
    ws_data.push(["", "", "", "", "", "", "", "", ""]);
    currentRow++;
  }

  // 소계
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  ws_data.push(["소계", "", "", "", totalQty, "", totalSupply, totalTax, ""]);
  currentRow++;

  // 계좌 정보 (Footer)
  if (company.bank_account) {
    ws_data.push(["입금계좌 : " + company.bank_account, "", "", "", "", "", "", "", ""]);
    currentRow++;
  }

  // 메모 정보 (Footer)
  if (tsNote) {
    ws_data.push(["비고 : " + tsNote, "", "", "", "", "", "", "", ""]);
    currentRow++;
  }

  // 워크시트 생성
  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  // --- 스타일 정의 ---
  const borderStyle = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  const thickBorderBottom = { bottom: { style: "medium" } };
  const centerStyle = { alignment: { horizontal: "center", vertical: "center" } };
  const rightStyle = { alignment: { horizontal: "right", vertical: "center" } };
  const leftStyle = { alignment: { horizontal: "left", vertical: "center", wrapText: true } };
  const titleStyle = { font: { sz: 20, bold: true, underline: true }, alignment: { horizontal: "center", vertical: "center" } };
  const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "F3F4F6" } }, border: borderStyle, alignment: { horizontal: "center", vertical: "center" } };
  const cellStyle = { border: borderStyle, alignment: { horizontal: "center", vertical: "center" } };
  const currencyStyle = { border: borderStyle, alignment: { horizontal: "right", vertical: "center" }, numFmt: "#,##0" };

  // --- 셀 병합 설정 ---
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Title merged across A-I
    // 공급자 블록 병합
    { s: { r: 4, c: 0 }, e: { r: 8, c: 1 } }, // "공급자" Label (Vertical)
    { s: { r: 4, c: 3 }, e: { r: 4, c: 4 } }, // BizNo value
    { s: { r: 7, c: 3 }, e: { r: 7, c: 4 } }, // Address value
    { s: { r: 8, c: 3 }, e: { r: 8, c: 4 } }, // Phone value
    // 공급받는자 블록 병합
    { s: { r: 4, c: 5 }, e: { r: 8, c: 6 } }, // "공급받는자" Label (Vertical)
    { s: { r: 4, c: 8 }, e: { r: 4, c: 9 } }, // BizNo value
    { s: { r: 7, c: 8 }, e: { r: 7, c: 9 } }, // Address value
    { s: { r: 8, c: 8 }, e: { r: 8, c: 9 } }, // Phone value
    // 합계 금액
    { s: { r: 10, c: 0 }, e: { r: 10, c: 5 } },
    { s: { r: 10, c: 6 }, e: { r: 10, c: 8 } },
    // 소계
    { s: { r: currentRow - (company.bank_account ? 2 : 1), c: 0 }, e: { r: currentRow - (company.bank_account ? 2 : 1), c: 3 } }
  ];

  if (company.bank_account) {
    // 계좌 정보 병합
    ws['!merges'].push({ s: { r: currentRow - (tsNote ? 2 : 1), c: 0 }, e: { r: currentRow - (tsNote ? 2 : 1), c: 8 } });
  }

  if (tsNote) {
    // 메모 정보 병합
    ws['!merges'].push({ s: { r: currentRow - 1, c: 0 }, e: { r: currentRow - 1, c: 8 } });
  }

  // --- 스타일 적용 ---
  const range = XLSX.utils.decode_range(ws['!ref']);

  // 1. Title Style (Row 0)
  if (ws[XLSX.utils.encode_cell({ r: 0, c: 0 })]) ws[XLSX.utils.encode_cell({ r: 0, c: 0 })].s = titleStyle;

  // 2. Info Grid Styles (Rows 4-8)
  for (let r = 4; r <= 8; r++) {
    for (let c = 0; c <= 9; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' }; // Ensure empty cells exist for borders

      // Labels (Gray background)
      if (c === 0 || c === 2 || c === 5 || c === 7) {
        ws[cellRef].s = headerStyle;
      } else {
        ws[cellRef].s = cellStyle;
      }

      // Text Alignment adjustments
      if (c === 3 || c === 8) ws[cellRef].s = { ...cellStyle, alignment: { horizontal: 'left', vertical: 'center', wrapText: true } }; // Address/BizNo left align
    }
  }

  // 3. Total Amount Row (Row 10)
  for (let c = 0; c <= 8; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 10, c });
    if (!ws[cellRef]) continue;
    ws[cellRef].s = {
      font: { bold: true, sz: 12 },
      fill: { fgColor: { rgb: "FFFBEB" } }, // Amber-50ish
      border: { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } },
      alignment: { horizontal: c === 6 ? 'right' : 'center', vertical: 'center' }
    };
  }

  // 4. Items Header (Row 12)
  for (let c = 0; c <= 8; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 12, c });
    if (ws[cellRef]) ws[cellRef].s = headerStyle;
  }

  // 5. Items Data (Row 13 to End)
  for (let r = 13; r < currentRow; r++) {
    for (let c = 0; c <= 8; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };

      let style = { ...cellStyle };
      if (c === 2) style = { ...style, alignment: { horizontal: 'left', vertical: 'center' } }; // Product Name
      if (c === 5 || c === 6 || c === 7) style = { ...currencyStyle }; // Prices

      ws[cellRef].s = style;
    }
  }

  // 6. Footer Rows (Bank Account & Note)
  const footerRowsCount = (company.bank_account ? 1 : 0) + (tsNote ? 1 : 0);
  for (let r = currentRow - footerRowsCount; r < currentRow; r++) {
    for (let c = 0; c <= 8; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          ...headerStyle,
          fill: { fgColor: { rgb: "F9FAFB" } }, // Light Gray
          alignment: { horizontal: 'left', vertical: 'center', wrapText: true }
        };
      }
    }
  }

  // 컬럼 너비 설정
  ws['!cols'] = [
    { wch: 6 }, // 월
    { wch: 6 }, // 일
    { wch: 40 }, // 품목/규격
    { wch: 8 }, // 단위
    { wch: 8 }, // 수량
    { wch: 15 }, // 단가
    { wch: 15 }, // 공급가액
    { wch: 12 }, // 세액
    { wch: 15 }, // 비고
    { wch: 0 } // Extra
  ];

  // 행 높이 설정 (약간 여유있게)
  ws['!rows'] = [];
  ws['!rows'][0] = { hpt: 30 }; // Title
  ws['!rows'][4] = { hpt: 25 };
  ws['!rows'][5] = { hpt: 25 };
  ws['!rows'][6] = { hpt: 25 };
  ws['!rows'][7] = { hpt: 25 };
  ws['!rows'][8] = { hpt: 25 };
  ws['!rows'][10] = { hpt: 30 }; // Total

  // 워크북 생성 및 다운로드
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "거래명세표");
  XLSX.writeFile(wb, `거래명세표_${company.name}_${customer.name}_${start}.xlsx`);

  // 완료 토스트
  const toasts = document.querySelectorAll('.fixed.bottom-5.right-5');
  toasts.forEach(t => t.remove());
  showToast('엑셀 파일이 다운로드되었습니다.', 'success');
}

function renderTSResults(sales) {
  const container = document.getElementById('tsResultsContainer');
  let totalAmount = sales.reduce((sum, s) => sum + s.final_amount, 0);

  container.innerHTML = `
    <div class="p-6">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-lg font-bold text-slate-800">조회된 판매 내역 (${sales.length}건)</h3>
        <div class="text-right">
          <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">총 합계 금액</p>
          <p class="text-2xl font-black text-teal-600">${formatCurrency(totalAmount)}</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-3 text-center w-12">
                <input type="checkbox" onclick="toggleAllTSItems(this)" class="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 border-gray-300 transition-all cursor-pointer" checked>
              </th>
              <th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">판매일자</th>
              <th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">내역</th>
              <th class="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">결제 수단</th>
              <th class="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">금액</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${sales.map(s => `
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-4 py-4 text-center">
                    <input type="checkbox" class="ts-item-checkbox w-4 h-4 text-teal-600 rounded focus:ring-teal-500 border-gray-300 transition-all cursor-pointer" value="${s.id}" checked>
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                    ${formatDateTimeKST(s.created_at).split(' ').slice(0, 3).join(' ')}
                </td>
                <td class="px-4 py-4 text-sm font-medium text-slate-800">
                  ${s.items_summary || '<span class="text-slate-400">상품 내역 정보 없음</span>'}
                </td>
                <td class="px-4 py-4 text-right text-sm text-slate-500">${s.payment_method}</td>
                <td class="px-4 py-4 text-right text-sm font-bold text-slate-700">${formatCurrency(s.final_amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="mt-8 flex flex-wrap justify-center border-t border-slate-100 pt-8 gap-4">
        <button onclick="saveTSDocument()" class="px-8 py-4 bg-white text-teal-700 border-2 border-teal-600 rounded-2xl hover:bg-teal-50 transition-all font-bold flex items-center gap-3 shadow-sm">
          <i class="fas fa-save text-xl"></i>
          명세서 저장 (번호발급)
        </button>
        <button onclick="downloadTSExcel()" class="px-8 py-4 bg-white text-emerald-600 border-2 border-emerald-600 rounded-2xl hover:bg-emerald-50 transition-all font-bold flex items-center gap-3 shadow-sm">
          <i class="fas fa-file-excel text-xl"></i>
          엑셀로 저장 (XLSX)
        </button>
        <button onclick="prepareTSPrint()" class="px-10 py-4 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition-all font-black flex items-center gap-3 shadow-xl shadow-teal-100">
          <i class="fas fa-print text-xl"></i>
          거래명세표 생성 및 출력
        </button>
      </div>
    </div>
  `;
}

function renderTSPrintLayout(company, customer, items, start, end, note = '') {
  const printArea = document.getElementById('tsPrintArea');

  const totalSupply = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const totalTax = items.reduce((sum, item) => sum + (item.tax || 0), 0);
  const grandTotal = totalSupply + totalTax;

  // 데이터 보정
  const bizNo = company.business_number || '';
  const ceo = company.owner_name || '';
  const addr = company.address || '';
  const companyPhone = company.phone || '';
  
  // 고객(공급받는자) 데이터 보정
  const customerBizNo = customer.business_number || '';
  const customerName = customer.company || customer.name || '';
  const customerAddress = customer.address || '';
  const customerPhone = customer.phone || '';

  printArea.innerHTML = `
        <div class="p-4 max-w-[210mm] mx-auto font-sans leading-tight text-black bg-white select-text print:p-0">
            <!-- Header -->
            <div class="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
                <div class="w-1/3">
                    ${company.logo_url ? `<img src="${company.logo_url}" class="max-h-12 object-contain" alt="Logo">` : '<div class="text-xl font-black italic text-slate-300">WOW-SMART</div>'}
                </div>
                <div class="w-1/3 text-center">
                    <h1 class="text-4xl font-black tracking-[0.5em] border-b-2 border-black inline-block pb-1">거래명세표</h1>
                </div>
                <div class="w-1/3 text-right text-sm font-bold">
                    <p class="border border-black inline-block px-2 py-1">( 공급받는자 보관용 )</p>
                </div>
            </div>
            
            <div class="flex justify-between items-end mb-2 text-[11px] font-bold">
                 <div>거래일자 : ${start} ~ ${end}</div>
                 <div class="text-right">No. ${new Date().getTime().toString().slice(-8)}</div>
            </div>

            <!-- Main Info Table -->
            <div class="w-full border-t-2 border-l-2 border-black mb-4">
                <table class="w-full text-[11px] border-collapse table-fixed">
                    <colgroup>
                        <col style="width: 25px;">
                        <col style="width: 70px;">
                        <col style="width: auto;">
                        <col style="width: 50px;">
                        <col style="width: 80px;">
                        <col style="width: 25px;">
                        <col style="width: 70px;">
                        <col style="width: auto;">
                        <col style="width: 50px;">
                        <col style="width: 80px;">
                    </colgroup>
                    <tbody>
                        <!-- Registration Number Row -->
                        <tr class="h-10">
                            <td rowspan="4" class="border-r border-b border-black font-bold text-center bg-gray-100" style="writing-mode: vertical-rl; padding: 5px 0;">공급자</td>
                            <td class="border-r border-b border-black text-center bg-gray-50 font-bold">등록번호</td>
                            <td colspan="3" class="border-r border-b border-black px-2 text-[15px] font-black tracking-widest text-center align-middle">${bizNo}</td>
                            
                            <td rowspan="4" class="border-r border-b border-black font-bold text-center bg-gray-100" style="writing-mode: vertical-rl; padding: 5px 0;">공급받는자</td>
                            <td class="border-r border-b border-black text-center bg-gray-50 font-bold">등록번호</td>
                            <td colspan="3" class="border-b border-black px-2 text-[15px] font-black tracking-widest text-center align-middle">${customerBizNo}</td>
                        </tr>
                        <!-- Name and CEO Row -->
                        <tr class="h-10">
                            <td class="border-r border-b border-black text-center bg-gray-50 font-bold">상호<br>(법인명)</td>
                            <td class="border-r border-b border-black px-2 font-bold">${company.name}</td>
                            <td class="border-r border-b border-black text-center bg-gray-50 font-bold">성명</td>
                            <td class="border-r border-b border-black px-2 text-center relative">
                                <span class="font-bold">${ceo}</span>
                                <!-- Stamp Placeholder -->
                                <div class="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-red-500 flex items-center justify-center text-[10px] text-red-500 font-bold rotate-12 opacity-80">
                                    인
                                </div>
                            </td>
                            
                            <td class="border-r border-b border-black text-center bg-gray-50 font-bold">상호<br>(법인명)</td>
                            <td class="border-r border-b border-black px-2 font-bold">${customerName}</td>
                            <td class="border-r border-b border-black text-center bg-gray-50 font-bold">성명</td>
                            <td class="border-b border-black px-2 text-center align-middle font-bold">${customer.name}</td>
                        </tr>
                        <!-- Address Row -->
                        <tr class="h-12">
                            <td class="border-r border-b border-black text-center bg-gray-50 font-bold">사업장<br>주소</td>
                            <td colspan="3" class="border-r border-b border-black px-2 text-[10px] leading-tight align-middle">${addr}</td>
                            
                            <td class="border-r border-b border-black text-center bg-gray-50 font-bold">사업장<br>주소</td>
                            <td colspan="3" class="border-b border-black px-2 text-[10px] leading-tight align-middle">${customerAddress}</td>
                        </tr>
                        <!-- Contact/Note Row -->
                        <tr class="h-10">
                            <td class="border-r border-b border-black text-center bg-gray-50 font-bold">업태/종목</td>
                            <td class="border-r border-b border-black px-2 italic text-gray-400 text-[10px]">전자상거래</td>
                            <td class="border-r border-b border-black text-center bg-gray-50 font-bold">전화번호</td>
                            <td class="border-r border-b border-black px-2 text-center font-bold">${companyPhone}</td>
                            
                            <td class="border-r border-b border-black text-center bg-gray-50 font-bold">업태/종목</td>
                            <td class="border-r border-b border-black px-2 italic text-gray-400 text-[10px]"></td>
                            <td class="border-r border-b border-black text-center bg-gray-50 font-bold">전화번호</td>
                            <td class="border-b border-black px-2 text-center font-bold">${customerPhone}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Sum-up Section -->
            <div class="w-full border-2 border-black flex items-center mb-4 h-10 bg-slate-50">
                <div class="w-24 h-full flex items-center justify-center font-black border-r-2 border-black text-sm bg-gray-100">합계금액</div>
                <div class="flex-1 flex items-center justify-between px-6">
                    <span class="font-bold text-lg tracking-widest">${toKoreanCurrency(grandTotal)}</span>
                    <span class="font-black text-xl">₩ ${grandTotal.toLocaleString()}</span>
                </div>
            </div>

            <!-- Items Table -->
            <div class="w-full border-t-2 border-l-2 border-black mb-4">
                <table class="w-full text-[11px] border-collapse">
                    <thead>
                        <tr class="bg-gray-100 text-center border-b-2 border-black h-8 font-bold">
                            <th class="border-r border-black w-8">월</th>
                            <th class="border-r border-black w-8">일</th>
                            <th class="border-r border-black">품목 / 규격</th>
                            <th class="border-r border-black w-12">단위</th>
                            <th class="border-r border-black w-12">수량</th>
                            <th class="border-r border-black w-24">단가</th>
                            <th class="border-r border-black w-24">공급가액</th>
                            <th class="border-r border-black w-20">세액</th>
                            <th class="border-r border-black w-14">비고</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-black/20">
                        ${items.map(item => {
                            const date = new Date(item.sale_date);
                            return `
                                <tr class="text-center h-7">
                                    <td class="border-r border-black">${date.getMonth() + 1}</td>
                                    <td class="border-r border-black">${date.getDate()}</td>
                                    <td class="border-r border-black text-left px-2 font-medium truncate">${item.product_name}</td>
                                    <td class="border-r border-black">EA</td>
                                    <td class="border-r border-black">${item.quantity}</td>
                                    <td class="border-r border-black text-right px-1">${item.unit_price.toLocaleString()}</td>
                                    <td class="border-r border-black text-right px-1 font-bold">${item.subtotal.toLocaleString()}</td>
                                    <td class="border-r border-black text-right px-1 text-gray-500">${item.tax.toLocaleString()}</td>
                                    <td class="border-r border-black text-[9px] text-gray-400"></td>
                                </tr>
                            `;
                        }).join('')}
                        
                        <!-- Fixed Empty Rows for Form Height -->
                        ${Array(Math.max(0, 15 - items.length)).fill(0).map(() => `
                             <tr class="h-7">
                                <td class="border-r border-black"></td><td class="border-r border-black"></td><td class="border-r border-black"></td><td class="border-r border-black"></td><td class="border-r border-black"></td><td class="border-r border-black"></td><td class="border-r border-black"></td><td class="border-r border-black"></td><td class="border-r border-black"></td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                         <tr class="border-t-2 border-black h-9 font-bold bg-gray-50 text-center">
                            <td colspan="4" class="border-r border-black">소 계</td>
                            <td class="border-r border-black">${items.reduce((s, i) => s + i.quantity, 0)}</td>
                            <td class="border-r border-black"></td>
                            <td class="border-r border-black text-right px-1">${totalSupply.toLocaleString()}</td>
                            <td class="border-r border-black text-right px-1">${totalTax.toLocaleString()}</td>
                            <td class="border-r border-black"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- Footer / Bank / Note -->
            <div class="flex gap-4">
                <div class="flex-1 border-2 border-black p-3 bg-slate-50 min-h-[80px]">
                    <p class="text-[10px] font-black underline mb-2">입금계좌 안내</p>
                    <p class="text-xs font-bold">${company.bank_account || '별도 문의 바랍니다.'}</p>
                    <div class="mt-4 text-[9px] text-gray-400 leading-tight">
                        * 본 문서는 거래 확인용이며 법적 증빙(세금계산서) 효력이 없을 수 있습니다.<br>
                        * 계좌 입금 시 반드시 상호명으로 입금 부탁드립니다.
                    </div>
                </div>
                <div class="flex-1 border-2 border-black p-3 min-h-[80px]">
                    <p class="text-[10px] font-black underline mb-2">비고 (Note)</p>
                    <div class="text-[11px] whitespace-pre-wrap leading-tight">${note || '특이사항 없음'}</div>
                </div>
            </div>

            <div class="mt-6 text-center">
                 <p class="text-[10px] text-slate-300 font-mono italic tracking-tighter">Powered by WOW-SMART MANAGER Business Intelligence</p>
            </div>
        </div>
    `;
}

// 숫자를 한글 금액으로 변환 (예: 12500 -> 일금 일만이천오백 원정)
function toKoreanCurrency(number) {
  if (number === 0) return "일금 영 원정";

  const units = ["", "십", "백", "천"];
  const bigUnits = ["", "만", "억", "조", "경"];
  const numChar = ["영", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];

  let result = "";
  let n = number.toString();

  // 4자리씩 끊어서 처리
  let parts = [];
  for (let i = n.length; i > 0; i -= 4) {
    parts.push(n.substring(Math.max(0, i - 4), i));
  }

  for (let i = 0; i < parts.length; i++) {
    let part = parts[i];
    let partStr = "";

    for (let j = 0; j < part.length; j++) {
      let digit = parseInt(part.charAt(part.length - 1 - j));
      if (digit !== 0) {
        partStr = numChar[digit] + units[j] + partStr;
      }
    }

    if (partStr.length > 0) {
      result = partStr + bigUnits[i] + result;
    }
  }

  return "일금 " + result + " 원정";
}

window.renderTransactionStatementPage = renderTransactionStatementPage;
window.searchTSCustomer = searchTSCustomer;
window.selectTSCustomer = selectTSCustomer;
window.clearTSCustomer = clearTSCustomer;
window.loadTSData = loadTSData;
window.prepareTSPrint = prepareTSPrint;
window.downloadTSExcel = downloadTSExcel;
window.toggleAllTSItems = toggleAllTSItems;
window.saveTSDocument = saveTSDocument;
window.loadTSHistory = loadTSHistory;

async function saveTSDocument() {
  const customerId = document.getElementById('tsCustomerId').value;
  const startDate = document.getElementById('tsStartDate').value;
  const endDate = document.getElementById('tsEndDate').value;
  const applyVat = document.getElementById('tsApplyVat')?.checked;
  const note = document.getElementById('tsNote')?.value || '';
  const ids = [...document.querySelectorAll('.ts-item-checkbox:checked')].map(cb => Number(cb.value));

  if (!customerId) return showToast('고객을 선택하세요.', 'warning');
  if (!ids.length) return showToast('저장할 판매를 선택하세요.', 'warning');

  try {
    let supply = 0;
    const rows = document.querySelectorAll('.ts-item-checkbox:checked');
    rows.forEach(cb => {
      const tr = cb.closest('tr');
      const amountText = tr?.querySelector('td:last-child')?.textContent?.replace(/[^\d.-]/g, '') || '0';
      supply += Number(amountText) || 0;
    });
    const vat = applyVat ? Math.round(supply * 0.1) : 0;
    const detail = await fetchTSData(ids);
    const res = await axios.post(`${API_BASE}/transaction-statements`, {
      customer_id: Number(customerId),
      start_date: startDate,
      end_date: endDate,
      apply_vat: !!applyVat,
      note,
      sale_ids: ids,
      supply_amount: detail?.items
        ? detail.items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0)
        : supply,
      vat_amount: vat,
      total_amount: (detail?.items
        ? detail.items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0)
        : supply) + vat,
      snapshot: detail ? {
        items: detail.items,
        customer: detail.customer,
        company: detail.company
      } : null
    });
    showToast(`저장됨: ${res.data.data.doc_number}`, 'success');
    loadTSHistory();
  } catch (e) {
    alert('저장 실패: ' + (e.response?.data?.error || e.message));
  }
}

async function loadTSHistory() {
  const el = document.getElementById('tsHistoryList');
  const customerId = document.getElementById('tsCustomerId')?.value;
  if (!el) return;
  if (!customerId) {
    el.textContent = '고객을 선택하면 이력이 표시됩니다.';
    return;
  }
  el.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  try {
    const res = await axios.get(`${API_BASE}/transaction-statements`, {
      params: { customerId, limit: 30 }
    });
    const rows = res.data.data || [];
    if (!rows.length) {
      el.innerHTML = '<div class="text-slate-400 py-4 text-center">저장된 명세서가 없습니다.</div>';
      return;
    }
    el.innerHTML = `
      <table class="min-w-full text-sm">
        <thead class="text-xs text-slate-500 bg-slate-50">
          <tr>
            <th class="px-3 py-2 text-left">문서번호</th>
            <th class="px-3 py-2 text-left">기간</th>
            <th class="px-3 py-2 text-right">합계</th>
            <th class="px-3 py-2 text-left">작성</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          ${rows.map(r => `
            <tr>
              <td class="px-3 py-2 font-mono text-xs font-semibold text-teal-800">${r.doc_number}</td>
              <td class="px-3 py-2 text-slate-600">${r.start_date} ~ ${r.end_date}</td>
              <td class="px-3 py-2 text-right font-bold">${Number(r.total_amount || 0).toLocaleString()}원</td>
              <td class="px-3 py-2 text-slate-500 text-xs">${(r.created_at || '').slice(0, 16)} · ${r.created_by_name || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="text-rose-500">${e.response?.data?.error || e.message}</div>`;
  }
}
