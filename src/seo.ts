/** 검색·답변형 엔진용 공통 SEO/AEO 설정 */

export const SITE_URL = 'https://wow3d.co.kr'
export const SITE_NAME = 'WOW Smart Manager'
export const SITE_NAME_KO = '와우 스마트 매니저'
export const ORG_NAME = '(주)와우쓰리디'
export const OG_IMAGE = `${SITE_URL}/static/wow-symbol-gold.jpg`

export const DEFAULT_TITLE = 'WOW Smart Manager - 중소제조 ERP·MES 재고 판매 생산관리'
export const DEFAULT_DESCRIPTION =
  '중소 제조·유통 기업을 위한 클라우드 ERP·MES. 재고, 판매, 출고, 구매, 인사, 회계, QR 생산추적을 한 곳에서 관리하세요.'
export const DEFAULT_KEYWORDS = [
  '제조 ERP',
  'MES',
  '재고관리',
  '판매관리',
  '출고관리',
  '스마트팩토리',
  '중소기업 ERP',
  '생산관리',
  'WOW Smart Manager',
  '와우 스마트 매니저',
  '와우쓰리디',
].join(', ')

/** Search Console / 네이버 서치어드바이저 인증값을 발급받으면 여기에 넣으면 됩니다. */
export const GOOGLE_SITE_VERIFICATION = ''
export const NAVER_SITE_VERIFICATION = 'eb3371b8f004a496f576cbe405c389b661806c01'
export const NAVER_HTML_FILE = 'naver165f9e79465026abd5b02aee545d676c.html'

export type SeoPage = {
  title: string
  description: string
  path: string
  index?: boolean
}

export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'WOW Smart Manager는 어떤 서비스인가요?',
    a: 'WOW Smart Manager는 중소 제조·유통 기업을 위한 클라우드 ERP·MES입니다. 재고, 판매, 출고, 구매, 영업 CRM, 인사·급여, 회계와 QR 기반 생산추적을 한 화면에서 관리합니다.',
  },
  {
    q: '어떤 기업에 적합한가요?',
    a: '재고와 판매, 출고, 생산 실적을 엑셀이나 수기로 관리하던 중소 제조사·유통사에 맞습니다. 3D프린팅·시제품·부품 유통처럼 SKU가 많고 출고가 잦은 현장에도 적합합니다.',
  },
  {
    q: 'ERP와 MES를 함께 쓰나요?',
    a: '네. ERP로 영업·구매·재고·인사·회계를 관리하고, MES로 BOM·공정·작업지시·품질·QR 추적을 연결합니다. 판매부터 생산, 출고까지 데이터가 이어집니다.',
  },
  {
    q: '무료로 시작할 수 있나요?',
    a: '무료 플랜으로 상품 100개·1인 계정부터 시작할 수 있습니다. 팀 사용과 엑셀 다운로드가 필요하면 월 5만 원 스탠다드, 무제한·API가 필요하면 월 7만 원 프로 플랜을 선택하면 됩니다.',
  },
  {
    q: '재고와 출고는 어떻게 관리하나요?',
    a: '창고별 재고, 예약 재고, 적정재고·발주제안, 간편 출고, 피킹·패킹·송장, 출고 이력을 제공합니다. POS 판매와 주문·배송, 반품·교환까지 같은 재고 흐름으로 처리합니다.',
  },
]

export function absoluteUrl(path = '/'): string {
  if (!path || path === '/') return `${SITE_URL}/`
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export function seoHeadHtml(page: SeoPage): string {
  const url = absoluteUrl(page.path)
  const index = page.index !== false
  const robots = index ? 'index,follow' : 'noindex,nofollow'
  const googleMeta = GOOGLE_SITE_VERIFICATION
    ? `<meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATION}">`
    : ''
  const naverMeta = NAVER_SITE_VERIFICATION
    ? `<meta name="naver-site-verification" content="${NAVER_SITE_VERIFICATION}">`
    : ''

  return `
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${naverMeta}
${googleMeta}
<title>${escapeHtml(page.title)}</title>
<meta name="description" content="${escapeHtml(page.description)}">
<meta name="keywords" content="${escapeHtml(DEFAULT_KEYWORDS)}">
<meta name="author" content="${escapeHtml(ORG_NAME)}">
<meta name="robots" content="${robots}">
<meta name="googlebot" content="${robots}">
<meta name="theme-color" content="#0f172a">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="ko" href="${url}">
<link rel="icon" href="/static/wow-symbol-gold.jpg">
<link rel="apple-touch-icon" href="/static/wow-symbol-gold.jpg">
<meta property="og:type" content="website">
<meta property="og:locale" content="ko_KR">
<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">
<meta property="og:title" content="${escapeHtml(page.title)}">
<meta property="og:description" content="${escapeHtml(page.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${OG_IMAGE}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(page.title)}">
<meta name="twitter:description" content="${escapeHtml(page.description)}">
<meta name="twitter:image" content="${OG_IMAGE}">
`.trim()
}

export function jsonLdHtml(page: SeoPage): string {
  const url = absoluteUrl(page.path)
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: ORG_NAME,
      alternateName: [SITE_NAME, SITE_NAME_KO],
      url: SITE_URL,
      logo: OG_IMAGE,
      sameAs: ['https://www.wow3dp.co.kr'],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: 'ko-KR',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#app`,
      name: SITE_NAME,
      alternateName: SITE_NAME_KO,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: SITE_URL,
      image: OG_IMAGE,
      description: DEFAULT_DESCRIPTION,
      inLanguage: 'ko-KR',
      offers: [
        { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'KRW' },
        { '@type': 'Offer', name: 'Standard', price: '50000', priceCurrency: 'KRW' },
        { '@type': 'Offer', name: 'Pro', price: '70000', priceCurrency: 'KRW' },
      ],
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: page.title,
      description: page.description,
      inLanguage: 'ko-KR',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#app` },
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/login#faq`,
      inLanguage: 'ko-KR',
      mainEntity: FAQ_ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ]

  const payload = {
    '@context': 'https://schema.org',
    '@graph': graph,
  }

  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`
}

export function robotsTxt(): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Allow: /login',
    'Allow: /faq',
    'Allow: /static/',
    'Allow: /llms.txt',
    'Disallow: /admin',
    'Disallow: /api/',
    '',
    'User-agent: Yeti',
    'Allow: /',
    'Allow: /login',
    'Allow: /faq',
    'Allow: /static/',
    'Disallow: /admin',
    'Disallow: /api/',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n')
}

export function sitemapXml(): string {
  const today = new Date().toISOString().slice(0, 10)
  const urls = [
    { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'weekly' },
    { loc: `${SITE_URL}/login`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${SITE_URL}/faq`, priority: '0.8', changefreq: 'monthly' },
  ]
  const body = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`
}

export function llmsTxt(): string {
  return `# ${SITE_NAME} (${SITE_NAME_KO})

> 중소 제조·유통 기업을 위한 클라우드 ERP·MES. 재고, 판매, 출고, 구매, 인사, 회계, QR 생산추적을 한 곳에서 관리합니다.

- 공식 사이트: ${SITE_URL}
- 로그인/가입: ${SITE_URL}/login
- FAQ: ${SITE_URL}/faq
- 운영사: ${ORG_NAME}

## 제품 한 줄 정의
${SITE_NAME}는 엑셀·수기 관리를 대체하는 웹 기반 스마트제조 ERP/MES입니다.

## 주요 기능
- ERP: 영업·CRM, 견적, POS, 주문/배송, 반품, 거래명세서, 고객관리
- 구매·물류: 발주, 공급사, 입고·검수, 출고, 피킹, 패킹, 송장
- 재고·SCM: 창고별 재고, 재고이동, 예약재고, 적정재고·발주제안
- 인사·급여: 조직·사원, 근태, 급여
- 재무·회계: 매출채권(AR), 매입채무(AP), 전표
- MES: BOM·공정·설비, 작업지시, 품질, OEE, QR 추적, 제조 KPI

## 요금
- Free: 0원, 상품 100개, 1인
- Standard: 월 50,000원, 상품 1,000개, 사용자 5명
- Pro: 월 70,000원, 무제한·API

## FAQ
${FAQ_ITEMS.map((item) => `### ${item.q}\n${item.a}`).join('\n\n')}
`
}

export function faqPageHtml(): string {
  const items = FAQ_ITEMS.map(
    (item) => `        <section class="mb-8">
          <h2 class="text-xl font-bold text-white mb-2">${escapeHtml(item.q)}</h2>
          <p class="text-slate-300 leading-relaxed">${escapeHtml(item.a)}</p>
        </section>`
  ).join('\n')

  return `<!DOCTYPE html>
<html lang="ko">
<head>
${seoHeadHtml({
  title: `자주 묻는 질문 | ${SITE_NAME} 제조 ERP·MES`,
  description: 'WOW Smart Manager 도입 전 자주 묻는 질문. 대상 기업, ERP·MES 범위, 무료 플랜, 재고·출고 관리 방식을 안내합니다.',
  path: '/faq',
})}
${jsonLdHtml({
  title: `자주 묻는 질문 | ${SITE_NAME}`,
  description: DEFAULT_DESCRIPTION,
  path: '/faq',
})}
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-200 min-h-screen">
  <main class="max-w-3xl mx-auto px-6 py-16">
    <p class="text-teal-400 text-sm font-bold tracking-widest uppercase mb-3">FAQ</p>
    <h1 class="text-3xl font-extrabold text-white mb-4">${SITE_NAME} 자주 묻는 질문</h1>
    <p class="text-slate-400 mb-10">${escapeHtml(DEFAULT_DESCRIPTION)}</p>
${items}
    <p class="mt-12"><a href="/login" class="text-teal-400 hover:underline">로그인하고 시작하기</a></p>
  </main>
</body>
</html>`
}

export function loginMarketingHtml(): string {
  const faqs = FAQ_ITEMS.map(
    (item) => `                                    <details class="group rounded-2xl border border-white/10 bg-white/5 p-6">
                                        <summary class="cursor-pointer text-white font-semibold list-none flex items-center justify-between gap-4">
                                            ${escapeHtml(item.q)}
                                            <i class="fas fa-chevron-down text-xs text-slate-500 group-open:rotate-180 transition-transform"></i>
                                        </summary>
                                        <p class="mt-4 text-slate-300 text-sm leading-relaxed">${escapeHtml(item.a)}</p>
                                    </details>`
  ).join('\n')

  return `
                                <section class="w-full max-w-6xl mt-24" id="product">
                                    <div class="text-center mb-12">
                                        <span class="text-teal-400 font-bold text-sm tracking-[0.3em] uppercase mb-4 block">제조 ERP · MES</span>
                                        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">재고부터 생산·출고까지 한 시스템</h2>
                                        <p class="text-slate-400 max-w-3xl mx-auto leading-relaxed">
                                            ${escapeHtml(DEFAULT_DESCRIPTION)}
                                        </p>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <article class="rounded-2xl border border-white/10 bg-white/5 p-6">
                                            <h3 class="text-white font-bold mb-2">영업 · 재고 · 물류</h3>
                                            <p class="text-slate-400 text-sm leading-relaxed">견적, POS, 주문/배송, 창고별 재고, 피킹·패킹·송장, 발주·입고를 한 흐름으로 처리합니다.</p>
                                        </article>
                                        <article class="rounded-2xl border border-white/10 bg-white/5 p-6">
                                            <h3 class="text-white font-bold mb-2">인사 · 회계</h3>
                                            <p class="text-slate-400 text-sm leading-relaxed">조직·사원, 근태, 급여와 매출채권(AR), 매입채무(AP), 전표를 같은 화면에서 관리합니다.</p>
                                        </article>
                                        <article class="rounded-2xl border border-white/10 bg-white/5 p-6">
                                            <h3 class="text-white font-bold mb-2">MES · QR 추적</h3>
                                            <p class="text-slate-400 text-sm leading-relaxed">BOM·공정·설비, 작업지시, 품질, 제조 KPI와 QR 기반 추적로 현장 실적을 남깁니다.</p>
                                        </article>
                                    </div>
                                </section>

                                <section class="w-full max-w-6xl mt-24" id="faq">
                                    <div class="text-center mb-10">
                                        <span class="text-teal-400 font-bold text-sm tracking-[0.3em] uppercase mb-4 block">FAQ</span>
                                        <h2 class="text-3xl font-bold text-white mb-4">자주 묻는 질문</h2>
                                    </div>
                                    <div class="space-y-4 max-w-3xl mx-auto">
${faqs}
                                    </div>
                                    <p class="text-center mt-8 text-sm text-slate-500">
                                        <a href="/faq" class="text-teal-400 hover:underline">FAQ 전체 보기</a>
                                    </p>
                                </section>`
}

export function noscriptHomeHtml(): string {
  return `<noscript>
  <main>
    <h1>${SITE_NAME} - 중소제조 ERP·MES</h1>
    <p>${escapeHtml(DEFAULT_DESCRIPTION)}</p>
    <p><a href="${SITE_URL}/login">로그인 / 회원가입</a> · <a href="${SITE_URL}/faq">자주 묻는 질문</a></p>
  </main>
</noscript>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function shouldNoindexHost(host: string): boolean {
  const h = host.split(':')[0]?.toLowerCase() || ''
  return h.endsWith('.pages.dev') || h.endsWith('.workers.dev')
}

export function apexRedirectUrl(host: string, url: string): string | null {
  const hostname = host.split(':')[0]?.toLowerCase() || ''
  if (hostname !== 'www.wow3d.co.kr') return null
  try {
    const next = new URL(url)
    next.protocol = 'https:'
    next.hostname = 'wow3d.co.kr'
    next.port = ''
    return next.toString()
  } catch {
    return `https://wow3d.co.kr/`
  }
}
