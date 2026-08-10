/* auth.js - 인증 및 세션 관리 */

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    window.location.replace('/login');
}

function updateCompanyName() {
    const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
    const companyNameEl = document.getElementById('companyName');

    if (companyNameEl && tenant.name) {
        companyNameEl.textContent = tenant.name;
        // Impersonation check
        if (localStorage.getItem('impersonatedTenantId')) {
            companyNameEl.textContent = `[접속] ${tenant.name}`;
            companyNameEl.classList.add('text-rose-400');
        }
    }

    const logoImg = document.getElementById('companyLogo');
    const placeholder = document.getElementById('companyLogoPlaceholder');

    if (logoImg && placeholder) {
        if (tenant.logo_url) {
            logoImg.src = tenant.logo_url;
            logoImg.classList.remove('hidden');
            placeholder.classList.add('hidden');
        } else {
            logoImg.classList.add('hidden');
            placeholder.classList.remove('hidden');
        }
    }
}

async function fetchUserInfo() {
    try {
        const res = await axios.get(`${API_BASE}/auth/me`);
        if (res.data.success) {
            const { user, tenant } = res.data.data;
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('tenant', JSON.stringify(tenant));
            // 여기서 전역 업데이트 호출
            if (window.updateUserUI) window.updateUserUI(user);
            updateCompanyName();
        }
    } catch (e) {
        console.error('Failed to fetch user info:', e);
        if (e.response && e.response.status === 401) {
            logout();
        }
    }
}

function exitImpersonation() {
    localStorage.removeItem('impersonatedTenantId');
    localStorage.removeItem('impersonatedTenantName');
    window.location.reload();
}

function checkImpersonationStatus() {
    const tenantId = localStorage.getItem('impersonatedTenantId');
    const tenantName = localStorage.getItem('impersonatedTenantName');

    if (tenantId && tenantName) {
        // 이미 배너가 있으면 스킵
        if (document.querySelector('.impersonation-banner')) return;

        const banner = document.createElement('div');
        banner.className = 'impersonation-banner bg-rose-600 text-white px-4 py-2 flex justify-between items-center shadow-md z-[100] relative';
        banner.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-user-secret text-xl mr-3"></i>
                <span class="font-bold">현재 '${tenantName}'(#${tenantId}) 조직으로 접속 중입니다. (슈퍼관리자 권한)</span>
            </div>
            <button onclick="exitImpersonation()" class="bg-white text-rose-600 px-4 py-1.5 rounded font-bold text-sm hover:bg-rose-50 transition-colors">
                <i class="fas fa-sign-out-alt mr-1"></i> 접속 종료
            </button>
        `;
        document.body.prepend(banner);

        // Sidebar indication update (updateCompanyName에서도 처리하지만 여기서도 확실히)
        const companyNameEl = document.getElementById('companyName');
        if (companyNameEl) {
            companyNameEl.textContent = `[접속] ${tenantName}`;
            companyNameEl.classList.add('text-rose-400');
        }
    }
}

window.logout = logout;
window.updateCompanyName = updateCompanyName;
window.fetchUserInfo = fetchUserInfo;
window.exitImpersonation = exitImpersonation;
window.checkImpersonationStatus = checkImpersonationStatus;
