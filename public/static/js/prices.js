// 가격 정책 관리 JS (기준 단가 가독성 개선 버전)

let cpSelectedItems = [];

async function loadPricingPolicy(content) {
  content.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-slate-800">
        <i class="fas fa-hand-holding-usd mr-2 text-teal-600"></i>가격 정책 관리
      </h1>
      <div class="flex gap-2">
         <button onclick="showPricingHelp()" class="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-colors flex items-center">
          <i class="fas fa-question-circle mr-2"></i>운영 가이드
        </button>
      </div>
    </div>
    
    <div id="pricingSearchArea" class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 flex flex-wrap gap-4 items-center">
      <div class="relative flex-1 min-w-[300px]">
        <i class="fas fa-search absolute left-3 top-3 text-slate-400"></i>
        <input type="text" id="pricingProdSearch" placeholder="상품명 또는 SKU 검색..." class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" onkeyup="if(event.key === 'Enter') renderPricingGradeTab()">
      </div>
      <button onclick="renderPricingGradeTab()" class="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors font-bold">검색</button>
    </div>

    <!-- 탭 네비게이션 -->
    <div class="flex border-b border-slate-200 mb-6 bg-white rounded-t-xl px-4 pt-2 shadow-sm">
      <button id="tab-grade-prices" class="px-6 py-4 font-bold text-teal-600 border-b-2 border-teal-600 transition-colors flex items-center" onclick="switchPricingTab('grade')">
        <i class="fas fa-layer-group mr-2"></i>등급별 가격 설정
      </button>
      <button id="tab-customer-prices" class="px-6 py-4 font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center" onclick="switchPricingTab('customer')">
        <i class="fas fa-user-tag mr-2"></i>고객별 전용 단가 관리
      </button>
    </div>

    <!-- 탭 컨텐츠 -->
    <div id="pricingTabContent" class="space-y-6"></div>

    <!-- 전용 단가 등록/수정 모달 -->
    <div id="customerPriceModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm hidden flex items-center justify-center z-[100]">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh] border border-slate-100">
        <div class="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 id="cpModalTitle" class="text-xl font-bold text-slate-800">계약 단가 설정</h3>
          <button onclick="closeCustomerPriceModal()" class="text-slate-400 hover:text-slate-600"><i class="fas fa-times"></i></button>
        </div>
        
        <div class="p-6 overflow-y-auto space-y-6">
          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label class="block text-xs font-bold text-slate-500 uppercase mb-2">① 대상 고객</label>
            <div class="relative" id="cpCustomerSearchWrapper">
              <input type="text" id="cpSearchCustomer" placeholder="이름 또는 연락처로 검색..." class="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" onkeyup="searchCPCustomer(this.value)">
              <div id="cpCustomerResults" class="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 hidden max-h-40 overflow-y-auto"></div>
            </div>
            <div id="cpSelectedCustomer" class="hidden p-3 bg-white border border-teal-500 rounded-lg shadow-sm flex justify-between items-center">
               <div class="flex items-center">
                 <div class="w-10 h-10 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mr-3"><i class="fas fa-user"></i></div>
                 <div><span id="cpSelectedCustomerLabel" class="font-bold text-slate-800 block"></span><span id="cpCustomerStatus" class="text-[10px] text-teal-600 font-medium tracking-tight">계약 품목 추가 가능</span></div>
               </div>
               <button id="btnChangeCustomer" onclick="clearCPCustomer()" class="text-slate-400 hover:text-rose-500"><i class="fas fa-sync-alt mr-1 text-xs"></i>변경</button>
            </div>
            <input type="hidden" id="cpCustomerId">
          </div>

          <div class="bg-indigo-50/30 rounded-xl border border-indigo-100 p-4 space-y-4">
             <div class="flex flex-col md:flex-row gap-4">
                <div class="flex-1 relative">
                  <label class="block text-[10px] font-bold text-indigo-400 uppercase mb-1">상품 검색</label>
                  <input type="text" id="cpSearchProduct" placeholder="상품명 또는 SKU 입력..." class="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" onkeyup="searchCPProduct(this.value)">
                  <div id="cpProductResults" class="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 hidden max-h-40 overflow-y-auto"></div>
                </div>
                <div class="w-full md:w-32">
                   <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">현재 판매가</label>
                   <div id="cpCurrentSellingPrice" class="h-9 flex items-center px-3 bg-slate-100 rounded-lg text-xs font-bold text-slate-500 border border-slate-200">-</div>
                </div>
                <div class="w-full md:w-40">
                  <label class="block text-[10px] font-bold text-indigo-400 uppercase mb-1">지정 계약 단가</label>
                  <div class="flex items-center gap-2">
                    <input type="number" id="cpInputPrice" placeholder="금액" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-600">
                    <button onclick="addItemToCPList()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap">추가</button>
                  </div>
                </div>
             </div>
          </div>

          <div class="space-y-2">
            <h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest flex justify-between px-1"><span>상품별 계약 목록</span><span id="cpListCount" class="text-teal-600 font-mono">0</span></h4>
            <div id="cpSelectedItemsList" class="min-h-[180px] border border-slate-100 rounded-xl p-3 space-y-2 bg-slate-50/30 overflow-y-auto"></div>
          </div>
        </div>

        <div class="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white rounded-b-2xl">
          <button onclick="closeCustomerPriceModal()" class="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">닫기</button>
          <button id="btnSubmitCP" onclick="submitCustomerPriceBulk()" class="bg-teal-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-teal-700 shadow-xl shadow-teal-100 transition-all flex items-center gap-2"><i class="fas fa-check-circle"></i> 설정 저장하기</button>
        </div>
      </div>
    </div>
  `;

  renderPricingGradeTab();
}

// [Update] 모달 내 리스트 가독성 개선
function renderCPItemsList() {
  const container = document.getElementById('cpSelectedItemsList');
  const count = document.getElementById('cpListCount');
  count.textContent = cpSelectedItems.length;

  if (cpSelectedItems.length === 0) {
    container.innerHTML = `<div class="flex flex-col items-center justify-center py-10 text-slate-300"><i class="fas fa-folder-open text-2xl mb-2 opacity-20"></i><p class="text-[11px]">추가된 계약 상품이 없습니다.</p></div>`;
    return;
  }

  container.innerHTML = cpSelectedItems.map((item, index) => `
    <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group">
      <div class="flex items-center">
        <div class="p-2 bg-slate-50 text-slate-400 rounded-lg mr-3"><i class="fas fa-cube text-xs"></i></div>
        <div class="flex flex-col">
          <span class="text-xs font-bold text-slate-800">${item.name}</span>
          <div class="flex items-center gap-2 mt-0.5">
             <span class="text-[11px] text-slate-400 font-medium">기준가: ${formatCurrency(item.basePrice || 0)}</span>
             <span class="text-[11px] ${item.isExisting ? 'text-teal-600' : 'text-indigo-600'} font-bold">계약: ${formatCurrency(item.price)}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center border border-slate-100 rounded-lg p-1 bg-slate-50 group-hover:bg-white group-hover:border-teal-100 transition-colors">
           <input type="number" value="${item.price}" class="w-20 bg-transparent text-right text-xs font-bold text-teal-600 outline-none" onchange="updateCPItemPrice(${index}, this.value)">
           <span class="text-[10px] text-slate-400 ml-1 mr-1">원</span>
        </div>
        <button onclick="removeCPItem(${index})" class="text-slate-300 hover:text-rose-500 transition-colors"><i class="fas fa-trash-alt text-sm"></i></button>
      </div>
    </div>
  `).join('');
}

// [Update] 고객 관리 리스트 기준 단가 가독성 개선
async function renderPricingCustomerTab() {
  const area = document.getElementById('pricingSearchArea'); if (area) area.classList.add('hidden');
  const container = document.getElementById('pricingTabContent');
  container.innerHTML = `<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>`;
  try {
    const res = await axios.get(`${API_BASE}/prices/all`);
    const groups = {}; res.data.data.customer_prices.forEach(cp => { if (!groups[cp.customer_id]) groups[cp.customer_id] = { name: cp.customer_name, phone: cp.customer_phone, items: [] }; groups[cp.customer_id].items.push(cp); });
    if (Object.keys(groups).length === 0) { container.innerHTML = `<div class="bg-white p-20 rounded-xl border border-slate-200 text-center"><p class="text-slate-400">등록된 계약 단가가 없습니다.</p><button onclick="openCustomerPriceModal()" class="mt-4 bg-teal-600 text-white px-6 py-2 rounded-xl font-bold text-sm">신규 계약 등록</button></div>`; return; }

    container.innerHTML = `
      <div class="flex justify-between items-center mb-4"><span class="text-sm font-medium text-slate-500">총 ${Object.keys(groups).length}명의 계약 고객</span><button onclick="openCustomerPriceModal()" class="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md"><i class="fas fa-plus mr-1"></i>계약 등록</button></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${Object.entries(groups).map(([cid, group]) => `
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:border-teal-300 transition-colors flex flex-col h-full">
            <div class="p-5 border-b border-slate-50 bg-slate-50/30 flex justify-between items-start">
              <div><div class="font-bold text-slate-800 text-lg">${group.name}</div><div class="text-[11px] text-slate-400 font-mono tracking-tighter">${group.phone || '-'}</div></div>
              <button onclick="editCustomerContract(${cid}, '${group.name}')" class="text-teal-600 bg-white border border-teal-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-teal-50">계약 관리</button>
            </div>
            <div class="p-4 space-y-2 flex-1 max-h-80 overflow-y-auto">
              ${group.items.map(item => `
                <div class="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100 group">
                  <div class="flex flex-col">
                    <span class="text-xs font-bold text-slate-700 leading-tight">${item.product_name}</span>
                    <span class="text-[9px] text-slate-400 font-mono mt-0.5">${item.product_sku}</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="text-right">
                       <!-- [Improved] 가독성 강화된 기준 단가 -->
                       <div class="text-[12px] text-slate-400 line-through font-medium leading-none mb-1">${formatCurrency(item.base_price)}</div>
                       <div class="text-base font-bold text-teal-600 leading-none">${formatCurrency(item.price)}</div>
                    </div>
                    <button onclick="deleteCustomerPrice(${item.id})" class="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><i class="fas fa-times-circle"></i></button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>`;
  } catch (e) { console.error(e); }
}

// --- 공통 로직 유지 ---
function selectCPProduct(id, name, sellingPrice) {
  document.getElementById('tempSelectedProdId').value = id;
  document.getElementById('tempSelectedProdName').value = name;
  document.getElementById('tempSelectedProdBasePrice').value = sellingPrice;
  document.getElementById('cpSearchProduct').value = name;
  const pDisp = document.getElementById('cpCurrentSellingPrice');
  if (pDisp) { pDisp.textContent = formatCurrency(sellingPrice); pDisp.classList.remove('text-slate-500', 'bg-slate-100'); pDisp.classList.add('text-slate-700', 'bg-white'); }
  document.getElementById('cpProductResults').classList.add('hidden');
  document.getElementById('cpInputPrice').value = sellingPrice;
  document.getElementById('cpInputPrice').focus(); document.getElementById('cpInputPrice').select();
}
async function searchCPProduct(q) { const rd = document.getElementById('cpProductResults'); if (!q) { rd.classList.add('hidden'); return; } const r = await axios.get(`${API_BASE}/products`, { params: { search: q, limit: 5 } }); rd.innerHTML = r.data.data.map(p => `<div class="p-3 hover:bg-indigo-50 cursor-pointer border-b" onclick="selectCPProduct(${p.id}, '${p.name}', ${p.selling_price})"><div class="text-sm font-bold text-slate-800">${p.name}</div><div class="text-[10px] text-slate-400">SKU: ${p.sku} | 현재가: ${formatCurrency(p.selling_price)}</div></div>`).join(''); rd.classList.remove('hidden'); }
function addItemToCPList() { const id = document.getElementById('tempSelectedProdId')?.value; const n = document.getElementById('tempSelectedProdName')?.value; const bp = document.getElementById('tempSelectedProdBasePrice')?.value; const p = document.getElementById('cpInputPrice').value; if (!id || !p) return showToast('상품/가격 입력', 'warning'); if (cpSelectedItems.find(i => i.id === parseInt(id))) return showToast('이미 추가됨', 'warning'); cpSelectedItems.push({ id: parseInt(id), name: n, price: parseFloat(p), basePrice: parseFloat(bp), isExisting: false }); renderCPItemsList(); document.getElementById('cpSearchProduct').value = ''; document.getElementById('cpInputPrice').value = ''; document.getElementById('cpCurrentSellingPrice').textContent = '-'; }
async function editCustomerContract(cid, name) { openCustomerPriceModal(); document.getElementById('cpModalTitle').textContent = '고객별 계약 상품 관리'; document.getElementById('cpCustomerId').value = cid; document.getElementById('cpSelectedCustomerLabel').textContent = name; document.getElementById('cpSelectedCustomer').classList.remove('hidden'); document.getElementById('cpCustomerSearchWrapper').classList.add('hidden'); document.getElementById('btnChangeCustomer').classList.add('hidden'); try { const res = await axios.get(`${API_BASE}/prices/all`); const existing = res.data.data.customer_prices.filter(cp => cp.customer_id === parseInt(cid)); cpSelectedItems = existing.map(item => ({ id: item.product_id, name: item.product_name, price: item.price, basePrice: item.base_price, isExisting: true })); renderCPItemsList(); } catch (e) { showToast('로드 실패', 'error'); } }
function openCustomerPriceModal() { document.getElementById('customerPriceModal').classList.remove('hidden'); cpSelectedItems = []; renderCPItemsList(); clearCPCustomer(); if (document.getElementById('cpCurrentSellingPrice')) document.getElementById('cpCurrentSellingPrice').textContent = '-'; if (!document.getElementById('tempSelectedProdId')) { const h1 = document.createElement('input'); h1.id = 'tempSelectedProdId'; h1.type = 'hidden'; const h2 = document.createElement('input'); h2.id = 'tempSelectedProdName'; h2.type = 'hidden'; const h3 = document.createElement('input'); h3.id = 'tempSelectedProdBasePrice'; h3.type = 'hidden'; document.body.appendChild(h1); document.body.appendChild(h2); document.body.appendChild(h3); } }
function closeCustomerPriceModal() { document.getElementById('customerPriceModal').classList.add('hidden'); }
async function searchCPCustomer(q) { const rd = document.getElementById('cpCustomerResults'); if (!q) { rd.classList.add('hidden'); return; } const r = await axios.get(`${API_BASE}/customers`, { params: { search: q, limit: 5 } }); rd.innerHTML = r.data.data.map(c => `<div class="p-3 hover:bg-slate-50 cursor-pointer border-b" onclick="selectCPCustomer(${c.id}, '${c.name} (${c.phone})')"><div class="text-sm font-bold text-slate-800">${c.name}</div><div class="text-[10px] text-slate-400">${c.phone}</div></div>`).join(''); rd.classList.remove('hidden'); }
function selectCPCustomer(id, lab) { document.getElementById('cpCustomerId').value = id; document.getElementById('cpSelectedCustomerLabel').textContent = lab; document.getElementById('cpSelectedCustomer').classList.remove('hidden'); document.getElementById('cpCustomerSearchWrapper').classList.add('hidden'); document.getElementById('cpCustomerResults').classList.add('hidden'); }
function clearCPCustomer() { document.getElementById('cpCustomerId').value = ''; document.getElementById('cpSearchCustomer').value = ''; document.getElementById('cpCustomerSearchWrapper').classList.remove('hidden'); document.getElementById('cpSelectedCustomer').classList.add('hidden'); }
function updateCPItemPrice(i, p) { cpSelectedItems[i].price = parseFloat(p) || 0; }
function removeCPItem(i) { cpSelectedItems.splice(i, 1); renderCPItemsList(); }
async function submitCustomerPriceBulk() { const cid = document.getElementById('cpCustomerId').value; if (!cid) return showToast('고객 선택', 'error'); const b = document.getElementById('btnSubmitCP'); const oh = b.innerHTML; b.disabled = true; b.innerHTML = '저장 중...'; try { const ps = cpSelectedItems.map(it => axios.post(`${API_BASE}/prices/customer`, { product_id: it.id, customer_id: parseInt(cid), price: it.price })); await Promise.all(ps); showToast('저장됨'); closeCustomerPriceModal(); renderPricingCustomerTab(); } catch (e) { showToast('오류', 'error'); } finally { b.disabled = false; b.innerHTML = oh; } }
async function renderPricingGradeTab() { const area = document.getElementById('pricingSearchArea'); if (area) area.classList.remove('hidden'); const container = document.getElementById('pricingTabContent'); const q = document.getElementById('pricingProdSearch')?.value || ''; container.innerHTML = `<div class="flex justify-center py-10"><div class="animate-spin h-8 w-8 border-b-2 border-teal-600"></div></div>`; try { const [pRes, prRes] = await Promise.all([axios.get(`${API_BASE}/products`, { params: { search: q, limit: 100 } }), axios.get(`${API_BASE}/prices/all`)]); const priceMap = {}; prRes.data.data.grade_prices.forEach(gp => { if (!priceMap[gp.product_id]) priceMap[gp.product_id] = {}; priceMap[gp.product_id][gp.grade] = gp.price; }); container.innerHTML = `<div class="bg-white rounded-2xl border shadow-sm overflow-hidden"><table class="min-w-full"><thead class="bg-slate-50"><tr><th class="px-6 py-4 text-left text-xs font-bold text-slate-500">상품 정보</th><th class="px-6 py-4 text-right text-xs font-bold text-slate-500">기본가</th><th class="px-4 py-4 text-center text-xs font-bold text-indigo-500">VIP</th><th class="px-4 py-4 text-center text-xs font-bold text-amber-600">도매</th><th class="px-4 py-4 text-center text-xs font-bold text-emerald-500">대리점</th></tr></thead><tbody>${pRes.data.data.map(p => `<tr><td class="px-6 py-4 text-sm font-bold">${p.name}<div class="text-[10px] text-slate-400 font-mono">${p.sku}</div></td><td class="px-6 py-4 text-right text-xs text-slate-400">${formatCurrency(p.selling_price)}</td>${['VIP', '도매', '대리점'].map(g => `<td class="px-4 py-4"><input type="number" class="w-24 border border-slate-200 rounded px-2 py-1 text-xs text-center" value="${priceMap[p.id]?.[g] || ''}" onchange="quickSaveGradePrice(${p.id}, '${g}', this.value)"></td>`).join('')}</tr>`).join('')}</tbody></table></div>`; } catch (e) { } }
async function quickSaveGradePrice(pid, grade, price) { try { await axios.post(`${API_BASE}/prices/grade`, { product_id: pid, grade, price: parseFloat(price) || 0 }); showToast('저장 완료'); } catch (e) { } }
async function deleteCustomerPrice(id) { if (!confirm('삭제하시겠습니까?')) return; try { await axios.delete(`${API_BASE}/prices/customer/${id}`); renderPricingCustomerTab(); } catch (e) { } }
function switchPricingTab(tabName) {
  document.querySelectorAll('[id^="tab-"]').forEach(el => {
    el.classList.remove('text-teal-600', 'border-b-2', 'border-teal-600', 'font-bold');
    el.classList.add('text-slate-500', 'font-medium', 'border-transparent');
  });
  document.getElementById(`tab-${tabName}-prices`).classList.add('text-teal-600', 'border-b-2', 'border-teal-600', 'font-bold');
  if (typeof window.setHelpContext === 'function') {
    window.setHelpContext('pricing-policy', tabName);
  }
  if (tabName === 'grade') renderPricingGradeTab();
  else renderPricingCustomerTab();
}
function showPricingHelp() { alert('도움말: 기준 단가를 크게 보강하였습니다. 할인폭을 더 쉽게 확인하세요.'); }

window.loadPricingPolicy = loadPricingPolicy;
window.renderPricingGradeTab = renderPricingGradeTab;
window.switchPricingTab = switchPricingTab;
window.showPricingHelp = showPricingHelp;
window.openCustomerPriceModal = openCustomerPriceModal;
window.closeCustomerPriceModal = closeCustomerPriceModal;
window.searchCPCustomer = searchCPCustomer;
window.selectCPCustomer = selectCPCustomer;
window.clearCPCustomer = clearCPCustomer;
window.searchCPProduct = searchCPProduct;
window.selectCPProduct = selectCPProduct;
window.addItemToCPList = addItemToCPList;
window.removeCPItem = removeCPItem;
window.submitCustomerPriceBulk = submitCustomerPriceBulk;
window.editCustomerContract = editCustomerContract;
window.deleteCustomerPrice = deleteCustomerPrice;
window.updateCPItemPrice = updateCPItemPrice;
window.quickSaveGradePrice = quickSaveGradePrice;
