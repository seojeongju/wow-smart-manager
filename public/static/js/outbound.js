/* outbound.js - 출고 관리 모듈 */

let outboundCurrentPage = 1; // History pagination
const outboundPerPage = 10;
let outboundProdPage = 1; // Product list pagination
const outboundProdLimit = 6; // Product items per page
let outboundInputMode = 'auto'; // 'auto' | 'manual'
if (!window.outboundCart) window.outboundCart = [];

async function renderOutboundPage(initialTab = 'reg') {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="flex flex-col h-full">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-slate-800">
          <i class="fas fa-truck-loading mr-2 text-teal-600"></i>출고 관리
        </h1>
      </div>

      <!-- 탭 네비게이션 -->
      <div class="flex border-b border-slate-200 mb-6 bg-white rounded-t-xl px-4 pt-2 shadow-sm">
        <button id="tab-out-reg" class="px-6 py-4 font-bold text-teal-600 border-b-2 border-teal-600 transition-colors flex items-center" onclick="switchOutboundTab('reg')">
          <i class="fas fa-edit mr-2"></i>간편 출고 등록
        </button>
        <button id="tab-out-hist" class="px-6 py-4 font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center" onclick="switchOutboundTab('hist')">
          <i class="fas fa-history mr-2"></i>출고 이력 조회
        </button>
        <button id="tab-out-warehouse" class="px-6 py-4 font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center" onclick="switchOutboundTab('warehouse')">
          <i class="fas fa-warehouse mr-2"></i>창고별 관리
        </button>
      </div>

      <!-- 탭 컨텐츠 영역 -->
      <div id="outboundTabContent" class="flex-1 overflow-hidden flex flex-col relative">
        <!-- 동적 로드 -->
      </div>
    </div>
  `;

  // 기본 탭 로드
  switchOutboundTab(initialTab);
}

async function switchOutboundTab(tabName) {
  const tabs = ['reg', 'hist', 'warehouse'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-out-${t}`);
    if (btn) {
      if (t === tabName) {
        btn.classList.remove('text-slate-500', 'font-medium', 'border-transparent');
        btn.classList.add('text-teal-600', 'border-b-2', 'border-teal-600', 'font-bold');
      } else {
        btn.classList.remove('text-teal-600', 'border-b-2', 'border-teal-600', 'font-bold');
        btn.classList.add('text-slate-500', 'font-medium', 'border-transparent');
      }
    }
  });

  const container = document.getElementById('outboundTabContent');
  container.innerHTML = ''; // Clear content first

  if (tabName === 'reg') {
    await renderOutboundRegistrationTab(container);
  } else if (tabName === 'hist') {
    await renderOutboundHistoryTab(container);
  } else if (tabName === 'warehouse') {
    await renderOutboundWarehouseTab(container);
  }
}

async function renderOutboundRegistrationTab(container) {
  // 상품 목록 로드
  if (!window.products) {
    try {
      const res = await axios.get(`${API_BASE}/products`);
      window.products = res.data.data;
    } catch (e) {
      console.error('상품 로드 실패', e);
    }
  }

  // Ensure sorting is applied (Important: Do this outside the if block to ensure it's always sorted when rendering)
  if (Array.isArray(window.products)) {
    window.products.sort((a, b) => b.current_stock - a.current_stock);
  }

  // 창고 목록 로드
  if (!window.warehouses) {
    try {
      const res = await axios.get(`${API_BASE}/warehouses`);
      window.warehouses = res.data.data;
    } catch (e) {
      console.error('창고 로드 실패', e);
    }
  }

  container.innerHTML = `
    <div class="flex flex-1 gap-6 overflow-hidden h-full pb-4">
      <!-- 좌측: 상품 선택 -->
      <div class="w-1/2 flex flex-col bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50">
          <div class="flex justify-between items-center mb-3">
             <h3 class="font-bold text-slate-800">1. 출고 상품 선택</h3>
             <button onclick="openOutboundExcelUploadModal()" class="text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700 transition-colors flex items-center gap-1">
               <i class="fas fa-file-excel"></i> 엑셀 일괄 등록
             </button>
          </div>
          
          <div class="flex gap-4 mb-3">
            <label class="flex items-center cursor-pointer group">
              <input type="radio" name="outMode" value="auto" checked onchange="setOutboundMode('auto')" class="form-radio text-teal-600 focus:ring-teal-500 w-4 h-4">
              <span class="ml-2 text-sm text-slate-700 group-hover:text-teal-700 font-medium">스캔 (자동 +1)</span>
            </label>
            <label class="flex items-center cursor-pointer group">
              <input type="radio" name="outMode" value="manual" onchange="setOutboundMode('manual')" class="form-radio text-teal-600 focus:ring-teal-500 w-4 h-4">
              <span class="ml-2 text-sm text-slate-700 group-hover:text-teal-700 font-medium">수량 수동 입력</span>
            </label>
          </div>

          <div class="relative">
            <i class="fas fa-search absolute left-3 top-3 text-slate-400"></i>
            <input type="text" id="outboundSearch" placeholder="상품명 또는 SKU 검색..." 
                   class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow"
                   onkeyup="filterOutboundProducts()">
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-2" id="outboundProductList">
          <!-- 상품 목록 렌더링 -->
        </div>
        <!-- 페이지네이션 컨트롤 -->
        <div id="outboundProductPagination" class="p-2 border-t border-slate-100 bg-white"></div>
      </div>

      <!-- 우측: 출고 정보 입력 -->
      <div class="w-1/2 flex flex-col gap-6 overflow-y-auto pr-2">
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 class="font-bold text-slate-800 mb-4">2. 선택된 상품</h3>
          <div id="outboundCartItems" class="space-y-3 mb-4 min-h-[100px]">
            <p class="text-center text-slate-400 py-8">상품을 선택해주세요.</p>
          </div>
          <div class="flex justify-between items-center pt-4 border-t border-slate-100">
            <span class="font-bold text-slate-600">총 수량</span>
            <span class="font-bold text-teal-600 text-lg" id="outboundTotalQty">0개</span>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 class="font-bold text-slate-800 mb-4">3. 구매자 정보 (고객 등록 대상)</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1">출고 창고 <span class="text-red-500">*</span></label>
              <select id="outWarehouse" class="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-500">
                 <option value="">창고 선택...</option>
                 ${(window.warehouses || []).map(w => `<option value="${w.id}" ${w.name.includes('기본') ? 'selected' : ''}>${w.name}</option>`).join('')}
              </select>
            </div>

            <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">기존 고객 검색</label>
              <div class="relative" id="outCustomerSearchWrapper">
                <input type="text" id="outCustomerSearch" placeholder="이름 또는 연락처로 고객 검색..." 
                       class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                       onkeyup="searchOutboundCustomer(this.value)">
                <div id="outCustomerResults" class="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 hidden max-h-40 overflow-y-auto"></div>
              </div>
              <div id="outSelectedCustomer" class="hidden p-2 bg-white border border-teal-500 rounded-lg flex justify-between items-center">
                 <div class="flex items-center gap-2">
                   <div class="w-8 h-8 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center text-xs"><i class="fas fa-user"></i></div>
                   <span id="outSelectedCustomerLabel" class="text-sm font-bold text-slate-700"></span>
                 </div>
                 <button onclick="clearOutboundCustomer()" class="text-slate-400 hover:text-rose-500 p-1"><i class="fas fa-sync-alt text-xs"></i></button>
              </div>
              <input type="hidden" id="outCustomerId">
            </div>

            <div id="outNewBuyerFields" class="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">구매자명</label>
                <input type="text" id="outBuyerName" oninput="syncToRecipient()" placeholder="신규 고객일 경우 입력" class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">구매자 연락처</label>
                <input type="text" id="outBuyerPhone" oninput="syncToRecipient()" placeholder="예) 01012345678" class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500">
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div class="flex justify-between items-center mb-4">
             <h3 class="font-bold text-slate-800">4. 수령인 및 배송지 정보</h3>
             <label class="flex items-center cursor-pointer group">
               <input type="checkbox" id="outSameAsBuyer" checked onchange="toggleSameAsBuyer()" class="form-checkbox text-teal-600 focus:ring-teal-500 w-4 h-4 rounded">
               <span class="ml-2 text-xs text-slate-500 group-hover:text-teal-600 font-medium">구매자와 동일</span>
             </label>
          </div>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">수령인 성함</label>
                <input type="text" id="outDestName" class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">수령인 연락처</label>
                <input type="text" id="outDestPhone" class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500">
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1">배송 주소</label>
              <div class="flex gap-2">
                 <input type="text" id="outDestAddress" class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 mb-1" placeholder="수령지 주소 입력">
                 <button type="button" onclick="openAddressSearch('outDestAddress')" class="bg-slate-100 text-slate-600 px-3 py-2 rounded text-sm hover:bg-slate-200 font-medium whitespace-nowrap border border-slate-200">
                   <i class="fas fa-search"></i> 검색
                 </button>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 class="font-bold text-slate-800 mb-4">5. 운송장 정보</h3>

        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 class="font-bold text-slate-800 mb-4">4. 운송장 정보</h3>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">택배사</label>
                <select id="outCourier" class="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white" onchange="onOutCourierChange()">
                  <option value="CJ대한통운">CJ대한통운</option>
                  <option value="우체국택배">우체국택배</option>
                  <option value="한진택배">한진택배</option>
                  <option value="롯데택배">롯데택배</option>
                  <option value="로젠택배">로젠택배</option>
                  <option value="직접수령">직접수령</option>
                </select>
              </div>
              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="block text-xs font-bold text-slate-500">운송장 번호</label>
                  <label class="flex items-center cursor-pointer hover:text-teal-600 transition-colors">
                    <input type="checkbox" id="outDirectReceipt" onchange="toggleDirectReceipt()" class="form-checkbox text-teal-600 focus:ring-teal-500 w-3 h-3 rounded mr-1">
                    <span class="text-xs text-slate-500 font-medium">직접수령</span>
                  </label>
                </div>
                <input type="text" id="outTracking" class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 transition-colors">
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1">비고</label>
              <input type="text" id="outNotes" class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500">
            </div>
          </div>
        </div>

        <button onclick="submitDirectOutbound()" class="w-full bg-teal-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-teal-700 shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.99] mb-6">
          출고 등록 완료
        </button>
      </div>
    </div>
  `;

  renderOutboundProducts();
  renderOutboundCart();
}

function renderOutboundProducts(filterText = '') {
  const container = document.getElementById('outboundProductList');
  const pagContainer = document.getElementById('outboundProductPagination');

  if (!container || !window.products) return;

  // 1. 필터링
  const filtered = window.products.filter(p =>
    p.name.toLowerCase().includes(filterText.toLowerCase()) ||
    p.sku.toLowerCase().includes(filterText.toLowerCase())
  );

  // 2. 페이지네이션 계산
  const total = filtered.length;
  const totalPages = Math.ceil(total / outboundProdLimit);

  // 현재 페이지 보정
  if (outboundProdPage > totalPages && totalPages > 0) outboundProdPage = 1;
  if (outboundProdPage < 1) outboundProdPage = 1;

  const start = (outboundProdPage - 1) * outboundProdLimit;
  const end = start + outboundProdLimit;
  const pageItems = filtered.slice(start, end);

  // 3. 상품 목록 렌더링
  if (total === 0) {
    container.innerHTML = '<div class="text-center text-slate-400 py-10">검색 결과가 없습니다.</div>';
  } else {
    container.innerHTML = pageItems.map(p => {
      // 마스터 상품 판단: product_type이 master이거나, 하위 변체가 존재하는 경우(레거시 데이터 대응)
      const isMaster = p.product_type === 'master' || (p.variant_count && p.variant_count > 0);
      const isBundle = p.product_type === 'bundle';

      return `
        <div class="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-colors cursor-pointer" 
             onclick="handleProductSelection(${p.id}, '${isMaster ? 'master' : (p.product_type || 'simple')}')">
          <div>
            <div class="flex items-center gap-2">
              <div class="font-medium text-slate-800">${p.name}</div>
              ${isMaster ? '<span class="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-bold rounded">옵션</span>' : ''}
              ${isBundle ? '<span class="px-1.5 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded">세트</span>' : ''}
            </div>
            <div class="text-xs text-slate-500 flex items-center gap-2">
              <span class="font-mono bg-slate-100 px-1.5 py-0.5 rounded">${p.sku}</span>
              ${!isMaster ? `<span>재고: <span class="${p.current_stock <= 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}">${p.current_stock}</span></span>` : '<span class="text-indigo-500 font-medium">옵션 선택 필요</span>'}
            </div>
          </div>
          <button class="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center hover:bg-teal-100">
            <i class="fas ${isMaster ? 'fa-list-ul' : 'fa-plus'}"></i>
          </button>
        </div>
      `;
    }).join('');
  }

  // 4. 페이지네이션 컨트롤 렌더링
  if (pagContainer) {
    if (totalPages > 1) {
      let buttons = '';

      // 이전 버튼
      if (outboundProdPage > 1) {
        buttons += `<button onclick="changeOutboundProdPage(${outboundProdPage - 1})" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"><i class="fas fa-chevron-left"></i></button>`;
      }

      // 페이지 번호 (최대 5개 표시)
      let startPage = Math.max(1, outboundProdPage - 2);
      let endPage = Math.min(totalPages, startPage + 4);
      if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

      for (let i = startPage; i <= endPage; i++) {
        buttons += `<button onclick="changeOutboundProdPage(${i})" class="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${i === outboundProdPage ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}">${i}</button>`;
      }

      // 다음 버튼
      if (outboundProdPage < totalPages) {
        buttons += `<button onclick="changeOutboundProdPage(${outboundProdPage + 1})" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"><i class="fas fa-chevron-right"></i></button>`;
      }

      pagContainer.innerHTML = `<div class="flex justify-center items-center gap-1">${buttons}</div>`;
      pagContainer.classList.remove('hidden');
    } else {
      pagContainer.innerHTML = '';
      pagContainer.classList.add('hidden');
    }
  }
}

function changeOutboundProdPage(page) {
  outboundProdPage = page;
  renderOutboundProducts(document.getElementById('outboundSearch').value);
}

function filterOutboundProducts() {
  const text = document.getElementById('outboundSearch').value;
  outboundProdPage = 1; // 검색 시 페이지 초기화
  renderOutboundProducts(text);
}

function handleProductSelection(productId, type) {
  if (type === 'master') {
    showVariantSelector(productId);
  } else {
    addToOutboundCart(productId);
  }
}

async function showVariantSelector(productId) {
  try {
    const res = await axios.get(`${API_BASE}/products/${productId}`);
    const product = res.data.data;
    const variants = product.variants || [];

    if (variants.length === 0) {
      showToast('등록된 세부옵션이 없습니다.', 'warning');
      return;
    }

    // 변체 목록 저장 (전역 변수 활용하여 ID로 조회 가능하게 함)
    window.currentSelectorVariants = variants;

    const modalHtml = `
      <div id="variantSelectorModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100]">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
          <div class="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 class="font-bold text-slate-800">옵션 선택: ${product.name}</h3>
            <button onclick="closeVariantSelector()" class="text-slate-400 hover:text-slate-600"><i class="fas fa-times"></i></button>
          </div>
          <div class="max-h-[60vh] overflow-y-auto">
            <div class="divide-y divide-slate-50">
              ${variants.map(v => `
                <div class="p-4 hover:bg-slate-50 cursor-pointer flex justify-between items-center group transition-colors" 
                     onclick="selectVariantById(${v.id})">
                  <div class="flex-1">
                    <div class="font-medium text-slate-700">${v.options.map(o => o.value_name).join(' / ')}</div>
                    <div class="text-xs text-slate-400 font-mono mt-0.5">${v.sku}</div>
                  </div>
                  <div class="flex items-center gap-4">
                    <div class="text-right">
                      <div class="text-xs text-slate-400">재고</div>
                      <div class="text-sm font-bold ${v.current_stock <= 0 ? 'text-rose-500' : 'text-teal-600'}">${v.current_stock}</div>
                    </div>
                    <div class="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                      <i class="fas fa-plus"></i>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  } catch (e) {
    console.error(e);
    showToast('옵션 정보를 불러오는데 실패했습니다.', 'error');
  }
}

function closeVariantSelector() {
  const modal = document.getElementById('variantSelectorModal');
  if (modal) modal.remove();
  window.currentSelectorVariants = null;
}

function selectVariantById(variantId) {
  const variant = window.currentSelectorVariants?.find(v => v.id === variantId);
  if (variant) {
    addVariantToCart(variant);
  } else {
    showToast('선택한 옵션 정보를 찾을 수 없습니다.', 'error');
  }
}

function addVariantToCart(variant) {
  const productIdx = window.products.findIndex(p => p.id === variant.id);
  if (productIdx === -1) {
    // If variant not in current page list, add it to window.products so addToOutboundCart can find it
    window.products.push(variant);
  }
  addToOutboundCart(variant.id);
  closeVariantSelector();
}

function addToOutboundCart(productId) {
  const product = window.products.find(p => p.id === productId);
  if (!product) return;

  if (product.current_stock <= 0) {
    showToast('재고가 없는 상품입니다.', 'error');
    return;
  }

  const existing = window.outboundCart.find(item => item.product.id === productId);

  if (outboundInputMode === 'manual') {
    // 수동 모드: 없으면 추가하고 포커스, 있으면 포커스만
    if (!existing) {
      window.outboundCart.push({ product, quantity: 1, qr_code: '', lot_number: '' });
      renderOutboundCart();
    }
    // 포커스 이동 (렌더링 후 실행)
    setTimeout(() => {
      const input = document.querySelector(`input[data-qty-id="${productId}"]`);
      if (input) {
        input.focus();
        input.select();
      }
    }, 50);
  } else {
    // 자동 모드: 기존 로직 (+1)
    if (existing) {
      if (existing.quantity >= product.current_stock) {
        showToast('재고 수량을 초과할 수 없습니다.', 'error');
        return;
      }
      existing.quantity++;
    } else {
      window.outboundCart.push({ product, quantity: 1, qr_code: '', lot_number: '' });
    }
    renderOutboundCart();
  }
}

function renderOutboundCart() {
  const container = document.getElementById('outboundCartItems');
  const totalEl = document.getElementById('outboundTotalQty');

  if (window.outboundCart.length === 0) {
    container.innerHTML = '<p class="text-center text-slate-400 py-8">상품을 선택해주세요.</p>';
    totalEl.textContent = '0개';
    return;
  }

  let totalQty = 0;
  container.innerHTML = window.outboundCart.map(item => {
    totalQty += item.quantity;
    if (item.qr_code == null) item.qr_code = '';
    if (item.lot_number == null) item.lot_number = '';
    return `
      <div class="bg-slate-50 p-3 rounded-lg border border-slate-100 hover:border-teal-200 transition-colors space-y-2">
        <div class="flex justify-between items-center gap-2">
          <div class="flex-1 min-w-0">
            <div class="font-medium text-slate-800 text-sm truncate">${item.product.name}</div>
            <div class="text-xs text-slate-500 font-mono">${item.product.sku}</div>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex items-center bg-white rounded border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500">
              <button onclick="updateOutboundQty(${item.product.id}, -1)" tabindex="-1" class="w-8 h-8 flex items-center justify-center hover:bg-slate-100 text-slate-500 border-r border-slate-100 active:bg-slate-200 transition-colors">
                <i class="fas fa-minus text-xs"></i>
              </button>
              <input type="number" 
                     value="${item.quantity}" 
                     min="1" 
                     max="${item.product.current_stock}"
                     data-qty-id="${item.product.id}"
                     onchange="updateOutboundQtyFromInput(${item.product.id}, this.value)"
                     class="w-16 h-8 text-center text-sm font-bold border-none focus:ring-0 p-0 appearance-none mx-0"
                     onclick="this.select()"
              >
              <button onclick="updateOutboundQty(${item.product.id}, 1)" tabindex="-1" class="w-8 h-8 flex items-center justify-center hover:bg-slate-100 text-slate-500 border-l border-slate-100 active:bg-slate-200 transition-colors">
                <i class="fas fa-plus text-xs"></i>
              </button>
            </div>
            <button onclick="removeOutboundItem(${item.product.id})" tabindex="-1" class="text-slate-400 hover:text-red-500 w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input type="text" value="${item.qr_code || ''}" placeholder="제조 QR (선택)"
            onchange="setOutboundTrace(${item.product.id}, 'qr_code', this.value)"
            class="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono bg-white">
          <input type="text" value="${item.lot_number || ''}" placeholder="Lot 번호 (선택)"
            onchange="setOutboundTrace(${item.product.id}, 'lot_number', this.value)"
            class="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono bg-white">
        </div>
      </div>
    `;
  }).join('');

  totalEl.textContent = totalQty + '개';
}

window.setOutboundTrace = function (productId, field, value) {
  const item = window.outboundCart.find(i => i.product.id === productId);
  if (!item) return;
  item[field] = (value || '').trim();
};

function updateOutboundQty(productId, delta) {
  const item = window.outboundCart.find(i => i.product.id === productId);
  if (!item) return;
  const newQty = item.quantity + delta;
  if (newQty <= 0) {
    removeOutboundItem(productId);
    return;
  }
  if (newQty > item.product.current_stock) {
    showToast('재고 부족', 'error');
    return;
  }
  item.quantity = newQty;
  renderOutboundCart();
}

function removeOutboundItem(productId) {
  window.outboundCart = window.outboundCart.filter(i => i.product.id !== productId);
  renderOutboundCart();
}

async function submitDirectOutbound() {
  if (window.outboundCart.length === 0) {
    showToast('출고할 상품을 선택해주세요.', 'error');
    return;
  }
  const destName = document.getElementById('outDestName').value;
  const destAddress = document.getElementById('outDestAddress').value;

  if (!destName || !destAddress) {
    showToast('수령인과 주소를 입력해주세요.', 'error');
    return;
  }

  const warehouseId = document.getElementById('outWarehouse')?.value;
  if (!warehouseId) {
    showToast('출고할 창고를 선택해주세요.', 'error');
    document.getElementById('outWarehouse')?.focus();
    return;
  }

  const payload = {
    items: window.outboundCart.map(i => ({
      productId: i.product.id,
      quantity: i.quantity,
      qr_code: i.qr_code || undefined,
      lot_number: i.lot_number || undefined
    })),
    recipient: document.getElementById('outDestName').value,
    phone: document.getElementById('outDestPhone').value,
    address: document.getElementById('outDestAddress').value,
    buyerName: document.getElementById('outBuyerName').value,
    buyerPhone: document.getElementById('outBuyerPhone').value,
    courier: document.getElementById('outCourier').value,
    trackingNumber: document.getElementById('outTracking').value,
    memo: document.getElementById('outNotes').value,
    purchasePath: '',
    warehouseId: warehouseId,
    customerId: document.getElementById('outCustomerId').value || null
  };

  try {
    await axios.post(`${API_BASE}/outbound/direct`, payload);
    showToast('출고가 완료되었습니다.');
    window.outboundCart = [];
    renderOutboundRegistrationTab(document.getElementById('outboundTabContent'));
  } catch (e) {
    console.error(e);
    showToast('출고 등록 실패: ' + (e.response?.data?.error || e.message), 'error');
  }
}

// History Tab
async function renderOutboundHistoryTab(container) {
  container.innerHTML = `
    <div class="flex flex-col h-full">
      <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6">
        <div class="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div class="flex flex-1 gap-4 w-full md:w-auto">
            <div class="relative flex-1 md:max-w-xs">
              <i class="fas fa-search absolute left-3 top-3 text-slate-400"></i>
              <input type="text" id="outHistorySearch" placeholder="주문번호 또는 받는분 검색" class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" onkeyup="if(event.key === 'Enter') filterOutboundHistory()">
            </div>
            <select id="outHistoryStatus" class="border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500" onchange="filterOutboundHistory()">
              <option value="">전체 상태</option>
              <option value="PENDING">출고 대기</option>
              <option value="SHIPPED">출고 완료</option>
              <option value="CANCELLED">취소됨</option>
            </select>
            <div class="flex items-center gap-2">
              <input type="date" id="outHistoryStartDate" class="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm">
              <span class="text-slate-400">~</span>
              <input type="date" id="outHistoryEndDate" class="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm">
            </div>
            <button onclick="filterOutboundHistory()" class="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 font-medium transition-colors">
              <i class="fas fa-search mr-2"></i>조회
            </button>
            <button onclick="downloadOutboundExcel()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-medium transition-colors">
              <i class="fas fa-file-excel mr-2"></i>엑셀 다운로드
            </button>
          </div>
        </div>
      </div>
      <div id="outboundHistoryList" class="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-slate-100 p-0"></div>
      <div id="outboundPaginationContainer" class="shrink-0 pb-6 mt-4"></div>
    </div>
  `;
  await filterOutboundHistory();
}

async function filterOutboundHistory() {
  const container = document.getElementById('outboundHistoryList');
  container.innerHTML = `<div class="flex items-center justify-center p-10"><i class="fas fa-spinner fa-spin mr-2"></i>로딩 중...</div>`;

  const search = document.getElementById('outHistorySearch')?.value || '';
  const status = document.getElementById('outHistoryStatus')?.value || '';
  const startDate = document.getElementById('outHistoryStartDate')?.value || '';
  const endDate = document.getElementById('outHistoryEndDate')?.value || '';

  try {
    const params = {
      limit: outboundPerPage,
      offset: (outboundCurrentPage - 1) * outboundPerPage,
      search,
      status,
      start_date: startDate,
      end_date: endDate
    };

    const res = await axios.get(`${API_BASE}/outbound`, { params });
    const list = res.data.data;
    const pagination = res.data.pagination || { total: list.length };

    container.innerHTML = `
      <table class="min-w-full text-sm text-left">
        <thead class="bg-slate-50 font-bold text-slate-500 sticky top-0 z-10">
          <tr>
            <th class="px-6 py-3 border-b">출고번호</th>
            <th class="px-6 py-3 border-b">일시</th>
            <th class="px-6 py-3 border-b">상품명</th>
            <th class="px-6 py-3 border-b">수령인</th>
            <th class="px-6 py-3 border-b">수량</th>
            <th class="px-6 py-3 border-b">운송장</th>
            <th class="px-6 py-3 border-b">상태</th>
            <th class="px-6 py-3 border-b text-center">관리</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${list.map(o => `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4 font-mono">${o.order_number}</td>
              <td class="px-6 py-4 text-slate-500">${formatDateTimeKST(o.created_at)}</td>
              <td class="px-6 py-4 font-medium text-slate-800">
                ${o.first_product_name || '-'} ${o.item_count > 1 ? `외 ${o.item_count - 1}건` : ''}
              </td>
              <td class="px-6 py-4">${o.destination_name}</td>
              <td class="px-6 py-4">${o.total_quantity || 0}</td>
              <td class="px-6 py-4">
                 ${(() => {
        const tNum = o.tracking_number;
        const courier = o.courier || o.courier_name || '';
        if (!tNum) return '-';
        if (tNum === '직접수령') return '<span class="text-slate-500">직접수령</span>';

        const url = getTrackingUrl(courier, tNum);
        if (url) return `<a href="${url}" target="_blank" class="text-blue-600 hover:underline flex items-center gap-1 group"><i class="fas fa-external-link-alt text-xs text-blue-400 group-hover:text-blue-600"></i> ${tNum}</a><div class="text-xs text-slate-400 mt-0.5">${courier}</div>`;
        return `${tNum} <div class="text-xs text-slate-400 mt-0.5">${courier}</div>`;
      })()}
              </td>
              <td class="px-6 py-4"><span class="px-2 py-1 rounded bg-slate-100 text-xs font-bold">${o.status}</span></td>
              <td class="px-6 py-4 text-center">
                <button onclick="showOutboundDetail(${o.id})" class="text-teal-600 hover:bg-teal-50 px-3 py-1 rounded text-xs font-bold">상세보기</button>
              </td>
            </tr>
          `).join('')}
          ${list.length === 0 ? '<tr><td colspan="7" class="p-8 text-center text-slate-500">데이터가 없습니다.</td></tr>' : ''}
        </tbody>
      </table>
    `;
    renderOutboundPagination(pagination);
  } catch (e) {
    console.error(e);
    container.innerHTML = `<div class="p-8 text-center text-red-500">조회 실패</div>`;
  }
}

function renderOutboundPagination(pagination) {
  const container = document.getElementById('outboundPaginationContainer');
  if (!container) return;
  const totalPages = Math.ceil((pagination.total || 0) / outboundPerPage);
  if (totalPages <= 0) { container.innerHTML = ''; return; }

  let buttons = '';
  // Simple pagination logic
  for (let i = 1; i <= totalPages; i++) {
    buttons += `<button onclick="changeOutboundPage(${i})" class="px-3 py-1 border rounded ${i === outboundCurrentPage ? 'bg-teal-600 text-white' : 'bg-white'}">${i}</button>`;
  }
  container.innerHTML = `<div class="flex justify-center gap-2">${buttons}</div>`;
}

function changeOutboundPage(page) {
  outboundCurrentPage = page;
  filterOutboundHistory();
}

async function showOutboundDetail(id) {
  try {
    const res = await axios.get(`${API_BASE}/outbound/${id}`);
    const data = res.data.data;
    const items = data.items || [];
    const packages = data.packages || [];

    const modalHtml = `
      <div id="outDetailModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] transition-opacity duration-300 opacity-0">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col transform scale-95 transition-transform duration-300">
          <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
            <div>
              <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                <i class="fas fa-file-invoice-dollar text-teal-600"></i> 출고 상세 정보
              </h3>
              <p class="text-sm text-slate-500 mt-1 font-mono">${data.order_number}</p>
            </div>
            <div class="flex items-center gap-1">
                ${data.status === 'PENDING' ? `
                <button onclick="openShipOutboundModal(${data.id})" class="text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-lg mr-2 text-sm font-bold shadow-sm transition-colors flex items-center gap-1">
                  <i class="fas fa-shipping-fast"></i> 출고 확정
                </button>
                ` : ''}
                <button onclick="openEditOutboundModal(${data.id})" class="text-slate-400 hover:text-teal-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors" title="수정">
                  <i class="fas fa-pen text-sm"></i>
                </button>
                <button onclick="deleteOutbound(${data.id})" class="text-slate-400 hover:text-red-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors" title="삭제">
                  <i class="fas fa-trash text-sm"></i>
                </button>
                <div class="w-px h-4 bg-slate-200 mx-2"></div>
                <button onclick="closeOutboundDetail()" class="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors">
                  <i class="fas fa-times text-lg"></i>
                </button>
            </div>
          </div>
          
          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            <!-- 상태 및 기본 정보 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 class="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">받는 분 정보</h4>
                <div class="space-y-2 text-sm">
                  <div class="flex"><span class="w-20 text-slate-500">이름</span> <span class="font-medium text-slate-900">${data.destination_name}</span></div>
                  <div class="flex"><span class="w-20 text-slate-500">연락처</span> <span class="font-medium text-slate-900">${data.destination_phone ? formatPhoneNumber(data.destination_phone) : '-'}</span></div>
                  <div class="flex"><span class="w-20 text-slate-500">주소</span> <span class="font-medium text-slate-900 break-all">${data.destination_address}</span></div>
                </div>
              </div>
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 class="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">출고 상태</h4>
                <div class="space-y-2 text-sm">
                  <div class="flex"><span class="w-20 text-slate-500">출고 창고</span> <span class="font-medium text-slate-900">${data.warehouse_name || '-'} <span class="text-xs text-slate-400 font-normal">(${data.warehouse_location || '위치 미지정'})</span></span></div>
                  <div class="flex"><span class="w-20 text-slate-500">구매 경로</span> <span class="font-medium text-slate-900">${data.purchase_path || '-'}</span></div>
                  <div class="flex items-center"><span class="w-20 text-slate-500">상태</span> 
                    <span class="px-2 py-0.5 rounded bg-white border border-slate-200 text-xs font-bold text-teal-600 shadow-sm">${data.status}</span>
                  </div>
                  <div class="flex"><span class="w-20 text-slate-500">담당자</span> <span class="text-slate-700">${data.created_by_name || '-'}</span></div>
                  <div class="flex"><span class="w-20 text-slate-500">등록일</span> <span class="text-slate-700">${formatDateTimeKST(data.created_at)}</span></div>
                  <div class="flex"><span class="w-20 text-slate-500">비고</span> <span class="text-slate-700">${data.notes || '-'}</span></div>
                </div>
              </div>
            </div>

            <!-- 상품 목록 -->
            <div>
              <h4 class="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <i class="fas fa-box-open text-slate-400"></i> 출고 상품 목록
              </h4>
              <div class="border border-slate-200 rounded-lg overflow-hidden">
                <table class="min-w-full text-sm text-left divide-y divide-slate-200">
                  <thead class="bg-slate-50 font-semibold text-slate-500">
                    <tr>
                      <th class="px-4 py-3">상품명 / SKU</th>
                      <th class="px-4 py-3 text-center">수량</th>
                      <th class="px-4 py-3 text-center">상태</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 bg-white">
                    ${items.map(i => `
                      <tr>
                        <td class="px-4 py-3">
                          <div class="font-medium text-slate-900">${i.product_name}</div>
                          <div class="text-xs text-slate-500 font-mono">${i.sku}</div>
                        </td>
                        <td class="px-4 py-3 text-center font-bold text-slate-700">${i.quantity_ordered}</td>
                        <td class="px-4 py-3 text-center">
                          <span class="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">${i.status}</span>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 배송 정보 (패키지) -->
            <div>
              <h4 class="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <i class="fas fa-truck text-slate-400"></i> 배송 및 운송장 정보
              </h4>
              <div class="grid grid-cols-1 gap-3">
                ${packages.length > 0 ? packages.map(p => `
                  <div class="flex items-center justify-between p-4 bg-teal-50 border border-indigo-100 rounded-lg">
                    <div class="flex items-center gap-4">
                      <div class="bg-white p-2 rounded-full shadow-sm text-teal-600">
                        <i class="fas fa-shipping-fast"></i>
                      </div>
                      <div>
                        <div class="font-bold text-teal-900">${p.courier || '-'}</div>
                        <div class="text-sm text-teal-700 font-mono tracking-wide">${p.tracking_number || '-'}</div>
                      </div>
                    </div>
                    <div class="text-right text-sm">
                      <div class="font-medium text-slate-600">${p.box_type || '박스정보 없음'}</div>
                      <div class="text-slate-500">수량: ${p.box_count || 1}</div>
                    </div>
                  </div>
                `).join('') : '<div class="text-slate-500 text-sm p-4 bg-slate-50 rounded-lg text-center">등록된 운송장 정보가 없습니다.</div>'}
              </div>
            </div>
          </div>
          
          <div class="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center">
            <button onclick="deleteOutbound(${data.id})" class="px-6 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors border border-red-200">
              <i class="fas fa-trash-alt mr-2"></i>주문 취소
            </button>
            <button onclick="closeOutboundDetail()" class="px-6 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium transition-colors shadow-lg shadow-slate-200">
              닫기
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // 애니메이션
    requestAnimationFrame(() => {
      const modal = document.getElementById('outDetailModal');
      const content = modal.querySelector('div');
      if (modal && content) {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
      }
    });

  } catch (e) {
    console.error(e);
    alert('상세 정보를 불러오는데 실패했습니다.');
  }
}

function closeOutboundDetail() {
  const modal = document.getElementById('outDetailModal');
  if (modal) modal.remove();
}

async function deleteOutbound(id) {
  if (!confirm('정말 삭제하시겠습니까? 재고가 복구됩니다.')) return;
  try {
    await axios.delete(`${API_BASE}/outbound/${id}`);
    showToast('삭제되었습니다.');
    closeOutboundDetail();
    filterOutboundHistory();
  } catch (e) {
    console.error(e);
    const errMsg = e.response?.data?.error || e.message;
    const details = e.response?.data?.details || '';
    const debug = e.response?.data?.debug || '';

    alert(`삭제 실패:\n${errMsg}\n\n[상세 정보]\n${details}\n${debug}`);
  }
}

async function openEditOutboundModal(id) {
  closeOutboundDetail();

  try {
    const res = await axios.get(`${API_BASE}/outbound/${id}`);
    const data = res.data.data;
    const { packages } = data;
    const pkg = packages && packages.length > 0 ? packages[0] : {};
    const items = data.items || [];
    const firstItem = items.length > 0 ? items[0] : {};

    // 날짜를 datetime-local 형식으로 변환
    let dateTimeLocal = '';
    if (data.created_at) {
      const date = new Date(data.created_at);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      dateTimeLocal = `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    const modalHtml = `
      <div id="outEditModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[70] transition-opacity duration-300 opacity-0">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col transform scale-95 transition-transform duration-300">
          <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
            <h3 class="text-lg font-bold text-slate-800">출고 정보 수정</h3>
            <button onclick="closeEditOutboundModal()" class="text-slate-400 hover:text-slate-600">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">출고일시</label>
              <input type="datetime-local" id="editCreatedAt" value="${dateTimeLocal}" class="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500">
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">상품명</label>
                <input type="text" id="editProductName" value="${firstItem.product_name || ''}" class="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">수량</label>
                <input type="number" id="editQuantity" value="${firstItem.quantity_ordered || ''}" min="1" class="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500">
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">수령인</label>
              <input type="text" id="editDestName" value="${data.destination_name || ''}" class="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">전화번호</label>
              <input type="text" id="editDestPhone" value="${formatPhoneNumber(data.destination_phone) || ''}" class="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">주소</label>
              <div class="flex gap-2">
                 <input type="text" id="editDestAddr" value="${data.destination_address || ''}" class="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50">
                 <button type="button" onclick="openAddressSearch('editDestAddr')" class="bg-teal-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-teal-700 font-medium whitespace-nowrap">
                   <i class="fas fa-search"></i> 검색
                 </button>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">택배사</label>
                  <select id="editCourier" class="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50">
                    <option value="">선택</option>
                    <option value="CJ대한통운" ${pkg.courier === 'CJ대한통운' ? 'selected' : ''}>CJ대한통운</option>
                    <option value="우체국택배" ${pkg.courier === '우체국택배' ? 'selected' : ''}>우체국택배</option>
                    <option value="한진택배" ${pkg.courier === '한진택배' ? 'selected' : ''}>한진택배</option>
                    <option value="롯데택배" ${pkg.courier === '롯데택배' ? 'selected' : ''}>롯데택배</option>
                    <option value="로젠택배" ${pkg.courier === '로젠택배' ? 'selected' : ''}>로젠택배</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">운송장번호</label>
                  <input type="text" id="editTrackingNum" value="${pkg.tracking_number || ''}" class="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50">
                </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">비고</label>
              <textarea id="editNotes" class="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50" rows="3">${data.notes || ''}</textarea>
            </div>
          </div>

          <div class="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl">
            <button onclick="closeEditOutboundModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">취소</button>
            <button onclick="updateOutbound(${id})" class="px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg transition-colors">저장</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    requestAnimationFrame(() => {
      const modal = document.getElementById('outEditModal');
      if (modal) {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
      }
    });

  } catch (e) {
    console.error(e);
    showToast('정보 로드 실패', 'error');
  }
}

function closeEditOutboundModal() {
  const modal = document.getElementById('outEditModal');
  if (modal) {
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => modal.remove(), 300);
  }
}

async function updateOutbound(id) {
  const createdAtInput = document.getElementById('editCreatedAt').value;
  let createdAt = null;
  if (createdAtInput) {
    // datetime-local 값을 ISO 형식으로 변환
    const date = new Date(createdAtInput);
    createdAt = date.toISOString();
  }

  const payload = {
    created_at: createdAt,
    product_name: document.getElementById('editProductName').value,
    quantity: parseInt(document.getElementById('editQuantity').value) || null,
    destination_name: document.getElementById('editDestName').value,
    destination_phone: document.getElementById('editDestPhone').value,
    destination_address: document.getElementById('editDestAddr').value,
    courier: document.getElementById('editCourier').value,
    tracking_number: document.getElementById('editTrackingNum').value,
    notes: document.getElementById('editNotes').value
  };

  try {
    const res = await axios.put(`${API_BASE}/outbound/${id}`, payload);
    if (res.data.success) {
      showToast('수정되었습니다.');
      closeEditOutboundModal();
      filterOutboundHistory();
    }
  } catch (e) {
    console.error(e);
    showToast('수정 실패: ' + (e.response?.data?.error || e.message), 'error');
  }
}

window.updateOutbound = updateOutbound;
window.closeEditOutboundModal = closeEditOutboundModal;

// --- Warehouse Management Tab Logic ---

async function renderOutboundWarehouseTab(container) {
  container.innerHTML = `
    <div class="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-100 p-6 overflow-hidden">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                <i class="fas fa-warehouse text-slate-400"></i> 창고 등록 및 관리
            </h2>
            <button onclick="openWarehouseModal()" class="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center">
                <i class="fas fa-plus mr-2"></i>창고 등록
            </button>
        </div>
        <div id="warehouseList" class="flex-1 overflow-auto">
            <div class="flex items-center justify-center h-full text-slate-500">
                <i class="fas fa-spinner fa-spin mr-2"></i>로딩 중...
            </div>
        </div>
    </div>
  `;
  await loadWarehouses();
}

async function loadWarehouses() {
  const container = document.getElementById('warehouseList');
  if (!container) return;

  try {
    const res = await axios.get(`${API_BASE}/warehouses`);
    const warehouses = res.data.data;

    if (!warehouses || warehouses.length === 0) {
      container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-64 text-slate-400">
                    <i class="fas fa-warehouse text-4xl mb-4 text-slate-300"></i>
                    <p>등록된 창고가 없습니다.</p>
                </div>
            `;
      return;
    }

    container.innerHTML = `
            <table class="min-w-full text-sm text-left">
                <thead class="bg-slate-50 font-bold text-slate-500 sticky top-0">
                    <tr>
                        <th class="px-6 py-3 border-b">창고명</th>
                        <th class="px-6 py-3 border-b">위치</th>
                        <th class="px-6 py-3 border-b">설명</th>
                        <th class="px-6 py-3 border-b">상태</th>
                        <th class="px-6 py-3 border-b">등록일</th>
                        <th class="px-6 py-3 border-b text-center">관리</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    ${warehouses.map(w => `
                        <tr class="hover:bg-slate-50 transition-colors">
                            <td class="px-6 py-4 font-medium text-slate-900">${w.name}</td>
                            <td class="px-6 py-4 text-slate-600">${w.location || '-'}</td>
                            <td class="px-6 py-4 text-slate-500">${w.description || '-'}</td>
                            <td class="px-6 py-4">
                                ${w.is_active ? '<span class="text-teal-600 bg-teal-50 px-2 py-0.5 rounded text-xs font-bold">사용중</span>' : '<span class="text-slate-400 bg-slate-100 px-2 py-0.5 rounded text-xs">미사용</span>'}
                            </td>
                            <td class="px-6 py-4 text-slate-400">${formatDateTimeKST(w.created_at)}</td>
                            <td class="px-6 py-4 text-center">
                                <button onclick="openWarehouseModal(${w.id}, '${w.name}', '${w.location || ''}', '${w.description || ''}')" class="text-teal-600 hover:bg-teal-50 px-2 py-1 rounded transition-colors mr-1">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteWarehouse(${w.id})" class="text-red-400 hover:bg-red-50 px-2 py-1 rounded transition-colors">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
  } catch (e) {
    console.error(e);
    container.innerHTML = '<div class="text-center text-red-500 p-4">창고 목록을 불러오지 못했습니다.</div>';
  }
}

async function deleteWarehouse(id) {
  if (!confirm('정말 이 창고를 삭제(비활성화)하시겠습니까?')) return;
  try {
    await axios.delete(`${API_BASE}/warehouses/${id}`);
    showToast('창고가 삭제되었습니다.');
    loadWarehouses();
  } catch (e) {
    console.error(e);
    showToast(e.response?.data?.error || '삭제 실패', 'error');
  }
}

function openWarehouseModal(id = null, name = '', location = '', description = '') {
  // Remove existing modal if any
  const existing = document.getElementById('warehouseModal');
  if (existing) existing.remove();

  const isEdit = !!id;
  const modalHtml = `
      <div id="warehouseModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[70] transition-opacity duration-300 opacity-0">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col transform scale-95 transition-transform duration-300">
          <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
            <h3 class="text-lg font-bold text-slate-800">${isEdit ? '창고 수정' : '새 창고 등록'}</h3>
            <button onclick="document.getElementById('warehouseModal').remove()" class="text-slate-400 hover:text-slate-600">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <form onsubmit="handleWarehouseSubmit(event, ${id})" class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">창고명 <span class="text-red-500">*</span></label>
              <input type="text" name="name" value="${name}" required class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder-slate-400" placeholder="예: 제1물류센터">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">위치</label>
              <div class="flex gap-2">
                  <input type="text" id="warehouseLocation" name="location" value="${location}" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder-slate-400" placeholder="예: 서울 구로구 ...">
                  <button type="button" onclick="openAddressSearch('warehouseLocation')" class="bg-teal-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-teal-700 font-medium whitespace-nowrap">
                   <i class="fas fa-search"></i> 검색
                  </button>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">설명</label>
              <textarea name="description" rows="3" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none placeholder-slate-400">${description}</textarea>
            </div>

            <div class="pt-4 flex justify-end gap-2">
                <button type="button" onclick="document.getElementById('warehouseModal').remove()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">취소</button>
                <button type="submit" class="px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg transition-colors font-bold shadow-lg shadow-teal-200">${isEdit ? '수정 저장' : '등록 완료'}</button>
            </div>
          </form>
        </div>
      </div>
    `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  requestAnimationFrame(() => {
    const modal = document.getElementById('warehouseModal');
    if (modal) {
      modal.classList.remove('opacity-0');
      modal.querySelector('div').classList.remove('scale-95');
    }
  });
}

window.handleWarehouseSubmit = async (e, id) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const payload = {
    name: formData.get('name'),
    location: formData.get('location'),
    description: formData.get('description')
  };

  try {
    if (id) {
      await axios.put(`${API_BASE}/warehouses/${id}`, payload);
      showToast('창고 정보가 수정되었습니다.');
    } else {
      await axios.post(`${API_BASE}/warehouses`, payload);
      showToast('새 창고가 등록되었습니다.');
    }
    document.getElementById('warehouseModal').remove();
    loadWarehouses();
  } catch (err) {
    console.error(err);
    showToast(err.response?.data?.error || '저장 실패', 'error');
  }
};

window.openWarehouseModal = openWarehouseModal;
window.deleteWarehouse = deleteWarehouse;
window.handleWarehouseSubmit = window.handleWarehouseSubmit;

// Global Assignments
window.renderOutboundPage = renderOutboundPage;
window.switchOutboundTab = switchOutboundTab;
window.renderOutboundRegistrationTab = renderOutboundRegistrationTab;
window.renderOutboundHistoryTab = renderOutboundHistoryTab;
window.filterOutboundHistory = filterOutboundHistory;
window.renderOutboundPagination = renderOutboundPagination;
window.changeOutboundPage = changeOutboundPage;
window.changeOutboundProdPage = changeOutboundProdPage;
window.renderOutboundProducts = renderOutboundProducts;
window.filterOutboundProducts = filterOutboundProducts;
window.addToOutboundCart = addToOutboundCart;
window.renderOutboundCart = renderOutboundCart;
window.updateOutboundQty = updateOutboundQty;
window.removeOutboundItem = removeOutboundItem;

// New Helper Functions
function setOutboundMode(mode) {
  outboundInputMode = mode;
  // UI 상태 업데이트는 필요시 여기서 수행 (현재는 renderCart에서 처리하거나, 검색창 포커스 등)
  const searchInput = document.getElementById('outboundSearch');
  if (searchInput && mode === 'auto') {
    searchInput.focus();
  }
}
window.setOutboundMode = setOutboundMode;

function updateOutboundQtyFromInput(productId, value) {
  const qty = parseInt(value);
  if (isNaN(qty) || qty <= 0) {
    // 1 미만 입력 시 삭제 또는 1로 복귀? 여기서는 1로 복귀하고 토스트 경고
    // 사용자 경험상 삭제보다 1이 나음
    showToast('수량은 1 이상이어야 합니다.', 'error');
    renderOutboundCart(); // 값 리셋
    return;
  }

  const item = window.outboundCart.find(i => i.product.id === productId);
  if (!item) return;

  if (qty > item.product.current_stock) {
    showToast(`재고 부족 (최대 ${item.product.current_stock}개)`, 'error');
    item.quantity = item.product.current_stock; // 최대치로 보정
  } else {
    item.quantity = qty;
  }
  renderOutboundCart();

  // 입력 후 포커스 유지 (renderCart 호출로 DOM이 재생성되면 포커스 잃음. 재설정 필요)
  setTimeout(() => {
    const input = document.querySelector(`input[data-qty-id="${productId}"]`);
    if (input) {
      input.focus();
      // 커서를 끝으로? or Select all? 여기서 선택할 필요는 없을듯.
    }
  }, 0);
}
window.updateOutboundQtyFromInput = updateOutboundQtyFromInput;
window.submitDirectOutbound = submitDirectOutbound;
window.showOutboundDetail = showOutboundDetail;
window.closeOutboundDetail = closeOutboundDetail;
window.deleteOutbound = deleteOutbound;
window.openEditOutboundModal = openEditOutboundModal;
window.downloadOutboundExcel = downloadOutboundExcel;

// New helper to sync Select -> Checkbox
function onOutCourierChange() {
  const courier = document.getElementById('outCourier').value;
  const checkbox = document.getElementById('outDirectReceipt');
  if (!checkbox) return;

  if (courier === '직접수령') {
    if (!checkbox.checked) {
      checkbox.checked = true;
      toggleDirectReceipt();
    }
  } else {
    // If user changes to a real courier, uncheck direct receipt
    if (checkbox.checked) {
      checkbox.checked = false;
      toggleDirectReceipt();
    }
  }
}
window.onOutCourierChange = onOutCourierChange;

function toggleDirectReceipt() {
  const isDirect = document.getElementById('outDirectReceipt').checked;
  const trackingInput = document.getElementById('outTracking');
  const courierSelect = document.getElementById('outCourier');

  if (!trackingInput) return;

  if (isDirect) {
    trackingInput.value = '직접수령';
    trackingInput.readOnly = true;
    trackingInput.classList.add('bg-slate-100', 'text-slate-500');
    trackingInput.classList.remove('bg-white');

    // Sync Select
    if (courierSelect && courierSelect.value !== '직접수령') {
      courierSelect.value = '직접수령';
    }
  } else {
    if (trackingInput.value === '직접수령') {
      trackingInput.value = '';
    }
    trackingInput.readOnly = false;
    trackingInput.classList.remove('bg-slate-100', 'text-slate-500');
    trackingInput.classList.add('bg-white');
    trackingInput.focus();

    // Sync Select (Revert to default if it was Direct Receipt)
    if (courierSelect && courierSelect.value === '직접수령') {
      courierSelect.value = 'CJ대한통운'; // Default fallback
    }
  }
}
window.toggleDirectReceipt = toggleDirectReceipt;

async function downloadOutboundExcel() {
  const search = document.getElementById('outHistorySearch')?.value || '';
  const status = document.getElementById('outHistoryStatus')?.value || '';
  const startDate = document.getElementById('outHistoryStartDate')?.value || '';
  const endDate = document.getElementById('outHistoryEndDate')?.value || '';

  try {
    const params = { search, status, start_date: startDate, end_date: endDate, limit: 1000 }; // Fetch up to 1000 for export
    const res = await axios.get(`${API_BASE}/outbound`, { params });
    const list = res.data.data;

    if (!list || list.length === 0) {
      showToast('다운로드할 데이터가 없습니다.', 'info');
      return;
    }

    // CSV Data Generation
    const headers = ['출고번호', '일시', '상태', '상품명', '수량', '수령인', '연락처', '주소', '구매경로', '택배사', '운송장번호', '담당자', '비고'];
    const rows = list.map(o => {
      const productName = o.first_product_name ? (o.first_product_name + (o.item_count > 1 ? ` 외 ${o.item_count - 1}건` : '')) : '-';
      return [
        o.order_number,
        formatDateTimeKST(o.created_at),
        o.status,
        productName,
        o.total_quantity || 0,
        o.destination_name,
        o.destination_phone,
        o.destination_address,
        o.purchase_path || '',
        o.courier_name || '',
        o.tracking_number ? `'${o.tracking_number}` : '',
        o.created_by_name || '',
        o.notes || ''
      ].map(field => {
        const str = String(field || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `출고내역_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (e) {
    console.error(e);
    showToast('엑셀 다운로드 실패', 'error');
  }
}

// --- Excel Bulk Upload Logic ---

function openOutboundExcelUploadModal() {
  const modalHtml = `
    <div id="outExcelModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[80] transition-opacity duration-300 opacity-0">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col transform scale-95 transition-transform duration-300">
        <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <h3 class="text-lg font-bold text-slate-800">엑셀 일괄 등록</h3>
          <button onclick="closeOutboundExcelUploadModal()" class="text-slate-400 hover:text-slate-600">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="p-6 space-y-6">
          <div class="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
             <i class="fas fa-info-circle text-blue-500 mt-1"></i>
             <div class="text-sm text-blue-700">
                <p class="font-bold mb-1">사용 방법</p>
                <ol class="list-decimal pl-4 space-y-1">
                   <li>템플릿 파일을 다운로드합니다.</li>
                   <li>엑셀 파일에 주문 정보를 입력합니다. (상품명 필수 항목)</li>
                   <li>작성한 파일을 업로드하면 <strong>출고 대기</strong> 상태로 등록됩니다.</li>
                </ol>
             </div>
          </div>

          <div class="flex justify-center">
             <button onclick="downloadOutboundTemplate()" class="text-teal-600 border border-teal-200 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                <i class="fas fa-download"></i> 템플릿 다운로드
             </button>
          </div>

          <div class="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-teal-500 hover:bg-teal-50 transition-all cursor-pointer" onclick="document.getElementById('excelFileInput').click()">
             <input type="file" id="excelFileInput" accept=".xlsx, .xls" class="hidden" onchange="handleExcelFileSelect(this)">
             <i class="fas fa-file-excel text-4xl text-slate-300 mb-3"></i>
             <p class="text-slate-600 font-medium">클릭하여 엑셀 파일 업로드</p>
             <p class="text-xs text-slate-400 mt-1">.xlsx, .xls 형식 지원</p>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  requestAnimationFrame(() => {
    const modal = document.getElementById('outExcelModal');
    if (modal) {
      modal.classList.remove('opacity-0');
      modal.querySelector('div').classList.remove('scale-95');
    }
  });
}

function closeOutboundExcelUploadModal() {
  const modal = document.getElementById('outExcelModal');
  if (modal) {
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => modal.remove(), 300);
  }
}

function downloadOutboundTemplate() {
  const headers = ['상품명', '수량', '수령인', '연락처', '주소', '배송메모', '택배사', '운송장번호'];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, "출고등록_양식.xlsx");
}

async function handleExcelFileSelect(input) {
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet);

      if (json.length === 0) {
        showToast('데이터가 없습니다.', 'error');
        return;
      }

      // Map keys
      const items = json.map(row => ({
        productName: row['상품명'],
        quantity: row['수량'],
        recipient: row['수령인'],
        phone: row['연락처'],
        address: row['주소'],
        notes: row['배송메모'],
        courier: row['택배사'],
        trackingNumber: row['운송장번호']
      }));

      // Validate
      const invalid = items.filter(i => !i.productName || !i.quantity);
      if (invalid.length > 0) {
        if (!confirm(`${invalid.length}개의 데이터에 필수 정보(상품명, 수량)가 누락되었습니다. 제외하고 진행하시겠습니까?`)) {
          input.value = '';
          return;
        }
      }

      const validItems = items.filter(i => i.productName && i.quantity);

      // Upload
      showToast(`${validItems.length}건 업로드 중...`, 'info');
      const res = await axios.post(`${API_BASE}/outbound/bulk`, { items: validItems });

      if (res.data.success) {
        const { success, fail } = res.data.data;
        alert(`업로드 완료!\n성공: ${success}건\n실패: ${fail}건` + (fail > 0 ? '\n(콘솔에서 상세 에러 확인 가능)' : ''));
        if (fail > 0) console.table(res.data.data.errors);

        closeOutboundExcelUploadModal();
        // Go to history tab to see them
        switchOutboundTab('hist');
        document.getElementById('outHistoryStatus').value = 'PENDING';
        filterOutboundHistory();
      }

    } catch (e) {
      console.error(e);
      showToast('파일 처리 중 오류 발생', 'error');
    } finally {
      input.value = '';
    }
  };
  reader.readAsArrayBuffer(file);
}

// --- Ship Modal Logic ---
let currentShipId = null;

async function openShipOutboundModal(id) {
  currentShipId = id;

  // Load warehouses for selection
  let warehouses = window.warehouses;
  if (!warehouses) {
    try {
      const res = await axios.get(`${API_BASE}/warehouses`);
      warehouses = res.data.data;
      window.warehouses = warehouses;
    } catch (e) {
      console.error(e);
    }
  }

  const modalHtml = `
      <div id="shipModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[80] transition-opacity duration-300 opacity-0">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 flex flex-col transform scale-95 transition-transform duration-300">
           <div class="p-6">
              <h3 class="text-xl font-bold text-slate-800 mb-2">출고 확정</h3>
              <p class="text-slate-500 text-sm mb-4">해당 주문을 출고 처리하시겠습니까?<br>재고가 즉시 차감됩니다.</p>
              
              <div class="mb-4">
                 <label class="block text-sm font-bold text-slate-700 mb-1">출고 창고 <span class="text-red-500">*</span></label>
                 <select id="shipWarehouseId" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                    ${(warehouses || []).map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
                 </select>
              </div>

              <div class="flex justify-end gap-2">
                 <button onclick="closeShipOutboundModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">취소</button>
                 <button onclick="confirmShipOutbound()" class="px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg font-bold shadow-lg shadow-teal-200">확정 (재고차감)</button>
              </div>
           </div>
        </div>
      </div>
    `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  requestAnimationFrame(() => {
    const m = document.getElementById('shipModal');
    if (m) { m.classList.remove('opacity-0'); m.querySelector('div').classList.remove('scale-95'); }
  });
}

function closeShipOutboundModal() {
  const m = document.getElementById('shipModal');
  if (m) {
    m.classList.add('opacity-0');
    m.querySelector('div').classList.add('scale-95');
    setTimeout(() => m.remove(), 200);
  }
  currentShipId = null;
}

async function confirmShipOutbound() {
  if (!currentShipId) return;
  const warehouseId = document.getElementById('shipWarehouseId').value;
  if (!warehouseId) { showToast('창고를 선택해주세요.', 'error'); return; }

  try {
    const res = await axios.post(`${API_BASE}/outbound/${currentShipId}/ship`, { warehouseId });
    if (res.data.success) {
      showToast('출고 확정되었습니다.');
      closeShipOutboundModal();
      closeOutboundDetail(); // Close detail view
      filterOutboundHistory(); // Refresh list
    }
  } catch (e) {
    console.error(e);
    showToast('출고 확정 실패: ' + (e.response?.data?.error || e.message), 'error');
  }
}

window.openOutboundExcelUploadModal = openOutboundExcelUploadModal;
window.closeOutboundExcelUploadModal = closeOutboundExcelUploadModal;
window.downloadOutboundTemplate = downloadOutboundTemplate;
window.handleExcelFileSelect = handleExcelFileSelect;
window.openShipOutboundModal = openShipOutboundModal;
window.closeShipOutboundModal = closeShipOutboundModal;
window.getTrackingUrl = getTrackingUrl;

function getTrackingUrl(courier, number) {
  if (!number) return null;
  const cleanNum = number.replace(/[^0-9]/g, '');
  if (!cleanNum) return null;

  if (courier.includes('CJ') || courier.includes('대한통운')) return `https://nplus.doortodoor.co.kr/web/detail.jsp?slipno=${cleanNum}`;
  if (courier.includes('우체국')) return `https://service.epost.go.kr/trace.RetrieveDomRgiTraceList.comm?sid1=${cleanNum}`;
  if (courier.includes('한진')) return `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumVal=${cleanNum}`;
  if (courier.includes('로젠')) return `https://www.ilogen.com/web/personal/trace/${cleanNum}`; // 로젠은 GET 방식이 막힐 수 있음, 확인 필요. 일단 시도. (Actually logen is tricky, need form post usually, but mobile link might work: https://www.ilogen.com/m/personal/trace/...)
  // 로젠 Mobile link: https://www.ilogen.com/m/personal/trace/{num}
  if (courier.includes('로젠')) return `https://www.ilogen.com/m/personal/trace/${cleanNum}`;

  if (courier.includes('롯데')) return `https://www.lotteglogis.com/home/reservation/tracking/index/${cleanNum}`;
  return null;
}
// Customer Search for Outbound
async function searchOutboundCustomer(query) {
  const resDiv = document.getElementById('outCustomerResults');
  if (!query) { resDiv.classList.add('hidden'); return; }
  try {
    const res = await axios.get(`${API_BASE}/customers`, { params: { search: query, limit: 5 } });
    const customers = res.data.data;
    resDiv.innerHTML = customers.map(c => `
      <div class="p-3 hover:bg-teal-50 cursor-pointer border-b border-slate-50" onclick="selectOutboundCustomer(${c.id}, '${c.name}', '${c.phone}', '${c.address.replace(/'/g, "\\'")}')">
        <div class="text-sm font-bold text-slate-800">${c.name}</div>
        <div class="text-[10px] text-slate-400">${c.phone} | ${c.address || '주소 없음'}</div>
      </div>
    `).join('');
    resDiv.classList.remove('hidden');
  } catch (e) {
    console.error('고객 검색 실패', e);
  }
}

function selectOutboundCustomer(id, name, phone, address) {
  document.getElementById('outCustomerId').value = id;
  document.getElementById('outSelectedCustomerLabel').textContent = `${name} (${phone})`;
  document.getElementById('outCustomerSearchWrapper').classList.add('hidden');
  document.getElementById('outSelectedCustomer').classList.remove('hidden');
  document.getElementById('outCustomerResults').classList.add('hidden');

  // Auto-fill recipient info
  document.getElementById('outDestName').value = name;
  document.getElementById('outDestPhone').value = phone;
  document.getElementById('outDestAddress').value = address;

  showToast(`${name} 고객 정보를 불러왔습니다.`);
}

function clearOutboundCustomer() {
  document.getElementById('outCustomerId').value = '';
  document.getElementById('outCustomerSearch').value = '';
  document.getElementById('outCustomerSearchWrapper').classList.remove('hidden');
  document.getElementById('outSelectedCustomer').classList.add('hidden');

  // Optionally clear recipient info? Usually better to keep it if they just wanted to detach link, 
  // but and user said Buyer/Recipient can be different, so it's safer to keep for now or clear.
  // Let's clear it to give a fresh start for manual input if they hit change.
  document.getElementById('outDestName').value = '';
  document.getElementById('outDestPhone').value = '';
  document.getElementById('outDestAddress').value = '';
}

window.searchOutboundCustomer = searchOutboundCustomer;
window.selectOutboundCustomer = selectOutboundCustomer;
window.clearOutboundCustomer = clearOutboundCustomer;
// Outbound Helper Functions
function toggleSameAsBuyer() {
  const isSame = document.getElementById('outSameAsBuyer').checked;
  const destFields = ['outDestName', 'outDestPhone'];

  if (isSame) {
    syncToRecipient();
    destFields.forEach(id => document.getElementById(id).readOnly = true);
    document.getElementById('outDestName').classList.add('bg-slate-50');
    document.getElementById('outDestPhone').classList.add('bg-slate-50');
  } else {
    destFields.forEach(id => {
      document.getElementById(id).readOnly = false;
      document.getElementById(id).classList.remove('bg-slate-50');
    });
  }
}

function syncToRecipient() {
  if (!document.getElementById('outSameAsBuyer').checked) return;

  const buyerId = document.getElementById('outCustomerId').value;
  if (!buyerId) {
    document.getElementById('outDestName').value = document.getElementById('outBuyerName').value;
    document.getElementById('outDestPhone').value = document.getElementById('outBuyerPhone').value;
  }
}

// [Override existing selectOutboundCustomer to support sync]
const originalSelectOutboundCustomer = selectOutboundCustomer;
selectOutboundCustomer = function (id, name, phone, address) {
  document.getElementById('outCustomerId').value = id;
  document.getElementById('outSelectedCustomerLabel').textContent = `${name} (${phone})`;
  document.getElementById('outCustomerSearchWrapper').classList.add('hidden');
  document.getElementById('outSelectedCustomer').classList.remove('hidden');
  document.getElementById('outCustomerResults').classList.add('hidden');
  document.getElementById('outNewBuyerFields').classList.add('opacity-50', 'pointer-events-none');

  // Buyer fields (stored for safety even if disabled)
  document.getElementById('outBuyerName').value = name;
  document.getElementById('outBuyerPhone').value = phone;

  if (document.getElementById('outSameAsBuyer').checked) {
    document.getElementById('outDestName').value = name;
    document.getElementById('outDestPhone').value = phone;
    document.getElementById('outDestAddress').value = address || '';
  }
  showToast(`${name} 고객 정보를 불러왔습니다.`);
};

// [Override existing clearOutboundCustomer]
const originalClearOutboundCustomer = clearOutboundCustomer;
clearOutboundCustomer = function () {
  document.getElementById('outCustomerId').value = '';
  document.getElementById('outCustomerSearch').value = '';
  document.getElementById('outCustomerSearchWrapper').classList.remove('hidden');
  document.getElementById('outSelectedCustomer').classList.add('hidden');
  document.getElementById('outNewBuyerFields').classList.remove('opacity-50', 'pointer-events-none');

  document.getElementById('outBuyerName').value = '';
  document.getElementById('outBuyerPhone').value = '';

  if (document.getElementById('outSameAsBuyer').checked) {
    document.getElementById('outDestName').value = '';
    document.getElementById('outDestPhone').value = '';
    document.getElementById('outDestAddress').value = '';
  }
};

window.toggleSameAsBuyer = toggleSameAsBuyer;
window.syncToRecipient = syncToRecipient;
