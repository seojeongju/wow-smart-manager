/**
 * 대시보드 ERP / MES 탭
 * window.loadDashboard, window.switchDashboardTab
 */

function dashEsc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function dashFetch(url, fallback) {
  return axios.get(url).catch((e) => {
    console.error(`Failed to fetch ${url}`, e);
    return { data: { data: fallback } };
  });
}

async function loadDashboard(content, initialTab = 'erp') {
  const tab = initialTab === 'mes' ? 'mes' : 'erp';
  const headerHtml =
    typeof window.renderPageHeader === 'function'
      ? window.renderPageHeader({
          title: '대시보드',
          subtitle: 'ERP 매출·재고와 MES 제조 성과를 한곳에서',
          icon: 'fa-tachometer-alt',
          accent: tab === 'mes' ? 'orange' : 'teal'
        })
      : `<div class="mb-6">
          <h1 class="text-2xl font-bold text-slate-800">
            <i class="fas fa-tachometer-alt mr-2 text-teal-600"></i>대시보드
          </h1>
          <p class="text-sm text-slate-500 mt-1">ERP 매출·재고와 MES 제조 성과를 한곳에서</p>
        </div>`;

  content.innerHTML = `
    <div class="flex flex-col h-full">
      ${headerHtml}
      <div class="flex mb-6 border-b border-slate-200 overflow-x-auto">
        <button type="button" id="dash-tab-erp" onclick="switchDashboardTab('erp')"
          class="px-6 py-4 font-medium text-slate-500 border-b-2 border-transparent transition-colors flex items-center whitespace-nowrap">
          <i class="fas fa-chart-pie mr-2"></i>ERP
        </button>
        <button type="button" id="dash-tab-mes" onclick="switchDashboardTab('mes')"
          class="px-6 py-4 font-medium text-slate-500 border-b-2 border-transparent transition-colors flex items-center whitespace-nowrap">
          <i class="fas fa-industry mr-2"></i>MES 성과지표
        </button>
      </div>
      <div id="dashTabPanel"></div>
    </div>
  `;

  await switchDashboardTab(tab, { skipHistory: true });
}

async function switchDashboardTab(tab, opts = {}) {
  const resolved = tab === 'mes' ? 'mes' : 'erp';
  const erpBtn = document.getElementById('dash-tab-erp');
  const mesBtn = document.getElementById('dash-tab-mes');

  const inactive = 'px-6 py-4 font-medium text-slate-500 border-b-2 border-transparent transition-colors flex items-center whitespace-nowrap';
  const erpActive = 'px-6 py-4 font-bold text-teal-600 border-b-2 border-teal-600 transition-colors flex items-center whitespace-nowrap';
  const mesActive = 'px-6 py-4 font-bold text-orange-600 border-b-2 border-orange-600 transition-colors flex items-center whitespace-nowrap';

  if (erpBtn) erpBtn.className = resolved === 'erp' ? erpActive : inactive;
  if (mesBtn) mesBtn.className = resolved === 'mes' ? mesActive : inactive;

  if (typeof updatePageTitle === 'function') {
    if (resolved === 'mes') {
      updatePageTitle('대시보드 · MES', '제조 성과지표 · OEE · 작업지시');
    } else {
      updatePageTitle('대시보드 · ERP', '매출 · 재고 · 오늘의 업무');
    }
  }

  if (typeof window.setHelpContext === 'function') {
    window.setHelpContext(resolved === 'mes' ? 'dashboard:mes' : 'dashboard');
  }

  if (!opts.skipHistory && typeof window.syncSidebarNav === 'function') {
    window.syncSidebarNav('dashboard', resolved);
  }

  const panel = document.getElementById('dashTabPanel');
  if (!panel) return;

  if (resolved === 'mes') {
    await fillDashboardMesTab(panel);
  } else {
    await fillDashboardErpTab(panel);
  }
}

async function fillDashboardErpTab(panel) {
  panel.innerHTML = `
    <div class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
    </div>
  `;

  try {
    const [
      summaryRes,
      salesChartRes,
      categoryStatsRes,
      lowStockRes,
      productsRes,
      salesRes,
      inventoryRes,
      actionRes,
      profitRes,
      kpiRes
    ] = await Promise.all([
      dashFetch(`${API_BASE}/dashboard/summary`, {}),
      dashFetch(`${API_BASE}/dashboard/sales-chart?days=30`, []),
      dashFetch(`${API_BASE}/dashboard/category-stats`, []),
      dashFetch(`${API_BASE}/dashboard/low-stock-alerts?limit=5&offset=0`, []),
      dashFetch(`${API_BASE}/products?limit=5&offset=0`, []),
      dashFetch(`${API_BASE}/sales?limit=5&offset=0`, []),
      dashFetch(`${API_BASE}/dashboard/inventory-health?days=30`, []),
      dashFetch(`${API_BASE}/dashboard/action-items`, {
        pending_shipment: 0,
        shipping: 0,
        claims: 0,
        low_stock: 0
      }),
      dashFetch(`${API_BASE}/dashboard/profit-chart?days=30`, []),
      dashFetch(`${API_BASE}/dashboard-kpi/kpi-comparison`, {})
    ]);

    void summaryRes;
    const chartData = salesChartRes.data.data || [];
    const categoryStats = categoryStatsRes.data.data || [];
    const lowStockAlerts = lowStockRes.data.data || [];
    const products = productsRes.data.data || [];
    const sales = salesRes.data.data || [];
    const deadStocks = inventoryRes.data.data || [];
    const actionItems = actionRes.data.data || {
      pending_shipment: 0,
      shipping: 0,
      claims: 0,
      low_stock: 0
    };
    const profitData = profitRes.data.data || [];
    const kpiData = kpiRes.data.data || {};

    panel.innerHTML = `
      <!-- KPI 대시보드 (오늘 vs 어제 비교) -->
      <div class="mb-6">
        <div class="mb-4 flex items-center gap-2">
          <h2 class="text-xl font-bold text-slate-800">핵심 성과 지표</h2>
          <span class="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">KPI Dashboard</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-5">
            <div class="flex items-center justify-between mb-2">
              <p class="text-blue-700 text-xs font-semibold uppercase tracking-wide">오늘 매출</p>
              <div class="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center">
                <i class="fas fa-won-sign text-blue-600 text-sm"></i>
              </div>
            </div>
            <p class="text-2xl font-bold text-blue-900 mb-1">${formatCurrency(kpiData.today_revenue || 0)}</p>
            <div class="flex items-center gap-1 text-xs">
              <span class="text-blue-600">vs 어제</span>
              ${
                kpiData.revenue_change >= 0
                  ? `<span class="text-emerald-600 font-bold flex items-center gap-1">
                    <i class="fas fa-arrow-up text-[10px]"></i>
                    ${Math.abs(kpiData.revenue_change || 0).toFixed(1)}%
                   </span>`
                  : `<span class="text-rose-600 font-bold flex items-center gap-1">
                    <i class="fas fa-arrow-down text-[10px]"></i>
                    ${Math.abs(kpiData.revenue_change || 0).toFixed(1)}%
                   </span>`
              }
            </div>
          </div>

          <div class="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-sm border border-emerald-200 p-5">
            <div class="flex items-center justify-between mb-2">
              <p class="text-emerald-700 text-xs font-semibold uppercase tracking-wide">주문 건수</p>
              <div class="w-8 h-8 bg-emerald-200 rounded-lg flex items-center justify-center">
                <i class="fas fa-shopping-bag text-emerald-600 text-sm"></i>
              </div>
            </div>
            <p class="text-2xl font-bold text-emerald-900 mb-1">${kpiData.today_order_count || 0}건</p>
            <div class="flex items-center gap-1 text-xs">
              <span class="text-emerald-600">vs 어제</span>
              ${
                kpiData.order_count_change >= 0
                  ? `<span class="text-emerald-600 font-bold flex items-center gap-1">
                    <i class="fas fa-arrow-up text-[10px]"></i>
                    ${Math.abs(kpiData.order_count_change || 0).toFixed(1)}%
                   </span>`
                  : `<span class="text-rose-600 font-bold flex items-center gap-1">
                    <i class="fas fa-arrow-down text-[10px]"></i>
                    ${Math.abs(kpiData.order_count_change || 0).toFixed(1)}%
                   </span>`
              }
            </div>
          </div>

          <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200 p-5">
            <div class="flex items-center justify-between mb-2">
              <p class="text-purple-700 text-xs font-semibold uppercase tracking-wide">평균 주문액</p>
              <div class="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center">
                <i class="fas fa-chart-line text-purple-600 text-sm"></i>
              </div>
            </div>
            <p class="text-2xl font-bold text-purple-900 mb-1">${formatCurrency(kpiData.today_avg_order || 0)}</p>
            <div class="flex items-center gap-1 text-xs">
              <span class="text-purple-600">vs 어제</span>
              ${
                kpiData.avg_order_change >= 0
                  ? `<span class="text-emerald-600 font-bold flex items-center gap-1">
                    <i class="fas fa-arrow-up text-[10px]"></i>
                    ${Math.abs(kpiData.avg_order_change || 0).toFixed(1)}%
                   </span>`
                  : `<span class="text-rose-600 font-bold flex items-center gap-1">
                    <i class="fas fa-arrow-down text-[10px]"></i>
                    ${Math.abs(kpiData.avg_order_change || 0).toFixed(1)}%
                   </span>`
              }
            </div>
          </div>

          <div class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl shadow-sm border border-amber-200 p-5">
            <div class="flex items-center justify-between mb-2">
              <p class="text-amber-700 text-xs font-semibold uppercase tracking-wide">재고 회전율</p>
              <div class="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center">
                <i class="fas fa-sync text-amber-600 text-sm"></i>
              </div>
            </div>
            <p class="text-2xl font-bold text-amber-900 mb-1">${kpiData.turnover_days || 0}일</p>
            <p class="text-xs text-amber-600">평균 재고 소진 일수</p>
          </div>

          <div class="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl shadow-sm border border-rose-200 p-5">
            <div class="flex items-center justify-between mb-2">
              <p class="text-rose-700 text-xs font-semibold uppercase tracking-wide">목표 달성률</p>
              <div class="w-8 h-8 bg-rose-200 rounded-lg flex items-center justify-center">
                <i class="fas fa-bullseye text-rose-600 text-sm"></i>
              </div>
            </div>
            <p class="text-2xl font-bold text-rose-900 mb-1">${(kpiData.target_achievement || 0).toFixed(1)}%</p>
            <div class="w-full bg-rose-200 rounded-full h-2 mt-2">
              <div class="bg-rose-500 h-2 rounded-full transition-all duration-500" style="width: ${Math.min(kpiData.target_achievement || 0, 100)}%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Board (오늘의 업무) -->
      <div class="mb-4 flex items-center gap-2">
        <h2 class="text-xl font-bold text-slate-800">오늘의 업무</h2>
        <span class="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">Action Board</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group" onclick="loadPage('outbound')">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-slate-500 text-sm font-medium group-hover:text-teal-600 transition-colors">출고 대기</p>
              <p class="text-3xl font-bold text-slate-800 mt-2">${actionItems.pending_shipment}</p>
              <p class="text-xs text-slate-400 mt-1">건의 주문 처리 필요</p>
            </div>
            <div class="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 text-xl group-hover:scale-110 transition-transform">
              <i class="fas fa-box-open"></i>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group" onclick="loadPage('sales')">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-slate-500 text-sm font-medium group-hover:text-blue-600 transition-colors">배송 중</p>
              <p class="text-3xl font-bold text-slate-800 mt-2">${actionItems.shipping}</p>
              <p class="text-xs text-slate-400 mt-1">건이 배송되고 있습니다</p>
            </div>
            <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 text-xl group-hover:scale-110 transition-transform">
              <i class="fas fa-truck"></i>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 cursor-pointer hover:shadow-md hover:border-amber-200 transition-all group" onclick="loadPage('sales')">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-slate-500 text-sm font-medium group-hover:text-amber-600 transition-colors">반품/교환 요청</p>
              <p class="text-3xl font-bold text-slate-800 mt-2">${actionItems.claims}</p>
              <p class="text-xs text-slate-400 mt-1">건의 클레임 확인</p>
            </div>
            <div class="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 text-xl group-hover:scale-110 transition-transform">
              <i class="fas fa-undo"></i>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 cursor-pointer hover:shadow-md hover:border-rose-200 transition-all group" onclick="loadPage('stock')">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-slate-500 text-sm font-medium group-hover:text-rose-600 transition-colors">재고 부족</p>
              <p class="text-3xl font-bold text-slate-800 mt-2">${actionItems.low_stock}</p>
              <p class="text-xs text-slate-400 mt-1">건의 상품 발주 필요</p>
            </div>
            <div class="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 text-xl group-hover:scale-110 transition-transform">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- 차트 영역 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-bold text-slate-800 flex items-center">
              <i class="fas fa-chart-line text-indigo-500 mr-2"></i>매출 및 순익 분석
            </h2>
            <div class="flex gap-2">
              <div class="bg-slate-100 p-1 rounded-lg flex text-xs font-bold">
                <button onclick="updateChartPeriod('daily')" id="btn-period-daily" class="px-3 py-1 rounded-md bg-white shadow-sm text-indigo-600 transition-all">일별</button>
                <button onclick="updateChartPeriod('monthly')" id="btn-period-monthly" class="px-3 py-1 rounded-md text-slate-500 hover:text-slate-700 transition-all">월별</button>
              </div>
            </div>
          </div>
          <div class="h-72">
            <canvas id="salesChart"></canvas>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div class="flex items-center mb-6">
            <h2 class="text-lg font-bold text-slate-800 flex items-center">
              <i class="fas fa-chart-pie text-emerald-500 mr-2"></i>카테고리별 판매 비중
            </h2>
          </div>
          <div class="h-72">
            <canvas id="categoryChart"></canvas>
          </div>
        </div>
      </div>

      <!-- 하단 정보 그리드 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full">
          <div class="flex items-center mb-4">
            <div class="bg-teal-100 rounded-lg p-2 mr-3">
              <i class="fas fa-box text-teal-600"></i>
            </div>
            <h2 class="text-xl font-bold text-gray-800">최근 상품 목록</h2>
          </div>
          <div id="dashProductList" class="space-y-3 flex-1 mb-4"></div>
          <div class="flex justify-center items-center gap-4 mt-auto pt-3 border-t border-slate-100">
            <button onclick="loadDashboardProducts(Math.max(0, window.dashProdPage - 1))" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"><i class="fas fa-chevron-left"></i></button>
            <span id="dashProdPageDisplay" class="text-sm text-slate-500 font-medium">1 페이지</span>
            <button onclick="loadDashboardProducts(window.dashProdPage + 1)" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"><i class="fas fa-chevron-right"></i></button>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full">
          <div class="flex items-center mb-4">
            <div class="bg-emerald-100 rounded-lg p-2 mr-3">
              <i class="fas fa-shopping-cart text-emerald-600"></i>
            </div>
            <h2 class="text-xl font-bold text-gray-800">최근 판매 현황</h2>
          </div>
          <div id="dashSaleList" class="space-y-3 flex-1 mb-4"></div>
          <div class="flex justify-center items-center gap-4 mt-auto pt-3 border-t border-slate-100">
            <button onclick="loadDashboardSales(Math.max(0, window.dashSalePage - 1))" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"><i class="fas fa-chevron-left"></i></button>
            <span id="dashSalePageDisplay" class="text-sm text-slate-500 font-medium">1 페이지</span>
            <button onclick="loadDashboardSales(window.dashSalePage + 1)" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"><i class="fas fa-chevron-right"></i></button>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full">
          <div class="flex items-center mb-4">
            <div class="bg-red-100 rounded-lg p-2 mr-3">
              <i class="fas fa-exclamation-triangle text-red-600"></i>
            </div>
            <h2 class="text-xl font-bold text-gray-800">재고 부족 알림</h2>
          </div>
          <div id="dashLowStockList" class="space-y-3 flex-1 mb-4 overflow-y-auto max-h-60"></div>
          <div class="flex justify-center items-center gap-4 mt-auto pt-3 border-t border-slate-100">
            <button onclick="loadDashboardLowStock(Math.max(0, window.dashLowStockPage - 1))" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"><i class="fas fa-chevron-left"></i></button>
            <span id="dashLowStockPageDisplay" class="text-sm text-slate-500 font-medium">1 페이지</span>
            <button onclick="loadDashboardLowStock(window.dashLowStockPage + 1)" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"><i class="fas fa-chevron-right"></i></button>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full">
          <div class="flex items-center mb-4">
            <div class="bg-slate-100 rounded-lg p-2 mr-3">
              <i class="fas fa-box-open text-slate-600"></i>
            </div>
            <h2 class="text-xl font-bold text-gray-800">장기 미판매 재고</h2>
          </div>
          <div id="dashDeadStockList" class="space-y-3 flex-1 mb-4 overflow-y-auto max-h-60"></div>
        </div>
      </div>
    `;

    if (typeof renderCharts === 'function') {
      renderCharts(chartData, categoryStats, profitData);
    }

    window.dashProdPage = 0;
    window.dashSalePage = 0;
    window.dashLowStockPage = 0;

    if (typeof renderDashboardProducts === 'function') renderDashboardProducts(products);
    if (typeof renderDashboardSales === 'function') renderDashboardSales(sales);
    if (typeof renderDashboardLowStock === 'function') renderDashboardLowStock(lowStockAlerts);
    if (typeof renderDashboardDeadStock === 'function') renderDashboardDeadStock(deadStocks);
  } catch (error) {
    console.error('ERP 대시보드 로드 실패:', error);
    panel.innerHTML = `
      <div class="text-center py-16 text-rose-600">
        <i class="fas fa-exclamation-circle text-3xl mb-3"></i>
        <p>ERP 대시보드를 불러오는데 실패했습니다.</p>
      </div>
    `;
  }
}

function mesDashKpiCard(title, value, sub, valueClass = 'text-slate-800') {
  return `<div class="bg-white border border-slate-200 rounded-xl p-4">
    <div class="text-xs text-slate-500 mb-1">${title}</div>
    <div class="text-2xl font-bold ${valueClass}">${value}</div>
    <div class="text-xs text-slate-400 mt-1">${sub}</div>
  </div>`;
}

async function fillDashboardMesTab(panel) {
  panel.innerHTML = `
    <div class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
    </div>
  `;

  try {
    const [kpiRes, oeeRes, opsRes, byProductRes, trendRes] = await Promise.all([
      dashFetch(`${API_BASE}/production/kpi/summary`, {}),
      dashFetch(`${API_BASE}/production/ops/oee?days=7`, { summary: {}, equipment: [] }),
      dashFetch(`${API_BASE}/production/ops/stats`, {}),
      dashFetch(`${API_BASE}/production/kpi/by-product`, { items: [] }),
      dashFetch(`${API_BASE}/production/kpi/trend`, { production: [] })
    ]);

    const s = kpiRes.data.data || {};
    const oeePayload = oeeRes.data.data || {};
    const oeeSummary = oeePayload.summary || {};
    const oeeEquipment = Array.isArray(oeePayload.equipment) ? oeePayload.equipment : [];
    const ops = opsRes.data.data || {};
    const products = Array.isArray(byProductRes.data.data?.items)
      ? byProductRes.data.data.items
      : Array.isArray(byProductRes.data.data)
        ? byProductRes.data.data
        : [];
    const trendRows = Array.isArray(trendRes.data.data?.production)
      ? trendRes.data.data.production
      : Array.isArray(trendRes.data.data)
        ? trendRes.data.data
        : [];

    const topOee = [...oeeEquipment]
      .sort((a, b) => (Number(b.oee) || 0) - (Number(a.oee) || 0))
      .slice(0, 8);
    const topProducts = products.slice(0, 8);

    const running = ops.running_count ?? oeeSummary.status?.running ?? 0;
    const breakdown = ops.breakdown_count ?? oeeSummary.status?.breakdown ?? 0;
    const equipmentCount = ops.equipment_count ?? oeeSummary.status?.total ?? oeeEquipment.length;
    const openOs = ops.open_os ?? 0;
    const wipCount = ops.wip_count ?? ops.open_wo ?? s.open_wo ?? 0;
    const receivedToday = ops.received_today ?? 0;

    panel.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 class="text-lg font-bold text-slate-800">MES 성과지표</h2>
          <p class="text-xs text-slate-500 mt-0.5">오늘 양품 · 계획달성 · 수율 · 납기 · OEE · 진행 WO</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" onclick="loadPage('production','kpi')" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-orange-50 hover:border-orange-300 text-slate-700">
            <i class="fas fa-chart-bar mr-1 text-orange-600"></i>생산 KPI
          </button>
          <button type="button" onclick="loadPage('mes-oee')" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-orange-50 hover:border-orange-300 text-slate-700">
            <i class="fas fa-tachometer-alt mr-1 text-orange-600"></i>OEE
          </button>
          <button type="button" onclick="loadPage('production','shopfloor')" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-orange-50 hover:border-orange-300 text-slate-700">
            <i class="fas fa-hard-hat mr-1 text-orange-600"></i>현장 실행
          </button>
          <button type="button" onclick="loadPage('mes-equipment')" class="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-orange-50 hover:border-orange-300 text-slate-700">
            <i class="fas fa-cogs mr-1 text-orange-600"></i>설비 상태
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        ${mesDashKpiCard('오늘 양품', s.today_good_qty ?? 0, `불량 ${s.today_scrap_qty ?? 0}`, 'text-emerald-700')}
        ${mesDashKpiCard('계획 달성률', `${s.plan_achievement_rate ?? 0}%`, `${s.completed_qty ?? 0}/${s.planned_qty ?? 0}`, 'text-orange-700')}
        ${mesDashKpiCard('수율', `${s.yield_rate ?? 0}%`, `양품 ${s.record_good_qty ?? 0}`, 'text-emerald-700')}
        ${mesDashKpiCard('납기 준수율', `${s.on_time_rate ?? 0}%`, `완료 WO ${s.completed_wo ?? 0}`, 'text-blue-700')}
        ${mesDashKpiCard('평균 OEE', `${oeeSummary.avg_oee ?? 0}%`, `최근 7일`, 'text-teal-700')}
        ${mesDashKpiCard('진행중 WO', s.in_progress_wo ?? 0, `미완료 ${s.open_wo ?? 0}`, 'text-amber-700')}
      </div>

      <div class="mb-4 flex items-center gap-2">
        <h3 class="text-base font-bold text-slate-800">운영 현황</h3>
        <span class="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">Ops</span>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <div class="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-orange-300 transition-colors" onclick="loadPage('mes-equipment')">
          <div class="text-xs text-slate-500">가동 설비</div>
          <div class="text-xl font-bold text-emerald-700 mt-1">${running}</div>
          <div class="text-xs text-slate-400 mt-1">전체 ${equipmentCount}</div>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-orange-300 transition-colors" onclick="loadPage('mes-equipment')">
          <div class="text-xs text-slate-500">고장 설비</div>
          <div class="text-xl font-bold text-rose-600 mt-1">${breakdown}</div>
          <div class="text-xs text-slate-400 mt-1">즉시 대응 필요</div>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-orange-300 transition-colors" onclick="loadPage('mes-oee')">
          <div class="text-xs text-slate-500">가동률 A</div>
          <div class="text-xl font-bold text-teal-700 mt-1">${oeeSummary.avg_availability ?? 0}%</div>
          <div class="text-xs text-slate-400 mt-1">성능 P ${oeeSummary.avg_performance ?? 0}%</div>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-orange-300 transition-colors" onclick="loadPage('production','shopfloor')">
          <div class="text-xs text-slate-500">WIP / 미완료</div>
          <div class="text-xl font-bold text-amber-700 mt-1">${wipCount}</div>
          <div class="text-xs text-slate-400 mt-1">현장 확인</div>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-orange-300 transition-colors" onclick="loadPage('production','materials')">
          <div class="text-xs text-slate-500">외주 진행</div>
          <div class="text-xl font-bold text-slate-800 mt-1">${openOs}</div>
          <div class="text-xs text-slate-400 mt-1">오늘 입고 ${receivedToday}</div>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-orange-300 transition-colors" onclick="loadPage('production','kpi')">
          <div class="text-xs text-slate-500">불량률</div>
          <div class="text-xl font-bold text-rose-600 mt-1">${s.scrap_rate ?? 0}%</div>
          <div class="text-xs text-slate-400 mt-1">불량 ${s.record_scrap_qty ?? 0}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div class="bg-white border border-slate-200 rounded-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-sm text-slate-800">
              <i class="fas fa-chart-bar text-orange-500 mr-2"></i>일별 생산 추이
            </h3>
            <button type="button" onclick="loadPage('production','kpi')" class="text-xs text-orange-600 font-semibold hover:underline">상세</button>
          </div>
          <div class="h-64">
            <canvas id="mesDashTrendChart"></canvas>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div class="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
            <span class="font-bold text-sm text-slate-800">설비 OEE Top 8</span>
            <button type="button" onclick="loadPage('mes-oee')" class="text-xs text-orange-600 font-semibold hover:underline">OEE 전체</button>
          </div>
          <div class="overflow-x-auto max-h-72">
            <table class="w-full text-sm">
              <thead class="text-xs bg-white sticky top-0 border-b">
                <tr>
                  <th class="px-3 py-2 text-left">설비</th>
                  <th class="px-3 py-2 text-right">OEE</th>
                  <th class="px-3 py-2 text-right">A%</th>
                  <th class="px-3 py-2 text-right">Q%</th>
                </tr>
              </thead>
              <tbody>
                ${
                  topOee.length
                    ? topOee
                        .map(
                          (r) => `
                  <tr class="border-t hover:bg-slate-50">
                    <td class="px-3 py-2">
                      <div class="font-semibold text-slate-800">${dashEsc(r.name)}</div>
                      <div class="text-xs text-slate-400">${dashEsc(r.process_name || r.code || '')}</div>
                    </td>
                    <td class="px-3 py-2 text-right font-bold ${Number(r.oee) >= 85 ? 'text-teal-700' : Number(r.oee) >= 60 ? 'text-amber-700' : 'text-rose-600'}">${r.oee ?? 0}%</td>
                    <td class="px-3 py-2 text-right">${r.availability ?? 0}%</td>
                    <td class="px-3 py-2 text-right">${r.quality ?? 0}%</td>
                  </tr>`
                        )
                        .join('')
                    : '<tr><td colspan="4" class="px-3 py-10 text-center text-slate-400">설비 데이터 없음</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
        <div class="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
          <span class="font-bold text-sm text-slate-800">제품별 실적 Top 8</span>
          <button type="button" onclick="loadPage('production','kpi')" class="text-xs text-orange-600 font-semibold hover:underline">KPI 상세</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-xs bg-white border-b">
              <tr>
                <th class="px-3 py-2 text-left">제품</th>
                <th class="px-3 py-2 text-right">계획</th>
                <th class="px-3 py-2 text-right">양품</th>
                <th class="px-3 py-2 text-right">달성%</th>
                <th class="px-3 py-2 text-right">수율%</th>
              </tr>
            </thead>
            <tbody>
              ${
                topProducts.length
                  ? topProducts
                      .map(
                        (p) => `
                <tr class="border-t hover:bg-slate-50">
                  <td class="px-3 py-2">
                    <div class="font-semibold text-slate-800">${dashEsc(p.product_name)}</div>
                    <div class="text-xs text-slate-400">${dashEsc(p.product_sku || '')}</div>
                  </td>
                  <td class="px-3 py-2 text-right">${p.planned_qty ?? 0}</td>
                  <td class="px-3 py-2 text-right">${p.completed_qty ?? 0}</td>
                  <td class="px-3 py-2 text-right">${p.plan_achievement_rate ?? 0}</td>
                  <td class="px-3 py-2 text-right">${p.yield_rate ?? 0}</td>
                </tr>`
                      )
                      .join('')
                  : '<tr><td colspan="5" class="px-3 py-10 text-center text-slate-400">제품별 실적 없음</td></tr>'
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    renderMesDashboardTrend(trendRows);
  } catch (error) {
    console.error('MES 대시보드 로드 실패:', error);
    panel.innerHTML = `
      <div class="text-center py-16 text-rose-600">
        <i class="fas fa-exclamation-circle text-3xl mb-3"></i>
        <p>MES 성과지표를 불러오는데 실패했습니다.</p>
      </div>
    `;
  }
}

function renderMesDashboardTrend(rows) {
  const canvas = document.getElementById('mesDashTrendChart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (window.mesDashTrendChartInstance) {
    window.mesDashTrendChartInstance.destroy();
    window.mesDashTrendChartInstance = null;
  }

  const list = Array.isArray(rows) ? rows : [];
  window.mesDashTrendChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: list.map((r) => r.date || ''),
      datasets: [
        {
          label: '양품',
          data: list.map((r) => Number(r.good_qty) || 0),
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          stack: 'prod'
        },
        {
          label: '불량',
          data: list.map((r) => Number(r.scrap_qty) || 0),
          backgroundColor: 'rgba(244, 63, 94, 0.85)',
          stack: 'prod'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
      },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, beginAtZero: true, grid: { borderDash: [2, 4] } }
      }
    }
  });
}

window.loadDashboard = loadDashboard;
window.switchDashboardTab = switchDashboardTab;
window.fillDashboardErpTab = fillDashboardErpTab;
window.fillDashboardMesTab = fillDashboardMesTab;
window.renderMesDashboardTrend = renderMesDashboardTrend;
