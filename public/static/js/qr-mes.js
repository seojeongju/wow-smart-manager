// QR MES 모듈
// QR 코드 기반 제조실행시스템 페이지 렌더링 함수

// ================================================
// QR MES 대시보드
// ================================================
async function renderQRDashboardPage(container) {
  container.innerHTML = `
    <div class="space-y-6">
      <!-- 헤더 카드 -->
      <div class="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-8 text-white">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <i class="fas fa-chart-line text-3xl"></i>
            </div>
            <div>
              <h2 class="text-3xl font-bold">MES 대시보드</h2>
              <p class="text-purple-100 mt-1">실시간 QR 작업 현황 및 통계</p>
            </div>
          </div>
          <button onclick="refreshQRDashboard()" 
                  class="px-6 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-xl transition-all font-semibold flex items-center gap-2">
            <i class="fas fa-sync-alt"></i>
            <span>새로고침</span>
          </button>
        </div>
      </div>

      <!-- 통계 카드 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- 오늘의 입고 -->
        <div class="stat-card bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
          <div class="flex items-center justify-between mb-4">
            <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <i class="fas fa-qrcode text-2xl"></i>
            </div>
            <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold">입고</span>
          </div>
          <div>
            <h3 class="text-4xl font-bold mb-2" id="today-inbound-count">
              <span class="loading-shimmer">0</span>
            </h3>
            <p class="text-blue-100 text-sm font-medium">오늘의 입고 건수</p>
          </div>
          <div class="mt-4 pt-4 border-t border-white/20">
            <p class="text-xs text-blue-100">
              <i class="fas fa-arrow-up mr-1"></i>
              실시간 업데이트
            </p>
          </div>
        </div>

        <!-- 오늘의 출고 -->
        <div class="stat-card bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
          <div class="flex items-center justify-between mb-4">
            <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <i class="fas fa-dolly text-2xl"></i>
            </div>
            <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold">출고</span>
          </div>
          <div>
            <h3 class="text-4xl font-bold mb-2" id="today-outbound-count">
              <span class="loading-shimmer">0</span>
            </h3>
            <p class="text-orange-100 text-sm font-medium">오늘의 출고 건수</p>
          </div>
          <div class="mt-4 pt-4 border-t border-white/20">
            <p class="text-xs text-orange-100">
              <i class="fas fa-arrow-down mr-1"></i>
              실시간 업데이트
            </p>
          </div>
        </div>

        <!-- 오늘의 판매 -->
        <div class="stat-card bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
          <div class="flex items-center justify-between mb-4">
            <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <i class="fas fa-cash-register text-2xl"></i>
            </div>
            <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold">판매</span>
          </div>
          <div>
            <h3 class="text-4xl font-bold mb-2" id="today-sale-count">
              <span class="loading-shimmer">0</span>
            </h3>
            <p class="text-green-100 text-sm font-medium">오늘의 판매 건수</p>
          </div>
          <div class="mt-4 pt-4 border-t border-white/20">
            <p class="text-xs text-green-100">
              <i class="fas fa-check-circle mr-1"></i>
              실시간 업데이트
            </p>
          </div>
        </div>

        <!-- 활성 QR 코드 -->
        <div class="stat-card bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
          <div class="flex items-center justify-between mb-4">
            <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <i class="fas fa-barcode text-2xl"></i>
            </div>
            <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold">활성</span>
          </div>
          <div>
            <h3 class="text-4xl font-bold mb-2" id="active-qr-count">
              <span class="loading-shimmer">0</span>
            </h3>
            <p class="text-purple-100 text-sm font-medium">활성 QR 코드</p>
          </div>
          <div class="mt-4 pt-4 border-t border-white/20">
            <p class="text-xs text-purple-100">
              <i class="fas fa-database mr-1"></i>
              전체 등록 코드
            </p>
          </div>
        </div>
      </div>

      <!-- 최근 활동 -->
      <div class="bg-white rounded-2xl shadow-sm border-2 border-slate-200 overflow-hidden">
        <div class="bg-gradient-to-r from-slate-50 to-slate-100 px-8 py-6 border-b-2 border-slate-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                <i class="fas fa-history text-white"></i>
              </div>
              <div>
                <h3 class="text-xl font-bold text-slate-800">최근 QR 트랜잭션</h3>
                <p class="text-sm text-slate-500">오늘의 입출고 및 판매 활동</p>
              </div>
            </div>
            <span class="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
              <i class="fas fa-circle animate-pulse mr-2"></i>
              실시간
            </span>
          </div>
        </div>
        <div class="p-6">
          <div id="recent-qr-transactions" class="space-y-3">
            <p class="text-center text-slate-400 py-8">
              <i class="fas fa-spinner fa-spin text-2xl mb-2"></i><br/>
              데이터를 불러오는 중...
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- CSS 애니메이션 -->
    <style>
      @keyframes shimmer {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
      }
      
      .loading-shimmer {
        animation: shimmer 1.5s ease-in-out infinite;
      }

      .stat-card {
        position: relative;
        overflow: hidden;
      }

      .stat-card::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        transform: rotate(45deg);
        pointer-events: none;
      }
    </style>
  `;

  // 데이터 로드
  await loadQRDashboardData();
}

// ================================================
// QR 입고 페이지
// ================================================
async function renderQRInboundPage(container) {
  container.innerHTML = `
    <div class="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl shadow-sm border border-teal-200 overflow-hidden">
      <!-- 헤더 -->
      <div class="bg-gradient-to-r from-teal-600 to-blue-600 p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <i class="fas fa-qrcode text-white text-2xl"></i>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-white flex items-center gap-3">
                QR 스캔 입고
              </h2>
              <p class="text-teal-100 mt-1">QR 코드를 스캔하여 빠르게 입고 처리</p>
            </div>
          </div>
          <button onclick="loadInboundHistory()" class="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all">
            <i class="fas fa-sync-alt mr-2"></i>새로고침
          </button>
        </div>
      </div>

      <div class="p-8">
        <!-- 메인 스캔 영역 -->
        <div class="grid lg:grid-cols-2 gap-8 mb-8">
          <!-- 왼쪽: 스캔 카메라 -->
          <div class="space-y-6">
            <!-- 스캔 상태 표시 -->
            <div id="scan-status-bar" class="bg-white rounded-xl p-4 border-2 border-slate-200 hidden">
              <div class="flex items-center gap-3">
                <
div id="scan-status-icon" class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <i class="fas fa-camera text-blue-600"></i>
                </div>
                <div class="flex-1">
                  <p id="scan-status-text" class="font-semibold text-slate-800">스캔 준비 중...</p>
                  <p id="scan-status-subtext" class="text-sm text-slate-500">QR 코드를 카메라에 비춰주세요</p>
                </div>
              </div>
            </div>

            <!-- 카메라 뷰포트 -->
            <div class="relative bg-slate-900 rounded-2xl overflow-hidden border-4 border-teal-500 shadow-2xl">
              <!-- 스캔 가이드 오버레이 -->
              <div id="scan-guide" class="absolute inset-0 z-10 pointer-events-none hidden">
                <div class="absolute inset-0 bg-black/60"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="relative w-64 h-64">
                    <!-- 스캔 박스 애니메이션 -->
                    <div class="scan-box-border"></div>
                    <div class="absolute inset-0 border-4 border-teal-400 rounded-2xl animate-pulse"></div>
                    <!-- 코너 마크 -->
                    <div class="scan-corner top-0 left-0"></div>
                    <div class="scan-corner top-0 right-0"></div>
                    <div class="scan-corner bottom-0 left-0"></div>
                    <div class="scan-corner bottom-0 right-0"></div>
                    <!-- 스캔 라인 애니메이션 -->
                    <div class="scan-line"></div>
                  </div>
                </div>
              </div>
              
              <!-- 카메라 영역 -->
              <div id="qr-reader" class="min-h-[400px] bg-slate-800 flex items-center justify-center">
                <div class="text-center text-white p-8">
                  <i class="fas fa-camera text-6xl mb-4 opacity-50"></i>
                  <p class="text-lg">스캔을 시작하려면 아래 버튼을 클릭하세요</p>
                </div>
              </div>
            </div>

            <!-- 컨트롤 버튼 -->
            <div class="flex gap-3">
              <button id="start-scan-btn" onclick="startQRScan('inbound')" 
                      class="flex-1 px-6 py-4 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-xl hover:from-teal-700 hover:to-blue-700 transition-all font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105">
                <i class="fas fa-camera mr-2"></i>스캔 시작
              </button>
              <button id="stop-scan-btn" onclick="stopQRScan()" 
                      class="flex-1 px-6 py-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all font-bold text-lg shadow-lg hidden">
                <i class="fas fa-stop-circle mr-2"></i>스캔 중지
              </button>
            </div>

            <!-- 수동 입력 -->
            <div class="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm">
              <label class="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <i class="fas fa-keyboard text-teal-600"></i>
                수동 입력
              </label>
              <div class="flex gap-2">
                <input type="text" id="manual-qr-input" placeholder="QR-XXXXXX-XXXXX 형식으로 입력..." 
                       class="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-lg font-mono"
                       onkeypress="if(event.key==='Enter') handleManualQRInput('inbound')">
                <button onclick="handleManualQRInput('inbound')" 
                        class="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all font-semibold">
                  <i class="fas fa-check mr-2"></i>확인
                </button>
              </div>
              <p class="text-xs text-slate-500 mt-2">
                <i class="fas fa-info-circle mr-1"></i>카메라를 사용할 수 없는 경우 QR 코드를 직접 입력할 수 있습니다
              </p>
            </div>
          </div>

          <!-- 오른쪽: 스캔 결과 및 입고 폼 -->
          <div>
            <!-- 대기 상태 -->
            <div id="scan-waiting" class="bg-white rounded-xl p-8 border-2 border-dashed border-slate-300">
              <div class="text-center text-slate-400 py-12">
                <div class="w-24 h-24 bg-slate-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <i class="fas fa-qrcode text-5xl text-slate-300"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-600 mb-2">스캔 대기 중</h3>
                <p class="text-slate-500">QR 코드를 스캔하면<br/>여기에 제품 정보가 표시됩니다</p>
              </div>
            </div>

            <!-- 스캔 결과 표시 -->
            <div id="qr-scan-result" class="hidden">
              <div class="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl p-6 border-2 border-teal-300 shadow-lg">
                <!-- 성공 헤더 -->
                <div class="flex items-center gap-3 mb-6 pb-4 border-b-2 border-teal-200">
                  <div class="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center">
                    <i class="fas fa-check text-white text-xl"></i>
                  </div>
                  <div class="flex-1">
                    <h3 class="text-lg font-bold text-teal-900">스캔 성공!</h3>
                    <p class="text-sm text-teal-700">제품 정보를 확인하고 입고를 진행하세요</p>
                  </div>
                </div>

                <div class="space-y-4">
                  <!-- 제품 정보 카드 -->
                  <div class="bg-white rounded-xl p-5 border border-teal-200">
                    <div class="flex items-start gap-4">
                      <div class="w-16 h-16 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-box text-teal-600 text-2xl"></i>
                      </div>
                      <div class="flex-1">
                        <label class="text-xs font-semibold text-slate-500 uppercase">제품명</label>
                        <p id="scanned-product-name" class="text-xl font-bold text-slate-900 mt-1"></p>
                        <div class="flex items-center gap-4 mt-2">
                          <div>
                            <label class="text-xs text-slate-500">현재 재고</label>
                            <p id="scanned-product-stock" class="text-lg font-semibold text-blue-600"></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 입고 정보 입력 -->
                  <div class="bg-white rounded-xl p-5 border border-teal-200 space-y-4">
                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <i class="fas fa-hashtag text-teal-600"></i>
                        입고 수량
                      </label>
                      <div class="flex items-center gap-2">
                        <button onclick="decreaseQuantity()" class="w-12 h-12 bg-slate-200 hover:bg-slate-300 rounded-lg transition-all">
                          <i class="fas fa-minus text-slate-700"></i>
                        </button>
                        <input type="number" id="inbound-quantity" value="1" min="1" 
                               class="flex-1 px-4 py-3 border-2 border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-center text-2xl font-bold text-teal-900">
                        <button onclick="increaseQuantity()" class="w-12 h-12 bg-teal-600 hover:bg-teal-700 rounded-lg transition-all">
                          <i class="fas fa-plus text-white"></i>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <i class="fas fa-warehouse text-teal-600"></i>
                        창고 선택
                      </label>
                      <select id="inbound-warehouse" 
                              class="w-full px-4 py-3 border-2 border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-lg">
                        <option value="">창고를 선택하세요</option>
                      </select>
                    </div>

                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <i class="fas fa-comment-alt text-teal-600"></i>
                        메모 (선택사항)
                      </label>
                      <textarea id="inbound-notes" rows="3" placeholder="입고 관련 메모를 입력하세요..."
                                class="w-full px-4 py-3 border-2 border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"></textarea>
                    </div>
                  </div>

                  <!-- 액션 버튼 -->
                  <div class="flex gap-3 pt-4">
                    <button onclick="confirmQRInbound()" 
                            class="flex-1 px-6 py-4 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-xl hover:from-teal-700 hover:to-blue-700 font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all">
                      <i class="fas fa-check-circle mr-2"></i>입고 확정
                    </button>
                    <button onclick="cancelQRScan()" 
                            class="px-6 py-4 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl font-semibold transition-all">
                      <i class="fas fa-times mr-2"></i>취소
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 오늘의 입고 이력 -->
        <div class="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2">
              <i class="fas fa-history text-blue-600"></i>
              오늘의 입고 이력
            </h3>
            <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              실시간 업데이트
            </span>
          </div>
          <div id="qr-inbound-history" class="space-y-3">
            <p class="text-center text-slate-400 py-8">입고 이력을 불러오는 중...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- CSS 애니메이션 -->
    <style>
      .scan-box-border {
        position: absolute;
        inset: -4px;
        background: linear-gradient(45deg, #14b8a6, #3b82f6);
        border-radius: 1.5rem;
        animation: scan-box-glow 2s ease-in-out infinite;
      }

      @keyframes scan-box-glow {
        0%, 100% { opacity: 0.3; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.02); }
      }

      .scan-corner {
        position: absolute;
        width: 40px;
        height: 40px;
        border: 4px solid #14b8a6;
      }

      .scan-corner.top-0.left-0 {
        border-right: none;
        border-bottom: none;
        border-top-left-radius: 1rem;
      }

      .scan-corner.top-0.right-0 {
        border-left: none;
        border-bottom: none;
        border-top-right-radius: 1rem;
      }

      .scan-corner.bottom-0.left-0 {
        border-right: none;
        border-top: none;
        border-bottom-left-radius: 1rem;
      }

      .scan-corner.bottom-0.right-0 {
        border-left: none;
        border-top: none;
        border-bottom-right-radius: 1rem;
      }

      .scan-line {
        position: absolute;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, transparent, #14b8a6, transparent);
        box-shadow: 0 0 10px #14b8a6;
        animation: scan-line-move 2s linear infinite;
      }

      @keyframes scan-line-move {
        0% { top: 0; }
        100% { top: 100%; }
      }

      #qr-reader video {
        border-radius: 1rem;
      }
    </style>
  `;

  // 창고 목록 로드
  await loadWarehousesForQR('inbound-warehouse');
  // 입고 이력 로드
  await loadInboundHistory();
}

// ================================================
// QR 출고 페이지
// ================================================
async function renderQROutboundPage(container) {
  container.innerHTML = `
    <div class="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl shadow-sm border border-orange-200 overflow-hidden">
      <!-- 헤더 -->
      <div class="bg-gradient-to-r from-orange-600 to-red-600 p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <i class="fas fa-dolly text-white text-2xl"></i>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-white flex items-center gap-3">
                QR 스캔 출고
              </h2>
              <p class="text-orange-100 mt-1">QR 코드를 스캔하여 빠르게 출고 처리</p>
            </div>
          </div>
          <button onclick="loadOutboundHistory()" class="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all">
            <i class="fas fa-sync-alt mr-2"></i>새로고침
          </button>
        </div>
      </div>

      <div class="p-8">
        <!-- 중요 공지 -->
        <div class="bg-orange-100 border-2 border-orange-300 rounded-xl p-4 mb-6 flex items-start gap-3">
          <div class="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <i class="fas fa-exclamation-triangle text-white"></i>
          </div>
          <div class="flex-1">
            <h4 class="font-bold text-orange-900 mb-1">재고 확인 필수</h4>
            <p class="text-sm text-orange-800">
              출고 시 재고가 자동으로 차감됩니다. 재고 부족 시 출고가 불가능하니 현재 재고를 반드시 확인하세요.
            </p>
          </div>
        </div>

        <!-- 메인 스캔 영역 -->
        <div class="grid lg:grid-cols-2 gap-8 mb-8">
          <!-- 왼쪽: 스캔 카메라 -->
          <div class="space-y-6">
            <!-- 스캔 상태 표시 -->
            <div id="scan-status-bar-outbound" class="bg-white rounded-xl p-4 border-2 border-slate-200 hidden">
              <div class="flex items-center gap-3">
                <div id="scan-status-icon-outbound" class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <i class="fas fa-camera text-orange-600"></i>
                </div>
                <div class="flex-1">
                  <p id="scan-status-text-outbound" class="font-semibold text-slate-800">스캔 준비 중...</p>
                  <p id="scan-status-subtext-outbound" class="text-sm text-slate-500">QR 코드를 카메라에 비춰주세요</p>
                </div>
              </div>
            </div>

            <!-- 카메라 뷰포트 -->
            <div class="relative bg-slate-900 rounded-2xl overflow-hidden border-4 border-orange-500 shadow-2xl">
              <!-- 스캔 가이드 오버레이 -->
              <div id="scan-guide-outbound" class="absolute inset-0 z-10 pointer-events-none hidden">
                <div class="absolute inset-0 bg-black/60"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="relative w-64 h-64">
                    <!-- 스캔 박스 애니메이션 -->
                    <div class="scan-box-border-outbound"></div>
                    <div class="absolute inset-0 border-4 border-orange-400 rounded-2xl animate-pulse"></div>
                    <!-- 코너 마크 -->
                    <div class="scan-corner-outbound top-0 left-0"></div>
                    <div class="scan-corner-outbound top-0 right-0"></div>
                    <div class="scan-corner-outbound bottom-0 left-0"></div>
                    <div class="scan-corner-outbound bottom-0 right-0"></div>
                    <!-- 스캔 라인 애니메이션 -->
                    <div class="scan-line-outbound"></div>
                  </div>
                </div>
              </div>
              
              <!-- 카메라 영역 -->
              <div id="qr-reader-outbound" class="min-h-[400px] bg-slate-800 flex items-center justify-center">
                <div class="text-center text-white p-8">
                  <i class="fas fa-camera text-6xl mb-4 opacity-50"></i>
                  <p class="text-lg">스캔을 시작하려면 아래 버튼을 클릭하세요</p>
                </div>
              </div>
            </div>

            <!-- 컨트롤 버튼 -->
            <div class="flex gap-3">
              <button id="start-scan-btn-outbound" onclick="startQRScan('outbound')" 
                      class="flex-1 px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition-all font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105">
                <i class="fas fa-camera mr-2"></i>스캔 시작
              </button>
              <button id="stop-scan-btn-outbound" onclick="stopQRScan()" 
                      class="flex-1 px-6 py-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all font-bold text-lg shadow-lg hidden">
                <i class="fas fa-stop-circle mr-2"></i>스캔 중지
              </button>
            </div>

            <!-- 수동 입력 -->
            <div class="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm">
              <label class="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <i class="fas fa-keyboard text-orange-600"></i>
                수동 입력
              </label>
              <div class="flex gap-2">
                <input type="text" id="manual-qr-input-outbound" placeholder="QR-XXXXXX-XXXXX 형식으로 입력..." 
                       class="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-lg font-mono"
                       onkeypress="if(event.key==='Enter') handleManualQRInput('outbound')">
                <button onclick="handleManualQRInput('outbound')" 
                        class="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all font-semibold">
                  <i class="fas fa-check mr-2"></i>확인
                </button>
              </div>
              <p class="text-xs text-slate-500 mt-2">
                <i class="fas fa-info-circle mr-1"></i>카메라를 사용할 수 없는 경우 QR 코드를 직접 입력할 수 있습니다
              </p>
            </div>
          </div>

          <!-- 오른쪽: 스캔 결과 및 출고 폼 -->
          <div>
            <!-- 대기 상태 -->
            <div id="scan-waiting-outbound" class="bg-white rounded-xl p-8 border-2 border-dashed border-slate-300">
              <div class="text-center text-slate-400 py-12">
                <div class="w-24 h-24 bg-slate-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <i class="fas fa-dolly text-5xl text-slate-300"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-600 mb-2">스캔 대기 중</h3>
                <p class="text-slate-500">QR 코드를 스캔하면<br/>여기에 제품 정보가 표시됩니다</p>
              </div>
            </div>

            <!-- 스캔 결과 표시 -->
            <div id="qr-outbound-result" class="hidden">
              <!-- JavaScript에서 동적으로 생성됨 -->
            </div>
          </div>
        </div>

        <!-- 오늘의 출고 이력 -->
        <div class="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2">
              <i class="fas fa-history text-orange-600"></i>
              오늘의 출고 이력
            </h3>
            <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
              실시간 업데이트
            </span>
          </div>
          <div id="qr-outbound-history" class="space-y-3">
            <p class="text-center text-slate-400 py-8">출고 이력을 불러오는 중...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- CSS 애니메이션 (출고용) -->
    <style>
      .scan-box-border-outbound {
        position: absolute;
        inset: -4px;
        background: linear-gradient(45deg, #ea580c, #dc2626);
        border-radius: 1.5rem;
        animation: scan-box-glow 2s ease-in-out infinite;
      }

      .scan-corner-outbound {
        position: absolute;
        width: 40px;
        height: 40px;
        border: 4px solid #ea580c;
      }

      .scan-corner-outbound.top-0.left-0 {
        border-right: none;
        border-bottom: none;
        border-top-left-radius: 1rem;
      }

      .scan-corner-outbound.top-0.right-0 {
        border-left: none;
        border-bottom: none;
        border-top-right-radius: 1rem;
      }

      .scan-corner-outbound.bottom-0.left-0 {
        border-right: none;
        border-top: none;
        border-bottom-left-radius: 1rem;
      }

      .scan-corner-outbound.bottom-0.right-0 {
        border-left: none;
        border-top: none;
        border-bottom-right-radius: 1rem;
      }

      .scan-line-outbound {
        position: absolute;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, transparent, #ea580c, transparent);
        box-shadow: 0 0 10px #ea580c;
        animation: scan-line-move 2s linear infinite;
      }
    </style>
  `;

  await loadWarehousesForQR('outbound-warehouse');
  await loadOutboundHistory();
}

// ================================================
// QR 판매 페이지
// ================================================
async function renderQRSalePage(container) {
  container.innerHTML = `
    <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-sm border border-green-200 overflow-hidden">
      <!-- 헤더 -->
      <div class="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <i class="fas fa-cash-register text-white text-2xl"></i>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-white flex items-center gap-3">
                QR 스캔 판매
              </h2>
              <p class="text-green-100 mt-1">QR 코드를 스캔하여 즉시 판매 등록</p>
            </div>
          </div>
          <button onclick="loadSaleHistory()" class="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all">
            <i class="fas fa-sync-alt mr-2"></i>새로고침
          </button>
        </div>
      </div>

      <div class="p-8">
        <!-- 메인 스캔 영역 -->
        <div class="grid lg:grid-cols-2 gap-8 mb-8">
          <!-- 왼쪽: 스캔 카메라 -->
          <div class="space-y-6">
            <!-- 카메라 뷰포트 -->
            <div class="relative bg-slate-900 rounded-2xl overflow-hidden border-4 border-green-500 shadow-2xl">
              <!-- 스캔 가이드 오버레이 -->
              <div id="scan-guide-sale" class="absolute inset-0 z-10 pointer-events-none hidden">
                <div class="absolute inset-0 bg-black/60"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="relative w-64 h-64">
                    <div class="scan-box-border-sale"></div>
                    <div class="absolute inset-0 border-4 border-green-400 rounded-2xl animate-pulse"></div>
                    <div class="scan-corner-sale top-0 left-0"></div>
                    <div class="scan-corner-sale top-0 right-0"></div>
                    <div class="scan-corner-sale bottom-0 left-0"></div>
                    <div class="scan-corner-sale bottom-0 right-0"></div>
                    <div class="scan-line-sale"></div>
                  </div>
                </div>
              </div>
              
              <div id="qr-reader-sale" class="min-h-[400px] bg-slate-800 flex items-center justify-center">
                <div class="text-center text-white p-8">
                  <i class="fas fa-camera text-6xl mb-4 opacity-50"></i>
                  <p class="text-lg">스캔을 시작하려면 아래 버튼을 클릭하세요</p>
                </div>
              </div>
            </div>

            <!-- 컨트롤 버튼 -->
            <div class="flex gap-3">
              <button id="start-scan-btn-sale" onclick="startQRScan('sale')" 
                      class="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105">
                <i class="fas fa-camera mr-2"></i>스캔 시작
              </button>
              <button id="stop-scan-btn-sale" onclick="stopQRScan('sale')" 
                      class="flex-1 px-6 py-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all font-bold text-lg shadow-lg hidden">
                <i class="fas fa-stop-circle mr-2"></i>스캔 중지
              </button>
            </div>

            <!-- 수동 입력 -->
            <div class="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm">
              <label class="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <i class="fas fa-keyboard text-green-600"></i>
                수동 입력
              </label>
              <div class="flex gap-2">
                <input type="text" id="manual-qr-input-sale" placeholder="QR-XXXXXX-XXXXX 형식으로 입력..." 
                       class="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-lg font-mono"
                       onkeypress="if(event.key==='Enter') handleManualQRInput('sale')">
                <button onclick="handleManualQRInput('sale')" 
                        class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold">
                  <i class="fas fa-check mr-2"></i>확인
                </button>
              </div>
            </div>
          </div>

          <!-- 오른쪽: 스캔 결과 및 판매 폼 -->
          <div>
            <!-- 대기 상태 -->
            <div id="scan-waiting-sale" class="bg-white rounded-xl p-8 border-2 border-dashed border-slate-300">
              <div class="text-center text-slate-400 py-12">
                <div class="w-24 h-24 bg-slate-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <i class="fas fa-cash-register text-5xl text-slate-300"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-600 mb-2">스캔 대기 중</h3>
                <p class="text-slate-500">QR 코드를 스캔하면<br/>여기에 제품 정보가 표시됩니다</p>
              </div>
            </div>

            <!-- 스캔 결과 표시 -->
            <div id="qr-sale-result" class="hidden">
              <!-- JavaScript에서 동적으로 생성됨 -->
            </div>
          </div>
        </div>

        <!-- 오늘의 판매 이력 -->
        <div class="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2">
              <i class="fas fa-history text-green-600"></i>
              오늘의 판매 이력
            </h3>
            <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
              실시간 업데이트
            </span>
          </div>
          <div id="qr-sale-history" class="space-y-3">
            <p class="text-center text-slate-400 py-8">판매 이력을 불러오는 중...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- CSS 애니메이션 (판매용) -->
    <style>
      .scan-box-border-sale {
        position: absolute;
        inset: -4px;
        background: linear-gradient(45deg, #16a34a, #059669);
        border-radius: 1.5rem;
        animation: scan-box-glow 2s ease-in-out infinite;
      }

      .scan-corner-sale {
        position: absolute;
        width: 40px;
        height: 40px;
        border: 4px solid #16a34a;
      }

      .scan-corner-sale.top-0.left-0 {
        border-right: none;
        border-bottom: none;
        border-top-left-radius: 1rem;
      }

      .scan-corner-sale.top-0.right-0 {
        border-left: none;
        border-bottom: none;
        border-top-right-radius: 1rem;
      }

      .scan-corner-sale.bottom-0.left-0 {
        border-right: none;
        border-top: none;
        border-bottom-left-radius: 1rem;
      }

      .scan-corner-sale.bottom-0.right-0 {
        border-left: none;
        border-top: none;
        border-bottom-right-radius: 1rem;
      }

      .scan-line-sale {
        position: absolute;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, transparent, #16a34a, transparent);
        box-shadow: 0 0 10px #16a34a;
        animation: scan-line-move 2s linear infinite;
      }
    </style>
  `;

  await loadSaleHistory();
}

// ================================================
// QR 관리 페이지
// ================================================
async function renderQRManagementPage(container) {
  container.innerHTML = `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <i class="fas fa-cogs text-purple-600"></i>
          QR 코드 관리
        </h2>
        <p class="text-slate-500 mt-1">QR 코드 생성, 출력 및 관리</p>
      </div>

      <!-- QR 생성 섹션 -->
      <div class="bg-purple-50 rounded-xl p-6 border border-purple-200 mb-6">
        <h3 class="text-lg font-bold text-purple-900 mb-4">QR 코드 생성</h3>
        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">제품 선택</label>
            <select id="qr-product-select" class="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500">
              <option value="">제품을 선택하세요</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">생성 수량</label>
            <input type="number" id="qr-generate-quantity" value="1" min="1" max="100"
                   class="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500">
          </div>
        </div>
        <button onclick="generateQRCodes()" class="mt-4 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold">
          <i class="fas fa-qrcode mr-2"></i>QR 코드 생성
        </button>
      </div>

      <!-- QR 코드 목록 -->
      <div>
        <h3 class="text-lg font-bold text-slate-800 mb-4">생성된 QR 코드 목록</h3>
        <div id="qr-code-list" class="space-y-2">
          <p class="text-center text-slate-400 py-8">생성된 QR 코드가 없습니다</p>
        </div>
      </div>
    </div>
  `;

  // 제품 목록 로드
  await loadProductsForQR();
}

// ================================================
// 유틸리티 함수들
// ================================================

// QR 대시보드 데이터 로드
async function loadQRDashboardData() {
  try {
    // 통계 데이터 조회
    const statsRes = await fetch('/api/qr/stats', {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!statsRes.ok) throw new Error('Failed to load stats');

    const statsData = await statsRes.json();

    // 통계 카드 업데이트
    const todayStats = statsData.today_stats || {};
    const qrStats = statsData.qr_stats || {};

    document.getElementById('today-inbound-count').textContent = todayStats.today_inbound_count || '0';
    document.getElementById('today-outbound-count').textContent = todayStats.today_outbound_count || '0';
    document.getElementById('today-sale-count').textContent = todayStats.today_sale_count || '0';
    document.getElementById('active-qr-count').textContent = qrStats.active_codes || '0';

    // 최근 트랜잭션 조회
    const today = new Date().toISOString().split('T')[0];
    const transRes = await fetch(`/api/qr/transactions/all?date=${today}&limit=10`, {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!transRes.ok) throw new Error('Failed to load transactions');

    const transData = await transRes.json();
    renderRecentTransactions(transData.transactions || []);

  } catch (error) {
    console.error('QR 대시보드 데이터 로드 실패:', error);
    // 에러 시 기본값 표시
    document.getElementById('today-inbound-count').textContent = '0';
    document.getElementById('today-outbound-count').textContent = '0';
    document.getElementById('today-sale-count').textContent = '0';
    document.getElementById('active-qr-count').textContent = '0';

    const container = document.getElementById('recent-qr-transactions');
    if (container) {
      container.innerHTML = '<p class="text-center text-slate-400 py-8">데이터를 불러올 수 없습니다</p>';
    }
  }
}

// 최근 트랜잭션 렌더링
function renderRecentTransactions(transactions) {
  const container = document.getElementById('recent-qr-transactions');
  if (!container) return;

  if (!transactions || transactions.length === 0) {
    container.innerHTML = '<p class="text-center text-slate-400 py-8">오늘 트랜잭션이 없습니다</p>';
    return;
  }

  const typeConfig = {
    inbound: { color: 'blue', icon: 'fa-qrcode', label: '입고' },
    outbound: { color: 'orange', icon: 'fa-dolly', label: '출고' },
    sale: { color: 'green', icon: 'fa-cash-register', label: '판매' }
  };

  container.innerHTML = transactions.map(tx => {
    const config = typeConfig[tx.transaction_type] || { color: 'slate', icon: 'fa-box', label: '기타' };
    const timeAgo = getTimeAgo(tx.created_at);

    return `
      <div class="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-${config.color}-300 transition-colors">
        <div class="w-12 h-12 bg-${config.color}-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <i class="fas ${config.icon} text-${config.color}-600 text-xl"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-1 bg-${config.color}-100 text-${config.color}-700 rounded text-xs font-bold">${config.label}</span>
            <span class="text-xs text-slate-500">${timeAgo}</span>
          </div>
          <h4 class="font-semibold text-slate-900 truncate">${tx.product_name || 'Unknown'}</h4>
          <p class="text-sm text-slate-600">
            수량: <span class="font-semibold">${tx.quantity}개</span> 
            ${tx.warehouse_name ? `| 창고: ${tx.warehouse_name}` : ''}
            ${tx.user_name ? `| 담당: ${tx.user_name}` : ''}
          </p>
        </div>
      </div>
    `;
  }).join('');
}

// 시간 경과 표시 헬퍼 함수
function getTimeAgo(dateString) {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;

  return past.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// 창고 목록 로드
async function loadWarehousesForQR(selectId) {
  try {
    const res = await fetch('/api/warehouses', {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });
    const warehouses = await res.json();

    const select = document.getElementById(selectId);
    if (select) {
      warehouses.forEach(wh => {
        const option = document.createElement('option');
        option.value = wh.id;
        option.textContent = wh.name;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('창고 목록 로드 실패:', error);
  }
}

// 제품 목록 로드 (QR 관리용)
async function loadProductsForQR() {
  try {
    const res = await fetch('/api/products', {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!res.ok) throw new Error('Failed to load products');

    const products = await res.json();

    const select = document.getElementById('qr-product-select');
    if (select) {
      select.innerHTML = '<option value="">제품을 선택하세요</option>';
      products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.name} (${product.code})`;
        select.appendChild(option);
      });
    }

    // 기존 QR 코드 목록도 로드
    await loadQRCodeList();
  } catch (error) {
    console.error('제품 목록 로드 실패:', error);
    showToast('제품 목록 로드에 실패했습니다', 'error');
  }
}

// QR 코드 목록 로드
async function loadQRCodeList() {
  try {
    const res = await fetch('/api/qr/codes?limit=50', {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!res.ok) throw new Error('Failed to load QR codes');

    const data = await res.json();
    renderQRCodeList(data.codes);
  } catch (error) {
    console.error('QR 코드 목록 로드 실패:', error);
  }
}

// QR 코드 목록 렌더링
function renderQRCodeList(codes) {
  const container = document.getElementById('qr-code-list');
  if (!container) return;

  if (!codes || codes.length === 0) {
    container.innerHTML = '<p class="text-center text-slate-400 py-8">생성된 QR 코드가 없습니다</p>';
    return;
  }

  container.innerHTML = codes.map(code => `
    <div class="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-purple-300 transition-colors">
      <div class="flex items-center gap-4 flex-1">
        <div class="w-16 h-16 bg-white rounded-lg flex items-center justify-center border-2 border-purple-200">
          <canvas id="qr-canvas-${code.id}" class="w-full h-full"></canvas>
        </div>
        <div class="flex-1">
          <h4 class="font-semibold text-slate-800">${code.product_name}</h4>
          <p class="text-sm text-slate-500">코드: ${code.code}</p>
          <p class="text-xs text-slate-400">생성일: ${new Date(code.created_at).toLocaleDateString('ko-KR')}</p>
        </div>
        <div class="text-right">
          <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold ${code.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
    }">
            ${code.status === 'active' ? '활성' : '비활성'}
          </span>
          <p class="text-xs text-slate-500 mt-1">배치: ${code.batch_number || 'N/A'}</p>
        </div>
      </div>
      <div class="flex gap-2 ml-4">
        <button onclick="downloadQRCode('${code.code}', '${code.product_name}')" 
                class="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
          <i class="fas fa-download mr-1"></i>다운로드
        </button>
        <button onclick="printQRLabel('${code.code}', '${code.product_name}')" 
                class="px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 text-sm">
          <i class="fas fa-print mr-1"></i>출력
        </button>
      </div>
    </div>
  `).join('');

  // QR 코드 이미지 생성 (qrcode 라이브러리 사용)
  codes.forEach(code => {
    const canvas = document.getElementById(`qr-canvas-${code.id}`);
    if (canvas && window.QRCode) {
      try {
        window.QRCode.toCanvas(canvas, code.code, {
          width: 64,
          margin: 1,
          color: {
            dark: '#4c1d95',  // 보라색
            light: '#ffffff'
          }
        });
      } catch (error) {
        console.error('QR 코드 생성 실패:', error);
      }
    }
  });
}

// ================================================
// QR 스캔 헬퍼 함수들
// ================================================

// 수량 증가
function increaseQuantity() {
  const input = document.getElementById('inbound-quantity');
  if (input) {
    input.value = parseInt(input.value || 1) + 1;
  }
}

// 수량 감소
function decreaseQuantity() {
  const input = document.getElementById('inbound-quantity');
  if (input) {
    const currentValue = parseInt(input.value || 1);
    if (currentValue > 1) {
      input.value = currentValue - 1;
    }
  }
}

// 출고 수량 증가
function increaseOutboundQuantity(maxStock) {
  const input = document.getElementById('outbound-quantity');
  if (input) {
    const currentValue = parseInt(input.value || 1);
    if (currentValue < maxStock) {
      input.value = currentValue + 1;
    }
  }
}

// 출고 수량 감소
function decreaseOutboundQuantity() {
  const input = document.getElementById('outbound-quantity');
  if (input) {
    const currentValue = parseInt(input.value || 1);
    if (currentValue > 1) {
      input.value = currentValue - 1;
    }
  }
}

// 판매 수량 증가
function increaseSaleQuantity(maxStock) {
  const input = document.getElementById('sale-quantity');
  if (input) {
    const currentValue = parseInt(input.value || 1);
    if (currentValue < maxStock) {
      input.value = currentValue + 1;
      updateTotalAmount();
    }
  }
}

// 판매 수량 감소
function decreaseSaleQuantity() {
  const input = document.getElementById('sale-quantity');
  if (input) {
    const currentValue = parseInt(input.value || 1);
    if (currentValue > 1) {
      input.value = currentValue - 1;
      updateTotalAmount();
    }
  }
}

// 총 판매금액 업데이트
function updateTotalAmount() {
  const quantityInput = document.getElementById('sale-quantity');
  const priceInput = document.getElementById('sale-price');
  const totalDisplay = document.getElementById('total-amount');

  if (quantityInput && priceInput && totalDisplay) {
    const quantity = parseInt(quantityInput.value || 0);
    const price = parseInt(priceInput.value || 0);
    const total = quantity * price;

    totalDisplay.innerHTML = `<span class="text-3xl font-bold text-green-900">${total.toLocaleString()}</span><span class="text-xl text-green-700 ml-2">원</span>`;
  }
}

// 스캔 가이드 표시/숨기기
function toggleScanGuide(show, type = 'inbound') {
  const guideId = type === 'inbound' ? 'scan-guide' : 'scan-guide-outbound';
  const statusBarId = type === 'inbound' ? 'scan-status-bar' : 'scan-status-bar-outbound';

  const guide = document.getElementById(guideId);
  const statusBar = document.getElementById(statusBarId);

  if (guide) {
    if (show) {
      guide.classList.remove('hidden');
      if (statusBar) statusBar.classList.remove('hidden');
    } else {
      guide.classList.add('hidden');
      if (statusBar) statusBar.classList.add('hidden');
    }
  }
}

// 대기 상태 표시
function showScanWaiting(show) {
  const waiting = document.getElementById('scan-waiting');
  const result = document.getElementById('qr-scan-result');

  if (waiting && result) {
    if (show) {
      waiting.classList.remove('hidden');
      result.classList.add('hidden');
    } else {
      waiting.classList.add('hidden');
    }
  }
}

// 전역 스캔 상태
let html5QrcodeScanner = null;
let currentScannedData = null;

// QR 스캔 시작
async function startQRScan(type) {
  let readerId = 'qr-reader';
  let startBtnId = 'start-scan-btn';
  let stopBtnId = 'stop-scan-btn';

  if (type === 'outbound') {
    readerId = 'qr-reader-outbound';
    startBtnId = 'start-scan-btn-outbound';
    stopBtnId = 'stop-scan-btn-outbound';
  } else if (type === 'sale') {
    readerId = 'qr-reader-sale';
    startBtnId = 'start-scan-btn-sale';
    stopBtnId = 'stop-scan-btn-sale';
  }

  const startBtn = document.getElementById(startBtnId);
  const stopBtn = document.getElementById(stopBtnId);

  if (html5QrcodeScanner) {
    showToast('이미 스캔이 진행 중입니다', 'warning');
    return;
  }

  try {
    html5QrcodeScanner = new Html5Qrcode(readerId);

    await html5QrcodeScanner.start(
      { facingMode: "environment" }, // 후면 카메라 우선
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      async (decodedText) => {
        // 스캔 성공
        console.log(`QR 스캔 성공: ${decodedText}`);

        // 스캔 중지
        await stopQRScan(type);

        // 스캔된 QR 코드 처리
        await processScannedQR(decodedText, type);
      },
      (error) => {
        // 스캔 실패 (무시)
      }
    );

    if (startBtn) startBtn.classList.add('hidden');
    if (stopBtn) stopBtn.classList.remove('hidden');

    // 스캔 가이드 표시 (type 전달)
    toggleScanGuide(true, type);

    showToast('✨ 스캔 시작! QR 코드를 카메라에 비춰주세요', 'info');

  } catch (error) {
    console.error('QR 스캔 시작 실패:', error);
    showToast('❌ 카메라 접근에 실패했습니다. 권한을 확인해주세요', 'error');
    html5QrcodeScanner = null;
  }
}

// QR 스캔 중지
async function stopQRScan(type = 'inbound') {
  if (html5QrcodeScanner) {
    try {
      await html5QrcodeScanner.stop();
    } catch (error) {
      console.error('QR 스캔 중지 실패:', error);
    }
    html5QrcodeScanner = null;
  }

  let startBtnId = 'start-scan-btn';
  let stopBtnId = 'stop-scan-btn';

  if (type === 'outbound') {
    startBtnId = 'start-scan-btn-outbound';
    stopBtnId = 'stop-scan-btn-outbound';
  } else if (type === 'sale') {
    startBtnId = 'start-scan-btn-sale';
    stopBtnId = 'stop-scan-btn-sale';
  }

  const startBtn = document.getElementById(startBtnId);
  const stopBtn = document.getElementById(stopBtnId);
  if (startBtn) startBtn.classList.remove('hidden');
  if (stopBtn) stopBtn.classList.add('hidden');

  // 스캔 가이드 숨기기 (type 전달)
  toggleScanGuide(false, type);
}

// 스캔된 QR 코드 처리
async function processScannedQR(qrCode, type) {
  try {
    const res = await fetch(`/api/qr/scan/${qrCode}`, {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'QR 코드 조회 실패');
    }

    const data = await res.json();

    currentScannedData = {
      qr_code: qrCode,
      ...data.qr_code,
      type
    };    // 스캔 결과 표시
    displayScannedResult(currentScannedData, type);

    showToast('✅ QR 코드 스캔 성공!', 'success');

  } catch (error) {
    console.error('QR 스캔 처리 실패:', error);
    showToast(error.message || 'QR 코드 처리에 실패했습니다', 'error');
  }
}

// 스캔 결과 표시
function displayScannedResult(data, type) {
  const resultId = type === 'inbound' ? 'qr-scan-result' : `qr-${type}-result`;
  const resultContainer = document.getElementById(resultId);

  if (!resultContainer) return;

  // 대기 상태 숨기기
  showScanWaiting(false);

  // 입고용 결과 표시
  if (type === 'inbound') {
    document.getElementById('scanned-product-name').textContent = data.product_name;
    document.getElementById('scanned-product-stock').textContent = `${data.current_stock || 0}개`;
    document.getElementById('inbound-quantity').value = '1';
    document.getElementById('inbound-notes').value = '';

    resultContainer.classList.remove('hidden');

    // 스크롤 이동
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // 출고용 결과 표시 (출고 페이지에 동일한 구조 추가 필요)
  if (type === 'outbound') {
    resultContainer.innerHTML = `
      <div class="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border-2 border-orange-300 shadow-lg">
        <!-- 성공 헤더 -->
        <div class="flex items-center gap-3 mb-6 pb-4 border-b-2 border-orange-200">
          <div class="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
            <i class="fas fa-check text-white text-xl"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-orange-900">스캔 성공!</h3>
            <p class="text-sm text-orange-700">제품 정보를 확인하고 출고를 진행하세요</p>
          </div>
        </div>

        <div class="space-y-4">
          <!-- 제품 정보 카드 -->
          <div class="bg-white rounded-xl p-5 border border-orange-200">
            <div class="flex items-start gap-4">
              <div class="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <i class="fas fa-box text-orange-600 text-2xl"></i>
              </div>
              <div class="flex-1">
                <label class="text-xs font-semibold text-slate-500 uppercase">제품명</label>
                <p class="text-xl font-bold text-slate-900 mt-1">${data.product_name}</p>
                <div class="flex items-center gap-4 mt-2">
                  <div>
                    <label class="text-xs text-slate-500">현재 재고</label>
                    <p class="text-lg font-semibold ${data.current_stock > 0 ? 'text-green-600' : 'text-red-600'}">${data.current_stock || 0}개</p>
                  </div>
                  ${data.current_stock === 0 ? '<div class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">재고 없음</div>' : ''}
                </div>
              </div>
            </div>
          </div>

          <!-- 출고 정보 입력 -->
          <div class="bg-white rounded-xl p-5 border border-orange-200 space-y-4">
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <i class="fas fa-hashtag text-orange-600"></i>
                출고 수량
              </label>
              <div class="flex items-center gap-2">
                <button onclick="decreaseOutboundQuantity()" class="w-12 h-12 bg-slate-200 hover:bg-slate-300 rounded-lg transition-all">
                  <i class="fas fa-minus text-slate-700"></i>
                </button>
                <input type="number" id="outbound-quantity" value="1" min="1" max="${data.current_stock || 0}"
                       class="flex-1 px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-center text-2xl font-bold text-orange-900">
                <button onclick="increaseOutboundQuantity(${data.current_stock || 0})" class="w-12 h-12 bg-orange-600 hover:bg-orange-700 rounded-lg transition-all">
                  <i class="fas fa-plus text-white"></i>
                </button>
              </div>
              <p class="text-xs text-slate-500 mt-2">
                <i class="fas fa-info-circle mr-1"></i>최대 출고 가능: ${data.current_stock || 0}개
              </p>
            </div>

            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <i class="fas fa-warehouse text-orange-600"></i>
                창고 선택
              </label>
              <select id="outbound-warehouse" 
                      class="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-lg">
                <option value="">창고를 선택하세요</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <i class="fas fa-comment-alt text-orange-600"></i>
                메모 (선택사항)
              </label>
              <textarea id="outbound-notes" rows="3" placeholder="출고 관련 메모를 입력하세요..."
                        class="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 resize-none"></textarea>
            </div>
          </div>

          <!-- 액션 버튼 -->
          <div class="flex gap-3 pt-4">
            <button onclick="confirmQROutbound()" 
                    ${data.current_stock === 0 ? 'disabled' : ''}
                    class="flex-1 px-6 py-4 ${data.current_stock > 0 ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700' : 'bg-slate-300 cursor-not-allowed'} text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all">
              <i class="fas fa-check-circle mr-2"></i>출고 확정
            </button>
            <button onclick="cancelQRScan()" 
                    class="px-6 py-4 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl font-semibold transition-all">
              <i class="fas fa-times mr-2"></i>취소
            </button>
          </div>
        </div>
      </div>
    `;
    resultContainer.classList.remove('hidden');

    // 대기 상태 숨기기
    const waiting = document.getElementById('scan-waiting-outbound');
    if (waiting) waiting.classList.add('hidden');

    // 창고 목록 로드
    loadWarehousesForQR('outbound-warehouse');

    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // 판매용 결과 표시
  if (type === 'sale') {
    resultContainer.innerHTML = `
      <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-300 shadow-lg">
        <!-- 성공 헤더 -->
        <div class="flex items-center gap-3 mb-6 pb-4 border-b-2 border-green-200">
          <div class="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
            <i class="fas fa-check text-white text-xl"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-green-900">스캔 성공!</h3>
            <p class="text-sm text-green-700">제품 정보를 확인하고 판매를 진행하세요</p>
          </div>
        </div>

        <div class="space-y-4">
          <!-- 제품 정보 카드 -->
          <div class="bg-white rounded-xl p-5 border border-green-200">
            <div class="flex items-start gap-4">
              <div class="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <i class="fas fa-box text-green-600 text-2xl"></i>
              </div>
              <div class="flex-1">
                <label class="text-xs font-semibold text-slate-500 uppercase">제품명</label>
                <p class="text-xl font-bold text-slate-900 mt-1">${data.product_name}</p>
                <div class="flex items-center gap-4 mt-2">
                  <div>
                    <label class="text-xs text-slate-500">현재 재고</label>
                    <p class="text-lg font-semibold ${data.current_stock > 0 ? 'text-green-600' : 'text-red-600'}">${data.current_stock || 0}개</p>
                  </div>
                  <div>
                    <label class="text-xs text-slate-500">기준 판매가</label>
                    <p class="text-lg font-semibold text-blue-600">${(data.product_price || 0).toLocaleString()}원</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 판매 정보 입력 -->
          <div class="bg-white rounded-xl p-5 border border-green-200 space-y-4">
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <i class="fas fa-hashtag text-green-600"></i>
                판매 수량
              </label>
              <div class="flex items-center gap-2">
                <button onclick="decreaseSaleQuantity()" class="w-12 h-12 bg-slate-200 hover:bg-slate-300 rounded-lg transition-all">
                  <i class="fas fa-minus text-slate-700"></i>
                </button>
                <input type="number" id="sale-quantity" value="1" min="1" max="${data.current_stock || 0}"
                       class="flex-1 px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 text-center text-2xl font-bold text-green-900">
                <button onclick="increaseSaleQuantity(${data.current_stock || 0})" class="w-12 h-12 bg-green-600 hover:bg-green-700 rounded-lg transition-all">
                  <i class="fas fa-plus text-white"></i>
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <i class="fas fa-won-sign text-green-600"></i>
                판매 단가
              </label>
              <input type="number" id="sale-price" value="${data.product_price || 0}" min="0" step="100"
                     class="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 text-lg font-semibold"
                     oninput="updateTotalAmount()">
              <p class="text-xs text-slate-500 mt-2">
                <i class="fas fa-info-circle mr-1"></i>기준가: ${(data.product_price || 0).toLocaleString()}원
              </p>
            </div>

            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <i class="fas fa-calculator text-green-600"></i>
                총 판매금액
              </label>
              <div id="total-amount" class="px-4 py-4 bg-green-100 border-2 border-green-300 rounded-lg text-center">
                <span class="text-3xl font-bold text-green-900">${(data.product_price || 0).toLocaleString()}</span>
                <span class="text-xl text-green-700 ml-2">원</span>
              </div< /div>

            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <i class="fas fa-user text-green-600"></i>
                고객명 (선택사항)
              </label>
              <input type="text" id="customer-name" placeholder="고객명을 입력하세요..."
                     class="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500">
            </div>

            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <i class="fas fa-comment-alt text-green-600"></i>
                메모 (선택사항)
              </label>
              <textarea id="sale-notes" rows="2" placeholder="판매 관련 메모를 입력하세요..."
                        class="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"></textarea>
            </div>
          </div>

          <!-- 액션 버튼 -->
          <div class="flex gap-3 pt-4">
            <button onclick="confirmQRSale()" 
                    ${data.current_stock === 0 ? 'disabled' : ''}
                    class="flex-1 px-6 py-4 ${data.current_stock > 0 ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' : 'bg-slate-300 cursor-not-allowed'} text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all">
              <i class="fas fa-check-circle mr-2"></i>판매 확정
            </button>
            <button onclick="cancelQRScan()" 
                    class="px-6 py-4 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl font-semibold transition-all">
              <i class="fas fa-times mr-2"></i>취소
            </button>
          </div>
        </div>
      </div>
    `;
    resultContainer.classList.remove('hidden');

    // 대기 상태 숨기기
    const waiting = document.getElementById('scan-waiting-sale');
    if (waiting) waiting.classList.add('hidden');

    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// 수동 QR 입력
async function handleManualQRInput(type) {
  const inputId = type === 'inbound' ? 'manual-qr-input' : 'manual-qr-input-outbound';
  const input = document.getElementById(inputId);
  const qrCode = input?.value?.trim();

  if (!qrCode) {
    showToast('QR 코드를 입력하세요', 'error');
    return;
  }

  await processScannedQR(qrCode, type);

  // 입력 필드 초기화
  if (input) input.value = '';
}

// QR 입고 확정
async function confirmQRInbound() {
  if (!currentScannedData) {
    showToast('먼저 QR 코드를 스캔하세요', 'error');
    return;
  }

  const quantity = parseInt(document.getElementById('inbound-quantity')?.value || '0');
  const warehouseId = document.getElementById('inbound-warehouse')?.value;
  const notes = document.getElementById('inbound-notes')?.value?.trim();

  if (!quantity || quantity < 1) {
    showToast('올바른 수량을 입력하세요', 'error');
    return;
  }

  if (!warehouseId) {
    showToast('창고를 선택하세요', 'error');
    return;
  }

  try {
    const res = await fetch('/api/qr/inbound', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.authToken}`
      },
      body: JSON.stringify({
        qr_code: currentScannedData.qr_code,
        quantity,
        warehouse_id: parseInt(warehouseId),
        notes
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || '입고 처리 실패');
    }

    const data = await res.json();

    showToast(`✅ 입고 완료! ${data.transaction.product_name} (${quantity}개)`, 'success');

    // 폼 초기화
    currentScannedData = null;
    document.getElementById('qr-scan-result')?.classList.add('hidden');
    document.getElementById('inbound-quantity').value = '1';
    document.getElementById('inbound-notes').value = '';

    // 입고 이력 새로고침
    await loadInboundHistory();

  } catch (error) {
    console.error('QR 입고 확정 실패:', error);
    showToast(error.message || '입고 처리에 실패했습니다', 'error');
  }
}

// QR 출고 확정
async function confirmQROutbound() {
  if (!currentScannedData) {
    showToast('먼저 QR 코드를 스캔하세요', 'error');
    return;
  }

  const quantity = parseInt(document.getElementById('outbound-quantity')?.value || '0');
  const warehouseId = document.getElementById('outbound-warehouse')?.value;
  const notes = document.getElementById('outbound-notes')?.value?.trim();

  if (!quantity || quantity < 1) {
    showToast('올바른 수량을 입력하세요', 'error');
    return;
  }

  if (!warehouseId) {
    showToast('창고를 선택하세요', 'error');
    return;
  }

  try {
    const res = await fetch('/api/qr/outbound', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.authToken}`
      },
      body: JSON.stringify({
        qr_code: currentScannedData.qr_code,
        quantity,
        warehouse_id: parseInt(warehouseId),
        notes
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || '출고 처리 실패');
    }

    const data = await res.json();

    showToast(`✅ 출고 완료! ${data.transaction.product_name} (${quantity}개)`, 'success');

    // 폼 초기화
    currentScannedData = null;
    document.getElementById('qr-outbound-result')?.classList.add('hidden');

    // 출고 이력 새로고침
    await loadOutboundHistory();

  } catch (error) {
    console.error('QR 출고 확정 실패:', error);
    showToast(error.message || '출고 처리에 실패했습니다', 'error');
  }
}

// 입고 이력 로드
async function loadInboundHistory() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/qr/transactions/inbound?date=${today}&limit=10`, {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!res.ok) throw new Error('Failed to load history');

    const data = await res.json();
    renderInboundHistory(data.transactions);
  } catch (error) {
    console.error('입고 이력 로드 실패:', error);
  }
}

// 입고 이력 렌더링
function renderInboundHistory(transactions) {
  const container = document.getElementById('qr-inbound-history');
  if (!container) return;

  if (!transactions || transactions.length === 0) {
    container.innerHTML = '<p class="text-center text-slate-400 py-8">입고 이력이 없습니다</p>';
    return;
  }

  container.innerHTML = transactions.map(tx => `
    <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <h4 class="font-semibold text-blue-900">${tx.product_name}</h4>
          <p class="text-sm text-slate-600">수량: ${tx.quantity}개 | 창고: ${tx.warehouse_name}</p>
          <p class="text-xs text-slate-500">시간: ${new Date(tx.created_at).toLocaleString('ko-KR')}</p>
          ${tx.notes ? `<p class="text-xs text-slate-600 mt-1">메모: ${tx.notes}</p>` : ''}
        </div>
        <div class="text-blue-600">
          <i class="fas fa-check-circle text-2xl"></i>
        </div>
      </div>
    </div>
  `).join('');
}

// 출고 이력 로드
async function loadOutboundHistory() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/qr/transactions/outbound?date=${today}&limit=10`, {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!res.ok) throw new Error('Failed to load history');

    const data = await res.json();
    renderOutboundHistory(data.transactions);
  } catch (error) {
    console.error('출고 이력 로드 실패:', error);
  }
}

// 출고 이력 렌더링
function renderOutboundHistory(transactions) {
  const container = document.getElementById('qr-outbound-history');
  if (!container) return;

  if (!transactions || transactions.length === 0) {
    container.innerHTML = '<p class="text-center text-slate-400 py-8">출고 이력이 없습니다</p>';
    return;
  }

  container.innerHTML = transactions.map(tx => `
    <div class="p-4 bg-orange-50 rounded-lg border border-orange-200">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <h4 class="font-semibold text-orange-900">${tx.product_name}</h4>
          <p class="text-sm text-slate-600">수량: ${tx.quantity}개 | 창고: ${tx.warehouse_name}</p>
          <p class="text-xs text-slate-500">시간: ${new Date(tx.created_at).toLocaleString('ko-KR')}</p>
          ${tx.notes ? `<p class="text-xs text-slate-600 mt-1">메모: ${tx.notes}</p>` : ''}
        </div>
        <div class="text-orange-600">
          <i class="fas fa-check-circle text-2xl"></i>
        </div>
      </div>
    </div>
  `).join('');
}

// QR 스캔 취소
function cancelQRScan() {
  currentScannedData = null;
  document.getElementById('qr-scan-result')?.classList.add('hidden');
  document.getElementById('qr-outbound-result')?.classList.add('hidden');
  document.getElementById('qr-sale-result')?.classList.add('hidden');

  // 대기 상태 다시 표시
  showScanWaiting(true);  // 입고 대기 표시
  const waitingOutbound = document.getElementById('scan-waiting-outbound');
  if (waitingOutbound) waitingOutbound.classList.remove('hidden');

  const waitingSale = document.getElementById('scan-waiting-sale');
  if (waitingSale) waitingSale.classList.remove('hidden');
}

// QR 판매 확정
async function confirmQRSale() {
  if (!currentScannedData) {
    showToast('먼저 QR 코드를 스캔하세요', 'error');
    return;
  }

  const quantity = parseInt(document.getElementById('sale-quantity')?.value || '0');
  const salePrice = parseInt(document.getElementById('sale-price')?.value || '0');
  const customerName = document.getElementById('customer-name')?.value?.trim();
  const notes = document.getElementById('sale-notes')?.value?.trim();

  if (!quantity || quantity < 1) {
    showToast('올바른 수량을 입력하세요', 'error');
    return;
  }

  if (salePrice < 0) {
    showToast('올바른 판매가를 입력하세요', 'error');
    return;
  }

  try {
    const res = await fetch('/api/qr/sale', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.authToken}`
      },
      body: JSON.stringify({
        qr_code: currentScannedData.qr_code,
        quantity,
        sale_price: salePrice,
        customer_name: customerName,
        notes
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || '판매 처리 실패');
    }

    const data = await res.json();

    showToast(`✅ 판매 완료! ${data.transaction.product_name} (${quantity}개)`, 'success');

    // 폼 초기화
    cancelQRScan(); // 스캔 상태 초기화 및 대기 화면 표시

    // 판매 이력 새로고침
    await loadSaleHistory();

  } catch (error) {
    console.error('QR 판매 확정 실패:', error);
    showToast(error.message || '판매 처리에 실패했습니다', 'error');
  }
}

// 판매 이력 로드
async function loadSaleHistory() {
  const historyContainer = document.getElementById('qr-sale-history');
  if (!historyContainer) return;

  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/qr/transactions/sale?date=${today}`, {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!res.ok) throw new Error('Failed to load history');

    const data = await res.json();
    renderSaleHistory(data.transactions);
  } catch (error) {
    console.error('판매 이력 로드 실패:', error);
    historyContainer.innerHTML = '<p class="text-center text-red-500 py-4">이력을 불러오는데 실패했습니다</p>';
  }
}

// 판매 이력 렌더링
function renderSaleHistory(transactions) {
  const container = document.getElementById('qr-sale-history');
  if (!container) return;

  if (!transactions || transactions.length === 0) {
    container.innerHTML = '<p class="text-center text-slate-400 py-8">오늘 판매 내역이 없습니다</p>';
    return;
  }

  container.innerHTML = transactions.map(tx => `
    <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-green-300 transition-colors">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm">
          <i class="fas fa-box text-green-600"></i>
        </div>
        <div>
          <h4 class="font-bold text-slate-800">${tx.product_name}</h4>
          <p class="text-sm text-slate-500">
            <span class="font-mono bg-slate-200 px-1 rounded text-xs mr-2">${tx.qr_code}</span>
            ${new Date(tx.created_at).toLocaleTimeString()}
          </p>
        </div>
      </div>
      <div class="text-right">
        <span class="block text-lg font-bold text-green-600">-${tx.quantity}개</span>
        <span class="text-xs text-slate-500">${tx.user_name}</span>
      </div>
    </div>
  `).join('');
}

// QR 코드 생성
async function generateQRCodes() {
  const productId = document.getElementById('qr-product-select')?.value;
  const quantity = parseInt(document.getElementById('qr-generate-quantity')?.value || '1');

  if (!productId) {
    showToast('제품을 선택하세요', 'error');
    return;
  }

  if (quantity < 1 || quantity > 100) {
    showToast('수량은 1-100 사이여야 합니다', 'error');
    return;
  }

  try {
    const res = await fetch('/api/qr/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.authToken}`
      },
      body: JSON.stringify({
        product_id: parseInt(productId),
        quantity: quantity,
        type: 'product'
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'QR 코드 생성 실패');
    }

    showToast(`✅ ${data.codes.length}개의 QR 코드가 생성되었습니다!`, 'success');

    // 목록 새로고침
    await loadQRCodeList();

    // 폼 초기화
    document.getElementById('qr-product-select').value = '';
    document.getElementById('qr-generate-quantity').value = '1';

  } catch (error) {
    console.error('QR 코드 생성 실패:', error);
    showToast(error.message || 'QR 코드 생성에 실패했습니다', 'error');
  }
}

// QR 코드 다운로드
async function downloadQRCode(qrCode, productName) {
  try {
    const canvas = document.createElement('canvas');

    // 고해상도 QR 코드 생성
    await window.QRCode.toCanvas(canvas, qrCode, {
      width: 512,
      margin: 2,
      color: {
        dark: '#4c1d95',
        light: '#ffffff'
      }
    });

    // 캔버스를 이미지로 변환하여 다운로드
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR-${productName.replace(/\s+/g, '_')}-${qrCode}.png`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('QR 코드가 다운로드되었습니다', 'success');
    });
  } catch (error) {
    console.error('QR 코드 다운로드 실패:', error);
    showToast('QR 코드 다운로드에 실패했습니다', 'error');
  }
}

// QR 코드 라벨 출력 (PDF)
async function printQRLabel(qrCode, productName) {
  try {
    // jsPDF 로드 체크
    if (!window.jspdf) {
      showToast('PDF 라이브러리를 로드 중입니다...', 'info');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [80, 50] // 라벨 용지 크기 (80mm x 50mm)
    });

    // QR 코드 생성
    const canvas = document.createElement('canvas');
    await window.QRCode.toCanvas(canvas, qrCode, {
      width: 200,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    });
    const qrDataUrl = canvas.toDataURL('image/png');

    // PDF 디자인
    doc.setLineWidth(0.5);
    doc.rect(2, 2, 76, 46); // 테두리

    // QR 이미지
    doc.addImage(qrDataUrl, 'PNG', 4, 10, 30, 30);

    // 텍스트 정보
    doc.setFontSize(10);
    doc.text("Product Info", 36, 12);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(qrCode, 36, 20);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${new Date().toLocaleDateString('en-US')}`, 36, 28);

    doc.setFontSize(8);
    doc.text("WOW3D Stock Manager", 36, 42);

    // 자동 인쇄 및 열기
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');

  } catch (error) {
    console.error('라벨 출력 실패:', error);
    showToast('라벨 생성 중 오류가 발생했습니다', 'error');
  }
}

// 동적 스크립트 로드 헬퍼
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// QR 대시보드 새로고침
async function refreshQRDashboard() {
  await loadQRDashboardData();
  showToast('대시보드를 새로고침했습니다', 'success');
}

// ================================================
// QR 현장 — 탭 셸 (제조실행과 동일한 메뉴 트리 패턴)
// ================================================
window.loadQRFieldPage = async function (initialTab = 'dashboard') {
  const alias = {
    'qr-dashboard': 'dashboard',
    'qr-inbound': 'inbound',
    'qr-outbound': 'outbound',
    'qr-sale': 'sale',
    'qr-management': 'management'
  };
  const tab = alias[initialTab] || initialTab || 'dashboard';

  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">
          <i class="fas fa-qrcode mr-2 text-violet-600"></i>QR 현장
        </h1>
        <p class="text-sm text-slate-500 mt-1">현황 → 입고 → 출고 → 판매 → 라벨관리</p>
      </div>
    </div>

    <div class="flex mb-6 border-b border-slate-200 overflow-x-auto">
      <button onclick="switchQrTab('dashboard')" id="qr-tab-dashboard" class="px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap">1.현황</button>
      <button onclick="switchQrTab('inbound')" id="qr-tab-inbound" class="px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap">2.입고</button>
      <button onclick="switchQrTab('outbound')" id="qr-tab-outbound" class="px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap">3.출고</button>
      <button onclick="switchQrTab('sale')" id="qr-tab-sale" class="px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap">4.판매</button>
      <button onclick="switchQrTab('management')" id="qr-tab-management" class="px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap">5.라벨관리</button>
    </div>

    <div id="qr-tab-content"></div>
  `;

  await switchQrTab(tab);
};

window.switchQrTab = async function (tabName) {
  const tabs = ['dashboard', 'inbound', 'outbound', 'sale', 'management'];
  tabs.forEach((t) => {
    const btn = document.getElementById(`qr-tab-${t}`);
    if (!btn) return;
    if (t === tabName) {
      btn.classList.add('border-violet-600', 'text-violet-600');
      btn.classList.remove('border-transparent', 'text-slate-500');
    } else {
      btn.classList.remove('border-violet-600', 'text-violet-600');
      btn.classList.add('border-transparent', 'text-slate-500');
    }
  });

  // 사이드바 active 동기화
  document.querySelectorAll('.nav-link').forEach((link) => {
    const page = link.getAttribute('data-page');
    const tab = link.getAttribute('data-tab');
    if (page === 'qr' && tab === tabName) link.classList.add('active');
    else if (page === 'qr') link.classList.remove('active');
  });

  const titles = {
    dashboard: ['QR 현황', '실시간 QR 작업 현황 및 통계'],
    inbound: ['QR 입고', 'QR 스캔으로 간편 입고'],
    outbound: ['QR 출고', 'QR 스캔으로 간편 출고'],
    sale: ['QR 판매', 'QR 스캔으로 즉시 판매'],
    management: ['라벨관리', 'QR 코드 생성 및 라벨 출력']
  };
  if (typeof updatePageTitle === 'function') {
    const [title, desc] = titles[tabName] || titles.dashboard;
    updatePageTitle(title, desc);
  }

  const container = document.getElementById('qr-tab-content');
  if (!container) return;
  container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-violet-500"></i></div>';

  try {
    if (tabName === 'dashboard') await renderQRDashboardPage(container);
    else if (tabName === 'inbound') await renderQRInboundPage(container);
    else if (tabName === 'outbound') await renderQROutboundPage(container);
    else if (tabName === 'sale') await renderQRSalePage(container);
    else await renderQRManagementPage(container);
  } catch (e) {
    console.error(e);
    container.innerHTML = `<div class="text-center py-10 text-rose-600">${e.message || '페이지 로드 실패'}</div>`;
  }
};

// 전역으로 내보내기
window.renderQRDashboardPage = renderQRDashboardPage;
window.renderQRInboundPage = renderQRInboundPage;
window.renderQROutboundPage = renderQROutboundPage;
window.renderQRSalePage = renderQRSalePage;
window.renderQRManagementPage = renderQRManagementPage;
window.generateQRCodes = generateQRCodes;
window.downloadQRCode = downloadQRCode;
window.printQRLabel = printQRLabel;
window.startQRScan = startQRScan;
window.stopQRScan = stopQRScan;
window.handleManualQRInput = handleManualQRInput;
window.confirmQRInbound = confirmQRInbound;
window.confirmQROutbound = confirmQROutbound;
window.cancelQRScan = cancelQRScan;
window.refreshQRDashboard = refreshQRDashboard;
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;
window.increaseOutboundQuantity = increaseOutboundQuantity;
window.decreaseOutboundQuantity = decreaseOutboundQuantity;
window.increaseSaleQuantity = increaseSaleQuantity;
window.decreaseSaleQuantity = decreaseSaleQuantity;
window.confirmQRSale = confirmQRSale;
window.loadSaleHistory = loadSaleHistory;

console.log('✅ QR MES 모듈 로드 완료');
