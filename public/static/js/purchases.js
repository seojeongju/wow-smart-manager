
// 입고/발주 관리 페이지 로드
window.loadPurchasesPage = function (initialTab = 'purchases') {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">
          <i class="fas fa-truck-moving mr-2 text-teal-600"></i>입고/발주 관리
        </h1>
        <p class="text-sm text-slate-500 mt-1">사이드바 구매 탭 순서와 동일 · 발주 관리 → 공급사 관리</p>
      </div>
    </div>

    <!-- 탭 버튼 (사이드바: purchases → suppliers) -->
    <div class="flex mb-6 border-b border-slate-200">
      <button onclick="switchPurchaseTab('purchases')" id="tab-purchases" class="px-6 py-3 text-sm font-medium border-b-2 border-teal-600 text-teal-600 transition-colors">발주 관리</button>
      <button onclick="switchPurchaseTab('suppliers')" id="tab-suppliers" class="px-6 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-teal-600 transition-colors">공급사 관리</button>
    </div>

    <!-- 탭 컨텐츠 영역 -->
    <div id="purchase-tab-content">
      <!-- 동적 로드 -->
    </div>

    <!-- 모달 영역 (동적 추가됨) -->
    <div id="purchase-modals"></div>
  `;

  // 초기 탭 로드
  switchPurchaseTab(initialTab);
}

window.switchPurchaseTab = function (tabName) {
  const purchasesBtn = document.getElementById('tab-purchases');
  const suppliersBtn = document.getElementById('tab-suppliers');

  if (typeof window.setHelpContext === 'function') {
    window.setHelpContext('purchases', tabName);
  }
  if (typeof window.syncSidebarNav === 'function') {
    window.syncSidebarNav('purchases', tabName);
  }

  if (tabName === 'purchases') {
    purchasesBtn.classList.add('border-teal-600', 'text-teal-600');
    purchasesBtn.classList.remove('border-transparent', 'text-slate-500');
    suppliersBtn.classList.remove('border-teal-600', 'text-teal-600');
    suppliersBtn.classList.add('border-transparent', 'text-slate-500');
    loadPurchasesList();
  } else {
    suppliersBtn.classList.add('border-teal-600', 'text-teal-600');
    suppliersBtn.classList.remove('border-transparent', 'text-slate-500');
    purchasesBtn.classList.remove('border-teal-600', 'text-teal-600');
    purchasesBtn.classList.add('border-transparent', 'text-slate-500');
    loadSuppliersList();
  }
}

// ----------------------------------------------------
// 공급사 관리 (Suppliers)
// ----------------------------------------------------
async function loadSuppliersList() {
  const container = document.getElementById('purchase-tab-content');
  container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-teal-500"></i></div>';

  try {
    const res = await axios.get(`${API_BASE}/suppliers`);
    const suppliers = res.data.data;

    container.innerHTML = `
      <div class="flex justify-end mb-4">
        <button onclick="showSupplierModal()" class="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition">
          <i class="fas fa-plus mr-2"></i>공급사 등록
        </button>
      </div>

      <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
        <table class="w-full text-sm text-left text-slate-500">
          <thead class="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-6 py-3">공급사명</th>
              <th class="px-6 py-3">담당자</th>
              <th class="px-6 py-3">연락처</th>
              <th class="px-6 py-3">이메일</th>
              <th class="px-6 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            ${suppliers.length === 0 ? `<tr><td colspan="5" class="px-6 py-8 text-center text-slate-400">등록된 공급사가 없습니다.</td></tr>` :
        suppliers.map(s => `
                <tr class="hover:bg-slate-50 transition">
                  <td class="px-6 py-4 font-medium text-slate-900">${s.name}</td>
                  <td class="px-6 py-4">${s.contact_person || '-'}</td>
                  <td class="px-6 py-4">${s.phone || '-'}</td>
                  <td class="px-6 py-4">${s.email || '-'}</td>
                  <td class="px-6 py-4 text-right">
                    <button onclick="showSupplierModal(${s.id})" class="text-teal-600 hover:text-teal-800 mr-2"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteSupplier(${s.id})" class="text-red-500 hover:text-red-700 ml-2"><i class="fas fa-trash"></i></button>
                  </td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    container.innerHTML = '<div class="text-red-500 text-center py-10">데이터를 불러오는데 실패했습니다.</div>';
    console.error(error);
  }
}

window.showSupplierModal = async function (id = null) {
  window.editingSupplierId = id;
  const isEdit = !!id;

  const modalHtml = `
    <div id="supplierModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center animate-fade-in">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div class="bg-teal-600 px-6 py-4 flex justify-between items-center">
          <h3 class="text-lg font-bold text-white">${isEdit ? '공급사 수정' : '공급사 등록'}</h3>
          <button onclick="closeModal('supplierModal'); window.editingSupplierId = null;" class="text-white hover:text-teal-200"><i class="fas fa-times"></i></button>
        </div>
        <form onsubmit="handleCreateSupplier(event)" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">공급사명 <span class="text-red-500">*</span></label>
            <input type="text" name="name" id="sup-name" required class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">담당자</label>
              <input type="text" name="contact_person" id="sup-contact" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">연락처</label>
              <input type="text" name="phone" id="sup-phone" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">이메일</label>
            <input type="email" name="email" id="sup-email" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none">
          </div>
           <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">사업자번호</label>
            <input type="text" name="business_number" id="sup-biznum" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">주소</label>
            <input type="text" name="address" id="sup-address" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none">
          </div>
          <div class="flex justify-end pt-4">
            <button type="button" onclick="closeModal('supplierModal'); window.editingSupplierId = null;" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg mr-2">취소</button>
            <button type="submit" class="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">${isEdit ? '수정' : '등록'}</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  if (isEdit) {
    try {
      const res = await axios.get(`${API_BASE}/suppliers/${id}`);
      const data = res.data.data;
      document.getElementById('sup-name').value = data.name;
      document.getElementById('sup-contact').value = data.contact_person || '';
      document.getElementById('sup-phone').value = data.phone || '';
      document.getElementById('sup-email').value = data.email || '';
      document.getElementById('sup-biznum').value = data.business_number || '';
      document.getElementById('sup-address').value = data.address || '';
    } catch (e) {
      console.error(e);
      alert('공급사 정보를 불러오는데 실패했습니다.');
      closeModal('supplierModal');
      window.editingSupplierId = null; // Reset on error
    }
  }
}

window.handleCreateSupplier = async function (e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);

  try {
    if (window.editingSupplierId) {
      await axios.put(`${API_BASE}/suppliers/${window.editingSupplierId}`, data);
      alert('공급사 정보가 수정되었습니다.');
    } else {
      await axios.post(`${API_BASE}/suppliers`, data);
    }
    closeModal('supplierModal');
    window.editingSupplierId = null; // Reset after successful operation
    loadSuppliersList();
  } catch (err) {
    alert(err.response?.data?.error || (window.editingSupplierId ? '수정 실패' : '등록 실패'));
  }
}

window.deleteSupplier = async function (id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;
  try {
    await axios.delete(`${API_BASE}/suppliers/${id}`);
    loadSuppliersList();
  } catch (err) {
    alert(err.response?.data?.error || '삭제 실패');
  }
}

// ----------------------------------------------------
// 발주 관리 (Purchase Orders)
// ----------------------------------------------------
async function loadPurchasesList() {
  const container = document.getElementById('purchase-tab-content');
  container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-teal-500"></i></div>';

  try {
    const res = await axios.get(`${API_BASE}/purchases`);
    const orders = res.data.data;

    container.innerHTML = `
      <div class="flex justify-between mb-4">
        <div class="flex gap-2">
           <!-- 필터 영역 (추구 구현) -->
        </div>
        <button onclick="window.editingPoId = null; showCreatePurchaseModal()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
          <i class="fas fa-plus mr-2"></i>발주서 작성
        </button>
      </div>

      <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
        <table class="w-full text-sm text-left text-slate-500">
          <thead class="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-6 py-3">발주번호</th>
              <th class="px-6 py-3">공급사</th>
              <th class="px-6 py-3">상태</th>
              <th class="px-6 py-3">총 금액</th>
              <th class="px-6 py-3">입고예정일</th>
              <th class="px-6 py-3">작성일</th>
              <th class="px-6 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            ${orders.length === 0 ? `<tr><td colspan="7" class="px-6 py-8 text-center text-slate-400">발주 내역이 없습니다.</td></tr>` :
        orders.map(o => `
                <tr class="hover:bg-slate-50 transition cursor-pointer" onclick="showPurchaseDetailModal(${o.id})">
                  <td class="px-6 py-4 font-mono font-medium text-slate-900">${o.code}</td>
                  <td class="px-6 py-4">${o.supplier_name}</td>
                  <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded-full text-xs font-bold ${getStatusClass(o.status)}">${getStatusLabel(o.status)}</span>
                  </td>
                  <td class="px-6 py-4 font-medium">${formatCurrency(o.total_amount)}</td>
                  <td class="px-6 py-4">${o.expected_at ? new Date(o.expected_at).toLocaleDateString() : '-'}</td>
                  <td class="px-6 py-4 text-xs text-slate-400">${new Date(o.created_at).toLocaleDateString()}</td>
                  <td class="px-6 py-4 text-right" onclick="event.stopPropagation()">
                    <button onclick="showPurchaseDetailModal(${o.id})" class="text-indigo-600 hover:text-indigo-800 text-xs border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50">상세/입고</button>
                    ${o.status === 'ORDERED' || o.status === 'DRAFT' ? `<button onclick="showEditPurchaseModal(${o.id})" class="text-slate-500 hover:text-slate-700 text-xs border border-slate-200 px-2 py-1 rounded hover:bg-slate-50 ml-1">수정</button><button onclick="deletePurchaseOrder(${o.id})" class="text-red-500 hover:text-red-700 text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50 ml-1">삭제</button>` : ''}
                    ${o.status === 'DRAFT' ? `<button onclick="confirmPurchaseDraft(${o.id}, '${o.code || ''}')" class="text-orange-600 hover:text-orange-800 text-xs border border-orange-200 px-2 py-1 rounded hover:bg-orange-50 ml-1">발주확정</button>` : ''}
                  </td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    container.innerHTML = '<div class="text-red-500 text-center py-10">데이터를 불러오는데 실패했습니다.</div>';
    console.error(error);
  }
}

function getStatusClass(status) {
  switch (status) {
    case 'DRAFT': return 'bg-slate-100 text-slate-700';
    case 'ORDERED': return 'bg-yellow-100 text-yellow-800';
    case 'PARTIAL_RECEIVED': return 'bg-blue-100 text-blue-800';
    case 'COMPLETED': return 'bg-green-100 text-green-800';
    case 'CANCELLED': return 'bg-gray-100 text-gray-800';
    default: return 'bg-slate-100 text-slate-800';
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'DRAFT': return '초안';
    case 'ORDERED': return '발주완료';
    case 'PARTIAL_RECEIVED': return '부분입고';
    case 'COMPLETED': return '입고완료';
    case 'CANCELLED': return '취소됨';
    default: return status;
  }
}

// 발주서 작성 모달
window.showCreatePurchaseModal = async function () {
  // 기존 모달이 있으면 즉시 삭제 (ID 중복 방지)
  const existing = document.getElementById('createPurchaseModal');
  if (existing) existing.remove();

  // 공급사 및 상품 목록 조회
  try {
    const [suppliersRes, productsRes] = await Promise.all([
      axios.get(`${API_BASE}/suppliers`),
      axios.get(`${API_BASE}/products?limit=1000`) // 모든 상품
    ]);
    const suppliers = suppliersRes.data.data;
    const products = productsRes.data.data;

    // 글로벌 변수에 저장 (상품 검색용)
    window.purchaseProducts = products;

    const modalHtml = `
      <div id="createPurchaseModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center animate-fade-in">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
          <div class="bg-indigo-600 px-6 py-4 flex justify-between items-center shrink-0">
            <h3 class="text-lg font-bold text-white" id="po-modal-title">발주서 작성</h3>
            <button onclick="closeModal('createPurchaseModal'); window.editingPoId = null;" class="text-white hover:text-indigo-200"><i class="fas fa-times"></i></button>
          </div>
          
          <div class="p-6 overflow-y-auto flex-1">
            <div class="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">공급사 <span class="text-red-500">*</span></label>
                <select id="po-supplier" class="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">공급사를 선택하세요</option>
                  ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">입고 예정일</label>
                <input type="date" id="po-date" class="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
              </div>
            </div>

            <div class="mb-4">
              <h4 class="font-bold text-slate-700 mb-2 flex justify-between items-center">
                발주 품목
                <button onclick="addPoItemRow()" class="text-sm text-indigo-600 hover:text-indigo-800"><i class="fas fa-plus mr-1"></i>품목 추가</button>
              </h4>
              <div class="bg-slate-50 rounded-lg border border-slate-200 p-2">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-slate-500 text-left">
                      <th class="pb-2 pl-2">상품명</th>
                      <th class="pb-2 w-24">수량</th>
                      <th class="pb-2 w-32">단가</th>
                      <th class="pb-2 w-32">합계</th>
                      <th class="pb-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody id="po-items-list">
                    <!-- Rows added via JS -->
                  </tbody>
                  <tfoot>
                    <tr class="border-t border-slate-200">
                      <td colspan="3" class="pt-3 text-right font-bold text-slate-700 pr-4">총 발주 금액:</td>
                      <td class="pt-3 font-bold text-indigo-600" id="po-total-amount">0원</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">비고</label>
              <textarea id="po-notes" class="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" rows="2"></textarea>
            </div>
          </div>

          <div class="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end shrink-0">
            <button onclick="closeModal('createPurchaseModal'); window.editingPoId = null;" class="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg mr-2">취소</button>
            <button onclick="submitPurchaseOrder()" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm" id="po-submit-btn">발주서 발행</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    addPoItemRow(); // Add first row
  } catch (e) {
    console.error(e);
    alert('데이터 로드 실패');
  }
}

window.addPoItemRow = function () {
  const tbody = document.getElementById('po-items-list');
  const rowId = 'row-' + Math.random().toString(36).substr(2, 9);
  const options = window.purchaseProducts.map(p => `<option value="${p.id}" data-price="${p.purchase_price}">${p.name} (${p.sku})</option>`).join('');

  const tr = document.createElement('tr');
  tr.id = `po-row-${rowId}`;
  tr.innerHTML = `
    <td class="py-1">
      <select class="w-full border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500" onchange="updatePoRow('${rowId}', true)">
        <option value="">상품 선택</option>
        ${options}
      </select>
    </td>
    <td class="py-1">
      <input type="number" class="w-full border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500" value="1" min="1" onchange="updatePoRow('${rowId}')">
    </td>
    <td class="py-1">
      <input type="number" class="w-full border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500" onchange="updatePoRow('${rowId}')">
    </td>
    <td class="py-1 font-medium text-slate-700 row-total">0원</td>
    <td class="py-1 text-center">
      <button onclick="removePoRow('${rowId}')" class="text-slate-400 hover:text-red-500"><i class="fas fa-times"></i></button>
    </td>
  `;
  tbody.appendChild(tr);
}

window.updatePoRow = function (rowId, isProductChange = false) {
  const row = document.getElementById(`po-row-${rowId}`);
  const select = row.querySelector('select');
  const qtyInput = row.querySelectorAll('input')[0];
  const priceInput = row.querySelectorAll('input')[1];
  const totalDisplay = row.querySelector('.row-total');

  const selectedOption = select.options[select.selectedIndex];

  // 상품 변경 시에만 기본 단가 세팅
  if (isProductChange && selectedOption.dataset.price) {
    priceInput.value = selectedOption.dataset.price;
  }

  const price = parseInt(priceInput.value || 0);
  const qty = parseInt(qtyInput.value || 0);

  const total = price * qty;
  totalDisplay.textContent = formatCurrency(total);

  updatePoTotal();
}

window.removePoRow = function (rowId) {
  document.getElementById(`po-row-${rowId}`).remove();
  updatePoTotal();
}

window.updatePoTotal = function () {
  const rows = document.querySelectorAll('#po-items-list tr');
  let total = 0;
  rows.forEach(row => {
    const qty = parseInt(row.querySelectorAll('input')[0].value || 0);
    const price = parseInt(row.querySelectorAll('input')[1].value || 0);
    total += qty * price;
  });
  document.getElementById('po-total-amount').textContent = formatCurrency(total);
}

window.submitPurchaseOrder = async function () {
  const supplierId = document.getElementById('po-supplier').value;
  const expectedAt = document.getElementById('po-date').value;
  const notes = document.getElementById('po-notes').value;

  if (!supplierId) return alert('공급사를 선택해주세요.');

  const items = [];
  const rows = document.querySelectorAll('#po-items-list tr');
  for (let row of rows) {
    const select = row.querySelector('select');
    const qty = parseInt(row.querySelectorAll('input')[0].value || 0);
    const price = parseInt(row.querySelectorAll('input')[1].value || 0);

    if (select.value && qty > 0) {
      items.push({
        product_id: parseInt(select.value),
        quantity: qty,
        unit_price: price
      });
    }
  }

  if (items.length === 0) return alert('발주할 상품을 입력해주세요.');

  try {
    if (window.editingPoId) {
      await axios.put(`${API_BASE}/purchases/${window.editingPoId}`, {
        supplier_id: supplierId,
        expected_at: expectedAt,
        notes: notes,
        items: items
      });
      alert('발주 정보가 수정되었습니다.');
    } else {
      await axios.post(`${API_BASE}/purchases`, {
        supplier_id: supplierId,
        expected_at: expectedAt,
        notes: notes,
        items: items
      });
    }

    closeModal('createPurchaseModal');
    window.editingPoId = null; // Clear editing state after submission
    loadPurchasesList();
  } catch (err) {
    alert(err.response?.data?.error || '발주 실패');
  }
}

window.showEditPurchaseModal = async function (id) {
  try {
    window.editingPoId = id;

    // 1. Load Modal (Base)
    await showCreatePurchaseModal();

    // 2. Change Title & Button
    document.getElementById('po-modal-title').textContent = '발주서 수정';
    document.getElementById('po-submit-btn').textContent = '수정 완료';

    // 3. Fetch PO Details
    const res = await axios.get(`${API_BASE}/purchases/${id}`);
    const po = res.data.data;

    // 4. Fill Data
    document.getElementById('po-supplier').value = po.supplier_id;
    if (po.expected_at) document.getElementById('po-date').value = po.expected_at.split('T')[0];
    document.getElementById('po-notes').value = po.notes || '';

    // 5. Fill Items
    const tbody = document.getElementById('po-items-list');
    tbody.innerHTML = ''; // Clear empty row added by showCreatePurchaseModal

    if (!po.items) po.items = [];

    po.items.forEach(item => {
      const rowId = 'row-' + Math.random().toString(36).substr(2, 9);
      const options = window.purchaseProducts.map(p => `<option value="${p.id}" data-price="${p.purchase_price}" ${p.id === item.product_id ? 'selected' : ''}>${p.name} (${p.sku})</option>`).join('');

      const tr = document.createElement('tr');
      tr.id = `po-row-${rowId}`;
      tr.innerHTML = `
            <td class="py-1">
              <select class="w-full border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500" onchange="updatePoRow('${rowId}', true)">
                <option value="">상품 선택</option>
                ${options}
              </select>
            </td>
            <td class="py-1">
              <input type="number" class="w-full border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500" value="${item.quantity}" min="1" onchange="updatePoRow('${rowId}')">
            </td>
            <td class="py-1">
              <input type="number" class="w-full border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500" value="${item.unit_price}" onchange="updatePoRow('${rowId}')">
            </td>
            <td class="py-1 font-medium text-slate-700 row-total">${formatCurrency(item.quantity * item.unit_price)}</td>
            <td class="py-1 text-center">
              <button onclick="removePoRow('${rowId}')" class="text-slate-400 hover:text-red-500"><i class="fas fa-times"></i></button>
            </td>
          `;
      tbody.appendChild(tr);
      tbody.appendChild(tr);
    });

    // 만약 품목이 하나도 없다면 빈 줄 하나 추가 (사용자 편의)
    if (po.items.length === 0) {
      addPoItemRow();
    }

    updatePoTotal();

  } catch (e) {
    console.error(e);
    alert('발주 정보 로드 오류: ' + e.message);
    // closeModal('createPurchaseModal'); // Keep modal open for debugging
    window.editingPoId = null;
  }
}

window.deletePurchaseOrder = async function (id) {
  if (!confirm('정말로 이 발주서를 삭제하시겠습니까?\n\n삭제된 발주서는 복구할 수 없습니다.')) return;

  try {
    await axios.delete(`${API_BASE}/purchases/${id}`);
    alert('발주서가 삭제되었습니다.');
    loadPurchasesList();
  } catch (err) {
    alert(err.response?.data?.error || '발주서 삭제에 실패했습니다.');
  }
}

// ----------------------------------------------------
// 발주 상세 및 입고 처리
// ----------------------------------------------------
window.showPurchaseDetailModal = async function (id) {
  try {
    const res = await axios.get(`${API_BASE}/purchases/${id}`);
    const po = res.data.data;

    const modalHtml = `
      <div id="poDetailModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center animate-fade-in">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
          <div class="bg-slate-800 px-6 py-4 flex justify-between items-center shrink-0">
            <div>
               <span class="text-slate-400 text-xs font-mono">${po.code}</span>
               <h3 class="text-lg font-bold text-white">발주 상세 정보</h3>
            </div>
            <button onclick="closeModal('poDetailModal')" class="text-white hover:text-slate-300"><i class="fas fa-times"></i></button>
          </div>
          
          <div class="p-6 overflow-y-auto flex-1">
            <div class="flex justify-between items-start mb-6 bg-slate-50 p-4 rounded-lg">
              <div>
                <p class="text-sm text-slate-500">공급사</p>
                <p class="text-lg font-bold text-slate-800">${po.supplier_name}</p>
                <p class="text-sm text-slate-600">${po.contact_person || '-'} / ${po.phone || '-'}</p>
              </div>
              <div class="text-right">
                <p class="text-sm text-slate-500">상태</p>
                <span class="px-2 py-1 rounded-full text-xs font-bold ${getStatusClass(po.status)}">${getStatusLabel(po.status)}</span>
                <p class="text-sm text-slate-500 mt-2">총 금액</p>
                <p class="text-xl font-bold text-indigo-600">${formatCurrency(po.total_amount)}</p>
              </div>
            </div>

            <h4 class="font-bold text-slate-700 mb-3 ml-1">발주 품목 및 입고 처리</h4>
            <div class="border rounded-lg overflow-hidden">
               <table class="w-full text-sm">
                 <thead class="bg-slate-100 text-slate-600 uppercase text-xs">
                   <tr>
                     <th class="px-4 py-2 text-left">상품명</th>
                     <th class="px-4 py-2 text-right">발주수량</th>
                     <th class="px-4 py-2 text-right">기입고</th>
                     <th class="px-4 py-2 text-right">잔여</th>
                     <th class="px-4 py-2 text-right bg-indigo-50 w-32">금회 입고</th>
                   </tr>
                 </thead>
                  <tbody class="divide-y divide-slate-100" id="receive-list">
                    ${po.items.length === 0 ? `<tr><td colspan="5" class="px-4 py-8 text-center text-slate-400">발주 품목이 없습니다.</td></tr>` :
        po.items.map(item => {
          const remaining = item.quantity - item.received_quantity;
          const isDone = remaining <= 0;
          return `
                       <tr class="${isDone ? 'bg-slate-50 text-slate-400' : ''}">
                         <td class="px-4 py-3">
                           <div class="font-medium">${item.product_name || '<span class="text-red-400">(삭제된 상품)</span>'}</div>
                           <div class="text-xs text-slate-400">${item.sku || '-'}</div>
                         </td>
                         <td class="px-4 py-3 text-right">${item.quantity}</td>
                         <td class="px-4 py-3 text-right">${item.received_quantity}</td>
                         <td class="px-4 py-3 text-right font-medium ${isDone ? 'text-green-500' : 'text-orange-500'}">${Math.max(0, remaining)}</td>
                         <td class="px-4 py-3 bg-indigo-50">
                           ${!isDone ? `
                             <input type="number" data-id="${item.id}" max="${remaining}" min="0" value="0" class="w-full border border-indigo-200 rounded px-2 py-1 text-right focus:ring-2 focus:ring-indigo-500 text-indigo-700 font-bold receive-input">
                           ` : '<span class="text-xs text-green-600">완료</span>'}
                         </td>
                       </tr>
                     `;
        }).join('')}
                  </tbody>
               </table>
            </div>

            <div class="mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-sm text-yellow-800 flex items-start">
               <i class="fas fa-info-circle mt-0.5 mr-2"></i>
               <p>입고 수량을 입력하고 '입고 처리' 버튼을 누르면 해당 수량만큼 재고가 <strong>즉시 증가</strong>합니다.</p>
            </div>
          </div>

          <div class="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between shrink-0">
             <button onclick="closeModal('poDetailModal')" class="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">닫기</button>
             ${po.status !== 'COMPLETED' && po.status !== 'CANCELLED' ? `
               <button onclick="submitReceive(${po.id})" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg transform active:scale-95 transition">
                 <i class="fas fa-box-open mr-2"></i>선택 품목 입고 처리
               </button>
             ` : ''}
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  } catch (e) {
    console.error(e);
    alert('상세 정보 로드 실패');
  }
}

window.submitReceive = async function (poId) {
  const inputs = document.querySelectorAll('.receive-input');
  const itemsToReceive = [];

  inputs.forEach(input => {
    const qty = parseInt(input.value || 0);
    if (qty > 0) {
      itemsToReceive.push({
        id: parseInt(input.dataset.id),
        quantity: qty
      });
    }
  });

  if (itemsToReceive.length === 0) {
    return alert('입고할 수량을 입력해주세요.');
  }

  if (!confirm(`${itemsToReceive.length}개 품목에 대해 입고 처리를 진행하시겠습니까?\n처리가 완료되면 재고가 즉시 반영됩니다.`)) return;

  try {
    const res = await axios.post(`${API_BASE}/purchases/${poId}/receive`, { items: itemsToReceive });
    alert(res.data.message);
    closeModal('poDetailModal');
    loadPurchasesList(); // Refresh list
    // Optionally reopen detail to show updated state
    showPurchaseDetailModal(poId);
  } catch (err) {
    alert(err.response?.data?.error || '입고 처리 실패');
  }
}

window.confirmPurchaseDraft = async function (poId, code) {
  const label = code || poId;
  if (!confirm('발주 초안 ' + label + ' 을(를) 발주완료(ORDERED)로 확정할까요?')) return;
  try {
    await axios.put(API_BASE + '/purchases/' + poId + '/status', { status: 'ORDERED' });
    if (typeof showToast === 'function') showToast('발주가 확정되었습니다', 'success');
    else alert('발주가 확정되었습니다');
    if (typeof loadPurchasesList === 'function') loadPurchasesList();
    else if (typeof window.loadPurchasesPage === 'function') window.loadPurchasesPage('purchases');
  } catch (err) {
    const msg = err.response?.data?.error || '발주 확정 실패';
    if (typeof showToast === 'function') showToast(msg, 'error');
    else alert(msg);
  }
};
