// API Base URL
const API_BASE = '/api';
window.API_BASE = API_BASE; // 명시적 전역 할당

// 인증 체크 (로그인 페이지 등 예외 처리 필요하지만 기존 로직 유지)
const token = localStorage.getItem('token');
// 현재 페이지가 login이나 register가 아닐 때 체크해야 함.
// 하지만 app.js는 spa처럼 동작하므로 단순 체크.
if (!token && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
    window.location.replace('/login');
}

// Axios 인터셉터 설정
if (window.axios) {
    let isRefreshing = false;
    let failedQueue = [];

    const processQueue = (error, token = null) => {
        failedQueue.forEach(prom => {
            if (error) {
                prom.reject(error);
            } else {
                prom.resolve(token);
            }
        });
        failedQueue = [];
    };

    axios.interceptors.request.use(config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Super Admin Impersonation
        const impersonatedTenantId = localStorage.getItem('impersonatedTenantId');
        if (impersonatedTenantId) {
            config.headers['X-Tenant-ID'] = impersonatedTenantId;
        }
        return config;
    });

    axios.interceptors.response.use(response => {
        return response;
    }, async error => {
        const originalRequest = error.config;

        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            // /api/auth/login 이나 /api/auth/refresh 에서 401이 나면 즉시 로그아웃
            if (originalRequest.url.includes('/auth/login') || originalRequest.url.includes('/auth/refresh')) {
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.replace('/login');
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return axios(originalRequest);
                }).catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.replace('/login');
                return Promise.reject(error);
            }

            try {
                // Refresh API 호출 (여기서는 인터셉터를 거치지 않게 주의하거나 별도 인스턴스 사용 고민 가능)
                const res = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
                if (res.data.success) {
                    const { token, refreshToken: newRefreshToken } = res.data.data;
                    localStorage.setItem('token', token);
                    localStorage.setItem('refreshToken', newRefreshToken);

                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    processQueue(null, token);
                    return axios(originalRequest);
                }
            } catch (refreshError) {
                processQueue(refreshError, null);
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.replace('/login');
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    });
}
