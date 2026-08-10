
// ìê³ /ë°ì£¼ ê´ë¦¬ íì´ì§ ë¡ë
window.loadPurchasesPage = function (initialTab = 'purchases') {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-slate-800">
        <i class="fas fa-truck-moving mr-2 text-teal-600"></i>ìê³ /ë°ì£¼ ê´ë¦¬
      </h1>
    </div>

    <!-- í­ ë²í¼ -->
    <div class="flex mb-6 border-b border-slate-200">
      <button onclick="switchPurchaseTab('purchases')" id="tab-purchases" class="px-6 py-3 text-sm font-medium border-b-2 border-teal-600 text-teal-600 transition-colors">ë°ì£¼ ê´ë¦¬</button>
      <button onclick="switchPurchaseTab('suppliers')" id="tab-suppliers" class="px-6 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-teal-600 transition-colors">ê³µê¸ì¬ ê´ë¦¬</button>
    </div>

    <!-- í­ ì»¨íì¸  ìì­ -->
    <div id="purchase-tab-content">
      <!-- ëì  ë¡ë -->
    </div>

    <!-- ëª¨ë¬ ìì­ (ëì  ì¶ê°ë¨) -->
    <div id="purchase-modals"></div>
  `;

  // ì´ê¸° í­ ë¡ë
  switchPurchaseTab(initialTab);
}

window.switchPurchaseTab = function (tabName) {
  const purchasesBtn = document.getElementById('tab-purchases');
  const suppliersBtn = document.getElementById('tab-suppliers');

  if (typeof window.setHelpContext === 'function') {
    window.setHelpContext('purchases', tabName);
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
// ê³µê¸ì¬ ê´ë¦¬ (Suppliers)
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
          <i class="fas fa-plus mr-2"></i>ê³µê¸ì¬ ë±ë¡
        </button>
      </div>

      <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
        <table class="w-full text-sm text-left text-slate-500">
          <thead class="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-6 py-3">ê³µê¸ì¬ëª</th>
              <th class="px-6 py-3">ë´ë¹ì</th>
              <th class="px-6 py-3">ì°ë½ì²</th>
              <th class="px-6 py-3">ì´ë©ì¼</th>
              <th class="px-6 py-3 text-right">ê´ë¦¬</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            ${suppliers.length === 0 ? `<tr><td colspan="5" class="px-6 py-8 text-center text-slate-400">ë±ë¡ë ê³µê¸ì¬ê° ììµëë¤.</td></tr>` :
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
    container.innerHTML = '<div class="text-red-500 text-center py-10">ë°ì´í°ë¥¼ ë¶ë¬ì¤ëë° ì¤í¨íìµëë¤.</div>';
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
          <h3 class="text-lg font-bold text-white">${isEdit ? 'ê³µê¸ì¬ ìì ' : 'ê³µê¸ì¬ ë±ë¡'}</h3>
          <button onclick="closeModal('supplierModal'); window.editingSupplierId = null;" class="text-white hover:text-teal-200"><i class="fas fa-times"></i></button>
        </div>
        <form onsubmit="handleCreateSupplier(event)" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">ê³µê¸ì¬ëª <span class="text-red-500">*</span></label>
            <input type="text" name="name" id="sup-name" required class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">ë´ë¹ì</label>
              <input type="text" name="contact_person" id="sup-contact" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">ì°ë½ì²</label>
              <input type="text" name="phone" id="sup-phone" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">ì´ë©ì¼</label>
            <input type="email" name="email" id="sup-email" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none">
          </div>
           <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">ì¬ììë²í¸</label>
            <input type="text" name="business_number" id="sup-biznum" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">ì£¼ì</label>
            <input type="text" name="address" id="sup-address" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 outline-none">
          </div>
          <div class="flex justify-end pt-4">
            <button type="button" onclick="closeModal('supplierModal'); window.editingSupplierId = null;" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg mr-2">ì·¨ì</button>
            <button type="submit" class="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">${isEdit ? 'ìì ' : 'ë±ë¡'}</button>
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
      alert('ê³µê¸ì¬ ì ë³´ë¥¼ ë¶ë¬ì¤ëë° ì¤í¨íìµëë¤.');
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
      alert('ê³µê¸ì¬ ì ë³´ê° ìì ëììµëë¤.');
    } else {
      await axios.post(`${API_BASE}/suppliers`, data);
    }
    closeModal('supplierModal');
    window.editingSupplierId = null; // Reset after successful operation
    loadSuppliersList();
  } catch (err) {
    alert(err.response?.data?.error || (window.editingSupplierId ? 'ìì  ì¤í¨' : 'ë±ë¡ ì¤í¨'));
  }
}

window.deleteSupplier = async function (id) {
  if (!confirm('ì ë§ ì­ì íìê² ìµëê¹?')) return;
  try {
    await axios.delete(`${API_BASE}/suppliers/${id}`);
    loadSuppliersList();
  } catch (err) {
    alert(err.response?.data?.error || 'ì­ì  ì¤í¨');
  }
}

// ----------------------------------------------------
// ë°ì£¼ ê´ë¦¬ (Purchase Orders)
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
           <!-- íí° ìì­ (ì¶êµ¬ êµ¬í) -->
        </div>
        <button onclick="window.editingPoId = null; showCreatePurchaseModal()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
          <i class="fas fa-plus mr-2"></i>ë°ì£¼ì ìì±
        </button>
      </div>

      <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
        <table class="w-full text-sm text-left text-slate-500">
          <thead class="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-6 py-3">ë°ì£¼ë²í¸</th>
              <th class="px-6 py-3">ê³µê¸ì¬</th>
              <th class="px-6 py-3">ìí</th>
              <th class="px-6 py-3">ì´ ê¸ì¡</th>
              <th class="px-6 py-3">ìê³ ìì ì¼</th>
              <th class="px-6 py-3">ìì±ì¼</th>
              <th class="px-6 py-3 text-right">ê´ë¦¬</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            ${orders.length === 0 ? `<tr><td colspan="7" class="px-6 py-8 text-center text-slate-400">ë°ì£¼ ë´ì­ì´ ììµëë¤.</td></tr>` :
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
                    <button onclick="showPurchaseDetailModal(${o.id})" class="text-indigo-600 hover:text-indigo-800 text-xs border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50">ìì¸/ìê³ </button>
                    ${o.status === 'ORDERED' || o.status === 'DRAFT' ? `<button onclick="showEditPurchaseModal(${o.id})" class="text-slate-500 hover:text-slate-700 text-xs border border-slate-200 px-2 py-1 rounded hover:bg-slate-50 ml-1">ìì </button><button onclick="deletePurchaseOrder(${o.id})" class="text-red-500 hover:text-red-700 text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50 ml-1">ì­ì </button>` : ''}
                    ${o.status === 'DRAFT' ? `<button onclick="confirmPurchaseDraft(${o.id}, '${o.code || ''}')" class="text-orange-600 hover:text-orange-800 text-xs border border-orange-200 px-2 py-1 rounded hover:bg-orange-50 ml-1">ë°ì£¼íì </button>` : ''}
                  </td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    container.innerHTML = '<div class="text-red-500 text-center py-10">ë°ì´í°ë¥¼ ë¶ë¬ì¤ëë° ì¤í¨íìµëë¤.</div>';
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
    case 'DRAFT': return 'ì´ì';
    case 'ORDERED': return 'ë°ì£¼ìë£';
    case 'PARTIAL_RECEIVED': return 'ë¶ë¶ìê³ ';
    case 'COMPLETED': return 'ìê³ ìë£';
    case 'CANCELLED': return 'ì·¨ìë¨';
    default: return status;
  }
}

// ë°ì£¼ì ìì± ëª¨ë¬
window.showCreatePurchaseModal = async function () {
  // ê¸°ì¡´ ëª¨ë¬ì´ ìì¼ë©´ ì¦ì ì­ì  (ID ì¤ë³µ ë°©ì§)
  const existing = document.getElementById('createPurchaseModal');
  if (existing) existing.remove();

  // ê³µê¸ì¬ ë° ìí ëª©ë¡ ì¡°í
  try {
    const [suppliersRes, productsRes] = await Promise.all([
      axios.get(`${API_BASE}/suppliers`),
      axios.get(`${API_BASE}/products?limit=1000`) // ëª¨ë  ìí
    ]);
    const suppliers = suppliersRes.data.data;
    const products = productsRes.data.data;

    // ê¸ë¡ë² ë³ìì ì ì¥ (ìí ê²ìì©)
    window.purchaseProducts = products;

    const modalHtml = `
      <div id="createPurchaseModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center animate-fade-in">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
          <div class="bg-indigo-600 px-6 py-4 flex justify-between items-center shrink-0">
            <h3 class="text-lg font-bold text-white" id="po-modal-title">ë°ì£¼ì ìì±</h3>
            <button onclick="closeModal('createPurchaseModal'); window.editingPoId = null;" class="text-white hover:text-indigo-200"><i class="fas fa-times"></i></button>
          </div>
          
          <div class="p-6 overflow-y-auto flex-1">
            <div class="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">ê³µê¸ì¬ <span class="text-red-500">*</span></label>
                <select id="po-supplier" class="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">ê³µê¸ì¬ë¥¼ ì ííì¸ì</option>
                  ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">ìê³  ìì ì¼</label>
                <input type="date" id="po-date" class="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
              </div>
            </div>

            <div class="mb-4">
              <h4 class="font-bold text-slate-700 mb-2 flex justify-between items-center">
                ë°ì£¼ íëª©
                <button onclick="addPoItemRow()" class="text-sm text-indigo-600 hover:text-indigo-800"><i class="fas fa-plus mr-1"></i>íëª© ì¶ê°</button>
              </h4>
              <div class="bg-slate-50 rounded-lg border border-slate-200 p-2">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-slate-500 text-left">
                      <th class="pb-2 pl-2">ìíëª</th>
                      <th class="pb-2 w-24">ìë</th>
                      <th class="pb-2 w-32">ë¨ê°</th>
                      <th class="pb-2 w-32">í©ê³</th>
                      <th class="pb-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody id="po-items-list">
                    <!-- Rows added via JS -->
                  </tbody>
                  <tfoot>
                    <tr class="border-t border-slate-200">
                      <td colspan="3" class="pt-3 text-right font-bold text-slate-700 pr-4">ì´ ë°ì£¼ ê¸ì¡:</td>
                      <td class="pt-3 font-bold text-indigo-600" id="po-total-amount">0ì</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">ë¹ê³ </label>
              <textarea id="po-notes" class="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" rows="2"></textarea>
            </div>
          </div>

          <div class="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end shrink-0">
            <button onclick="closeModal('createPurchaseModal'); window.editingPoId = null;" class="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg mr-2">ì·¨ì</button>
            <button onclick="submitPurchaseOrder()" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm" id="po-submit-btn">ë°ì£¼ì ë°í</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    addPoItemRow(); // Add first row
  } catch (e) {
    console.error(e);
    alert('ë°ì´í° ë¡ë ì¤í¨');
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
        <option value="">ìí ì í</option>
        ${options}
      </select>
    </td>
    <td class="py-1">
      <input type="number" class="w-full border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500" value="1" min="1" onchange="updatePoRow('${rowId}')">
    </td>
    <td class="py-1">
      <input type="number" class="w-full border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500" onchange="updatePoRow('${rowId}')">
    </td>
    <td class="py-1 font-medium text-slate-700 row-total">0ì</td>
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

  // ìí ë³ê²½ ììë§ ê¸°ë³¸ ë¨ê° ì¸í
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

  if (!supplierId) return alert('ê³µê¸ì¬ë¥¼ ì íí´ì£¼ì¸ì.');

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

  if (items.length === 0) return alert('ë°ì£¼í  ìíì ìë ¥í´ì£¼ì¸ì.');

  try {
    if (window.editingPoId) {
      await axios.put(`${API_BASE}/purchases/${window.editingPoId}`, {
        supplier_id: supplierId,
        expected_at: expectedAt,
        notes: notes,
        items: items
      });
      alert('ë°ì£¼ ì ë³´ê° ìì ëììµëë¤.');
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
    alert(err.response?.data?.error || 'ë°ì£¼ ì¤í¨');
  }
}

window.showEditPurchaseModal = async function (id) {
  try {
    window.editingPoId = id;

    // 1. Load Modal (Base)
    await showCreatePurchaseModal();

    // 2. Change Title & Button
    document.getElementById('po-modal-title').textContent = 'ë°ì£¼ì ìì ';
    document.getElementById('po-submit-btn').textContent = 'ìì  ìë£';

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
                <option value="">ìí ì í</option>
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

    // ë§ì½ íëª©ì´ íëë ìë¤ë©´ ë¹ ì¤ íë ì¶ê° (ì¬ì©ì í¸ì)
    if (po.items.length === 0) {
      addPoItemRow();
    }

    updatePoTotal();

  } catch (e) {
    console.error(e);
    alert('ë°ì£¼ ì ë³´ ë¡ë ì¤ë¥: ' + e.message);
    // closeModal('createPurchaseModal'); // Keep modal open for debugging
    window.editingPoId = null;
  }
}

window.deletePurchaseOrder = async function (id) {
  if (!confirm('ì ë§ë¡ ì´ ë°ì£¼ìë¥¼ ì­ì íìê² ìµëê¹?\n\nì­ì ë ë°ì£¼ìë ë³µêµ¬í  ì ììµëë¤.')) return;

  try {
    await axios.delete(`${API_BASE}/purchases/${id}`);
    alert('ë°ì£¼ìê° ì­ì ëììµëë¤.');
    loadPurchasesList();
  } catch (err) {
    alert(err.response?.data?.error || 'ë°ì£¼ì ì­ì ì ì¤í¨íìµëë¤.');
  }
}

// ----------------------------------------------------
// ë°ì£¼ ìì¸ ë° ìê³  ì²ë¦¬
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
               <h3 class="text-lg font-bold text-white">ë°ì£¼ ìì¸ ì ë³´</h3>
            </div>
            <button onclick="closeModal('poDetailModal')" class="text-white hover:text-slate-300"><i class="fas fa-times"></i></button>
          </div>
          
          <div class="p-6 overflow-y-auto flex-1">
            <div class="flex justify-between items-start mb-6 bg-slate-50 p-4 rounded-lg">
              <div>
                <p class="text-sm text-slate-500">ê³µê¸ì¬</p>
                <p class="text-lg font-bold text-slate-800">${po.supplier_name}</p>
                <p class="text-sm text-slate-600">${po.contact_person || '-'} / ${po.phone || '-'}</p>
              </div>
              <div class="text-right">
                <p class="text-sm text-slate-500">ìí</p>
                <span class="px-2 py-1 rounded-full text-xs font-bold ${getStatusClass(po.status)}">${getStatusLabel(po.status)}</span>
                <p class="text-sm text-slate-500 mt-2">ì´ ê¸ì¡</p>
                <p class="text-xl font-bold text-indigo-600">${formatCurrency(po.total_amount)}</p>
              </div>
            </div>

            <h4 class="font-bold text-slate-700 mb-3 ml-1">ë°ì£¼ íëª© ë° ìê³  ì²ë¦¬</h4>
            <div class="border rounded-lg overflow-hidden">
               <table class="w-full text-sm">
                 <thead class="bg-slate-100 text-slate-600 uppercase text-xs">
                   <tr>
                     <th class="px-4 py-2 text-left">ìíëª</th>
                     <th class="px-4 py-2 text-right">ë°ì£¼ìë</th>
                     <th class="px-4 py-2 text-right">ê¸°ìê³ </th>
                     <th class="px-4 py-2 text-right">ìì¬</th>
                     <th class="px-4 py-2 text-right bg-indigo-50 w-32">ê¸í ìê³ </th>
                   </tr>
                 </thead>
                  <tbody class="divide-y divide-slate-100" id="receive-list">
                    ${po.items.length === 0 ? `<tr><td colspan="5" class="px-4 py-8 text-center text-slate-400">ë°ì£¼ íëª©ì´ ììµëë¤.</td></tr>` :
        po.items.map(item => {
          const remaining = item.quantity - item.received_quantity;
          const isDone = remaining <= 0;
          return `
                       <tr class="${isDone ? 'bg-slate-50 text-slate-400' : ''}">
                         <td class="px-4 py-3">
                           <div class="font-medium">${item.product_name || '<span class="text-red-400">(ì­ì ë ìí)</span>'}</div>
                           <div class="text-xs text-slate-400">${item.sku || '-'}</div>
                         </td>
                         <td class="px-4 py-3 text-right">${item.quantity}</td>
                         <td class="px-4 py-3 text-right">${item.received_quantity}</td>
                         <td class="px-4 py-3 text-right font-medium ${isDone ? 'text-green-500' : 'text-orange-500'}">${Math.max(0, remaining)}</td>
                         <td class="px-4 py-3 bg-indigo-50">
                           ${!isDone ? `
                             <input type="number" data-id="${item.id}" max="${remaining}" min="0" value="0" class="w-full border border-indigo-200 rounded px-2 py-1 text-right focus:ring-2 focus:ring-indigo-500 text-indigo-700 font-bold receive-input">
                           ` : '<span class="text-xs text-green-600">ìë£</span>'}
                         </td>
                       </tr>
                     `;
        }).join('')}
                  </tbody>
               </table>
            </div>

            <div class="mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-sm text-yellow-800 flex items-start">
               <i class="fas fa-info-circle mt-0.5 mr-2"></i>
               <p>ìê³  ìëì ìë ¥íê³  'ìê³  ì²ë¦¬' ë²í¼ì ëë¥´ë©´ í´ë¹ ìëë§í¼ ì¬ê³ ê° <strong>ì¦ì ì¦ê°</strong>í©ëë¤.</p>
            </div>
          </div>

          <div class="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between shrink-0">
             <button onclick="closeModal('poDetailModal')" class="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">ë«ê¸°</button>
             ${po.status !== 'COMPLETED' && po.status !== 'CANCELLED' ? `
               <button onclick="submitReceive(${po.id})" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg transform active:scale-95 transition">
                 <i class="fas fa-box-open mr-2"></i>ì í íëª© ìê³  ì²ë¦¬
               </button>
             ` : ''}
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  } catch (e) {
    console.error(e);
    alert('ìì¸ ì ë³´ ë¡ë ì¤í¨');
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
    return alert('ìê³ í  ìëì ìë ¥í´ì£¼ì¸ì.');
  }

  if (!confirm(`${itemsToReceive.length}ê° íëª©ì ëí´ ìê³  ì²ë¦¬ë¥¼ ì§ííìê² ìµëê¹?\nì²ë¦¬ê° ìë£ëë©´ ì¬ê³ ê° ì¦ì ë°ìë©ëë¤.`)) return;

  try {
    const res = await axios.post(`${API_BASE}/purchases/${poId}/receive`, { items: itemsToReceive });
    alert(res.data.message);
    closeModal('poDetailModal');
    loadPurchasesList(); // Refresh list
    // Optionally reopen detail to show updated state
    showPurchaseDetailModal(poId);
  } catch (err) {
    alert(err.response?.data?.error || 'ìê³  ì²ë¦¬ ì¤í¨');
  }
}

window.confirmPurchaseDraft = async function (poId, code) {
  const label = code || poId;
  if (!confirm('ë°ì£¼ ì´ì ' + label + ' ì(ë¥¼) ë°ì£¼ìë£(ORDERED)ë¡ íì í ê¹ì?')) return;
  try {
    await axios.put(API_BASE + '/purchases/' + poId + '/status', { status: 'ORDERED' });
    if (typeof showToast === 'function') showToast('ë°ì£¼ê° íì ëììµëë¤', 'success');
    else alert('ë°ì£¼ê° íì ëììµëë¤');
    if (typeof loadPurchasesList === 'function') loadPurchasesList();
    else if (typeof window.loadPurchasesPage === 'function') window.loadPurchasesPage('purchases');
  } catch (err) {
    const msg = err.response?.data?.error || 'ë°ì£¼ íì  ì¤í¨';
    if (typeof showToast === 'function') showToast(msg, 'error');
    else alert(msg);
  }
};
