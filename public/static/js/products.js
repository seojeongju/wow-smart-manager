
// 상품 관리 관련 변수
let productsCurrentPage = 1;
const productsPerPage = 10;
let productListCache = []; // 상품 목록 캐시 (필요시 사용)

// 상품 관리 페이지 로드
async function loadProducts(content) {
  productsCurrentPage = productsCurrentPage || 1; // 현재 페이지 유지 또는 초기화
  try {
    const response = await axios.get(`${API_BASE}/products`, {
      params: {
        limit: productsPerPage,
        offset: (productsCurrentPage - 1) * productsPerPage
      }
    });
    const products = response.data.data;
    const pagination = response.data.pagination;

    content.innerHTML = `
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-800">
          <i class="fas fa-box mr-2"></i>상품 관리
        </h1>
      </div>
      
      <!-- 필터 및 검색 -->
      <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6">
        <div class="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div class="flex flex-1 gap-4 w-full md:w-auto">
            <div class="relative flex-1 md:max-w-xs">
              <i class="fas fa-search absolute left-3 top-3 text-slate-400"></i>
              <input type="text" id="prodSearch" placeholder="상품명 또는 SKU 검색" class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" onkeyup="if(event.key === 'Enter') filterProductsList()">
            </div>
            <select id="prodCategoryFilter" class="border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500" onchange="filterProductsList()">
              <option value="">전체 카테고리</option>
            </select>
            <button onclick="toggleProductFilters()" class="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-2">
              <i class="fas fa-filter"></i>상세 필터
            </button>
          </div>
          <div class="flex gap-2">
            <button onclick="openImportModal()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center">
              <i class="fas fa-file-import mr-2"></i>엑셀 가져오기
            </button>
            <button onclick="downloadProducts()" class="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center">
              <i class="fas fa-file-export mr-2"></i>내보내기
            </button>
            <button onclick="showProductModal()" class="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center">
              <i class="fas fa-plus mr-2"></i>상품 등록
            </button>
          </div>
        </div>

        <!-- 상세 필터 영역 -->
        <div id="productDetailFilters" class="hidden mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">중분류</label>
            <input type="text" id="prodCatMedium" class="w-full border border-slate-200 rounded px-3 py-2 text-sm" placeholder="중분류 입력">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">소분류</label>
            <input type="text" id="prodCatSmall" class="w-full border border-slate-200 rounded px-3 py-2 text-sm" placeholder="소분류 입력">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">재고 상태</label>
            <select id="prodStockStatus" class="w-full border border-slate-200 rounded px-3 py-2 text-sm">
              <option value="">전체</option>
              <option value="in_stock">재고 있음</option>
              <option value="low_stock">재고 부족</option>
              <option value="out_of_stock">품절</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">판매가 범위</label>
            <div class="flex gap-2 items-center">
              <input type="number" id="prodMinPrice" class="w-full border border-slate-200 rounded px-3 py-2 text-sm" placeholder="최소">
              <span class="text-slate-400">~</span>
              <input type="number" id="prodMaxPrice" class="w-full border border-slate-200 rounded px-3 py-2 text-sm" placeholder="최대">
            </div>
          </div>
          <div class="md:col-span-2 lg:col-span-2">
            <label class="block text-xs font-medium text-slate-500 mb-1">등록일</label>
            <div class="flex gap-2 items-center">
              <input type="date" id="prodStartDate" class="border border-slate-200 rounded px-3 py-2 text-sm">
              <span class="text-slate-400">~</span>
              <input type="date" id="prodEndDate" class="border border-slate-200 rounded px-3 py-2 text-sm">
            </div>
          </div>
          <div class="flex items-end">
            <button onclick="filterProductsList()" class="w-full bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-700 text-sm">
              적용하기
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto" id="productListContainer">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">상품정보</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">카테고리</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">판매가</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">재고</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-slate-200">
              ${products.map(p => `
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="h-10 w-10 flex-shrink-0 mr-3 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
                        ${p.image_url ?
        `<img class="h-10 w-10 object-cover" src="${p.image_url}" alt="${p.name}">` :
        `<i class="fas fa-box text-slate-400"></i>`
      }
                      </div>
                      <div class="flex flex-col">
                        <div class="text-sm font-medium text-slate-900 flex items-center gap-2">
                          ${p.name}
                          ${p.product_type === 'bundle'
        ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">세트</span>`
        : ''}
                          ${(p.product_type === 'master' || p.variant_count > 0)
        ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">옵션</span>`
        : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-slate-500 font-mono">${p.sku}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-600">
                      ${[p.category, p.category_medium, p.category_small].filter(Boolean).join(' > ')}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right">
                    <div class="text-sm font-bold text-slate-700">${formatCurrency(p.selling_price)}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-center">
                    <span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${p.current_stock <= p.min_stock_alert ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}">
                      ${p.current_stock}개
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button onclick="editProduct(${p.id})" class="text-teal-600 hover:text-teal-900 mr-3 transition-colors">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteProductAction(${p.id})" class="text-red-500 hover:text-red-700 transition-colors">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- 페이지네이션 -->
      <div id="productPaginationContainer" class="mt-4 shrink-0 pb-6"></div>
    `;

    // 카테고리 목록 로드
    loadCategories();

    // 모달 주입
    injectProductModal();

    // 페이지네이션 렌더링
    if (pagination) {
      renderProductsPagination(pagination);
    }

  } catch (error) {
    console.error('상품 목록 로드 실패:', error);
    alert('상품 목록 로드 중 오류 발생: ' + error.message);
    content.innerHTML = `<div class="p-4 text-red-600">상품 목록을 불러오는데 실패했습니다: ${error.message}</div>`;
  }
}

function toggleProductFilters() {
  const filters = document.getElementById('productDetailFilters');
  filters.classList.toggle('hidden');
}

function renderProductsPagination(pagination) {
  const container = document.getElementById('productPaginationContainer');
  if (!container || !pagination) return;

  const totalPages = Math.ceil(pagination.total / productsPerPage);

  if (totalPages <= 0) {
    container.innerHTML = '';
    return;
  }

  const maxButtons = 5;
  let startPage = Math.max(1, productsCurrentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  let buttons = '';

  // 이전 버튼
  buttons += `
    <button 
      onclick="changeProductsPage(${productsCurrentPage - 1})" 
      ${productsCurrentPage === 1 ? 'disabled' : ''}
      class="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <i class="fas fa-chevron-left"></i>
    </button>
  `;

  // 첫 페이지
  if (startPage > 1) {
    buttons += `
      <button 
        onclick="changeProductsPage(1)" 
        class="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
      >
        1
      </button>
    `;
    if (startPage > 2) {
      buttons += '<span class="px-2 py-2 text-slate-500">...</span>';
    }
  }

  // 페이지 번호들
  for (let i = startPage; i <= endPage; i++) {
    buttons += `
      <button 
        onclick="changeProductsPage(${i})" 
        class="px-4 py-2 rounded-lg border transition-colors ${i === productsCurrentPage
        ? 'bg-teal-600 text-white border-teal-600'
        : 'border-slate-300 hover:bg-slate-50'
      }"
      >
        ${i}
      </button>
    `;
  }

  // 마지막 페이지
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      buttons += '<span class="px-2 py-2 text-slate-500">...</span>';
    }
    buttons += `
      <button 
        onclick="changeProductsPage(${totalPages})" 
        class="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
      >
        ${totalPages}
      </button>
    `;
  }

  // 다음 버튼
  buttons += `
    <button 
      onclick="changeProductsPage(${productsCurrentPage + 1})" 
      ${productsCurrentPage === totalPages ? 'disabled' : ''}
      class="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <i class="fas fa-chevron-right"></i>
    </button>
  `;

  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
      <div class="flex items-center justify-between">
        <div class="text-sm text-slate-600">
          전체 <span class="font-bold text-teal-600">${pagination.total}</span>개 
          (${productsCurrentPage} / ${totalPages} 페이지)
        </div>
        <div class="flex gap-2">
          ${buttons}
        </div>
      </div>
    </div>
  `;
}

async function changeProductsPage(page) {
  productsCurrentPage = page;
  const content = document.getElementById('content');
  await loadProducts(content);
}

async function filterProductsList() {
  const search = document.getElementById('prodSearch').value;
  const category = document.getElementById('prodCategoryFilter').value;

  // 상세 필터 값
  const categoryMedium = document.getElementById('prodCatMedium')?.value || '';
  const categorySmall = document.getElementById('prodCatSmall')?.value || '';
  const stockStatus = document.getElementById('prodStockStatus')?.value || '';
  const minPrice = document.getElementById('prodMinPrice')?.value || '';
  const maxPrice = document.getElementById('prodMaxPrice')?.value || '';
  const startDate = document.getElementById('prodStartDate')?.value || '';
  const endDate = document.getElementById('prodEndDate')?.value || '';

  const container = document.getElementById('productListContainer');

  try {
    const params = { search, category };
    if (categoryMedium) params.category_medium = categoryMedium;
    if (categorySmall) params.category_small = categorySmall;
    if (stockStatus) params.stock_status = stockStatus;
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    // 페이지네이션 리셋
    productsCurrentPage = 1;
    params.limit = productsPerPage;
    params.offset = 0;

    const response = await axios.get(`${API_BASE}/products`, { params });
    const products = response.data.data;
    const pagination = response.data.pagination;

    container.innerHTML = `
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">상품정보</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">카테고리</th>
            <th class="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">판매가</th>
            <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">재고</th>
            <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">관리</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-slate-200">
          ${products.length > 0 ? products.map(p => `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="h-10 w-10 flex-shrink-0 mr-3 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
                    ${p.image_url ?
        `<img class="h-10 w-10 object-cover" src="${p.image_url}" alt="${p.name}">` :
        `<i class="fas fa-box text-slate-400"></i>`
      }
                  </div>
                  <div class="text-sm font-medium text-slate-900">${p.name}</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-slate-500 font-mono">${p.sku}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-600">
                  ${[p.category, p.category_medium, p.category_small].filter(Boolean).join(' > ')}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="text-sm font-bold text-slate-700">${formatCurrency(p.selling_price)}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                  ${p.current_stock <= p.min_stock_alert ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}">
                  ${p.current_stock}개
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                <button onclick="editProduct(${p.id})" class="text-teal-600 hover:text-teal-900 mr-3 transition-colors">
                  <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteProductAction(${p.id})" class="text-red-500 hover:text-red-700 transition-colors">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          `).join('') :
        '<tr><td colspan="6" class="px-6 py-10 text-center text-slate-500">검색 결과가 없습니다.</td></tr>'}
        </tbody>
      </table>
    `;

    if (pagination) {
      renderProductsPagination(pagination);
    }

  } catch (e) {
    console.error(e);
    showToast('검색 실패', 'error');
  }
}

// 카테고리 로드
async function loadCategories() {
  try {
    const response = await axios.get(`${API_BASE}/products/meta/categories`);
    const categories = response.data.data;
    const select = document.getElementById('prodCategoryFilter');
    if (!select) return;

    // 기존 옵션 유지 (첫번째 '전체 카테고리')
    select.innerHTML = '<option value="">전체 카테고리</option>';

    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('카테고리 로드 실패:', error);
  }
}

// 엑셀 다운로드
async function downloadProducts() {
  try {
    const response = await axios.get(`${API_BASE}/products`);
    const products = response.data.data;

    const headers = {
      id: 'ID',
      sku: 'SKU',
      name: '상품명',
      category: '카테고리(대)',
      category_medium: '카테고리(중)',
      category_small: '카테고리(소)',
      purchase_price: '매입가',
      selling_price: '판매가',
      current_stock: '현재재고',
      min_stock_alert: '최소재고알림',
      supplier: '공급사',
      brand: '브랜드',
      status: '상태',
      created_at: '등록일'
    };

    // downloadCSV는 utils.js에 추가하거나 여기에 포함해야 함.
    // 현재 utils.js엔 없음. products.js 내부에 둠.
    downloadCSV(products, `상품목록_${new Date().toISOString().slice(0, 10)}.csv`, headers);
  } catch (error) {
    console.error('상품 데이터 다운로드 실패:', error);
    alert('데이터를 불러오는데 실패했습니다.');
  }
}

// CSV 다운로드 유틸리티 (내부용)
function downloadCSV(data, filename, headers) {
  if (!data || data.length === 0) {
    alert('다운로드할 데이터가 없습니다.');
    return;
  }

  let csvContent = "\uFEFF"; // BOM for Excel

  if (headers) {
    csvContent += Object.values(headers).join(',') + '\n';
  } else {
    csvContent += Object.keys(data[0]).join(',') + '\n';
  }

  data.forEach(row => {
    let rowContent = [];
    if (headers) {
      Object.keys(headers).forEach(key => {
        let cell = row[key] === null || row[key] === undefined ? '' : row[key].toString();
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell.replace(/"/g, '""')}"`;
        }
        rowContent.push(cell);
      });
    } else {
      rowContent = Object.values(row).map(cell => {
        cell = cell === null || cell === undefined ? '' : cell.toString();
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      });
    }
    csvContent += rowContent.join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// --- 모달 및 상품 CRUD ---

function injectProductModal() {
  if (document.getElementById('productModal')) return;

  const modalHtml = `
    <div id="productModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm hidden flex items-center justify-center z-50 transition-all duration-300">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 transform transition-all max-h-[90vh] overflow-y-auto border border-slate-100 flex flex-col">
        <div class="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur z-10">
          <h3 id="productModalTitle" class="text-xl font-bold text-slate-800">상품 등록</h3>
          <button onclick="closeProductModal()" class="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="flex border-b border-slate-100 px-6">
          <button type="button" onclick="switchProductTab('basic')" id="tab-basic" class="px-4 py-3 text-sm font-medium text-teal-600 border-b-2 border-teal-600 transition-colors">기본 정보</button>
          <button type="button" onclick="switchProductTab('bundle')" id="tab-bundle" class="px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors hidden">세트 구성</button>
          <button type="button" onclick="switchProductTab('detail')" id="tab-detail" class="px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">상세 정보</button>
          <button type="button" onclick="switchProductTab('media')" id="tab-media" class="px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">이미지/미디어</button>
        </div>

        <form id="productForm" onsubmit="submitProduct(event)" class="flex-1 overflow-y-auto">
          <div class="p-6 space-y-6">
            <!-- 기본 정보 탭 -->
            <div id="content-basic" class="space-y-6">
              <!-- 상품 유형 선택 -->
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-3">상품 유형</label>
                <div class="flex flex-wrap gap-4">
                  <label class="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50 flex-1 min-w-[120px]">
                    <input type="radio" name="product_type" value="simple" checked onchange="toggleProductType(this.value)" class="form-radio text-teal-600 focus:ring-teal-500">
                    <div class="flex flex-col">
                      <span class="text-sm font-bold text-slate-700">일반 상품</span>
                      <span class="text-[10px] text-slate-500">단일 옵션 상품</span>
                    </div>
                  </label>
                  <label class="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50 flex-1 min-w-[120px]">
                    <input type="radio" name="product_type" value="master" onchange="toggleProductType(this.value)" class="form-radio text-teal-600 focus:ring-teal-500">
                    <div class="flex flex-col">
                      <span class="text-sm font-bold text-slate-700">옵션 상품</span>
                      <span class="text-[10px] text-slate-500">여러 세부옵션 구성</span>
                    </div>
                  </label>
                  <label class="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50 flex-1 min-w-[120px]">
                    <input type="radio" name="product_type" value="bundle" onchange="toggleProductType(this.value)" class="form-radio text-teal-600 focus:ring-teal-500">
                    <div class="flex flex-col">
                      <span class="text-sm font-bold text-slate-700">세트 상품</span>
                      <span class="text-[10px] text-slate-500">기존 상품들로 구성</span>
                    </div>
                  </label>
                </div>
              </div>

              <!-- 인라인 옵션 선택 섹션 -->
              <div id="inlineOptionSelector" class="hidden p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
                <div>
                  <div class="flex justify-between items-center mb-3">
                    <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider">사용 가능한 옵션 그룹 선택</h4>
                    <a href="#" onclick="closeProductModal(); loadPage('product-options'); return false;" class="text-[10px] text-teal-600 hover:underline flex items-center gap-1">
                      <i class="fas fa-cog"></i> 옵션 프리셋 관리
                    </a>
                  </div>
                  <div id="optionTemplatesContainer" class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    <!-- 서버에서 불러온 옵션 그룹들이 여기에 렌더링됨 -->
                  </div>
                </div>

                <div>
                  <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">적용된 옵션</h4>
                  <div id="selectedOptionsContainer" class="space-y-3 min-h-[60px] border-2 border-dashed border-slate-200 rounded-xl p-4 bg-white transition-all">
                    <!-- 선택된 옵션들이 여기에 표시됨 -->
                  </div>
                </div>

                <div class="pt-2">
                  <button type="button" onclick="generateVariants()" class="w-full bg-teal-600 text-white py-3 rounded-lg text-sm font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-100 flex items-center justify-center gap-2">
                    <i class="fas fa-magic"></i> 세부품목(Variants) 생성
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">SKU (상품코드)</label>
                  <div class="flex flex-col gap-2">
                    <div class="flex items-center gap-4 mb-1">
                      <label class="inline-flex items-center cursor-pointer">
                        <input type="radio" name="skuType" value="auto" checked onchange="toggleSkuInput(this.value)" class="form-radio text-teal-600 focus:ring-teal-500">
                        <span class="ml-2 text-sm text-slate-700">자동 생성</span>
                      </label>
                      <label class="inline-flex items-center cursor-pointer">
                        <input type="radio" name="skuType" value="manual" onchange="toggleSkuInput(this.value)" class="form-radio text-teal-600 focus:ring-teal-500">
                        <span class="ml-2 text-sm text-slate-700">수동 입력</span>
                      </label>
                    </div>
                    <div class="flex gap-2">
                      <input type="text" id="prodSku" required readonly class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400 bg-slate-50 text-slate-500">
                      <button type="button" id="btnGenerateSku" onclick="generateAutoSku()" class="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
                        <i class="fas fa-sync-alt mr-1"></i>생성
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">상품명</label>
                  <input type="text" id="prodName" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm font-semibold text-slate-700 mb-2">
                    <i class="fas fa-barcode mr-1 text-slate-400"></i>바코드 (EAN/Code128 등)
                  </label>
                  <input type="text" id="prodBarcode" autocomplete="off"
                    class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                    placeholder="바코드건으로 스캔하거나 직접 입력 (선택)">
                  <p class="text-xs text-slate-400 mt-1">현장 QR 입고·출고·판매에서 바코드/SKU로도 조회됩니다.</p>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">카테고리 (대분류)</label>
                  <input type="text" id="prodCategory" list="categoryList" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400" placeholder="예: 전자제품">
                  <datalist id="categoryList"></datalist>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">카테고리 (중분류)</label>
                  <input type="text" id="prodCategoryMedium" list="categoryMediumList" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400" placeholder="예: 컴퓨터">
                  <datalist id="categoryMediumList"></datalist>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">카테고리 (소분류)</label>
                  <input type="text" id="prodCategorySmall" list="categorySmallList" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400" placeholder="예: 노트북">
                  <datalist id="categorySmallList"></datalist>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">매입가</label>
                  <div class="relative">
                    <span class="absolute left-4 top-2.5 text-slate-500">₩</span>
                    <input type="number" id="prodPurchasePrice" min="0" class="w-full border border-slate-300 rounded-lg pl-8 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                  </div>
                  <div id="bundlePurchaseTotalInfo" class="hidden mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                    <span class="text-xs text-slate-500">구성품 매입가 합계</span>
                    <span id="bundlePurchaseTotalDisplay" class="text-xs font-bold text-slate-700">0원</span>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">판매가</label>
                  <div class="relative">
                    <span class="absolute left-4 top-2.5 text-slate-500">₩</span>
                    <input type="number" id="prodSellingPrice" min="0" class="w-full border border-slate-300 rounded-lg pl-8 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                  </div>
                  <div id="bundleSellingTotalInfo" class="hidden mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                    <span class="text-xs text-slate-500">구성품 판매가 합계</span>
                    <span id="bundleSellingTotalDisplay" class="text-xs font-bold text-slate-700">0원</span>
                  </div>
                </div>
              </div>

              <div id="stockContainer" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">현재 재고</label>
                  <input type="number" id="prodStock" min="0" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                  <p class="text-xs text-slate-500 mt-1.5 flex items-center"><i class="fas fa-info-circle mr-1"></i>수정 시에는 재고 조정 기능을 이용하세요.</p>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">최소 재고 알림</label>
                  <input type="number" id="prodMinStock" min="0" value="10" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                </div>
              </div>

              <!-- 세트 구성 요약 테이블 (기본 정보 탭에 표시) -->
              <div id="bundleSummaryContainer" class="hidden">
                 <div class="flex justify-between items-center mb-2">
                    <h5 class="text-xs font-bold text-slate-500 uppercase tracking-widest">세트 구성 상세</h5>
                    <button type="button" onclick="switchProductTab('bundle')" class="text-[10px] text-teal-600 font-bold hover:underline">
                      <i class="fas fa-pencil-alt mr-1"></i>구성 수정
                    </button>
                 </div>
                 <div class="overflow-hidden border border-slate-200 rounded-lg bg-white">
                    <table class="min-w-full divide-y divide-slate-200">
                      <thead class="bg-slate-50">
                        <tr>
                           <th class="px-4 py-2 text-left text-[10px] font-bold text-slate-500">상품명</th>
                           <th class="px-4 py-2 text-center text-[10px] font-bold text-slate-500 w-16">수량</th>
                           <th class="px-4 py-2 text-right text-[10px] font-bold text-slate-500 w-24">매입가</th>
                           <th class="px-4 py-2 text-right text-[10px] font-bold text-slate-500 w-24">판매가</th>
                        </tr>
                      </thead>
                      <tbody id="bundleSummaryList" class="divide-y divide-slate-100">
                        <!-- populated by js -->
                      </tbody>
                      <tfoot class="bg-slate-50">
                         <tr>
                           <td colspan="2" class="px-4 py-2 text-right text-[10px] font-bold text-slate-600">합계</td>
                           <td class="px-4 py-2 text-right text-[10px] font-bold text-teal-600" id="bundleSummaryPurchaseTotal">0</td>
                           <td class="px-4 py-2 text-right text-[10px] font-bold text-teal-600" id="bundleSummarySellingTotal">0</td>
                         </tr>
                      </tfoot>
                    </table>
                 </div>
              </div>

              <!-- 생성된 세부옵션 목록 (옵션 상품일 때만 표시) -->
              <div id="variantsContainer" class="mt-6 hidden">
                <div class="flex justify-between items-center mb-3">
                  <h5 class="text-xs font-bold text-slate-500 uppercase tracking-widest">생성된 세부옵션 목록</h5>
                  <button type="button" onclick="switchProductTab('options')" class="text-[10px] text-teal-600 font-bold hover:underline">
                    <i class="fas fa-cog mr-1"></i>옵션 그룹 수정하기
                  </button>
                </div>
                <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                  <table class="min-w-full divide-y divide-slate-200">
                    <thead class="bg-slate-50">
                      <tr>
                        <th class="px-4 py-2 text-center w-10">
                          <input type="checkbox" id="selectAllVariants" checked onchange="toggleAllVariants(this.checked)" class="form-checkbox h-3 w-3 text-teal-600 rounded">
                        </th>
                        <th class="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">옵션 조합명</th>
                        <th class="px-4 py-2 text-left text-[10px] font-bold text-slate-500 uppercase w-32">SKU</th>
                        <th class="px-4 py-2 text-right text-[10px] font-bold text-slate-500 uppercase w-24">매입가</th>
                        <th class="px-4 py-2 text-right text-[10px] font-bold text-slate-500 uppercase w-24">판매가</th>
                        <th class="px-4 py-2 text-right text-[10px] font-bold text-slate-500 uppercase w-20">재고</th>
                        <th class="px-4 py-2 text-center text-[10px] font-bold text-slate-500 uppercase w-10"></th>
                      </tr>
                    </thead>
                    <tbody id="variantsList" class="bg-white divide-y divide-slate-200">
                      <!-- 생성된 세부옵션 로우들이 여기에 추가됨 -->
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- 옵션 설정 탭은 제거됨 (기본 정보 탭에 통합) -->

            <!-- 세트 구성 탭 -->
            <div id="content-bundle" class="space-y-6 hidden">
              <div>
                <h4 class="text-sm font-bold text-slate-700 mb-4">구성 상품 추가</h4>
                <div class="flex gap-2 mb-4">
                  <div class="relative flex-1">
                    <div class="relative flex-1">
                      <i class="fas fa-search absolute left-3 top-3 text-slate-400"></i>
                      <input type="text" id="bundleItemSearch" placeholder="상품명 또는 SKU로 구성 상품 검색" class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" onkeyup="searchBundleItems(this.value)" onfocus="searchBundleItems(this.value)">
                      <div id="bundleSearchResults" class="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-[100] hidden max-h-60 overflow-y-auto"></div>
                    </div>
                  </div>
  
                  <div id="bundleItemsContainer" class="flex flex-wrap items-center gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50 min-h-[120px]">
                    <!-- 구성 상품 카드들이 여기에 추가됨 -->
                    
                    <!-- 추가 버튼 (항상 마지막에 위치) -->
                    <div id="btnAddBundleItem" class="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-teal-500 hover:bg-white hover:text-teal-600 transition-all group" onclick="searchBundleItems(''); document.getElementById('bundleItemSearch').focus()">
                      <i class="fas fa-plus text-2xl text-slate-400 group-hover:text-teal-500 mb-2"></i>
                      <span class="text-xs font-bold text-slate-500 group-hover:text-teal-600">구성품 추가</span>
                    </div>
                  </div>
                </div> <!-- Closing flex gap-2 -->
                <div id="bundleEmptyMsg" class="hidden"></div> <!-- Deprecated but kept for logic safety if needed, or just hidden -->

                <div class="pt-4 flex justify-end">
                   <button type="button" onclick="switchProductTab('basic')" class="bg-teal-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 transition-colors shadow-lg shadow-teal-100 flex items-center gap-2">
                     <i class="fas fa-check"></i> 구성 완료 (가격 설정)
                   </button>
                </div>
              </div>
            </div>

            <!-- 상세 정보 탭 -->
            <div id="content-detail" class="space-y-6 hidden">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">브랜드</label>
                  <input type="text" id="prodBrand" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">공급사</label>
                  <input type="text" id="prodSupplier" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                </div>
              </div>

              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">태그 (쉼표로 구분)</label>
                <input type="text" id="prodTags" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400" placeholder="예: 신상품, 베스트, 여름특가">
              </div>

              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">상태</label>
                <select id="prodStatus" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow bg-white">
                  <option value="sale">판매중</option>
                  <option value="out_of_stock">품절</option>
                  <option value="discontinued">단종</option>
                  <option value="hidden">숨김</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">상세 설명</label>
                <textarea id="prodDesc" rows="5" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400 resize-none"></textarea>
              </div>
            </div>

            <!-- 이미지/미디어 탭 -->
            <div id="content-media" class="space-y-6 hidden">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">상품 이미지</label>
                <input type="hidden" id="prodImageUrl">
                <div class="mt-2 w-full">
                  <label for="prodImageFile" class="flex flex-col items-center justify-center w-full h-64 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors relative overflow-hidden group">
                    <div id="imgPlaceholder" class="flex flex-col items-center justify-center pt-5 pb-6">
                      <i class="fas fa-cloud-upload-alt text-4xl text-slate-400 mb-3 group-hover:text-teal-500 transition-colors"></i>
                      <p class="mb-2 text-sm text-slate-500"><span class="font-semibold">클릭하여 이미지 업로드</span></p>
                      <p class="text-xs text-slate-500">PNG, JPG, GIF (자동 리사이징됨)</p>
                    </div>
                    <img id="imgPreview" src="" class="absolute inset-0 w-full h-full object-contain hidden bg-white" alt="미리보기">
                    <div id="imgOverlay" class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden">
                      <p class="text-white font-semibold"><i class="fas fa-edit mr-2"></i>이미지 변경</p>
                    </div>
                    <input id="prodImageFile" type="file" accept="image/*" class="hidden" onchange="handleImageUpload(this)">
                  </label>
                  <div class="flex justify-end mt-2">
                    <button type="button" onclick="removeImage()" id="btnRemoveImage" class="text-sm text-red-500 hover:text-red-700 hidden">
                      <i class="fas fa-trash-alt mr-1"></i>이미지 삭제
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="bg-slate-50 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl sticky bottom-0 border-t border-slate-100">
            <button type="button" onclick="closeProductModal()" class="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200">
              취소
            </button>
            <button type="submit" class="px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2">
              저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function showProductModal() {
  injectProductModal();

  const modal = document.getElementById('productModal');
  const title = document.getElementById('productModalTitle');
  const form = document.getElementById('productForm');

  form.reset();
  window.editingProductId = null;

  title.textContent = '상품 등록';

  // SKU 초기화 (자동 생성 모드)
  const skuRadio = document.querySelector('input[name="skuType"][value="auto"]');
  if (skuRadio) skuRadio.checked = true;

  toggleSkuInput('auto');

  // 탭 초기화
  switchProductTab('basic');
  toggleProductType('simple');

  // 이미지 미리보기 초기화
  removeImage();

  // 옵션 및 세부옵션 초기화
  selectedOptionGroups = [];
  const variantsList = document.getElementById('variantsList');
  if (variantsList) variantsList.innerHTML = '';
  const selectedOptionsContainer = document.getElementById('selectedOptionsContainer');
  if (selectedOptionsContainer) renderSelectedOptionGroups();
  const variantsContainer = document.getElementById('variantsContainer');
  if (variantsContainer) variantsContainer.classList.add('hidden');

  modal.classList.remove('hidden');
}

function closeProductModal() {
  const modal = document.getElementById('productModal');
  if (modal) modal.classList.add('hidden');
}

async function editProduct(id) {
  injectProductModal();

  try {
    const response = await axios.get(`${API_BASE}/products/${id}`);
    const product = response.data.data;

    window.editingProductId = id;

    document.getElementById('productModalTitle').textContent = '상품 수정';

    // 수정 시에는 SKU 변경 불가 (UI 처리)
    const prodSku = document.getElementById('prodSku');
    prodSku.value = product.sku;
    prodSku.readOnly = true;
    prodSku.classList.add('bg-slate-50', 'text-slate-500');

    // 라디오 버튼 및 생성 버튼 숨김/비활성화
    document.querySelectorAll('input[name="skuType"]').forEach(el => el.disabled = true);
    const btnGen = document.getElementById('btnGenerateSku');
    if (btnGen) btnGen.classList.add('hidden');

    document.getElementById('prodName').value = product.name;
    const prodBarcode = document.getElementById('prodBarcode');
    if (prodBarcode) prodBarcode.value = product.barcode || '';
    document.getElementById('prodCategory').value = product.category;
    document.getElementById('prodCategoryMedium').value = product.category_medium || '';
    document.getElementById('prodCategorySmall').value = product.category_small || '';
    document.getElementById('prodSupplier').value = product.supplier || '';
    document.getElementById('prodBrand').value = product.brand || '';
    document.getElementById('prodTags').value = product.tags || '';
    document.getElementById('prodStatus').value = product.status || 'sale';
    document.getElementById('prodPurchasePrice').value = product.purchase_price;
    document.getElementById('prodSellingPrice').value = product.selling_price;

    const prodStock = document.getElementById('prodStock');
    prodStock.value = product.current_stock;
    prodStock.readOnly = true; // 재고는 수정 불가 (조정 기능 이용)
    prodStock.classList.add('bg-gray-100');

    document.getElementById('prodMinStock').value = product.min_stock_alert;
    document.getElementById('prodDesc').value = product.description || '';
    document.getElementById('prodImageUrl').value = product.image_url || '';
    updateImagePreview(product.image_url);

    // 세부옵션(Variants) 및 세트 구성(Bundle) 로드
    // 데이터가 있다면 타입에 관계없이 일단 렌더링 (UI 노출 여부는 toggleProductType에서 결정)
    if (product.variants && product.variants.length > 0) {
      console.log('Loading existing variants:', product.variants);
      renderExistingVariants(product.variants);
    }

    if (product.bundle_items && product.bundle_items.length > 0) {
      console.log('Rendering existing bundle items:', product.bundle_items);
      renderExistingBundleItems(product.bundle_items);
    }

    // 상품 유형 설정 및 UI 토글 (렌더링 이후에 수행하여 데이터 존재 여부 체크가 정확하게 작동하도록 함)
    const type = product.product_type || 'simple';
    const typeRadio = document.querySelector(`input[name="product_type"][value="${type}"]`);
    if (typeRadio) {
      typeRadio.checked = true;
      toggleProductType(type);
    }

    fillCategoryDatalist();
    switchProductTab('basic');

    document.getElementById('productModal').classList.remove('hidden');
  } catch (error) {
    console.error('상품 정보 로드 실패:', error);
    showToast('상품 정보를 불러오는데 실패했습니다.', 'error');
  }
}

async function submitProduct(e) {
  e.preventDefault();

  // 수동 유효성 검사 (HTML hidden tab focus 이슈 해결)
  const name = document.getElementById('prodName').value;
  const sku = document.getElementById('prodSku').value;
  const sellingPrice = document.getElementById('prodSellingPrice').value;

  if (!name || !sku || sellingPrice === '') {
    showToast('상품명, SKU, 판매가는 필수 입력 항목입니다.', 'warning');
    switchProductTab('basic');
    return;
  }

  const productType = document.querySelector('input[name="product_type"]:checked')?.value || 'simple';

  const payload = {
    sku: sku,
    barcode: document.getElementById('prodBarcode')?.value?.trim() || null,
    name: name,
    category: document.getElementById('prodCategory').value || '미분류',
    category_medium: document.getElementById('prodCategoryMedium').value || null,
    category_small: document.getElementById('prodCategorySmall').value || null,
    supplier: document.getElementById('prodSupplier').value || null,
    brand: document.getElementById('prodBrand').value || null,
    tags: document.getElementById('prodTags').value || null,
    status: document.getElementById('prodStatus').value || 'sale',
    image_url: document.getElementById('prodImageUrl').value || null,
    purchase_price: parseFloat(document.getElementById('prodPurchasePrice').value) || 0,
    selling_price: parseFloat(document.getElementById('prodSellingPrice').value) || 0,
    current_stock: parseInt(document.getElementById('prodStock').value) || 0,
    min_stock_alert: parseInt(document.getElementById('prodMinStock').value) || 10,
    description: document.getElementById('prodDesc').value || null,
    product_type: productType
  };

  console.log('Product Payload:', payload);

  try {
    // 옵션 및 세부옵션 정보 추가 (등록/수정 공통)
    if (payload.product_type === 'master') {
      const variants = getCreatedVariantsData();
      if (variants.length > 0) {
        payload.has_options = true;
        payload.variants = variants;
      } else {
        // 수정 시에는 기존 변체가 있을 수 있으므로 strict check를 할지 고민. 
        // 하지만 getCreatedVariantsData는 현재 화면의 상태를 가져오므로, 
        // 화면에서 다 지워버렸으면 빈 배열일 것임.
        // 마스터 상품인데 변체가 없으면 안되므로 경고.
        showToast('세부옵션 목록을 생성해 주세요.', 'warning');
        switchProductTab('options');
        return;
      }
    }

    // 세트 구성 정보 추가 (등록/수정 공통)
    if (payload.product_type === 'bundle') {
      const bundleItems = getBundleItemsData();
      if (bundleItems.length > 0) {
        payload.bundle_items = bundleItems;
      } else {
        showToast('구성 상품을 추가해 주세요.', 'warning');
        switchProductTab('bundle');
        return;
      }
    }

    if (window.editingProductId) {
      // 수정
      delete payload.sku; // SKU 제외
      delete payload.current_stock; // 재고 제외
      await axios.put(`${API_BASE}/products/${window.editingProductId}`, payload);
      showToast('상품이 수정되었습니다.');
    } else {
      // 등록
      await axios.post(`${API_BASE}/products`, payload);
      showToast('상품이 등록되었습니다.');
    }

    closeProductModal();
    // 현재 페이지가 products라면 리로드, 아니면 놔둠 (하지만 보통 products 페이지에서 모달을 띄움)
    if (typeof loadProducts === 'function') {
      const content = document.getElementById('content');
      loadProducts(content);
    }
  } catch (error) {
    console.error('상품 저장 실패:', error);
    console.dir(error);

    // 에러 메시지 처리 강화
    let msg = error.response?.data?.error || error.message || '저장 중 오류가 발생했습니다.';

    // SQLite Unique Constraint Error (SKU 중복) 구체화
    if (msg.includes('UNIQUE constraint failed: products.sku') || (error.response?.data && String(error.response.data).includes('UNIQUE'))) {
      msg = '이미 존재하는 SKU(상품코드)입니다. 번호를 변경하거나 [자동 생성]을 다시 클릭해주세요.';
    }

    alert(msg);
  }
}

async function deleteProductAction(id) {
  if (!confirm('정말 이 상품을 삭제하시겠습니까?')) return;

  try {
    await axios.delete(`${API_BASE}/products/${id}`);
    showToast('상품이 삭제되었습니다.');
    const content = document.getElementById('content');
    loadProducts(content);
  } catch (error) {
    console.error('상품 삭제 실패:', error);
    alert('상품 삭제 실패: ' + (error.response?.data?.error || error.message));
  }
}

function switchProductTab(tab) {
  console.log('Switching to tab:', tab);
  // 'options' 탭은 'basic'에 통합되었으므로 목록에서 제거
  const tabs = ['basic', 'bundle', 'detail', 'media'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    const content = document.getElementById(`content-${t}`);

    if (btn && content) {
      if (t === tab) {
        btn.classList.remove('text-slate-500', 'border-transparent');
        btn.classList.add('text-teal-600', 'border-b-2', 'border-teal-600');
        content.classList.remove('hidden');
        content.style.display = 'block';
      } else {
        btn.classList.add('text-slate-500');
        btn.classList.remove('text-teal-600', 'border-b-2', 'border-teal-600');
        content.classList.add('hidden');
        content.style.display = 'none';
      }
    }
  });
}

function toggleProductType(type) {
  const tabBundle = document.getElementById('tab-bundle');
  const stockContainer = document.getElementById('stockContainer');
  const variantsContainer = document.getElementById('variantsContainer');
  const inlineOptionSelector = document.getElementById('inlineOptionSelector');
  const variantsList = document.getElementById('variantsList');

  // 기본적으로 모든 특수 섹션 숨김 (필요한 것만 켬)
  if (inlineOptionSelector) inlineOptionSelector.classList.add('hidden');
  if (tabBundle) tabBundle.classList.add('hidden');
  if (stockContainer) stockContainer.classList.remove('hidden'); // 일반 상품은 재고 보여줌

  if (type === 'master') {
    if (inlineOptionSelector) {
      inlineOptionSelector.classList.remove('hidden');
      loadAndRenderOptionTemplates();
    }
    if (stockContainer) stockContainer.classList.add('hidden');
    if (variantsContainer && variantsList && variantsList.children.length > 0) {
      variantsContainer.classList.remove('hidden');
    }
  } else if (type === 'bundle') {
    if (tabBundle) tabBundle.classList.remove('hidden');
    if (stockContainer) stockContainer.classList.add('hidden');

    // 세트 상품이라도 이미 생성된 옵션이 있다면 보여줌 (중복 관리 방지)
    if (variantsContainer && variantsList && variantsList.children.length > 0) {
      variantsContainer.classList.remove('hidden');
    }

    if (document.getElementById('bundlePurchaseTotalInfo')) document.getElementById('bundlePurchaseTotalInfo').classList.remove('hidden');
    if (document.getElementById('bundleSellingTotalInfo')) document.getElementById('bundleSellingTotalInfo').classList.remove('hidden');
    if (document.getElementById('bundleSummaryContainer')) document.getElementById('bundleSummaryContainer').classList.remove('hidden');
  } else {
    // simple 등 기타
    if (variantsContainer) variantsContainer.classList.add('hidden');
    if (document.getElementById('bundleSummaryContainer')) document.getElementById('bundleSummaryContainer').classList.add('hidden');
  }
}

// Deprecated placeholder removed

function toggleSkuInput(type) {
  const skuInput = document.getElementById('prodSku');
  const generateBtn = document.getElementById('btnGenerateSku');

  if (type === 'auto') {
    skuInput.readOnly = true;
    skuInput.classList.add('bg-slate-50', 'text-slate-500');
    generateBtn.classList.remove('hidden');
    if (!skuInput.value) generateAutoSku();
  } else {
    skuInput.readOnly = false;
    skuInput.classList.remove('bg-slate-50', 'text-slate-500');
    generateBtn.classList.add('hidden');
    skuInput.value = '';
    skuInput.focus();
  }
}

function generateAutoSku() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  document.getElementById('prodSku').value = `PRD-${year}${month}${day}-${random}`;
}

function handleImageUpload(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];

    // 파일 크기 체크 (예: 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기가 너무 큽니다. 10MB 이하의 이미지를 선택해주세요.');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        // 캔버스를 이용한 리사이징
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 최대 크기 설정 (600px)
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Base64로 변환 (JPEG, 퀄리티 0.7)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

        // 데이터 설정 및 미리보기 업데이트
        document.getElementById('prodImageUrl').value = dataUrl;
        updateImagePreview(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

function updateImagePreview(url) {
  const img = document.getElementById('imgPreview');
  const placeholder = document.getElementById('imgPlaceholder');
  const overlay = document.getElementById('imgOverlay');
  const removeBtn = document.getElementById('btnRemoveImage');

  if (url) {
    img.src = url;
    img.classList.remove('hidden');
    placeholder.classList.add('hidden');
    overlay.classList.remove('hidden'); // 이미지가 있을 때만 오버레이 활성화 가능
    removeBtn.classList.remove('hidden');
  } else {
    img.src = '';
    img.classList.add('hidden');
    placeholder.classList.remove('hidden');
    overlay.classList.add('hidden');
    removeBtn.classList.add('hidden');
  }
}

function removeImage() {
  document.getElementById('prodImageUrl').value = '';
  document.getElementById('prodImageFile').value = ''; // 파일 인풋 초기화
  updateImagePreview('');
}

async function fillCategoryDatalist() {
  try {
    const response = await axios.get(`${API_BASE}/products`);
    const products = response.data.data;

    const categories = [...new Set(products.map(p => p.category))];
    const mediums = [...new Set(products.map(p => p.category_medium).filter(Boolean))];
    const smalls = [...new Set(products.map(p => p.category_small).filter(Boolean))];

    const list = document.getElementById('categoryList');
    const mediumList = document.getElementById('categoryMediumList');
    const smallList = document.getElementById('categorySmallList');

    if (list) {
      list.innerHTML = categories.map(c => `<option value="${c}">`).join('');
    }
    if (mediumList) {
      mediumList.innerHTML = mediums.map(c => `<option value="${c}">`).join('');
    }
    if (smallList) {
      smallList.innerHTML = smalls.map(c => `<option value="${c}">`).join('');
    }
  } catch (e) {
    console.error('카테고리 로드 실패', e);
  }
}

// --- 옵션 및 세부옵션 관리 기능 ---

let selectedOptionGroups = [];

async function loadAndRenderOptionTemplates() {
  const container = document.getElementById('optionTemplatesContainer');
  if (!container) return;

  try {
    const res = await axios.get(`${API_BASE}/product-options/groups`);
    const groups = res.data.data;

    if (groups.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-6 border-2 border-dashed border-slate-100 rounded-2xl text-center">
          <i class="fas fa-tags text-2xl text-slate-200 mb-2"></i>
          <p class="text-xs text-slate-400">등록된 옵션 프리셋이 없습니다.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = groups.map(g => `
      <div onclick="addOptionGroupToSelection(${JSON.stringify(g).replace(/"/g, '&quot;')})"
        class="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-teal-500 hover:bg-teal-50/30 cursor-pointer transition-all group">
        <div class="flex flex-col">
          <span class="text-sm font-bold text-slate-700 group-hover:text-teal-700 transition-colors">${g.name}</span>
          <span class="text-[10px] text-slate-400">${g.values.length}개 항목</span>
        </div>
        <div class="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-teal-500 group-hover:text-white transition-all">
          <i class="fas fa-plus text-[10px]"></i>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
    showToast('옵션 템플릿 로드 실패', 'error');
  }
}

function addOptionGroupToSelection(group) {
  if (selectedOptionGroups.find(g => g.id === group.id)) {
    showToast('이미 추가된 옵션 그룹입니다.', 'warning');
    return;
  }

  selectedOptionGroups.push(group);
  renderSelectedOptionGroups();
}

function renderSelectedOptionGroups() {
  const container = document.getElementById('selectedOptionsContainer');
  if (selectedOptionGroups.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-4 text-slate-400">
        <i class="fas fa-mouse-pointer mb-2 opacity-20"></i>
        <p class="text-[11px]">위 목록에서 옵션을 선택해 주세요.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = selectedOptionGroups.map((g, idx) => `
    <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 relative group/item">
      <button type="button" onclick="removeOptionGroup(${idx})" 
        class="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover/item:opacity-100">
        <i class="fas fa-times text-xs"></i>
      </button>
      <div class="mb-2">
        <span class="text-xs font-bold text-slate-700 border-b-2 border-teal-500 pb-0.5">${g.name}</span>
      </div>
      <div class="flex flex-wrap gap-1.5">
        ${g.values.map(v => `
          <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-white text-slate-600 border border-slate-200">
            ${v.value}
            ${v.additional_price ? `<span class="ml-1 text-teal-600 font-bold">+₩${formatCurrency(v.additional_price)}</span>` : ''}
          </span>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function removeOptionGroup(idx) {
  selectedOptionGroups.splice(idx, 1);
  renderSelectedOptionGroups();
}

function generateVariants() {
  if (selectedOptionGroups.length === 0) {
    showToast('먼저 옵션 그룹을 선택하세요.', 'warning');
    return;
  }

  const container = document.getElementById('variantsContainer');
  const list = document.getElementById('variantsList');
  const baseName = document.getElementById('prodName').value || '상품';
  const baseSku = document.getElementById('prodSku').value || 'SKU';
  const basePurchasePrice = parseInt(document.getElementById('prodPurchasePrice').value) || 0;
  const baseSellingPrice = parseInt(document.getElementById('prodSellingPrice').value) || 0;

  // 조합 계산 (Cartesian Product)
  const combinations = cartesianProduct(selectedOptionGroups.map(g => g.values));

  list.innerHTML = combinations.map((combo, idx) => {
    const variantName = combo.map(v => v.value).join(' / ');
    const variantSku = `${baseSku}-${idx + 1}`;
    // 옵션 추가금 합산 (문자열일 경우를 대비해 parseInt 처리)
    const optionPrice = combo.reduce((acc, v) => acc + (parseInt(v.additional_price) || 0), 0);
    const totalSellingPrice = baseSellingPrice + optionPrice;

    return `
      <tr class="variant-item group hover:bg-slate-50 transition-colors" data-options='${JSON.stringify(combo)}'>
        <td class="px-4 py-3 text-center">
          <input type="checkbox" class="v-checkbox form-checkbox h-3 w-3 text-teal-600 rounded" checked onchange="checkSelectAllStatus()">
        </td>
        <td class="px-4 py-3 text-sm font-medium text-slate-700">${variantName}</td>
        <td class="px-4 py-3">
          <input type="text" class="v-sku w-full border-b border-dashed border-slate-200 focus:border-teal-500 focus:border-solid outline-none text-xs py-1 transition-all" value="${variantSku}">
        </td>
        <td class="px-4 py-3">
          <input type="number" class="v-purchase-price w-full border-b border-dashed border-slate-200 focus:border-teal-500 focus:border-solid outline-none text-right text-xs py-1 transition-all" value="${basePurchasePrice}">
        </td>
        <td class="px-4 py-3">
          <input type="number" class="v-price w-full border-b border-dashed border-slate-200 focus:border-teal-500 focus:border-solid outline-none text-right text-xs py-1 transition-all" value="${totalSellingPrice}">
        </td>
        <td class="px-4 py-3">
          <input type="number" class="v-stock w-full border-b border-dashed border-slate-200 focus:border-teal-500 focus:border-solid outline-none text-right text-xs py-1 transition-all" value="0">
        </td>
        <td class="px-4 py-3 text-center">
          <button type="button" onclick="this.closest('tr').remove(); checkSelectAllStatus();" class="text-slate-300 hover:text-red-500 transition-colors">
            <i class="fas fa-trash-alt text-xs"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  container.classList.remove('hidden');
  const selectAll = document.getElementById('selectAllVariants');
  if (selectAll) selectAll.checked = true;

  // 기본 정보 탭으로 전환하여 생성된 결과 확인 유도
  switchProductTab('basic');
  showToast('세부품목 목록이 생성되었습니다.');
}

function toggleAllVariants(checked) {
  const checkboxes = document.querySelectorAll('.v-checkbox');
  checkboxes.forEach(cb => cb.checked = checked);
}

function checkSelectAllStatus() {
  const checkboxes = document.querySelectorAll('.v-checkbox');
  const selectAll = document.getElementById('selectAllVariants');
  if (!selectAll) return;

  if (checkboxes.length === 0) {
    selectAll.checked = false;
    return;
  }

  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  selectAll.checked = allChecked;
}

function cartesianProduct(arrays) {
  return arrays.reduce((acc, current) => {
    const res = [];
    acc.forEach(a => {
      current.forEach(b => {
        res.push([...a, b]);
      });
    });
    return res;
  }, [[]]);
}

function getCreatedVariantsData() {
  const items = document.querySelectorAll('.variant-item');
  const selectedItems = Array.from(items).filter(item => {
    const cb = item.querySelector('.v-checkbox');
    return cb && cb.checked;
  });

  const baseName = document.getElementById('prodName').value;

  if (selectedItems.length === 0 && document.querySelector('input[name="product_type"]:checked').value === 'master') {
    // 상품 등록 시 체크된 항목이 하나도 없는 경우에 대한 처리가 필요할 수 있음
  }

  return selectedItems.map(item => {
    const combo = JSON.parse(item.getAttribute('data-options'));
    return {
      sku: item.querySelector('.v-sku').value,
      name: `${baseName} (${combo.map(v => v.value).join('/')})`,
      purchase_price: parseFloat(item.querySelector('.v-purchase-price').value) || 0,
      selling_price: parseFloat(item.querySelector('.v-price').value) || 0,
      current_stock: parseInt(item.querySelector('.v-stock').value) || 0,
      options: combo.map(v => ({
        group_id: v.group_id,
        value_id: v.id
      }))
    };
  });
}

async function openOptionGroupModal() {
  const name = prompt('옵션 그룹명 (예: 색상, 사이즈)');
  if (!name) return;
  const valuesStr = prompt('옵션 값들을 쉼표로 구분하여 입력 (예: Red, Blue, White)');
  if (!valuesStr) return;

  const values = valuesStr.split(',').map(v => v.trim());

  try {
    const res = await axios.post(`${API_BASE} /product-options/groups`, { name, values });
    if (res.data.success) {
      showToast('옵션 그룹이 저장되었습니다.');
      // 새로 만든 그룹 바로 추가
      loadAndRenderOptionTemplates();
    }
  } catch (err) {
    console.error(err);
    alert('저장 실패');
  }
}

// Global Exports
window.loadProducts = loadProducts;
window.toggleProductFilters = toggleProductFilters;
window.renderProductsPagination = renderProductsPagination;
window.changeProductsPage = changeProductsPage;
window.filterProductsList = filterProductsList;
window.downloadProducts = downloadProducts;
window.injectProductModal = injectProductModal;
window.showProductModal = showProductModal;
window.closeProductModal = closeProductModal;
window.editProduct = editProduct;
window.submitProduct = submitProduct;
window.deleteProductAction = deleteProductAction;
window.switchProductTab = switchProductTab;
window.toggleSkuInput = toggleSkuInput;
window.generateAutoSku = generateAutoSku;
window.handleImageUpload = handleImageUpload;
window.updateImagePreview = updateImagePreview;
window.removeImage = removeImage;
window.loadAndRenderOptionTemplates = loadAndRenderOptionTemplates;
window.addOptionGroupToSelection = addOptionGroupToSelection;
window.removeOptionGroup = removeOptionGroup;
window.generateVariants = generateVariants;
window.toggleAllVariants = toggleAllVariants;
window.checkSelectAllStatus = checkSelectAllStatus;
window.openOptionGroupModal = openOptionGroupModal;

// --- 세트 구성(Bundle) 관리 기능 ---

async function searchBundleItems(query) {
  const resultsContainer = document.getElementById('bundleSearchResults');

  // 1글자 검색은 제한하되, 빈 값(초기 로딩)은 허용하여 최근 상품을 보여줌
  if (query && query.length > 0 && query.length < 2) {
    resultsContainer.classList.add('hidden');
    return;
  }

  try {
    const params = { limit: 20 };
    if (query) params.search = query;

    const res = await axios.get(`${API_BASE}/products`, { params });
    const products = res.data.data;

    if (products.length === 0) {
      resultsContainer.innerHTML = '<div class="p-4 text-slate-400 text-sm">검색 결과가 없습니다.</div>';
    } else {
      resultsContainer.innerHTML = products.map(p => `
        <div class="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0" onclick="addBundleItem(${JSON.stringify(p).replace(/"/g, '&quot;')})">
          <div class="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-400">
            ${p.image_url ? `<img src="${p.image_url}" class="w-full h-full object-cover rounded">` : '<i class="fas fa-box"></i>'}
          </div>
          <div class="flex-1">
            <div class="text-xs font-bold text-slate-700">${p.name}</div>
            <div class="text-[10px] text-slate-500">${p.sku} | ${formatCurrency(p.selling_price)}</div>
          </div>
          <i class="fas fa-plus text-teal-600 text-xs"></i>
        </div>
      `).join('');
    }
    resultsContainer.classList.remove('hidden');
  } catch (err) {
    console.error(err);
  }
}

function renderExistingBundleItems(items) {
  console.log('Rendering existing bundle items:', items);

  const container = document.getElementById('bundleItemsContainer');
  if (!container) {
    console.error('bundleItemsContainer not found!');
    return;
  }

  // Clear existing items
  document.querySelectorAll('.bundle-card').forEach(el => el.remove());
  document.querySelectorAll('.bundle-separator').forEach(el => el.remove());

  const addButton = document.getElementById('btnAddBundleItem');
  if (!addButton) {
    console.error('btnAddBundleItem not found inside container!');
    return;
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    console.log('No bundle items to render or items is empty');
    updateBundleTotal();
    return;
  }

  items.forEach(item => {
    // item from DB: component_product_id, name, purchase_price, selling_price, image_url, quantity
    const product = {
      id: item.component_product_id,
      name: item.name,
      purchase_price: item.purchase_price,
      selling_price: item.selling_price,
      image_url: item.image_url
    };
    const quantity = item.quantity;

    const cardHtml = `
      <div class="bundle-card relative group flex flex-col w-32 h-32 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden" data-id="${product.id}" data-price="${product.purchase_price}" data-selling="${product.selling_price}">
        <button type="button" onclick="removeBundleItem(this)" class="absolute top-1 right-1 w-5 h-5 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors z-10">
          <i class="fas fa-times text-[10px]"></i>
        </button>
        
        <div class="h-16 bg-slate-100 flex items-center justify-center overflow-hidden">
          ${product.image_url ? `<img src="${product.image_url}" class="w-full h-full object-cover">` : '<i class="fas fa-box text-slate-300 text-2xl"></i>'}
        </div>
        
        <div class="p-2 flex flex-col flex-1 justify-between">
          <div class="text-[10px] font-bold text-slate-700 truncate" title="${product.name}">${product.name}</div>
          <div class="flex items-center justify-between">
            <input type="number" class="b-qty w-10 border-b border-slate-200 focus:border-teal-500 outline-none text-center text-xs p-0" value="${quantity}" min="1" onchange="updateBundleTotal()">
            <span class="text-[9px] text-slate-400 b-price-total">${formatCurrency(product.purchase_price * quantity)}</span>
          </div>
        </div>
      </div>
      <div class="bundle-separator text-slate-300 font-bold text-lg"><i class="fas fa-plus"></i></div>
    `;

    addButton.insertAdjacentHTML('beforebegin', cardHtml);
  });

  updateBundleTotal();
}

function addBundleItem(product) {
  const container = document.getElementById('bundleItemsContainer');
  const addButton = document.getElementById('btnAddBundleItem');
  const resultsContainer = document.getElementById('bundleSearchResults');

  // 이미 존재하는지 확인
  if (document.querySelector(`.bundle-card[data-id="${product.id}"]`)) {
    showToast('이미 추가된 상품입니다.', 'warning');
    return;
  }

  const cardHtml = `
    <div class="bundle-card relative group flex flex-col w-32 h-32 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden" data-id="${product.id}" data-price="${product.purchase_price}" data-selling="${product.selling_price}">
      <button type="button" onclick="removeBundleItem(this)" class="absolute top-1 right-1 w-5 h-5 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors z-10">
        <i class="fas fa-times text-[10px]"></i>
      </button>
      
      <div class="h-16 bg-slate-100 flex items-center justify-center overflow-hidden">
        ${product.image_url ? `<img src="${product.image_url}" class="w-full h-full object-cover">` : '<i class="fas fa-box text-slate-300 text-2xl"></i>'}
      </div>
      
      <div class="p-2 flex flex-col flex-1 justify-between">
        <div class="text-[10px] font-bold text-slate-700 truncate">${product.name}</div>
        <div class="flex items-center justify-between">
          <input type="number" class="b-qty w-10 border-b border-slate-200 focus:border-teal-500 outline-none text-center text-xs p-0" value="1" min="1" onchange="updateBundleTotal()">
          <span class="text-[9px] text-slate-400 b-price-total">${formatCurrency(product.purchase_price)}</span>
        </div>
      </div>
    </div>
    
    <div class="bundle-separator text-slate-300 font-bold text-lg"><i class="fas fa-plus"></i></div>
  `;

  // Insert before the add button
  addButton.insertAdjacentHTML('beforebegin', cardHtml);

  resultsContainer.classList.add('hidden');
  document.getElementById('bundleItemSearch').value = '';

  updateBundleTotal();
}

function removeBundleItem(btn) {
  const card = btn.closest('.bundle-card');
  const separator = card.nextElementSibling; // The plus icon

  if (separator && separator.classList.contains('bundle-separator')) {
    separator.remove();
  } else {
    // If it's the last item (before add button), the separator might be before it?
    // Actually our logic adds Separator AFTER the card.
    // Wait, "Item + Item + Add". 
    // If we add "Card" then "Separator", the sequence is Card, Sep, Button.
    // So removing Card should remove the separator effectively.
  }

  card.remove();
  updateBundleTotal();
}

function updateBundleTotal() {
  const cards = document.querySelectorAll('.bundle-card');
  let totalPurchase = 0;
  let totalSelling = 0;

  cards.forEach(card => {
    const qty = parseInt(card.querySelector('.b-qty').value) || 0;
    const price = parseFloat(card.getAttribute('data-price')) || 0;
    const selling = parseFloat(card.getAttribute('data-selling')) || 0;

    totalPurchase += (qty * price);
    totalSelling += (qty * selling);

    card.querySelector('.b-price-total').textContent = formatCurrency(qty * price);
  });

  // Re-arrange separators
  document.querySelectorAll('.bundle-separator').forEach(el => el.remove());

  const container = document.getElementById('bundleItemsContainer');
  const addButton = document.getElementById('btnAddBundleItem');
  const currentCards = Array.from(document.querySelectorAll('.bundle-card'));

  if (currentCards.length > 0) {
    currentCards.forEach((card, idx) => {
      const sep = document.createElement('div');
      sep.className = 'bundle-separator text-slate-300 font-bold text-lg';
      sep.innerHTML = '<i class="fas fa-plus"></i>';
      card.after(sep);
    });
  }

  // Update Display Fields
  const purchaseDisplay = document.getElementById('bundlePurchaseTotalDisplay');
  const sellingDisplay = document.getElementById('bundleSellingTotalDisplay');
  if (purchaseDisplay) purchaseDisplay.textContent = formatCurrency(totalPurchase);
  if (sellingDisplay) sellingDisplay.textContent = formatCurrency(totalSelling);

  // Update Summary Table in Basic Info
  const summaryList = document.getElementById('bundleSummaryList');
  const summaryPurchaseTotal = document.getElementById('bundleSummaryPurchaseTotal');
  const summarySellingTotal = document.getElementById('bundleSummarySellingTotal');

  if (summaryList) {
    if (cards.length === 0) {
      summaryList.innerHTML = '<tr><td colspan="4" class="px-4 py-4 text-center text-xs text-slate-400">구성된 상품이 없습니다.</td></tr>';
    } else {
      summaryList.innerHTML = '';
      cards.forEach(card => {
        const name = card.querySelector('.text-slate-700').textContent.trim();
        const qty = parseInt(card.querySelector('.b-qty').value) || 0;
        const price = parseFloat(card.getAttribute('data-price')) || 0;
        const selling = parseFloat(card.getAttribute('data-selling')) || 0;

        summaryList.insertAdjacentHTML('beforeend', `
              <tr>
                <td class="px-4 py-2 text-left text-xs text-slate-700">${name}</td>
                <td class="px-4 py-2 text-center text-xs text-slate-600">${qty}</td>
                <td class="px-4 py-2 text-right text-xs text-slate-600">${formatCurrency(price * qty)}</td>
                <td class="px-4 py-2 text-right text-xs text-slate-600">${formatCurrency(selling * qty)}</td>
              </tr>
            `);
      });
    }
  }
  if (summaryPurchaseTotal) summaryPurchaseTotal.textContent = formatCurrency(totalPurchase);
  if (summarySellingTotal) summarySellingTotal.textContent = formatCurrency(totalSelling);

  // Auto-fill inputs if empty or zero (providing defaults)
  const purchaseInput = document.getElementById('prodPurchasePrice');
  const sellingInput = document.getElementById('prodSellingPrice');

  if (purchaseInput && (purchaseInput.value == '0' || purchaseInput.value == '')) {
    purchaseInput.value = totalPurchase;
  }
  if (sellingInput && (sellingInput.value == '0' || sellingInput.value == '')) {
    sellingInput.value = totalSelling;
  }
}

function getBundleItemsData() {
  const cards = document.querySelectorAll('.bundle-card');
  return Array.from(cards).map(card => {
    return {
      product_id: parseInt(card.getAttribute('data-id')),
      quantity: parseInt(card.querySelector('.b-qty').value) || 1
    };
  });
}



window.searchBundleItems = searchBundleItems;
window.addBundleItem = addBundleItem;
window.updateBundleTotal = updateBundleTotal;

async function deleteOptionTemplate(id, event) {
  if (event) event.stopPropagation();
  if (!confirm('해당 옵션 템플릿을 영구적으로 삭제하시겠습니까?')) return;

  try {
    await axios.delete(`${API_BASE}/product-options/groups/${id}`);
    showToast('템플릿이 삭제되었습니다.');
    // 현재 열려있는 템플릿 목록 갱신
    loadAndRenderOptionTemplates();
  } catch (err) {
    console.error(err);
    alert('삭제 실패: ' + (err.response?.data?.error || err.message));
  }
}

window.deleteOptionTemplate = deleteOptionTemplate;
window.toggleProductType = toggleProductType;

// 기존 변체 목록 렌더링 (수정 시)
function renderExistingVariants(variants) {
  console.log('--- renderExistingVariants called ---', variants);
  const container = document.getElementById('variantsContainer');
  const list = document.getElementById('variantsList');

  if (!variants || variants.length === 0) {
    console.warn('No variants provided to renderExistingVariants');
    return;
  }

  list.innerHTML = variants.map(v => {
    const options = v.options || [];
    const optionsData = options.map(opt => ({
      id: opt.value_id,
      value: opt.value_name,
      additional_price: 0,
      group_id: opt.group_id
    }));
    const variantName = options.length > 0 ? options.map(o => o.value_name).join(' / ') : v.name;
    const optionsJson = JSON.stringify(optionsData).replace(/"/g, '&quot;');

    return `
      <tr class="variant-item group hover:bg-slate-50 transition-colors" data-options="${optionsJson}">
        <td class="px-4 py-3 text-center">
          <input type="checkbox" class="v-checkbox form-checkbox h-3 w-3 text-teal-600 rounded" checked onchange="checkSelectAllStatus()">
        </td>
        <td class="px-4 py-3 text-sm font-medium text-slate-700">${variantName}</td>
        <td class="px-4 py-3">
          <input type="text" class="v-sku w-full border-b border-dashed border-slate-200 focus:border-teal-500 focus:border-solid outline-none text-xs py-1 transition-all" value="${v.sku}">
        </td>
        <td class="px-4 py-3">
          <input type="number" class="v-purchase-price w-full border-b border-dashed border-slate-200 focus:border-teal-500 focus:border-solid outline-none text-right text-xs py-1 transition-all" value="${v.purchase_price}">
        </td>
        <td class="px-4 py-3">
          <input type="number" class="v-price w-full border-b border-dashed border-slate-200 focus:border-teal-500 focus:border-solid outline-none text-right text-xs py-1 transition-all" value="${v.selling_price}">
        </td>
        <td class="px-4 py-3">
          <input type="number" class="v-stock w-full border-b border-dashed border-slate-200 focus:border-teal-500 focus:border-solid outline-none text-right text-xs py-1 transition-all" value="${v.current_stock}">
        </td>
        <td class="px-4 py-3 text-center">
          <button type="button" onclick="this.closest('tr').remove(); checkSelectAllStatus();" class="text-slate-300 hover:text-red-500 transition-colors">
            <i class="fas fa-trash-alt text-xs"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  container.classList.remove('hidden');
  container.style.display = 'block'; // 강제 노출
  checkSelectAllStatus();
}

// Ensure unique function and export
window.renderExistingVariants = renderExistingVariants;
window.renderExistingBundleItems = renderExistingBundleItems;
window.getBundleItemsData = getBundleItemsData;

// --- 가격 정책 관리 로직 ---

async function loadSpecialPrices(productId) {
  try {
    const res = await axios.get(`${API_BASE}/prices/product/${productId}`);
    const { grade_prices, customer_prices } = res.data.data;

    // 등급 가격 채우기
    ['VIP', '도매', '대리점'].forEach(grade => {
      const input = document.getElementById(`gradePrice_${grade}`);
      if (input) {
        const match = grade_prices.find(gp => gp.grade === grade);
        input.value = match ? match.price : '';
      }
    });

    // 고객 가격 리스트 렌더링
    renderCustomerPrices(customer_prices);
  } catch (e) {
    console.error('Failed to load special prices', e);
  }
}

function renderCustomerPrices(prices) {
  const list = document.getElementById('customerPriceList');
  if (!list) return;

  if (!prices || prices.length === 0) {
    list.innerHTML = '<tr><td colspan="3" class="px-4 py-10 text-center text-slate-400 text-xs text-slate-400">등록된 고객 전용 단가가 없습니다.</td></tr>';
    return;
  }

  list.innerHTML = prices.map(cp => `
    <tr class="hover:bg-slate-50 transition-colors">
      <td class="px-4 py-3">
        <div class="text-sm font-bold text-slate-700">${cp.customer_name}</div>
        <div class="text-[10px] text-slate-400 font-mono">${cp.customer_phone}</div>
      </td>
      <td class="px-4 py-3">
        <div class="flex items-center gap-2">
          <input type="number" id="custPriceVal_${cp.id}" value="${cp.price}" class="w-32 border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-teal-500">
          <span class="text-xs text-slate-400">원</span>
          <button type="button" onclick="updateCustomerPrice(${cp.id}, ${cp.customer_id})" class="ml-2 text-[10px] text-slate-600 border border-slate-200 px-2 py-1 rounded hover:bg-slate-50">수정</button>
        </div>
      </td>
      <td class="px-4 py-3 text-center">
        <button type="button" onclick="deleteCustomerPrice(${cp.id})" class="text-rose-500 hover:text-rose-700 p-2">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

async function saveGradePrice(grade) {
  if (!window.editingProductId) {
    alert('상품을 먼저 등록하거나 수정을 위해 열어주세요.');
    return;
  }

  const price = document.getElementById(`gradePrice_${grade}`).value;
  if (!price) {
    if (!confirm(`${grade} 등급 가격을 비우시겠습니까? (삭제와 동일)`)) return;
  }

  try {
    await axios.post(`${API_BASE}/prices/grade`, {
      product_id: window.editingProductId,
      grade: grade,
      price: parseFloat(price) || 0
    });
    showToast(`${grade} 등급 가격이 저장되었습니다.`, 'success');
  } catch (e) {
    alert('가격 저장 실패');
  }
}

async function searchCustomerForPrice(query) {
  const resultsBox = document.getElementById('custPriceSearchResults');
  if (!query || query.length < 2) {
    resultsBox.classList.add('hidden');
    return;
  }

  try {
    const res = await axios.get(`${API_BASE}/customers`, { params: { search: query, limit: 10 } });
    const customers = res.data.data;

    if (customers.length === 0) {
      resultsBox.innerHTML = '<div class="p-3 text-xs text-slate-400">검색 결과가 없습니다.</div>';
    } else {
      resultsBox.innerHTML = customers.map(c => `
        <div class="p-2 hover:bg-teal-50 cursor-pointer border-b border-slate-50 flex flex-col" onclick="addCustomerPrice(${c.id}, '${c.name.replace(/'/g, "\\'")}')">
          <span class="text-xs font-bold text-slate-700">${c.name}</span>
          <span class="text-[10px] text-slate-400 font-mono">${c.phone}</span>
        </div>
      `).join('');
    }
    resultsBox.classList.remove('hidden');
  } catch (e) {
    console.error(e);
  }
}

async function addCustomerPrice(customerId, name) {
  document.getElementById('custPriceSearchResults').classList.add('hidden');
  document.getElementById('custPriceSearch').value = '';

  if (!window.editingProductId) {
    alert('상품을 먼저 등록해 주세요.');
    return;
  }

  const price = prompt(`${name} 고객 전용 판매가를 입력해 주세요.`);
  if (!price) return;

  try {
    await axios.post(`${API_BASE}/prices/customer`, {
      product_id: window.editingProductId,
      customer_id: customerId,
      price: parseFloat(price)
    });
    loadSpecialPrices(window.editingProductId);
    showToast('고객별 전용 단가가 추가되었습니다.', 'success');
  } catch (e) {
    alert('저장 실패: ' + (e.response?.data?.error || e.message));
  }
}

async function updateCustomerPrice(id, customerId) {
  const price = document.getElementById(`custPriceVal_${id}`).value;
  try {
    await axios.post(`${API_BASE}/prices/customer`, {
      product_id: window.editingProductId,
      customer_id: customerId,
      price: parseFloat(price)
    });
    showToast('수정되었습니다.', 'success');
  } catch (e) {
    alert('저장 실패');
  }
}

async function deleteCustomerPrice(id) {
  if (!confirm('정말 이 고객 전용 단가를 삭제하시겠습니까?')) return;
  try {
    await axios.delete(`${API_BASE}/prices/customer/${id}`);
    loadSpecialPrices(window.editingProductId);
    showToast('삭제되었습니다.');
  } catch (e) {
    alert('삭제 실패');
  }
}

window.saveGradePrice = saveGradePrice;
window.searchCustomerForPrice = searchCustomerForPrice;
window.addCustomerPrice = addCustomerPrice;
window.updateCustomerPrice = updateCustomerPrice;
window.deleteCustomerPrice = deleteCustomerPrice;
