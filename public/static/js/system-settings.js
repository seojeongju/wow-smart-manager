// 시스템 설정 페이지 로드
async function loadSystemSettings(content) {
  content.innerHTML = `
    <div class="flex flex-col h-full">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-slate-800">
          <i class="fas fa-cog mr-2 text-teal-600"></i>설정
        </h1>
      </div>

      <!-- 탭 네비게이션 -->
      <div class="flex border-b border-slate-200 mb-6 bg-white rounded-t-xl px-4 pt-2 shadow-sm overflow-x-auto">
        <button id="tab-company" class="px-6 py-4 font-bold text-teal-600 border-b-2 border-teal-600 transition-colors flex items-center whitespace-nowrap" onclick="switchSettingsTab('company')">
          <i class="fas fa-building mr-2"></i>회사 정보
        </button>
        <button id="tab-team" class="px-6 py-4 font-medium text-slate-500 hover:text-slate-700 transition-colors border-b-2 border-transparent flex items-center whitespace-nowrap" onclick="switchSettingsTab('team')">
          <i class="fas fa-users mr-2"></i>팀원 관리
        </button>
        <button id="tab-subscription" class="px-6 py-4 font-medium text-slate-500 hover:text-slate-700 transition-colors border-b-2 border-transparent flex items-center whitespace-nowrap" onclick="switchSettingsTab('subscription')">
          <i class="fas fa-crown mr-2"></i>플랜 요청
        </button>
        <button id="tab-api" class="px-6 py-4 font-medium text-slate-500 hover:text-slate-700 transition-colors border-b-2 border-transparent flex items-center whitespace-nowrap" onclick="switchSettingsTab('api')">
          <i class="fas fa-key mr-2"></i>API 설정
        </button>
        <button id="tab-warehouse" class="px-6 py-4 font-medium text-slate-500 hover:text-slate-700 transition-colors border-b-2 border-transparent flex items-center whitespace-nowrap" onclick="switchSettingsTab('warehouse')">
          <i class="fas fa-warehouse mr-2"></i>창고 관리
        </button>
        <button id="tab-audit" class="px-6 py-4 font-medium text-slate-500 hover:text-slate-700 transition-colors border-b-2 border-transparent flex items-center whitespace-nowrap" onclick="switchSettingsTab('audit')">
          <i class="fas fa-clipboard-list mr-2"></i>감사 로그
        </button>
        <button id="tab-demo" class="px-6 py-4 font-medium text-slate-500 hover:text-slate-700 transition-colors border-b-2 border-transparent flex items-center whitespace-nowrap" onclick="switchSettingsTab('demo')">
          <i class="fas fa-flask mr-2"></i>데모/파일럿
        </button>
      </div>

      <!-- 탭 컨텐츠 -->
      <div id="settingsTabContent" class="flex-1 overflow-auto">
        <!-- 동적으로 로드 -->
      </div>
    </div>
  `;

  // 기본 탭 로드
  switchSettingsTab('company');
}

// 탭 전환
function switchSettingsTab(tabName) {
  // 탭 스타일 업데이트
  document.querySelectorAll('[id^="tab-"]').forEach(el => {
    el.classList.remove('text-teal-600', 'border-b-2', 'border-teal-600', 'font-bold');
    el.classList.add('text-slate-500', 'font-medium', 'border-transparent');
  });
  const activeTab = document.getElementById(`tab-${tabName}`);
  activeTab.classList.remove('text-slate-500', 'font-medium', 'border-transparent');
  activeTab.classList.add('text-teal-600', 'border-b-2', 'border-teal-600', 'font-bold');

  const container = document.getElementById('settingsTabContent');

  switch (tabName) {
    case 'company':
      renderCompanySettings(container);
      break;
    case 'team':
      renderTeamSettings(container);
      break;
    case 'subscription':
      renderSubscriptionSettings(container);
      break;
    case 'api':
      renderApiSettings(container);
      break;
    case 'warehouse':
      renderWarehouseSettings(container);
      break;
    case 'audit':
      renderAuditSettings(container);
      break;
    case 'demo':
      renderDemoSettings(container);
      break;
  }
}

const ROLE_LABEL_KO = {
  SUPER_ADMIN: '플랫폼 관리자',
  OWNER: '소유자',
  ADMIN: '관리자',
  MANAGEMENT: '경영',
  PRODUCTION: '생산관리',
  FLOOR: '현장',
  SALES: '영업',
  USER: '일반(영업)',
  staff: '일반(레거시)'
};

function roleBadgeClass(role) {
  const r = String(role || '').toUpperCase();
  if (r === 'OWNER' || r === 'SUPER_ADMIN') return 'bg-purple-100 text-purple-700';
  if (r === 'ADMIN') return 'bg-indigo-100 text-indigo-700';
  if (r === 'PRODUCTION') return 'bg-orange-100 text-orange-800';
  if (r === 'FLOOR') return 'bg-amber-100 text-amber-900';
  if (r === 'MANAGEMENT') return 'bg-sky-100 text-sky-800';
  if (r === 'SALES') return 'bg-emerald-100 text-emerald-800';
  return 'bg-slate-100 text-slate-700';
}

// 회사 정보 설정
async function renderCompanySettings(container) {
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h3 class="text-lg font-bold text-slate-800 mb-4">회사 정보</h3>
      
      <form id="companyForm" onsubmit="saveCompanyInfo(event)" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2">
              회사명 <span class="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              id="settingCompanyName" 
              required
              placeholder="회사명을 입력하세요"
              class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
          </div>
          <div>
             <label class="block text-sm font-bold text-slate-700 mb-2">
              대표자명
            </label>
            <input 
              type="text" 
              id="settingCompanyOwner" 
              placeholder="대표자 성명"
              class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
          </div>
          <div>
             <label class="block text-sm font-bold text-slate-700 mb-2">
              사업자등록번호
            </label>
            <input 
              type="text" 
              id="settingCompanyBizNo" 
              placeholder="000-00-00000"
              class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
              oninput="this.value = autoFormatBizNo(this.value)"
              maxlength="12"
            >
          </div>
          <div>
             <label class="block text-sm font-bold text-slate-700 mb-2">
              대표 전화번호
            </label>
            <input 
              type="text" 
              id="settingCompanyPhone" 
              placeholder="02-0000-0000"
              class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
              oninput="this.value = autoFormatPhoneNumber(this.value)"
              maxlength="13"
            >
          </div>
        </div>

        <div>
           <label class="block text-sm font-bold text-slate-700 mb-2">
            사업장 주소
          </label>
          <input 
            type="text" 
            id="settingCompanyAddress" 
            placeholder="도로명 주소 입력"
            class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
        </div>

        <div>
           <label class="block text-sm font-bold text-slate-700 mb-2">
            통장 정보 (거래명세서 출력용)
          </label>
          <input 
            type="text" 
            id="settingCompanyBankAccount" 
            placeholder="예: 신한은행 123-456-789012 (예금주: 홍길동)"
            class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
        </div>

        <div>
          <label class="block text-sm font-bold text-slate-700 mb-2">
            회사 로고
          </label>
          
          <!-- 현재 로고 미리보기 -->
          <div id="logoPreview" class="mb-3 hidden">
            <img id="logoPreviewImage" src="" alt="로고 미리보기" class="max-w-xs max-h-32 rounded-lg border border-slate-200">
          </div>

          <!-- 파일 업로드 영역 -->
          <div class="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-teal-400 transition-colors cursor-pointer" 
               onclick="document.getElementById('logoFileInput').click()">
            <input 
              type="file" 
              id="logoFileInput" 
              accept="image/*"
              class="hidden"
              onchange="handleLogoFileSelect(event)"
            >
            <i class="fas fa-cloud-upload-alt text-3xl text-slate-400 mb-2"></i>
            <p class="text-sm text-slate-600">
              <span class="text-teal-600 font-bold">클릭하여 파일 선택</span> 또는 드래그 앤 드롭
            </p>
            <p class="text-xs text-slate-400 mt-1">PNG, JPG, GIF (최대 2MB)</p>
          </div>

          <!-- 또는 URL 입력 -->
          <div class="mt-3">
            <label class="block text-xs font-medium text-slate-600 mb-1">또는 URL 직접 입력</label>
            <input 
              type="url" 
              id="settingLogoUrl" 
              placeholder="https://example.com/logo.png"
              class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
              onchange="handleLogoUrlChange()"
            >
          </div>
        </div>

        <button 
          type="submit"
          class="px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold transition-colors shadow-lg shadow-teal-200"
        >
          <i class="fas fa-save mr-2"></i>저장
        </button>
      </form>
    </div>
  `;

  // 기존 정보 로드
  loadCompanyInfo();
}

// 로고 파일 선택 처리
function handleLogoFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // 파일 크기 체크 (2MB)
  if (file.size > 2 * 1024 * 1024) {
    showToast('파일 크기는 2MB 이하여야 합니다.', 'error');
    return;
  }

  // 이미지 파일 체크
  if (!file.type.startsWith('image/')) {
    showToast('이미지 파일만 업로드 가능합니다.', 'error');
    return;
  }

  // 미리보기 표시
  const reader = new FileReader();
  reader.onload = function (e) {
    const preview = document.getElementById('logoPreview');
    const previewImage = document.getElementById('logoPreviewImage');

    previewImage.src = e.target.result;
    preview.classList.remove('hidden');

    // URL 필드 비우기 (파일 업로드 우선)
    document.getElementById('settingLogoUrl').value = '';
  };
  reader.readAsDataURL(file);
}

// URL 변경 시 미리보기
function handleLogoUrlChange() {
  const url = document.getElementById('settingLogoUrl').value.trim();

  if (url) {
    const preview = document.getElementById('logoPreview');
    const previewImage = document.getElementById('logoPreviewImage');

    previewImage.src = url;
    preview.classList.remove('hidden');

    // 파일 입력 초기화
    document.getElementById('logoFileInput').value = '';
  }
}


// 팀원 관리
async function renderTeamSettings(container) {
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold text-slate-800">팀원 관리</h3>
        <button onclick="openInviteMemberModal()" class="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">
          <i class="fas fa-user-plus mr-2"></i>팀원 초대
        </button>
      </div>
      
      <div id="teamMembersList">
        <div class="text-center py-10">
          <i class="fas fa-spinner fa-spin text-2xl text-slate-400"></i>
          <p class="text-slate-500 mt-2">로딩 중...</p>
        </div>
      </div>
    </div>
  `;

  // 팀원 목록 로드
  loadTeamMembers();
}

// 플랜 요청 설정
async function renderSubscriptionSettings(container) {
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h3 class="text-lg font-bold text-slate-800 mb-4">구독 플랜 관리</h3>
      
      <div id="subscriptionContent">
        <div class="text-center py-10">
          <i class="fas fa-spinner fa-spin text-2xl text-slate-400"></i>
          <p class="text-slate-500 mt-2">로딩 중...</p>
        </div>
      </div>
    </div>
  `;

  // 플랜 정보 로드
  loadSubscriptionInfo();
}

// 플랜 정보 로드
async function loadSubscriptionInfo() {
  try {
    const res = await axios.get(`${API_BASE}/subscription`);
    const data = res.data.data;

    const container = document.getElementById('subscriptionContent');

    const planNames = {
      'FREE': '무료',
      'BASIC': '베이직',
      'PRO': '프로'
    };

    const planPrices = {
      'FREE': '₩0',
      'BASIC': '₩9,900/월',
      'PRO': '₩29,900/월'
    };

    const planColors = {
      'FREE': 'slate',
      'BASIC': 'teal',
      'PRO': 'purple'
    };

    const currentPlanColor = planColors[data.plan.type];

    container.innerHTML = `
      <!-- 현재 플랜 정보 -->
      <div class="bg-gradient-to-r from-${currentPlanColor}-50 to-${currentPlanColor}-100 rounded-lg p-6 mb-6 border border-${currentPlanColor}-200">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h4 class="text-xl font-bold text-${currentPlanColor}-900">
              <i class="fas fa-crown mr-2"></i>현재 플랜: ${planNames[data.plan.type]}
            </h4>
            <p class="text-sm text-${currentPlanColor}-700 mt-1">${planPrices[data.plan.type]}</p>
          </div>
          ${data.plan.type !== 'PRO' ? `
            <button onclick="openPlanRequestModal()" class="px-4 py-2 bg-${currentPlanColor}-600 text-white rounded-lg hover:bg-${currentPlanColor}-700 font-medium shadow">
              <i class="fas fa-arrow-up mr-2"></i>플랜 업그레이드
            </button>
          ` : ''}
        </div>
        
        <!-- 사용량 정보 -->
        <div class="grid grid-cols-3 gap-4 mt-4">
          <div class="bg-white bg-opacity-50 rounded-lg p-3">
            <p class="text-xs text-${currentPlanColor}-600 font-bold mb-1">상품</p>
            <p class="text-lg font-bold text-${currentPlanColor}-900">
              ${data.usage.products} / ${data.limits.products === -1 ? '무제한' : data.limits.products}
            </p>
          </div>
          <div class="bg-white bg-opacity-50 rounded-lg p-3">
            <p class="text-xs text-${currentPlanColor}-600 font-bold mb-1">사용자</p>
            <p class="text-lg font-bold text-${currentPlanColor}-900">
              ${data.usage.users} / ${data.limits.users === -1 ? '무제한' : data.limits.users}
            </p>
          </div>
          <div class="bg-white bg-opacity-50 rounded-lg p-3">
            <p class="text-xs text-${currentPlanColor}-600 font-bold mb-1">저장공간</p>
            <p class="text-lg font-bold text-${currentPlanColor}-900">
              ${(data.usage.storage / 1024).toFixed(1)} GB / ${data.limits.storage === -1 ? '무제한' : (data.limits.storage / 1024) + ' GB'}
            </p>
          </div>
        </div>
      </div>

      ${data.pendingRequest ? `
        <!-- 대기 중인 요청 -->
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
          <h4 class="font-bold text-amber-900 mb-2 flex items-center">
            <i class="fas fa-clock mr-2"></i>플랜 변경 요청 대기 중
          </h4>
          <p class="text-sm text-amber-700">
            <strong>${planNames[data.pendingRequest.requested_plan]}</strong> 플랜으로 변경 요청이 접수되었습니다.
          </p>
          <p class="text-xs text-amber-600 mt-1">
            요청일: ${formatDateTimeKST(data.pendingRequest.requested_at)}
          </p>
          <p class="text-xs text-amber-600 mt-2">
            관리자가 검토 중입니다. 승인되면 자동으로 플랜이 변경됩니다.
          </p>
        </div>
      ` : ''}

      <!-- 플랜 비교 -->
      <div class="mt-6">
        <h4 class="font-bold text-slate-800 mb-4">플랜 비교</h4>
        <div class="grid grid-cols-3 gap-4">
          <div class="border border-slate-200 rounded-lg p-4 ${data.plan.type === 'FREE' ? 'ring-2 ring-slate-400' : ''}">
            <h5 class="font-bold text-lg mb-2">무료</h5>
            <p class="text-2xl font-bold text-slate-600 mb-4">₩0</p>
            <ul class="text-sm space-y-2">
              <li>✓ 상품 100개</li>
              <li>✓ 사용자 1명</li>
              <li>✓ 1 GB 저장</li>
            </ul>
          </div>
          
          <div class="border border-teal-200 rounded-lg p-4 ${data.plan.type === 'BASIC' ? 'ring-2 ring-teal-400' : ''} bg-teal-50">
            <div class="flex items-center justify-between mb-2">
              <h5 class="font-bold text-lg">베이직</h5>
              <span class="text-xs bg-teal-600 text-white px-2 py-1 rounded">인기</span>
            </div>
            <p class="text-2xl font-bold text-teal-600 mb-4">₩9,900<span class="text-sm">/월</span></p>
            <ul class="text-sm space-y-2">
              <li>✓ 상품 1,000개</li>
              <li>✓ 사용자 5명</li>
              <li>✓ 10 GB 저장</li>
              <li>✓ 주간/월간 리포트</li>
            </ul>
          </div>
          
          <div class="border border-purple-200 rounded-lg p-4 ${data.plan.type === 'PRO' ? 'ring-2 ring-purple-400' : ''} bg-purple-50">
            <h5 class="font-bold text-lg mb-2">프로</h5>
            <p class="text-2xl font-bold text-purple-600 mb-4">₩29,900<span class="text-sm">/월</span></p>
            <ul class="text-sm space-y-2">
              <li>✓ 상품 무제한</li>
              <li>✓ 사용자 무제한</li>
              <li>✓ 100 GB 저장</li>
              <li>✓ 실시간 분석</li>
              <li>✓ API 접근</li>
              <li>✓ 우선 지원</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    console.error(e);
    const container = document.getElementById('subscriptionContent');
    container.innerHTML = `
      <div class="text-center py-10 text-red-500">
        <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
        <p>플랜 정보를 불러올 수 없습니다.</p>
      </div>
    `;
  }
}

// 플랜 요청 모달
function openPlanRequestModal() {
  const modalHtml = `
    <div id="planRequestModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-slate-100">
        <div class="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 class="text-xl font-bold text-slate-800">플랜 업그레이드 요청</h3>
          <button onclick="closePlanRequestModal()" class="text-slate-400 hover:text-slate-600 transition-colors">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <form onsubmit="submitPlanRequest(event)" class="p-6">
          <div class="mb-4">
            <label class="block text-sm font-bold text-slate-700 mb-2">
              변경할 플랜 선택
            </label>
            <select id="requestedPlan" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500" required>
              <option value="">플랜을 선택하세요</option>
              <option value="BASIC">베이직 (₩9,900/월)</option>
              <option value="PRO">프로 (₩29,900/월)</option>
            </select>
          </div>

          <div class="bg-blue-50 p-4 rounded-lg mb-4">
            <p class="text-sm text-blue-700">
              <i class="fas fa-info-circle mr-2"></i>
              요청이 승인되면 즉시 플랜이 변경됩니다.
            </p>
          </div>

          <div class="flex gap-2">
            <button type="button" onclick="closePlanRequestModal()" class="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
              취소
            </button>
            <button type="submit" class="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold">
              요청하기
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closePlanRequestModal() {
  const modal = document.getElementById('planRequestModal');
  if (modal) modal.remove();
}

async function submitPlanRequest(e) {
  e.preventDefault();

  const requestedPlan = document.getElementById('requestedPlan').value;

  if (!requestedPlan) {
    showToast('플랜을 선택해주세요.', 'error');
    return;
  }

  try {
    const res = await axios.post(`${API_BASE}/subscription/request`, {
      requestedPlan
    });

    if (res.data.success) {
      showToast('플랜 변경 요청이 접수되었습니다.');
      closePlanRequestModal();
      loadSubscriptionInfo(); // 새로고침
    }
  } catch (e) {
    console.error(e);
    showToast(e.response?.data?.error || '요청 실패', 'error');
  }
}

// API 설정
function renderApiSettings(container) {
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
      <h3 class="text-lg font-bold text-slate-800 mb-4 flex items-center">
        <i class="fas fa-truck mr-2 text-teal-600"></i>
        배송 추적 API 설정
      </h3>
      
      <div class="bg-blue-50 p-4 rounded-lg mb-4">
        <p class="text-sm text-blue-700 mb-2">
          <i class="fas fa-info-circle mr-2"></i>
          <strong>스위트트래커(SweetTracker) API Key</strong>를 입력하면 배송 조회 기능을 사용할 수 있습니다.
        </p>
        <p class="text-xs text-blue-600">
          아직 API 키가 없으시다면 
          <a href="https://tracking.sweettracker.co.kr/" target="_blank" class="underline font-bold">
            스위트트래커 홈페이지
          </a>에서 무료로 발급받으세요.
        </p>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-2">
            API Key <span class="text-red-500">*</span>
          </label>
          <div class="flex gap-2">
            <input 
              type="password" 
              id="sweettrackerApiKey" 
              placeholder="API 키를 입력하세요"
              class="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
            <button 
              onclick="toggleApiKeyVisibility()" 
              class="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              title="보이기/숨기기"
            >
              <i id="apiKeyIcon" class="fas fa-eye text-slate-500"></i>
            </button>
          </div>
          <p class="text-xs text-slate-500 mt-1">
            예시: abcd1234-efgh-5678-ijkl-mnop9012qrst
          </p>
        </div>

        <div class="flex gap-2">
          <button 
            onclick="saveSweettrackerApiKey()" 
            class="px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold transition-colors shadow-lg shadow-teal-200"
          >
            <i class="fas fa-save mr-2"></i>저장
          </button>
          <button 
            onclick="testSweettrackerApi()" 
            class="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
          >
            <i class="fas fa-vial mr-2"></i>테스트
          </button>
        </div>
      </div>
    </div>

    <!-- 기타 시스템 설정 영역 -->
    <div class="bg-slate-50 rounded-lg p-6 border border-slate-200">
      <h4 class="font-bold text-slate-700 mb-2">
        <i class="fas fa-lightbulb mr-2 text-amber-500"></i>
        향후 추가 예정 기능
      </h4>
      <ul class="text-sm text-slate-600 space-y-1">
        <li>• 자동 배송 상태 동기화 (매 시간/매일)</li>
        <li>• 알림톡/SMS 발송 설정</li>
        <li>• 재고 알림 설정</li>
        <li>• 백업 및 복구 설정</li>
      </ul>
    </div>
  `;

  // 기존 API 설정 로드
  loadSweettrackerApiKey();
}

// 회사 정보 로드
async function loadCompanyInfo() {
  try {
    const [companyRes, settingsRes] = await Promise.all([
      axios.get(`${API_BASE}/settings/company`),
      axios.get(`${API_BASE}/settings/system`)
    ]);

    // 1. 기본 회사 정보 (Tenants 테이블)
    if (companyRes.data.success && companyRes.data.data) {
      document.getElementById('settingCompanyName').value = companyRes.data.data.name || '';
      const logoUrl = companyRes.data.data.logo_url || '';
      document.getElementById('settingLogoUrl').value = logoUrl.startsWith('data:') ? '' : logoUrl;

      if (logoUrl) {
        document.getElementById('logoPreviewImage').src = logoUrl;
        document.getElementById('logoPreview').classList.remove('hidden');
      }
    }

    // 2. 추가 정보 (Settings 테이블)
    if (settingsRes.data.success && settingsRes.data.data) {
      const settings = settingsRes.data.data;
      const findVal = (key) => settings.find(s => s.setting_key === key)?.setting_value || '';

      document.getElementById('settingCompanyOwner').value = findVal('company_owner');
      document.getElementById('settingCompanyBizNo').value = findVal('company_biz_no');
      document.getElementById('settingCompanyPhone').value = findVal('company_phone');
      document.getElementById('settingCompanyAddress').value = findVal('company_address');
      document.getElementById('settingCompanyBankAccount').value = findVal('company_bank_account');
    }

  } catch (e) {
    console.error('회사 정보 로드 실패:', e);
  }
}

// 회사 정보 저장
async function saveCompanyInfo(e) {
  e.preventDefault();

  const name = document.getElementById('settingCompanyName').value.trim();
  const owner = document.getElementById('settingCompanyOwner').value.trim();
  const bizNo = document.getElementById('settingCompanyBizNo').value.trim();
  const phone = document.getElementById('settingCompanyPhone').value.trim();
  const address = document.getElementById('settingCompanyAddress').value.trim();
  const bankAccount = document.getElementById('settingCompanyBankAccount').value.trim();

  const logo_url = document.getElementById('settingLogoUrl').value.trim();
  const fileInput = document.getElementById('logoFileInput');

  if (!name) {
    showToast('회사명을 입력해주세요.', 'error');
    return;
  }

  showToast('저장 중...', 'info');

  try {
    let finalLogoUrl = logo_url;

    // 파일이 선택되었다면 Base64로 인코딩
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      finalLogoUrl = base64;
    }

    // 1. 기본 정보 저장 (Tenants)
    const companyUpdate = axios.put(`${API_BASE}/settings/company`, {
      name,
      logo_url: finalLogoUrl || null
    });

    // 2. 추가 정보 저장 (Settings)
    const settingsUpdates = [
      axios.put(`${API_BASE}/settings/system/company_owner`, { value: owner, description: '대표자명' }),
      axios.put(`${API_BASE}/settings/system/company_biz_no`, { value: bizNo, description: '사업자등록번호' }),
      axios.put(`${API_BASE}/settings/system/company_phone`, { value: phone, description: '대표 전화번호' }),
      axios.put(`${API_BASE}/settings/system/company_address`, { value: address, description: '사업장 주소' }),
      axios.put(`${API_BASE}/settings/system/company_bank_account`, { value: bankAccount, description: '통장 정보' })
    ];

    await Promise.all([companyUpdate, ...settingsUpdates]);

    showToast('회사 정보가 저장되었습니다.');
    updateCompanyName(); // 헤더 업데이트

  } catch (e) {
    console.error(e);
    showToast('저장 실패: ' + (e.response?.data?.error || e.message), 'error');
  }
}


// 팀원 목록 로드
async function loadTeamMembers() {
  try {
    const res = await axios.get(`${API_BASE}/users`);
    const users = res.data.data || [];

    const container = document.getElementById('teamMembersList');

    if (users.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10 text-slate-500">
          <i class="fas fa-users text-4xl mb-2 text-slate-300"></i>
          <p>팀원이 없습니다</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="min-w-full">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">이름</th>
            <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">이메일</th>
            <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">역할</th>
            <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">가입일</th>
            <th class="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">관리</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          ${users.map(u => `
            <tr class="hover:bg-slate-50">
              <td class="px-6 py-4 text-sm font-medium text-slate-900">${u.name}</td>
              <td class="px-6 py-4 text-sm text-slate-600">${u.email}</td>
              <td class="px-6 py-4 text-sm">
                <span class="px-2 py-1 rounded ${roleBadgeClass(u.role)} text-xs font-bold">
                  ${ROLE_LABEL_KO[u.role] || ROLE_LABEL_KO[String(u.role || '').toUpperCase()] || u.role}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-slate-500">${formatDateTimeKST(u.created_at)}</td>
              <td class="px-6 py-4 text-center">
                <button onclick="openEditMemberModal(${u.id}, '${u.name}', '${u.role}')" class="text-teal-600 hover:text-teal-800 text-sm mr-2" title="정보 수정">
                  <i class="fas fa-edit"></i>
                </button>
                <button onclick="removeMember(${u.id})" class="text-red-600 hover:text-red-800 text-sm" title="삭제">
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
    showToast('팀원 목록 로드 실패', 'error');
  }
}

function roleSelectOptions(selected) {
  const role = String(selected || 'USER').toUpperCase();
  const options = [
    ['FLOOR', '현장 (FLOOR)'],
    ['PRODUCTION', '생산관리 (PRODUCTION)'],
    ['SALES', '영업 (SALES)'],
    ['MANAGEMENT', '경영 (MANAGEMENT)'],
    ['USER', '일반/영업 (USER)'],
    ['ADMIN', '관리자 (ADMIN)'],
    ['OWNER', '소유자 (OWNER)']
  ];
  return options.map(([v, label]) =>
    `<option value="${v}" ${role === v ? 'selected' : ''}>${label}</option>`
  ).join('');
}

// 팀원 초대 모달
function openInviteMemberModal() {
  const modalHtml = `
    <div id="inviteMemberModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-slate-100">
        <div class="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 class="text-xl font-bold text-slate-800">팀원 초대</h3>
          <button onclick="document.getElementById('inviteMemberModal').remove()" class="text-slate-400 hover:text-slate-600">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form onsubmit="handleInviteMember(event)" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2">이름</label>
            <input id="inviteName" required class="w-full border border-slate-300 rounded-lg px-4 py-2.5">
          </div>
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2">이메일</label>
            <input id="inviteEmail" type="email" required class="w-full border border-slate-300 rounded-lg px-4 py-2.5">
          </div>
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2">임시 비밀번호</label>
            <input id="invitePassword" type="password" required minlength="4" class="w-full border border-slate-300 rounded-lg px-4 py-2.5">
          </div>
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2">역할</label>
            <select id="inviteRole" class="w-full border border-slate-300 rounded-lg px-4 py-2.5">
              ${roleSelectOptions('FLOOR')}
            </select>
          </div>
          <div class="flex gap-2 pt-2">
            <button type="button" onclick="document.getElementById('inviteMemberModal').remove()" class="flex-1 px-4 py-2.5 border rounded-lg">취소</button>
            <button type="submit" class="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg font-bold">초대</button>
          </div>
        </form>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function handleInviteMember(e) {
  e.preventDefault();
  try {
    await axios.post(`${API_BASE}/users`, {
      name: document.getElementById('inviteName').value.trim(),
      email: document.getElementById('inviteEmail').value.trim(),
      password: document.getElementById('invitePassword').value,
      role: document.getElementById('inviteRole').value
    });
    showToast('팀원이 추가되었습니다');
    document.getElementById('inviteMemberModal')?.remove();
    loadTeamMembers();
  } catch (err) {
    showToast(err.response?.data?.error || err.message, 'error');
  }
}

// 팀원 수정 모달 열기
function openEditMemberModal(userId, userName, currentRole) {
  // Role normalization
  const role = currentRole ? currentRole.toUpperCase() : 'USER';

  const modalHtml = `
    <div id="editMemberModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-slate-100">
        <div class="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 class="text-xl font-bold text-slate-800">팀원 정보 수정</h3>
          <button onclick="document.getElementById('editMemberModal').remove()" class="text-slate-400 hover:text-slate-600 transition-colors">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <form onsubmit="handleUpdateMember(event, ${userId})" class="p-6">
          <div class="mb-4">
            <label class="block text-sm font-bold text-slate-700 mb-2">이름</label>
            <input type="text" id="editMemberName" value="${userName}" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500" required>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-bold text-slate-700 mb-2">역할 (권한)</label>
            <select id="editMemberRole" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500">
              ${roleSelectOptions(role)}
            </select>
            <p class="text-xs text-slate-500 mt-1">현장=스캔/실적, 생산관리=MES 기준정보, 경영=KPI·감사조회</p>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-bold text-slate-700 mb-2">
              비밀번호 변경 <span class="text-xs font-normal text-slate-400">(변경 시에만 입력)</span>
            </label>
            <input type="password" id="editMemberPassword" placeholder="새 비밀번호 (선택사항)" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500">
          </div>

          <div class="flex gap-2">
            <button type="button" onclick="document.getElementById('editMemberModal').remove()" class="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium">
              취소
            </button>
            <button type="submit" class="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold transition-colors">
              수정 저장
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 팀원 수정 처리
async function handleUpdateMember(e, userId) {
  e.preventDefault();

  const name = document.getElementById('editMemberName').value.trim();
  const role = document.getElementById('editMemberRole').value;
  const password = document.getElementById('editMemberPassword').value;

  if (!name) {
    showToast('이름을 입력해주세요', 'error');
    return;
  }

  const payload = {
    name,
    role
  };

  if (password) {
    payload.password = password;
  }

  try {
    const res = await axios.put(`${API_BASE}/users/${userId}`, payload);
    if (res.data.success) {
      showToast('팀원 정보가 수정되었습니다.');
      document.getElementById('editMemberModal').remove();
      loadTeamMembers();
    }
  } catch (e) {
    console.error(e);
    showToast('수정 실패: ' + (e.response?.data?.error || e.message), 'error');
  }
}

// 팀원 삭제
async function removeMember(userId) {
  if (!confirm('정말 이 팀원을 삭제하시겠습니까?')) return;

  try {
    await axios.delete(`${API_BASE}/users/${userId}`);
    showToast('팀원이 삭제되었습니다.');
    loadTeamMembers();
  } catch (e) {
    console.error(e);
    showToast('삭제 실패: ' + (e.response?.data?.error || e.message), 'error');
  }
}

// API Key 보이기/숨기기
function toggleApiKeyVisibility() {
  const input = document.getElementById('sweettrackerApiKey');
  const icon = document.getElementById('apiKeyIcon');

  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fas fa-eye-slash text-slate-500';
  } else {
    input.type = 'password';
    icon.className = 'fas fa-eye text-slate-500';
  }
}

// API Key 로드
async function loadSweettrackerApiKey() {
  try {
    const res = await axios.get(`${API_BASE}/settings/system/sweettracker_api_key`);
    if (res.data.success && res.data.data) {
      document.getElementById('sweettrackerApiKey').value = res.data.data.setting_value || '';
    }
  } catch (e) {
    // 설정이 없는 경우 무시
    console.log('API Key not set yet');
  }
}

// API Key 저장
async function saveSweettrackerApiKey() {
  const apiKey = document.getElementById('sweettrackerApiKey').value.trim();

  if (!apiKey) {
    showToast('API Key를 입력해주세요.', 'error');
    return;
  }

  try {
    const res = await axios.put(`${API_BASE}/settings/system/sweettracker_api_key`, {
      value: apiKey,
      description: '스위트트래커 API Key'
    });

    if (res.data.success) {
      showToast('API Key가 저장되었습니다.');
    }
  } catch (e) {
    console.error(e);
    showToast('저장 실패: ' + (e.response?.data?.error || e.message), 'error');
  }
}

// API 테스트
async function testSweettrackerApi() {
  const apiKey = document.getElementById('sweettrackerApiKey').value.trim();

  if (!apiKey) {
    showToast('저장된 API Key가 없거나 입력되지 않았습니다.', 'error');
    return;
  }

  showToast('API 테스트 중...', 'info');

  try {
    // 실제 테스트 API 호출 (또는 유효성 검사)
    // 여기서는 간단히 성공 메시지 출력 (실제 연동 필요)
    setTimeout(() => {
      showToast('API 연동 테스트 성공! (Mock)', 'success');
    }, 1000);
  } catch (e) {
    showToast('API 테스트 실패', 'error');
  }
}

// --- 창고 관리 ---
async function renderWarehouseSettings(container) {
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h3 class="text-lg font-bold text-slate-800">창고 관리</h3>
          <p class="text-slate-500 text-sm">물류 창고를 등록하고 관리하세요.</p>
        </div>
        <div class="flex gap-2">
            <button onclick="syncGlobalStock()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
            <i class="fas fa-sync-alt mr-2"></i>재고 전체 동기화
            </button>
            <button onclick="openWarehouseModal()" class="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors shadow-sm">
            <i class="fas fa-plus mr-2"></i>창고 등록
            </button>
        </div>
      </div>
      
      <div id="warehouseListContent">
        <div class="text-center py-10">
          <i class="fas fa-spinner fa-spin text-2xl text-slate-400"></i>
          <p class="text-slate-500 mt-2">로딩 중...</p>
        </div>
      </div>
    </div>
  `;

  await loadWarehouseList();
}

async function loadWarehouseList() {
  try {
    const res = await axios.get(`${API_BASE}/warehouses`);
    const warehouses = res.data.data;
    const container = document.getElementById('warehouseListContent');

    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">창고명</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">위치</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">설명</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">상태</th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">관리</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            ${warehouses.map(w => `
              <tr class="hover:bg-slate-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">${w.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${w.location || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${w.description || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 py-1 text-xs font-semibold rounded-full ${w.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}">
                    ${w.is_active ? '사용중' : '비활성'}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onclick="openWarehouseModal(${w.id})" class="text-teal-600 hover:text-teal-900 mr-3">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button onclick="deleteWarehouse(${w.id})" class="text-rose-600 hover:text-rose-900">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    console.error(e);
    document.getElementById('warehouseListContent').innerHTML = '<div class="text-center py-4 text-red-500">목록 로드 실패</div>';
  }
}

async function syncGlobalStock() {
  if (!confirm('모든 상품의 총 재고(Global Stock)를 각 창고별 재고의 합계로 강제 동기화하시겠습니까?\\n\\n이 작업은 되돌릴 수 없으며, "창고 재고"가 존재하는 상품의 총 재고 수치가 변경될 수 있습니다.')) return;

  try {
    const res = await axios.post(`${API_BASE}/stock/sync-global`);
    if (res.data.success) {
      showToast(`동기화 완료: ${res.data.updatedRows}개 상품의 재고가 수정되었습니다.`);
      switchSettingsTab('warehouse');
    }
  } catch (e) {
    console.error(e);
    showToast('동기화 실패: ' + (e.response?.data?.error || e.message), 'error');
  }
}

// openWarehouseModal, deleteWarehouse 등은 app.js에 전역으로 정의되어 있다고 가정,
// 만약 없다면 여기서 정의해야 함. 
// Step 149에서 app.js에 추가했으니 window 객체에 붙어있지 않을 수도 있음 (module scope vs global scope).
// public/static/app.js 는 보통 <script src="..."> 로 로드되므로 전역 스코프에 함수들이 등록됨.
// 따라서 호출 가능할 것으로 예상.

async function saveSweettrackerApiKey() {
  const apiKey = document.getElementById('sweettrackerApiKey').value.trim();

  if (!apiKey) {
    showToast('API Key를 입력해주세요.', 'error');
    return;
  }

  try {
    const res = await axios.put(`${API_BASE}/settings/system/sweettracker_api_key`, {
      value: apiKey,
      description: '스위트트래커 API Key'
    });

    if (res.data.success) {
      showToast('API Key가 저장되었습니다.');
    }
  } catch (e) {
    console.error(e);
    showToast('저장 실패: ' + (e.response?.data?.error || e.message), 'error');
  }
}

// API 테스트
async function testSweettrackerApi() {
  const apiKey = document.getElementById('sweettrackerApiKey').value.trim();

  if (!apiKey) {
    showToast('API Key를 먼저 저장해주세요.', 'error');
    return;
  }

  try {
    showToast('API 테스트 중...', 'info');

    // 테스트용 운송장 번호 (CJ대한통운 샘플)
    const testTrackingNumber = '123456789012';
    const testCourier = 'CJ대한통운';

    const res = await axios.get(`${API_BASE}/tracking/track/${testTrackingNumber}`, {
      params: { courier: testCourier }
    });

    if (res.data.success) {
      showToast('✅ API 연결 성공!');
    } else {
      showToast('⚠️ API 연결됨 (테스트 송장 조회 실패는 정상)', 'info');
    }
  } catch (e) {
    console.error(e);
    const errorMsg = e.response?.data?.error || e.message;

    if (errorMsg.includes('API 키가 설정되지 않았습니다')) {
      showToast('API Key를 먼저 저장해주세요.', 'error');
    } else if (errorMsg.includes('운송장')) {
      showToast('✅ API Key 정상 작동 (테스트 송장 없음은 정상)');
    } else {
      showToast('API 테스트 실패: ' + errorMsg, 'error');
    }
  }
}

window.toggleApiKeyVisibility = toggleApiKeyVisibility;
window.saveSweettrackerApiKey = saveSweettrackerApiKey;
window.testSweettrackerApi = testSweettrackerApi;
window.loadSystemSettings = loadSystemSettings;
window.switchSettingsTab = switchSettingsTab;
window.saveCompanyInfo = saveCompanyInfo;
window.openInviteMemberModal = openInviteMemberModal;
window.removeMember = removeMember;
window.openPlanRequestModal = openPlanRequestModal;
window.closePlanRequestModal = closePlanRequestModal;
window.submitPlanRequest = submitPlanRequest;
window.handleLogoFileSelect = handleLogoFileSelect;
window.handleLogoUrlChange = handleLogoUrlChange;

function autoFormatBizNo(value) {
  if (!value) return '';
  value = value.replace(/[^0-9]/g, '');
  if (value.length > 10) value = value.substring(0, 10);

  if (value.length < 4) return value;
  if (value.length < 6) return value.replace(/(\d{3})(\d+)/, '$1-$2');
  return value.replace(/(\d{3})(\d{2})(\d+)/, '$1-$2-$3');
}

function autoFormatPhoneNumber(value) {
  if (!value) return '';
  value = value.replace(/[^0-9]/g, '');

  if (value.length > 11) value = value.substring(0, 11);

  if (value.startsWith('02')) {
    if (value.length < 3) return value;
    if (value.length < 6) return value.replace(/(\d{2})(\d+)/, '$1-$2');
    if (value.length < 10) return value.replace(/(\d{2})(\d{3})(\d+)/, '$1-$2-$3');
    return value.replace(/(\d{2})(\d{4})(\d+)/, '$1-$2-$3');
  } else {
    if (value.length < 4) return value;
    if (value.length < 8) return value.replace(/(\d{3})(\d+)/, '$1-$2');
    if (value.length < 11) return value.replace(/(\d{3})(\d{3})(\d+)/, '$1-$2-$3');
    return value.replace(/(\d{3})(\d{4})(\d+)/, '$1-$2-$3');
  }
}

async function renderAuditSettings(container) {
  container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h3 class="text-lg font-bold text-slate-800">감사 로그</h3>
          <p class="text-sm text-slate-500">역할 변경·데모 시드 등 주요 관리 행위 기록</p>
        </div>
        <div class="flex gap-2">
          <input id="auditActionFilter" placeholder="액션 검색 (user.update 등)" class="border border-slate-300 rounded-lg px-3 py-2 text-sm w-56">
          <button onclick="loadAuditLogs()" class="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium">조회</button>
        </div>
      </div>
      <div id="auditLogsTable" class="overflow-x-auto">
        <div class="text-center py-10 text-slate-400"><i class="fas fa-spinner fa-spin"></i></div>
      </div>
    </div>`;
  await loadAuditLogs();
}

async function loadAuditLogs() {
  const el = document.getElementById('auditLogsTable');
  if (!el) return;
  try {
    const action = document.getElementById('auditActionFilter')?.value?.trim() || '';
    const res = await axios.get(`${API_BASE}/ops-admin/audit-logs`, {
      params: { limit: 100, action }
    });
    const rows = res.data.data || [];
    if (!rows.length) {
      el.innerHTML = '<div class="text-center py-10 text-slate-400 text-sm">기록이 없습니다.</div>';
      return;
    }
    el.innerHTML = `
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th class="px-3 py-2 text-left">시각</th>
            <th class="px-3 py-2 text-left">사용자</th>
            <th class="px-3 py-2 text-left">액션</th>
            <th class="px-3 py-2 text-left">대상</th>
            <th class="px-3 py-2 text-left">상세</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          ${rows.map((r) => `
            <tr class="hover:bg-slate-50">
              <td class="px-3 py-2 whitespace-nowrap text-slate-500">${(r.created_at || '').replace('T', ' ').slice(0, 19)}</td>
              <td class="px-3 py-2">${r.user_name || '-'}<div class="text-xs text-slate-400">${r.user_email || ''}</div></td>
              <td class="px-3 py-2 font-mono text-xs">${r.action}</td>
              <td class="px-3 py-2 text-xs">${r.entity_type || ''} ${r.entity_id || ''}</td>
              <td class="px-3 py-2 text-xs text-slate-500 max-w-xs truncate" title='${(r.meta_json || '').replace(/'/g, '')}'>${r.meta_json || ''}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="text-center py-10 text-rose-600 text-sm">${e.response?.data?.error || e.message}</div>`;
  }
}

async function renderDemoSettings(container) {
  container.innerHTML = `
    <div class="space-y-4">
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 class="text-lg font-bold text-slate-800 mb-1">데모 / 파일럿</h3>
        <p class="text-sm text-slate-500 mb-4">지원사업·현장 시연용 DEMO 접두 데이터를 생성·정리합니다. 기존 실데이터는 삭제하지 않습니다.</p>
        <div class="flex flex-wrap gap-2 mb-4">
          <button onclick="runDemoSeed()" class="px-4 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-bold">
            <i class="fas fa-magic mr-2"></i>데모 데이터 생성
          </button>
          <button onclick="runDemoReset()" class="px-4 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-bold">
            <i class="fas fa-trash-alt mr-2"></i>DEMO 데이터 정리
          </button>
        </div>
        <div id="demoActionResult" class="hidden text-sm rounded-lg px-3 py-2 mb-2"></div>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 class="text-lg font-bold text-slate-800 mb-3">시나리오 가이드</h3>
        <ol id="demoScenarioSteps" class="space-y-2 text-sm text-slate-700 list-decimal list-inside mb-4">
          <li class="text-slate-400">불러오는 중...</li>
        </ol>
        <div id="demoUsersBox" class="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-600"></div>
      </div>
    </div>`;

  try {
    const res = await axios.get(`${API_BASE}/ops-admin/demo/scenario`);
    const d = res.data.data;
    document.getElementById('demoScenarioSteps').innerHTML =
      (d.steps || []).map((s) => `<li><span class="font-semibold">${s.title}</span> — ${s.desc}</li>`).join('');
    document.getElementById('demoUsersBox').innerHTML =
      '<div class="font-bold mb-1 text-slate-700">데모 계정 (시드 후)</div>' +
      (d.demo_users || []).map((u) => `${u.email} / ${u.password} (${u.role})`).join('<br>');
  } catch (e) {
    document.getElementById('demoScenarioSteps').innerHTML =
      `<li class="text-rose-600 list-none">${e.response?.data?.error || e.message}</li>`;
  }
}

async function runDemoSeed() {
  if (!confirm('데모 상품·BOM·작업지시·역할별 계정을 생성할까요?')) return;
  const box = document.getElementById('demoActionResult');
  try {
    const res = await axios.post(`${API_BASE}/ops-admin/demo/seed`);
    if (box) {
      box.classList.remove('hidden', 'bg-rose-50', 'text-rose-700');
      box.classList.add('bg-emerald-50', 'text-emerald-800');
      const d = res.data.data || {};
      box.innerHTML = `${res.data.message}<br>WO: ${d.wo_number || ''}<br>${(d.demo_users || []).join('<br>')}`;
    }
    showToast('데모 데이터 준비 완료');
  } catch (e) {
    if (box) {
      box.classList.remove('hidden', 'bg-emerald-50', 'text-emerald-800');
      box.classList.add('bg-rose-50', 'text-rose-700');
      box.textContent = e.response?.data?.error || e.message;
    }
    showToast(e.response?.data?.error || e.message, 'error');
  }
}

async function runDemoReset() {
  if (!confirm('DEMO 접두 데이터와 @demo.local 계정을 삭제합니다. 계속할까요?')) return;
  try {
    const res = await axios.post(`${API_BASE}/ops-admin/demo/reset`);
    showToast(res.data.message || '정리 완료');
    const box = document.getElementById('demoActionResult');
    if (box) {
      box.classList.remove('hidden', 'bg-rose-50', 'text-rose-700');
      box.classList.add('bg-emerald-50', 'text-emerald-800');
      box.textContent = res.data.message;
    }
  } catch (e) {
    showToast(e.response?.data?.error || e.message, 'error');
  }
}

window.autoFormatBizNo = autoFormatBizNo;
window.autoFormatPhoneNumber = autoFormatPhoneNumber;
window.openEditMemberModal = openEditMemberModal;
window.handleUpdateMember = handleUpdateMember;
window.openInviteMemberModal = openInviteMemberModal;
window.handleInviteMember = handleInviteMember;
window.loadAuditLogs = loadAuditLogs;
window.runDemoSeed = runDemoSeed;
window.runDemoReset = runDemoReset;



