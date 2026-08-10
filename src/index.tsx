import { Hono, Context } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings, Variables } from './types'
import { tenantMiddleware } from './middleware/tenant'

// API 라우트 import
import productsRouter from './routes/products'
import customersRouter from './routes/customers'
import salesRouter from './routes/sales'
import stockRouter from './routes/stock'
import dashboardRouter from './routes/dashboard'
import claimsRouter from './routes/claims'
import usersRouter from './routes/users'
import outboundRouter from './routes/outbound'
import warehouseRouter from './routes/warehouse'
import authRouter from './routes/auth'
import subscriptionRouter from './routes/subscription'
import importExportRouter from './routes/import-export'
import settingsRouter from './routes/settings'
import superAdminRouter from './routes/super-admin'
import suppliersRouter from './routes/suppliers'
import purchasesRouter from './routes/purchases'
import trackingRouter from './routes/tracking'
import diagnosticRouter from './routes/diagnostic'
import productOptionsRouter from './routes/product-options'
import pricesRouter from './routes/prices'
import qrRouter from './routes/qr'
import dashboardKpiRouter from './routes/dashboard-kpi'
import productionRouter from './routes/production'
import opsAdminRouter from './routes/ops-admin'
import barcodeRouter from './routes/barcode'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// CORS 활성화
app.use('/api/*', cors())

// 멀티테넌트 미들웨어 적용
app.use('/api/*', tenantMiddleware)

// API 라우트 등록
app.route('/api/auth', authRouter)
app.route('/api/subscription', subscriptionRouter)
app.route('/api/import-export', importExportRouter)
app.route('/api/products', productsRouter)
app.route('/api/product-options', productOptionsRouter)
app.route('/api/customers', customersRouter)
app.route('/api/sales', salesRouter)
app.route('/api/stock', stockRouter)
app.route('/api/dashboard', dashboardRouter)
app.route('/api/claims', claimsRouter)
app.route('/api/users', usersRouter)
app.route('/api/outbound', outboundRouter)
app.route('/api/warehouses', warehouseRouter)
app.route('/api/settings', settingsRouter)
app.route('/api/super-admin', superAdminRouter)
app.route('/api/suppliers', suppliersRouter)
app.route('/api/purchases', purchasesRouter)
app.route('/api/tracking', trackingRouter)
app.route('/api/diagnostic', diagnosticRouter)
app.route('/api/prices', pricesRouter)
app.route('/api/qr', qrRouter)
app.route('/api/dashboard-kpi', dashboardKpiRouter)
app.route('/api/production', productionRouter)
app.route('/api/ops-admin', opsAdminRouter)
app.route('/api/barcode', barcodeRouter)

// 슈퍼 관리자 페이지
app.get('/admin', (c: Context) => {
    return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>슈퍼 관리자 - WOW-Smart Manager</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f3f4f6; }
    </style>
</head>
<body class="text-gray-900">
    <div class="min-h-screen flex flex-col">
        <header class="bg-white shadow">
            <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                <h1 class="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
                <button onclick="logout()" class="text-sm text-red-600 hover:text-red-800">로그아웃</button>
            </div>
        </header>
        <main class="flex-1 max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
            <div class="px-4 py-6 sm:px-0">
                <div class="mb-6 flex space-x-4">
                    <button onclick="loadPendingTenants()" id="btnPending" class="px-4 py-2 bg-teal-600 text-white rounded-lg shadow hover:bg-teal-700 transition">승인 대기 목록</button>
                    <button onclick="loadAllTenants()" id="btnAll" class="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition">전체 테넌트</button>
                </div>
                
                <div class="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul id="tenantList" class="divide-y divide-gray-200">
                        <!-- 리스트 아이템이 여기에 렌더링됩니다 -->
                        <li class="px-4 py-8 text-center text-gray-500">로딩 중...</li>
                    </ul>
                </div>
            </div>
        </main>
    </div>

    <script>
        const API_BASE = '/api';
        const token = localStorage.getItem('token');
        
        // 인증 체크
        if (!token) {
            window.location.href = '/login';
        } else {
             const user = JSON.parse(localStorage.getItem('user') || '{}');
             // role 체크는 서버에서도 하지만 여기서도 간단히 체크 가능
             // if (user.role !== 'SUPER_ADMIN') { alert('권한이 없습니다.'); window.location.href = '/'; }
        }

        // Axios 설정
        axios.defaults.headers.common['Authorization'] = \`Bearer \${token}\`;

        async function loadPendingTenants() {
            setActiveButton('btnPending');
            try {
                const res = await axios.get(\`\${API_BASE}/super-admin/tenants?status=PENDING\`);
                renderTenants(res.data.data, true);
            } catch (err) {
                console.error(err);
                if(err.response?.status === 401 || err.response?.status === 403) {
                     alert('권한이 없거나 세션이 만료되었습니다.');
                     window.location.href = '/login';
                } else {
                     alert('데이터 로드 실패: ' + (err.response?.data?.error || err.message));
                }
            }
        }

        async function loadAllTenants() {
            setActiveButton('btnAll');
            try {
                const res = await axios.get(\`\${API_BASE}/super-admin/tenants\`);
                renderTenants(res.data.data, false);
            } catch (err) {
                 console.error(err);
                 alert('데이터 로드 실패');
            }
        }
        
        function setActiveButton(id) {
            document.getElementById('btnPending').className = 'px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition';
            document.getElementById('btnAll').className = 'px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition';
            
            const btn = document.getElementById(id);
            btn.className = 'px-4 py-2 bg-teal-600 text-white rounded-lg shadow hover:bg-teal-700 transition';
        }

        function renderTenants(tenants, showActions) {
            const container = document.getElementById('tenantList');
            container.innerHTML = '';
            
            if (!tenants || tenants.length === 0) {
                container.innerHTML = '<li class="px-4 py-8 text-center text-gray-500">데이터가 없습니다.</li>';
                return;
            }

            tenants.forEach(t => {
                const li = document.createElement('li');
                li.className = 'block hover:bg-gray-50';
                
                let actionsHtml = '';
                if (showActions && t.status === 'PENDING') {
                    actionsHtml = \`
                        <div class="flex items-center space-x-2">
                            <button onclick="approveTenant(\${t.id})" class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                                <i class="fas fa-check mr-1"></i> 승인
                            </button>
                            <button onclick="rejectTenant(\${t.id})" class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                                <i class="fas fa-times mr-1"></i> 거절
                            </button>
                        </div>
                    \`;
                } else {
                     actionsHtml = \`<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${getStatusColor(t.status)}">\${t.status}</span>\`;
                }

                li.innerHTML = \`
                    <div class="px-4 py-4 sm:px-6 flex items-center justify-between">
                        <div class="flex flex-col">
                            <p class="text-sm font-medium text-teal-600 truncate">\${t.name}</p>
                            <div class="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                <p class="flex items-center mr-4">
                                    <i class="fas fa-cube flex-shrink-0 mr-1.5 text-gray-400"></i> \${t.plan_type}
                                </p>
                                <p class="flex items-center">
                                    <i class="fas fa-calendar flex-shrink-0 mr-1.5 text-gray-400"></i> \${new Date(t.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        \${actionsHtml}
                    </div>
                \`;
                container.appendChild(li);
            });
        }
        
        function getStatusColor(status) {
            switch(status) {
                case 'ACTIVE': return 'bg-green-100 text-green-800';
                case 'PENDING': return 'bg-yellow-100 text-yellow-800';
                case 'REJECTED': return 'bg-red-100 text-red-800';
                default: return 'bg-gray-100 text-gray-800';
            }
        }

        async function approveTenant(id) {
            if(!confirm('해당 테넌트를 승인하시겠습니까?')) return;
            try {
                await axios.post(\`\${API_BASE}/super-admin/tenants/\${id}/approve\`);
                alert('승인되었습니다.');
                loadPendingTenants();
            } catch (err) {
                alert('승인 처리 실패: ' + (err.response?.data?.error || err.message));
            }
        }

        async function rejectTenant(id) {
             if(!confirm('해당 테넌트 승인을 거절하시겠습니까?')) return;
            try {
                await axios.post(\`\${API_BASE}/super-admin/tenants/\${id}/reject\`);
                alert('거절되었습니다.');
                loadPendingTenants();
            } catch (err) {
                alert('거절 처리 실패: ' + (err.response?.data?.error || err.message));
            }
        }
        
        function logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }

        // 초기 로드
        loadPendingTenants();
    </script>
</body>
</html>`);
})
app.get('/login', (c: Context) => {
    return c.html(`<!DOCTYPE html>
    <html lang="ko">

        <head>
            <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>로그인 - WOW-Smart Manager</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
                        <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
                        <script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
                        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                            <style>
                                body {
                                    font - family: 'Plus Jakarta Sans', sans-serif;
                                background: #0f172a;
                                overflow-x: hidden;
        }

                                /* Animated Background */
                                .bg-mesh {
                                    position: fixed;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 100%;
                                z-index: -1;
                                background-color: #0f172a;
                                background-image:
                                radial-gradient(at 0% 0%, hsla(170, 75%, 35%, 0.15) 0, transparent 50%),
                                radial-gradient(at 50% 0%, hsla(215, 64%, 40%, 0.15) 0, transparent 50%),
                                radial-gradient(at 100% 0%, hsla(270, 75%, 40%, 0.1) 0, transparent 50%);
                                filter: blur(80px);
        }

                                .glass-card {
                                    background: rgba(255, 255, 255, 0.03);
                                backdrop-filter: blur(12px);
                                border: 1px solid rgba(255, 255, 255, 0.1);
                                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

                                .input-glass {
                                    background: rgba(255, 255, 255, 0.05);
                                border: 1px solid rgba(255, 255, 255, 0.1);
                                color: #f1f5f9;
                                transition: all 0.3s ease;
        }

                                .input-glass:focus {
                                    background: rgba(255, 255, 255, 0.08);
                                border-color: #2dd4bf;
                                box-shadow: 0 0 0 2px rgba(45, 212, 191, 0.2);
                                outline: none;
        }

                                .btn-gradient {
                                    background: linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%);
                                box-shadow: 0 10px 15px -3px rgba(45, 212, 191, 0.3);
                                transition: all 0.3s ease;
        }

                                .btn-gradient:hover {
                                    transform: translateY(-1px);
                                box-shadow: 0 20px 25px -5px rgba(45, 212, 191, 0.4);
        }

                                /* Pricing Card Glass */
                                .pricing-card {
                                    background: rgba(255, 255, 255, 0.02);
                                border: 1px solid rgba(255, 255, 255, 0.05);
                                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

                                .pricing-card:hover {
                                    transform: translateY(-10px);
                                background: rgba(255, 255, 255, 0.04);
                                border-color: rgba(45, 212, 191, 0.3);
        }

                                @keyframes fadeInUp {
                                    from {opacity: 0; transform: translateY(20px); }
                                to {opacity: 1; transform: translateY(0); }
        }

                                .animate-up {
                                    animation: fadeInUp 0.8s ease-out forwards;
        }
                            </style>
                        </head>

                        <body class="text-slate-200 min-h-screen">
                            <div class="bg-mesh"></div>

                            <!-- Background Transparency Filter -->
                            <svg style="position: absolute; width: 0; height: 0;">
                                <filter id="remove-white">
                                    <feColorMatrix type="matrix" values="1 0 0 0 0
                                                  0 1 0 0 0
                                                  0 0 1 0 0
                                                  -1 -1 -1 1 1" />
                                </filter>
                            </svg>

                            <div class="min-h-screen flex flex-col items-center py-20 px-4">
                                <!-- Main Auth Container -->
                                <div class="w-full max-w-5xl flex flex-col md:flex-row glass-card rounded-[2rem] overflow-hidden animate-up">
                                    <!-- Left Panel (Branding) -->
                                    <div class="hidden md:flex flex-col justify-center p-12 lg:p-20 bg-gradient-to-br from-teal-500/10 to-indigo-500/10 w-1/2 border-r border-white/5">
                                        <div class="mb-10">
                                            <div class="flex items-center gap-4 mb-8">
                                                <img src="/static/wow-symbol-gold.jpg" alt="WOW Logo" class="h-16 w-auto rounded-xl" style="filter: brightness(1.1);">
                                                    <h1 class="text-4xl font-extrabold text-white tracking-tighter">
                                                        WOW <br><span class="text-teal-400">Smart Manager</span>
                                                    </h1>
                                            </div>
                                            <p class="text-slate-400 text-lg leading-relaxed">
                                                WOW Smart Manager는 단순한 관리를 넘어<br>
                                                    데이터를 통한 비즈니스 통찰을 제공합니다.
                                            </p>
                                        </div>

                                        <div class="space-y-6">
                                            <div class="flex items-center gap-4 group">
                                                <div class="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-400 group-hover:bg-teal-500/20 transition-all">
                                                    <i class="fas fa-bolt text-xl"></i>
                                                </div>
                                                <div>
                                                    <p class="text-white font-semibold">Real-time Stock Tracking</p>
                                                    <p class="text-slate-500 text-sm">한 눈에 파악하는 정확한 재고 현황</p>
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-4 group">
                                                <div class="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-all">
                                                    <i class="fas fa-chart-line text-xl"></i>
                                                </div>
                                                <div>
                                                    <p class="text-white font-semibold">Smart Sales Insights</p>
                                                    <p class="text-slate-500 text-sm">성장을 위한 체계적인 판매 분석 리포트</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Right Panel (Form) -->
                                    <div class="w-full md:w-1/2 p-10 lg:p-16 flex flex-col justify-center bg-[#0b111e]/50">
                                        <!-- Mobile Logo -->
                                        <div class="md:hidden flex items-center justify-center gap-3 mb-10">
                                            <img src="/static/wow-symbol-gold.jpg" alt="WOW Logo" class="h-10 w-auto rounded-lg">
                                                <h1 class="text-2xl font-bold text-white tracking-tighter">WOW Smart Manager</h1>
                                        </div>

                                        <div class="text-center md:text-left mb-10">
                                            <h1 class="text-3xl font-bold text-white mb-2" id="formTitle">환영합니다</h1>
                                            <p class="text-slate-400" id="formDesc">로그인하여 서비스를 시작하세요</p>
                                        </div>

                                        <!-- Tabs -->
                                        <div class="flex p-1.5 bg-white/5 rounded-2xl mb-8">
                                            <button onclick="switchTab('login')" id="loginTabBtn"
                                                class="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-teal-500 shadow-lg transition-all duration-300">
                                                로그인
                                            </button>
                                            <button onclick="switchTab('register')" id="registerTabBtn"
                                                class="flex-1 py-2.5 text-sm font-semibold rounded-xl text-slate-400 hover:text-white transition-all duration-300">
                                                회원가입
                                            </button>
                                        </div>

                                        <!-- Login Form -->
                                        <form id="loginForm" onsubmit="handleLogin(event)" class="space-y-5">
                                            <div>
                                                <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">이메일 주소</label>
                                                <div class="relative group">
                                                    <i class="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-400 transition-colors"></i>
                                                    <input type="email" id="loginEmail" required
                                                        class="w-full pl-12 pr-4 py-3.5 input-glass rounded-2xl text-sm"
                                                        placeholder="name@company.com">
                                                </div>
                                            </div>
                                            <div>
                                                <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">비밀번호</label>
                                                <div class="relative group">
                                                    <i class="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-400 transition-colors"></i>
                                                    <input type="password" id="loginPassword" required
                                                        class="w-full pl-12 pr-4 py-3.5 input-glass rounded-2xl text-sm"
                                                        placeholder="비밀번호를 입력하세요">
                                                </div>
                                            </div>
                                            <button type="submit"
                                                class="w-full py-4 btn-gradient rounded-2xl text-white font-bold text-sm tracking-wider uppercase mt-4">
                                                로그인하기
                                            </button>
                                        </form>

                                        <!-- Register Form -->
                                        <form id="registerForm" onsubmit="handleRegister(event)" class="space-y-4 hidden">
                                            <div>
                                                <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">이메일</label>
                                                <input type="email" id="regEmail" required
                                                    class="w-full px-4 py-3.5 input-glass rounded-2xl text-sm"
                                                    placeholder="name@company.com">
                                            </div>
                                            <div>
                                                <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">비밀번호</label>
                                                <input type="password" id="regPassword" required
                                                    class="w-full px-4 py-3.5 input-glass rounded-2xl text-sm"
                                                    placeholder="최소 8자 이상">
                                            </div>
                                            <div class="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">이름</label>
                                                    <input type="text" id="regName" required
                                                        class="w-full px-4 py-3.5 input-glass rounded-2xl text-sm"
                                                        placeholder="실명을 입력하세요">
                                                </div>
                                                <div>
                                                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">전화번호</label>
                                                    <input type="tel" id="regPhone" required
                                                        class="w-full px-4 py-3.5 input-glass rounded-2xl text-sm"
                                                        placeholder="010-0000-0000">
                                                </div>
                                            </div>
                                            <div class="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">조직명 (회사명)</label>
                                                    <input type="text" id="regCompany" required
                                                        class="w-full px-4 py-3.5 input-glass rounded-2xl text-sm"
                                                        placeholder="회사 또는 팀 이름">
                                                </div>
                                                <div>
                                                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">요금제</label>
                                                    <select id="regPlan"
                                                        class="w-full px-4 py-3.5 input-glass rounded-2xl text-sm appearance-none cursor-pointer">
                                                        <option value="FREE" class="bg-[#0f172a]">무료 플랜 (Free)</option>
                                                        <option value="BASIC" class="bg-[#0f172a]">베이직 플랜 (Basic)</option>
                                                        <option value="PRO" class="bg-[#0f172a]">프로 플랜 (Pro)</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <button type="submit"
                                                class="w-full py-4 btn-gradient rounded-2xl text-white font-bold text-sm tracking-wider uppercase mt-4">
                                                계정 만들기
                                            </button>
                                        </form>

                                        <p class="mt-8 text-center text-slate-500 text-xs">
                                            가입 시 다음에 동의하게 됩니다: <a href="#" class="text-teal-400 hover:underline">이용약관 및 개인정보처리방침</a>
                                        </p>
                                    </div>
                                </div>

                                <!-- Pricing Section -->
                                <div class="w-full max-w-6xl mt-32 animate-up" style="animation-delay: 0.2s">
                                    <div class="text-center mb-16">
                                        <span class="text-teal-400 font-bold text-sm tracking-[0.3em] uppercase mb-4 block">Pricing Models</span>
                                        <h2 class="text-4xl font-bold text-white mb-4">비즈니스에 맞는 최적의 플랜</h2>
                                        <p class="text-slate-400">합리적인 요금으로 시작하는 스마트한 관리의 첫걸음</p>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <!-- Free Plan -->
                                        <div class="pricing-card rounded-[2rem] p-10 flex flex-col relative overflow-hidden group">
                                            <div class="absolute top-0 left-0 w-full h-1.5 bg-slate-700"></div>
                                            <div class="mb-8">
                                                <h3 class="text-xl font-bold text-white mb-4">Free Starter</h3>
                                                <div class="flex items-baseline mb-2">
                                                    <span class="text-4xl font-bold text-white">₩0</span>
                                                    <span class="text-slate-500 ml-2">/month</span>
                                                </div>
                                                <p class="text-sm text-slate-500 leading-relaxed">개인 및 소규모 창업자를 위한<br>기초 재고 관리 서비스</p>
                                            </div>

                                            <ul class="space-y-4 mb-10 flex-1">
                                                <li class="flex items-center gap-3 text-sm text-slate-300">
                                                    <i class="fas fa-check-circle text-teal-500 opacity-50"></i> <span>상품 등록 최대 100개</span>
                                                </li>
                                                <li class="flex items-center gap-3 text-sm text-slate-300">
                                                    <i class="fas fa-check-circle text-teal-500 opacity-50"></i> <span>1인 사용자 계정</span>
                                                </li>
                                                <li class="flex items-center gap-3 text-sm text-slate-300">
                                                    <i class="fas fa-check-circle text-teal-500 opacity-50"></i> <span>기본 수불 관리</span>
                                                </li>
                                            </ul>

                                            <button onclick="scrollToTop('register', 'FREE')"
                                                class="w-full py-4 rounded-2xl border border-white/10 text-white font-bold text-sm hover:bg-white/5 transition-colors">
                                                Get Started
                                            </button>
                                        </div>

                                        <!-- Basic Plan -->
                                        <div class="pricing-card rounded-[2rem] p-10 flex flex-col relative overflow-hidden border-teal-500/30 bg-teal-500/5 group scale-105 shadow-2xl shadow-teal-500/10">
                                            <div class="absolute top-0 left-0 w-full h-1.5 bg-teal-500"></div>
                                            <div class="absolute -top-4 -right-4 bg-teal-500 text-white text-[10px] font-bold px-8 py-6 rounded-full rotate-12 flex items-end justify-center">POPULAR</div>

                                            <div class="mb-8">
                                                <h3 class="text-xl font-bold text-teal-400 mb-4">Standard Business</h3>
                                                <div class="flex items-baseline mb-2">
                                                    <span class="text-4xl font-bold text-white">₩50,000</span>
                                                    <span class="text-slate-500 ml-2">/month</span>
                                                </div>
                                                <p class="text-sm text-slate-300 leading-relaxed">본격적인 성장을 시작하는<br>팀을 위한 전문적인 관리 기능</p>
                                            </div>

                                            <ul class="space-y-4 mb-10 flex-1">
                                                <li class="flex items-center gap-3 text-sm text-white">
                                                    <i class="fas fa-check-circle text-teal-500"></i> <span>상품 등록 최대 1,000개</span>
                                                </li>
                                                <li class="flex items-center gap-3 text-sm text-white">
                                                    <i class="fas fa-check-circle text-teal-500"></i> <span>사용자 계정 최대 5명</span>
                                                </li>
                                                <li class="flex items-center gap-3 text-sm text-white">
                                                    <i class="fas fa-check-circle text-teal-500"></i> <span>데이터 엑셀 다운로드</span>
                                                </li>
                                                <li class="flex items-center gap-3 text-sm text-white">
                                                    <i class="fas fa-check-circle text-teal-500"></i> <span>주간 성과 리포트</span>
                                                </li>
                                            </ul>

                                            <button onclick="scrollToTop('register', 'BASIC')"
                                                class="w-full py-4 rounded-2xl btn-gradient text-white font-bold text-sm">
                                                Start 14-Day Trial
                                            </button>
                                        </div>

                                        <!-- Pro Plan -->
                                        <div class="pricing-card rounded-[2rem] p-10 flex flex-col relative overflow-hidden group">
                                            <div class="absolute top-0 left-0 w-full h-1.5 bg-purple-600"></div>
                                            <div class="mb-8">
                                                <h3 class="text-xl font-bold text-purple-400 mb-4">Enterprise Pro</h3>
                                                <div class="flex items-baseline mb-2">
                                                    <span class="text-4xl font-bold text-white">₩70,000</span>
                                                    <span class="text-slate-500 ml-2">/month</span>
                                                </div>
                                                <p class="text-sm text-slate-500 leading-relaxed">확장 중인 대규모 비즈니스를 위한<br>모든 기능 및 기술 지원</p>
                                            </div>

                                            <ul class="space-y-4 mb-10 flex-1">
                                                <li class="flex items-center gap-3 text-sm text-slate-300">
                                                    <i class="fas fa-check-circle text-purple-500"></i> <span>상품 및 사용자 무제한</span>
                                                </li>
                                                <li class="flex items-center gap-3 text-sm text-slate-300">
                                                    <i class="fas fa-check-circle text-purple-500"></i> <span>API 및 웹훅 연동 지원</span>
                                                </li>
                                                <li class="flex items-center gap-3 text-sm text-slate-300">
                                                    <i class="fas fa-check-circle text-purple-500"></i> <span>실시간 재고 알림</span>
                                                </li>
                                                <li class="flex items-center gap-3 text-sm text-slate-300">
                                                    <i class="fas fa-check-circle text-purple-500"></i> <span>우선 기술 지원 채널</span>
                                                </li>
                                            </ul>

                                            <button onclick="scrollToTop('register', 'PRO')"
                                                class="w-full py-4 rounded-2xl border border-white/10 text-white font-bold text-sm hover:bg-white/5 transition-colors">
                                                Enterprise Inquiry
                                            </button>
                                        </div>
                                    </div>

                                    <div class="mt-32 text-center text-xs text-slate-600 tracking-widest pb-10">
                                        &copy; 2025 WOW-Smart Manager. All rights reserved.
                                    </div>
                                </div>
                            </div>

                            <script>
                                const API_BASE = '/api';

                                function switchTab(tab) {
            const loginForm = document.getElementById('loginForm');
                                const registerForm = document.getElementById('registerForm');
                                const loginBtn = document.getElementById('loginTabBtn');
                                const registerBtn = document.getElementById('registerTabBtn');
                                const formTitle = document.getElementById('formTitle');
                                const formDesc = document.getElementById('formDesc');

                                if (tab === 'login') {
                                    loginForm.classList.remove('hidden');
                                registerForm.classList.add('hidden');

                                loginBtn.classList.add('text-white', 'bg-teal-500', 'shadow-lg');
                                loginBtn.classList.remove('text-slate-400');
                                registerBtn.classList.add('text-slate-400');
                                registerBtn.classList.remove('text-white', 'bg-teal-500', 'shadow-lg');

                                formTitle.innerText = "환영합니다";
                                formDesc.innerText = "로그인하여 서비스를 시작하세요";
            } else {
                                    loginForm.classList.add('hidden');
                                registerForm.classList.remove('hidden');

                                registerBtn.classList.add('text-white', 'bg-teal-500', 'shadow-lg');
                                registerBtn.classList.remove('text-slate-400');
                                loginBtn.classList.add('text-slate-400');
                                loginBtn.classList.remove('text-white', 'bg-teal-500', 'shadow-lg');

                                formTitle.innerText = "계정 만들기";
                                formDesc.innerText = "스마트한 관리의 시작, 지금 바로 합류하세요";
            }
        }

                                function scrollToTop(tab, plan) {
            if (tab) switchTab(tab);
                                if (plan) {
                const planSelect = document.getElementById('regPlan');
                                if (planSelect) planSelect.value = plan;
            }
                                window.scrollTo({top: 0, behavior: 'smooth' });
        }

                                async function handleLogin(e) {
                                    e.preventDefault();
                                const email = document.getElementById('loginEmail').value;
                                const password = document.getElementById('loginPassword').value;

                                try {
                const res = await axios.post(\`\${API_BASE}/auth/login\`, {email, password});
                                if (res.data.success) {
                                    localStorage.setItem('token', res.data.data.token);
                                localStorage.setItem('refreshToken', res.data.data.refreshToken);
                                localStorage.setItem('user', JSON.stringify(res.data.data.user));
                                window.location.href = '/';
                }
            } catch (err) {
                                    alert(err.response?.data?.error || '로그인 실패');
            }
        }

                                async function handleRegister(e) {
                                    e.preventDefault();
                                const email = document.getElementById('regEmail').value;
                                const password = document.getElementById('regPassword').value;
                                const name = document.getElementById('regName').value;
                                const phone = document.getElementById('regPhone').value;
                                const company_name = document.getElementById('regCompany').value;
                                const plan = document.getElementById('regPlan').value;

                                try {
                const res = await axios.post(\`\${API_BASE}/auth/register\`, {
                                    email, password, name, phone, company_name, plan
                                });
                                if (res.data.success) {
                    if (res.data.data && res.data.data.token) {
                                    alert('회원가입이 완료되었습니다. 자동 로그인됩니다.');
                                localStorage.setItem('token', res.data.data.token);
                                localStorage.setItem('refreshToken', res.data.data.refreshToken);
                                localStorage.setItem('user', JSON.stringify(res.data.data.user));
                                window.location.href = '/';
                    } else {
                        const msg = res.data.message || '회원가입이 완료되었습니다.\\n관리자 승인 후 이용 가능합니다.';
                                alert(msg);
                                switchTab('login');
                                document.getElementById('regPassword').value = '';
                    }
                }
            } catch (err) {
                                    alert(err.response?.data?.error || '회원가입 실패');
            }
        }
                            </script>
                        </body>

                    </html>`);
})

// 메인 페이지
app.get('/', (c: Context) => {
    return c.html(`
                    <!DOCTYPE html>
                    <html lang="ko">
                        <head>
                            <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                    <title>WOW-Smart Manager</title>
                                    <script src="https://cdn.tailwindcss.com"></script>
                                    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
                                        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                                        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
                                        <script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
                                        <script src="https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.min.js?v=2"></script>
                                        <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
                                        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
                                        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
                                            <style>
                                                body {
                                                    font - family: 'Inter', 'Noto Sans KR', sans-serif;
                                                background-color: #f0fdfa; /* Teal 50 */
            }

                                                /* Custom Scrollbar */
                                                ::-webkit-scrollbar {
                                                    width: 8px;
                                                height: 8px;
            }
                                                ::-webkit-scrollbar-track {
                                                    background: transparent;
            }
                                                ::-webkit-scrollbar-thumb {
                                                    background: #cbd5e1;
                                                border-radius: 4px;
            }
                                                ::-webkit-scrollbar-thumb:hover {
                                                    background: #94a3b8;
            }

                                                /* Modern Sidebar Styles */
                                                .nav-link {
                                                    position: relative;
                                                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                                                    overflow: hidden;
                                                }

                                                .nav-link::before {
                                                    content: '';
                                                    position: absolute;
                                                    left: 0;
                                                    top: 50%;
                                                    transform: translateY(-50%);
                                                    width: 0;
                                                    height: 70%;
                                                    background: linear-gradient(90deg, #2dd4bf, transparent);
                                                    transition: width 0.3s ease;
                                                    border-radius: 0 8px 8px 0;
                                                }

                                                .nav-link:hover {
                                                    background-color: rgba(255, 255, 255, 0.05);
                                                    color: #f1f5f9;
                                                    transform: translateX(4px);
                                                }

                                                .nav-link:hover::before {
                                                    width: 4px;
                                                }

                                                .nav-link.active {
                                                    background: linear-gradient(90deg, rgba(45, 212, 191, 0.2) 0%, rgba(45, 212, 191, 0.05) 100%);
                                                    color: #2dd4bf;
                                                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
                                                }

                                                .nav-link.active::before {
                                                    width: 4px;
                                                    height: 70%;
                                                    background: linear-gradient(180deg, #2dd4bf 0%, #14b8a6 100%);
                                                    box-shadow: 0 0 12px rgba(45, 212, 191, 0.5);
                                                }

                                                .nav-link i {
                                                    transition: all 0.3s ease;
                                                }

                                                .nav-link:hover i {
                                                    transform: scale(1.1) rotate(-5deg);
                                                }

                                                .nav-link.active i {
                                                    color: #2dd4bf;
                                                    filter: drop-shadow(0 0 8px rgba(45, 212, 191, 0.6));
                                                    transform: scale(1.15);
                                                }

                                                /* Submenu Parent Button */
                                                .nav-item-group button {
                                                    position: relative;
                                                    transition: all 0.3s ease;
                                                }

                                                .nav-item-group button:hover {
                                                    background-color: rgba(255, 255, 255, 0.08);
                                                    transform: translateX(2px);
                                                }

                                                /* Submenu Styles */
                                                .nav-submenu {
                                                    max-height: 0;
                                                    overflow: hidden;
                                                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                                                    background: linear-gradient(135deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.1) 100%);
                                                    border-radius: 0.75rem;
                                                    opacity: 0;
                                                    transform: translateY(-10px);
                                                    border-left: 2px solid transparent;
                                                }

                                                .nav-submenu.open {
                                                    max-height: 500px;
                                                    margin-top: 0.5rem;
                                                    margin-bottom: 0.5rem;
                                                    padding: 0.5rem 0;
                                                    opacity: 1;
                                                    transform: translateY(0);
                                                    border-left-color: rgba(45, 212, 191, 0.3);
                                                }

                                                .nav-submenu .nav-link {
                                                    font-size: 0.875rem;
                                                    padding-left: 2.5rem;
                                                }

                                                .submenu-arrow {
                                                    transition: transform 0.3s ease;
                                                }

                                                /* Group Headers */
                                                .nav-item-group p {
                                                    position: relative;
                                                    padding-left: 1rem;
                                                }

                                                .nav-item-group p .w-1\.5 {
                                                    animation: pulse 2s ease-in-out infinite;
                                                }

                                                @keyframes pulse {
                                                    0%, 100% { opacity: 0.5; }
                                                    50% { opacity: 1; }
                                                }

                                                .glass-header {
                                                    background: rgba(255, 255, 255, 0.9);
                                                backdrop-filter: blur(8px);
                                                border-bottom: 1px solid #e2e8f0;
                                    }

                                                /* Print Styles */
                                                @media print {
                                                    #sidebar, #sidebarOverlay, .glass-header, .no-print {
                                                        display: none !important;
                                                    }
                                                    #content {
                                                        margin-left: 0 !important;
                                                        padding: 0 !important;
                                                        width: 100% !important;
                                                    }
                                                    body {
                                                        background: white !important;
                                                    }
                                                    .print-only {
                                                        display: block !important;
                                                    }
                                                    .invoice-box {
                                                        padding: 0 !important;
                                                        border: none !important;
                                                        box-shadow: none !important;
                                                    }
                                                }
                                                .print-only {
                                                    display: none;
                                                }
                                            </style>
                                            <script>
                                                tailwind.config = {
                                                    theme: {
                                                    extend: {
                                                    colors: {
                                                    primary: '#4f46e5', // Indigo 600
                                                secondary: '#64748b', // Slate 500
                                                teal: {
                                                    50: '#f0fdfa',
                                                100: '#ccfbf1',
                                                200: '#99f6e4',
                                                300: '#5eead4',
                                                400: '#2dd4bf',
                                                500: '#14b8a6',
                                                600: '#0d9488',
                                                700: '#0f766e',
                                                800: '#115e59',
                                                900: '#134e4a',
                                            }
                        },
                                                fontFamily: {
                                                    sans: ['Inter', 'Noto Sans KR', 'sans-serif'],
                        }
                    }
                }
            }
                                            </script>
                                        </head>
                                        <body class="text-slate-800 antialiased">
                                            <div id="app" class="flex h-screen overflow-hidden">
                                                <!-- 모바일 사이드바 오버레이 -->
                                                <div id="sidebarOverlay" class="fixed inset-0 bg-black bg-opacity-50 z-20 hidden md:hidden transition-opacity" onclick="toggleSidebar()"></div>

                                                <!-- 사이드바 -->
                                                <aside id="sidebar" class="w-[280px] bg-[#0f172a] text-slate-400 flex flex-col z-30 fixed inset-y-0 left-0 transform -translate-x-full md:relative md:translate-x-0 transition-transform duration-300 ease-in-out border-r border-[#1e293b] shadow-2xl">
                                                    <!-- Logo Section -->
                                                    <div class="h-20 flex items-center px-6 border-b border-[#1e293b] bg-[#0f172a] relative">
                                                        <div class="flex items-center w-full">
                                                            <div class="relative group cursor-pointer w-full flex items-center gap-3">
                                                                <img id="companyLogo" src="/static/wow-symbol-gold.jpg" alt="Logo" class="h-10 w-auto max-w-[150px] object-contain transition-all duration-300 rounded-lg">
                                                                    <div id="companyLogoPlaceholder" class="h-10 w-10 bg-gradient-to-br from-teal-400 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg hidden">W</div>
                                                                    <span id="companyName" class="text-white font-bold text-lg leading-tight tracking-tight truncate">WOW Smart Manager</span>
                                                            </div>
                                                        </div>
                                                        <button onclick="toggleSidebar()" class="md:hidden ml-auto text-slate-500 hover:text-white transition-colors p-2">
                                                            <i class="fas fa-times text-lg"></i>
                                                        </button>
                                                    </div>

                                                    <!-- Navigation -->
                                                    <nav class="flex-1 px-4 py-8 space-y-8 overflow-y-auto custom-scrollbar">
                                                        <!-- Analysis Group -->
                                                        <div>
                                                            <p class="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                <span class="w-1.5 h-1.5 rounded-full bg-teal-500/50"></span>
                                                                분석 및 현황
                                                            </p>
                                                            <div class="space-y-1">
                                                                <a href="#" data-page="dashboard" class="nav-link flex items-center px-4 py-3 rounded-lg group" onclick="closeSidebarOnMobile()">
                                                                    <i class="fas fa-chart-pie w-6 text-center text-lg mr-3"></i>
                                                                    <span class="font-medium">대시보드</span>
                                                                </a>
                                                            </div>
                                                        </div>

                                                        <!-- Business Group -->
                                                        <div id="nav-sales-group" data-module="sales">
                                                            <p class="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                <span class="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>
                                                                영업 및 물류
                                                            </p>
                                                            <div class="space-y-1">
                                                                <div class="nav-item-group">
                                                                    <button onclick="toggleSubMenu(this, 'sales-submenu')" class="flex items-center justify-between w-full px-4 py-3 rounded-lg group hover:bg-white/5 transition-all text-slate-400 hover:text-white">
                                                                        <div class="flex items-center">
                                                                            <i class="fas fa-cash-register w-6 text-center text-lg mr-3"></i>
                                                                            <span class="font-medium">판매 관리</span>
                                                                        </div>
                                                                        <i class="fas fa-chevron-down text-[10px] submenu-arrow"></i>
                                                                    </button>
                                                                    <div id="sales-submenu" class="nav-submenu ml-4 space-y-1">
                                                                        <a href="#" data-page="sales" data-tab="pos" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-calculator w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>POS (판매등록)</span>
                                                                        </a>
                                                                        <a href="#" data-page="sales" data-tab="orders" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-truck w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>주문/배송 관리</span>
                                                                        </a>
                                                                        <a href="#" data-page="sales" data-tab="claims" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-undo w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>반품/교환 관리</span>
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                                <div class="nav-item-group">
                                                                    <button onclick="toggleSubMenu(this, 'outbound-submenu')" class="flex items-center justify-between w-full px-4 py-3 rounded-lg group hover:bg-white/5 transition-all text-slate-400 hover:text-white">
                                                                        <div class="flex items-center">
                                                                            <i class="fas fa-truck-loading w-6 text-center text-lg mr-3"></i>
                                                                            <span class="font-medium">출고 관리</span>
                                                                        </div>
                                                                        <i class="fas fa-chevron-down text-[10px] submenu-arrow"></i>
                                                                    </button>
                                                                    <div id="outbound-submenu" class="nav-submenu ml-4 space-y-1">
                                                                        <a href="#" data-page="outbound" data-tab="reg" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-edit w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>간편 출고 등록</span>
                                                                        </a>
                                                                        <a href="#" data-page="outbound" data-tab="hist" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-history w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>출고 이력 조회</span>
                                                                        </a>
                                                                        <a href="#" data-page="outbound" data-tab="warehouse" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-warehouse w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>창고별 관리</span>
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                                <div class="nav-item-group">
                                                                    <button onclick="toggleSubMenu(this, 'purchases-submenu')" class="flex items-center justify-between w-full px-4 py-3 rounded-lg group hover:bg-white/5 transition-all text-slate-400 hover:text-white">
                                                                        <div class="flex items-center">
                                                                            <i class="fas fa-shopping-cart w-6 text-center text-lg mr-3"></i>
                                                                            <span class="font-medium">입고/발주 관리</span>
                                                                        </div>
                                                                        <i class="fas fa-chevron-down text-[10px] submenu-arrow"></i>
                                                                    </button>
                                                                    <div id="purchases-submenu" class="nav-submenu ml-4 space-y-1">
                                                                        <a href="#" data-page="purchases" data-tab="purchases" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-file-invoice-dollar w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>발주 관리</span>
                                                                        </a>
                                                                        <a href="#" data-page="purchases" data-tab="suppliers" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-users w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>공급사 관리</span>
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                                <div class="nav-item-group">
                                                                    <button onclick="toggleSubMenu(this, 'stock-submenu')" class="flex items-center justify-between w-full px-4 py-3 rounded-lg group hover:bg-white/5 transition-all text-slate-400 hover:text-white">
                                                                        <div class="flex items-center">
                                                                            <i class="fas fa-cubes w-6 text-center text-lg mr-3"></i>
                                                                            <span class="font-medium">재고 관리</span>
                                                                        </div>
                                                                        <i class="fas fa-chevron-down text-[10px] submenu-arrow"></i>
                                                                    </button>
                                                                    <div id="stock-submenu" class="nav-submenu ml-4 space-y-1">
                                                                        <a href="#" data-page="stock" data-tab="movements" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-list-ul w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>재고 이동 내역</span>
                                                                        </a>
                                                                        <a href="#" data-page="stock" data-tab="levels" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-boxes w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>창고별 재고 현황</span>
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                                <a href="#" data-page="transaction-statement" class="nav-link flex items-center px-4 py-3 rounded-lg group" onclick="closeSidebarOnMobile()">
                                                                    <i class="fas fa-file-invoice w-6 text-center text-lg mr-3"></i>
                                                                    <span class="font-medium">거래명세서 출력</span>
                                                                </a>
                                                            </div>
                                                        </div>

                                                        <!-- Resources Group -->
                                                        <div>
                                                            <p class="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                <span class="w-1.5 h-1.5 rounded-full bg-purple-500/50"></span>
                                                                기준 정보
                                                            </p>
                                                            <div class="space-y-1">
                                                                <div class="nav-item-group">
                                                                    <button onclick="toggleSubMenu(this, 'product-submenu')" class="flex items-center justify-between w-full px-4 py-3 rounded-lg group hover:bg-white/5 transition-all text-slate-400 hover:text-white">
                                                                        <div class="flex items-center">
                                                                            <i class="fas fa-box w-6 text-center text-lg mr-3"></i>
                                                                            <span class="font-medium">상품 관리</span>
                                                                        </div>
                                                                        <i class="fas fa-chevron-down text-[10px] submenu-arrow"></i>
                                                                    </button>
                                                                    <div id="product-submenu" class="nav-submenu ml-4 space-y-1">
                                                                        <a href="#" data-page="products" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-list w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>품목 정보 관리</span>
                                                                        </a>
                                                                        <a href="#" data-page="product-options" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-tags w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>옵션 프리셋 관리</span>
                                                                        </a>
                                                                        <a href="#" data-page="pricing-policy" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-hand-holding-usd w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>가격 정책 관리</span>
                                                                        </a></div>
                                                                </div>
                                                                <a href="#" data-page="customers" class="nav-link flex items-center px-4 py-3 rounded-lg group" onclick="closeSidebarOnMobile()">
                                                                    <i class="fas fa-users w-6 text-center text-lg mr-3"></i>
                                                                    <span class="font-medium">고객 관리</span>
                                                                </a>
                                                            </div>
                                                        </div>

                                                        <!-- MES Group — 업무 프로세스 순서 -->
                                                        <div id="nav-mes-group" data-module="mes">
                                                            <p class="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                <span class="w-1.5 h-1.5 rounded-full bg-orange-500/50"></span>
                                                                MES (제조실행)
                                                            </p>
                                                            <div class="space-y-1">
                                                                <div class="nav-item-group">
                                                                    <button onclick="toggleSubMenu(this, 'mes-exec-submenu')" class="flex items-center justify-between w-full px-4 py-3 rounded-lg group hover:bg-white/5 transition-all text-slate-400 hover:text-white">
                                                                        <div class="flex items-center">
                                                                            <i class="fas fa-industry w-6 text-center text-lg mr-3"></i>
                                                                            <span class="font-medium">제조실행</span>
                                                                        </div>
                                                                        <i class="fas fa-chevron-down text-[10px] submenu-arrow"></i>
                                                                    </button>
                                                                    <div id="mes-exec-submenu" class="nav-submenu ml-4 space-y-1 open">
                                                                        <a href="#" data-page="production" data-tab="shopfloor" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-hard-hat w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>1. 현장 실행</span>
                                                                        </a>
                                                                        <a href="#" data-page="production" data-tab="kpi" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-chart-pie w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>2. 제조 현황</span>
                                                                        </a>
                                                                        <a href="#" data-page="production" data-tab="masters" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-sitemap w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>3. 기준정보</span>
                                                                        </a>
                                                                        <a href="#" data-page="production" data-tab="work-orders" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-clipboard-list w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>4. 작업지시</span>
                                                                        </a>
                                                                        <a href="#" data-page="production" data-tab="materials" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-boxes w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>5. 자재·외주</span>
                                                                        </a>
                                                                        <a href="#" data-page="production" data-tab="trace" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-route w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>6. 현장추적</span>
                                                                        </a>
                                                                        <a href="#" data-page="production" data-tab="quality" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-clipboard-check w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>7. 품질검사</span>
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                                <div class="nav-item-group">
                                                                    <button onclick="toggleSubMenu(this, 'mes-qr-submenu')" class="flex items-center justify-between w-full px-4 py-3 rounded-lg group hover:bg-white/5 transition-all text-slate-400 hover:text-white">
                                                                        <div class="flex items-center">
                                                                            <i class="fas fa-qrcode w-6 text-center text-lg mr-3"></i>
                                                                            <span class="font-medium">QR 현장</span>
                                                                        </div>
                                                                        <i class="fas fa-chevron-down text-[10px] submenu-arrow"></i>
                                                                    </button>
                                                                    <div id="mes-qr-submenu" class="nav-submenu ml-4 space-y-1">
                                                                        <a href="#" data-page="qr" data-tab="dashboard" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-chart-line w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>1. QR 현황</span>
                                                                        </a>
                                                                        <a href="#" data-page="qr" data-tab="inbound" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-sign-in-alt w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>2. QR 입고</span>
                                                                        </a>
                                                                        <a href="#" data-page="qr" data-tab="outbound" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-dolly w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>3. QR 출고</span>
                                                                        </a>
                                                                        <a href="#" data-page="qr" data-tab="sale" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-cash-register w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>4. QR 판매</span>
                                                                        </a>
                                                                        <a href="#" data-page="qr" data-tab="management" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-tags w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>5. 라벨관리</span>
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                                <div class="nav-item-group">
                                                                    <button onclick="toggleSubMenu(this, 'mes-barcode-submenu')" class="flex items-center justify-between w-full px-4 py-3 rounded-lg group hover:bg-white/5 transition-all text-slate-400 hover:text-white">
                                                                        <div class="flex items-center">
                                                                            <i class="fas fa-barcode w-6 text-center text-lg mr-3"></i>
                                                                            <span class="font-medium">바코드 관리</span>
                                                                        </div>
                                                                        <i class="fas fa-chevron-down text-[10px] submenu-arrow"></i>
                                                                    </button>
                                                                    <div id="mes-barcode-submenu" class="nav-submenu ml-4 space-y-1">
                                                                        <a href="#" data-page="barcode" data-tab="dashboard" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-chart-pie w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>1. 바코드 현황</span>
                                                                        </a>
                                                                        <a href="#" data-page="barcode" data-tab="register" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-edit w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>2. 등록·수정</span>
                                                                        </a>
                                                                        <a href="#" data-page="barcode" data-tab="labels" class="nav-link flex items-center px-4 py-2 rounded-lg group text-sm" onclick="closeSidebarOnMobile()">
                                                                            <i class="fas fa-print w-5 text-center mr-3 text-xs opacity-70"></i>
                                                                            <span>3. 라벨 출력</span>
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <!-- System Group -->
                                                        <div>
                                                            <p class="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                <span class="w-1.5 h-1.5 rounded-full bg-gray-500/50"></span>
                                                                시스템
                                                            </p>
                                                            <div class="space-y-1">
                                                                <a href="#" id="nav-super-admin" data-page="super-admin" class="nav-link flex items-center px-4 py-3 rounded-lg group hidden" onclick="closeSidebarOnMobile()">
                                                                    <i class="fas fa-shield-alt w-6 text-center text-lg mr-3"></i>
                                                                    <span class="font-medium">시스템 관리</span>
                                                                </a>
                                                                <a href="#" id="nav-settings" data-page="settings" class="nav-link flex items-center px-4 py-3 rounded-lg group hidden" onclick="closeSidebarOnMobile()">
                                                                    <i class="fas fa-cog w-6 text-center text-lg mr-3"></i>
                                                                    <span class="font-medium">설정</span>
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </nav>

                                                    <!-- User Profile Section -->
                                                    <div class="p-4 border-t border-[#1e293b] bg-gradient-to-br from-[#0b111e] to-[#0f172a] relative">
                                                        <div class="flex items-center gap-3 p-3 rounded-xl hover:bg-[#1e293b]/50 transition-all duration-300 cursor-pointer group relative">
                                                            <!-- Avatar with Status Badge -->
                                                            <div class="relative">
                                                                <div class="w-11 h-11 rounded-full bg-gradient-to-tr from-teal-500 via-teal-400 to-emerald-400 p-[2px] shadow-md group-hover:shadow-teal-500/30 transition-all duration-300">
                                                                    <div class="w-full h-full rounded-full bg-[#0f172a] flex items-center justify-center text-white font-bold text-sm" id="user-avatar">
                                                                        U
                                                                    </div>
                                                                </div>
                                                                <!-- Online Status Indicator -->
                                                                <div class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0f172a] shadow-lg"></div>
                                                            </div>
                                                            
                                                            <div class="flex-1 min-w-0">
                                                                <p class="text-sm font-semibold text-white truncate group-hover:text-teal-400 transition-colors" id="user-name">Loading...</p>
                                                                <p class="text-[11px] text-slate-400 truncate" id="user-email">...</p>
                                                            </div>
                                                            <button onclick="logout()" class="text-slate-500 hover:text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-all duration-300" title="로그아웃">
                                                                <i class="fas fa-sign-out-alt"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </aside>

                                                <!-- 메인 컨텐츠 -->
                                                <div class="flex-1 flex flex-col h-screen overflow-hidden bg-gradient-to-br from-teal-50 to-white w-full">
                                                    <!-- 헤더 -->
                                                    <header class="h-16 glass-header border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 z-10 sticky top-0">
                                                        <div class="flex items-center">
                                                            <!-- 햄버거 메뉴 버튼 -->
                                                            <button onclick="toggleSidebar()" class="mr-4 text-slate-500 hover:text-slate-700 md:hidden focus:outline-none">
                                                                <i class="fas fa-bars text-xl"></i>
                                                            </button>
                                                            <h2 id="page-title" class="text-xl font-bold text-slate-800 truncate">대시보드</h2>
                                                        </div>
                                                        <div class="flex items-center gap-4">
                                                            <div class="text-right hidden sm:block">
                                                                <p class="text-xs font-medium text-slate-500" id="current-date"></p>
                                                                <p class="text-sm font-bold text-slate-700 font-mono" id="current-time"></p>
                                                            </div>
                                                            <button class="p-2 text-teal-400 hover:text-teal-600 transition-colors rounded-full hover:bg-teal-50">
                                                                <i class="fas fa-bell text-lg"></i>
                                                            </button>
                                                        </div>
                                                    </header>

                                                    <main id="content" class="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth w-full">
                                                        <!-- 동적 컨텐츠 영역 -->
                                                    </main>
                                                </div>
                                            </div>

                                            <script>
            // 사이드바 토글 함수
                                                function toggleSidebar() {
                const sidebar = document.getElementById('sidebar');
                                                const overlay = document.getElementById('sidebarOverlay');

                                                if (sidebar.classList.contains('-translate-x-full')) {
                                                    // 열기
                                                    sidebar.classList.remove('-translate-x-full');
                                                overlay.classList.remove('hidden');
                } else {
                                                    // 닫기
                                                    sidebar.classList.add('-translate-x-full');
                                                overlay.classList.add('hidden');
                }
            }

                                                // 모바일에서 메뉴 클릭 시 사이드바 닫기
                                                function closeSidebarOnMobile() {
                                        if (window.innerWidth < 768) { // md breakpoint
                                                    toggleSidebar();
                                        }
                                    }

                                                // 서브메뉴 토글 및 자동 페이지 이동 함수
                                                function toggleSubMenu(button, menuId) {
                                        const menu = document.getElementById(menuId);
                                                const arrow = button?.querySelector('.submenu-arrow');

                                                if (menu && menu.classList.contains('open')) {
                                                    // 서브메뉴 닫기
                                                    menu.classList.remove('open');
                                                if (arrow) arrow.style.transform = 'rotate(0deg)';
                                        } else if (menu) {
                                                    // 서브메뉴 열기
                                                    menu.classList.add('open');
                                                if (arrow) arrow.style.transform = 'rotate(180deg)';
                                        }
                                    }

                                    // 초기 상태 설정 (현재 페이지가 포함된 서브메뉴 열기)
                                    document.addEventListener('DOMContentLoaded', () => {
                                                    setTimeout(() => {
                                                        const activeLink = document.querySelector('.nav-link.active');
                                                        if (activeLink) {
                                                            const parentSubmenu = activeLink.closest('.nav-submenu');
                                                            if (parentSubmenu) {
                                                                const group = parentSubmenu.closest('.nav-item-group');
                                                                if (group) {
                                                                    const btn = group.querySelector('button');
                                                                    toggleSubMenu(btn, parentSubmenu.id);
                                                                }
                                                            }
                                                        }
                                                    }, 500); 
                                    });

                                                // 현재 시간 표시
                                                function updateTime() {
                const now = new Date();
                                                const timeStr = now.toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                                const dateStr = now.toLocaleDateString('ko-KR', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                                document.getElementById('current-time').textContent = timeStr;
                                                document.getElementById('current-date').textContent = dateStr;
            }
                                                updateTime();
                                                setInterval(updateTime, 1000);
                                            </script>
                                            <script src="/static/js/config.js?v=1"></script>
                                            <script src="/static/js/utils.js?v=2"></script>
                                            <script src="/static/js/utils_address.js?v=1"></script>
                                            <script src="/static/js/auth.js?v=1"></script>
                                            <script src="/static/app.js?v=37"></script>
                                            <script src="/static/js/outbound.js?v=10"></script>
                                            <script src="/static/js/purchases.js?v=1"></script>
                                            <script src="/static/js/options.js?v=1"></script>
                                            <script src="/static/js/products.js?v=8"></script>
                                            <script src="/static/js/prices.js?v=1"></script>
                                            <script src="/static/js/system-settings.js?v=2"></script>
                                            <script src="/static/js/tracking.js?v=1"></script>
                                            <script src="/static/js/transaction-statement.js?v=1"></script>
                                            <script src="/static/js/qr-mes.js?v=4"></script>
                                            <script src="/static/js/production.js?v=10"></script>
                                            <script src="/static/js/shopfloor.js?v=2"></script>
                                            <script src="/static/js/barcode-manager.js?v=1"></script>
                                        </body>
                                    </html>
                                    `)
})

export default app

