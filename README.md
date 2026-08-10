# Smart Link-F (스마트제조 ERP/MES)

스마트제조 지원을 위한 통합 ERP/MES 웹 시스템입니다.  
(재고·판매·출고·발주 ERP + QR MES 기반)

## 🎯 프로젝트 개요

중소 제조·유통 사업체를 위한 재고·생산·물류 통합 관리 솔루션입니다.

### 주요 기능

- ✅ **대시보드**: 실시간 매출 현황, 재고 통계, 베스트셀러 분석
- ✅ **상품 관리**: 상품 등록/수정/삭제, 재고 추적, 카테고리 관리
- ✅ **고객 관리**: 고객 정보 관리, 구매 이력 추적, VIP 등급 관리
- ✅ **재고·출고·발주**: 입고/출고/조정, 창고별 재고, 발주·공급사
- ✅ **MES (QR)**: QR 기반 입출고·판매·추적
- ⏳ **스마트제조 고도화**: 작업지시, BOM, 생산실적 KPI 등

## 🌐 공개 URL

- **프로덕션**: https://wow-smart-manager.pages.dev
- **GitHub**: https://github.com/seojeongju/wow-smart-manager
- **API Base**: https://wow-smart-manager.pages.dev/api

## 🏗️ 기술 스택

### 백엔드
- **Hono** - 경량 웹 프레임워크
- **TypeScript** - 타입 안정성
- **Cloudflare D1** - SQLite 기반 데이터베이스
- **Cloudflare Pages** - 엣지 배포 플랫폼

### 프론트엔드
- **Vanilla JavaScript** - 순수 자바스크립트
- **TailwindCSS** - 유틸리티 CSS 프레임워크
- **Chart.js** - 데이터 시각화
- **Axios** - HTTP 클라이언트
- **Font Awesome** - 아이콘
- **Noto Sans KR** - 한글 웹폰트

### 디자인
- **블루 계열 컬러 스킴** - 현대적이고 세련된 디자인
- **그라디언트 배경** - 부드러운 색상 전환
- **반응형 레이아웃** - 모바일, 태블릿, 데스크톱 지원
- **카드 호버 효과** - 인터랙티브한 사용자 경험

## 📊 데이터 모델

### 주요 테이블

1. **products** (상품)
   - SKU, 상품명, 카테고리, 가격, 재고량 등

2. **customers** (고객)
   - 이름, 연락처, 등급, 총 구매액, 구매 횟수 등

3. **sales** (판매)
   - 고객 정보, 결제 금액, 결제 방법, 상태 등

4. **sale_items** (판매 상세)
   - 판매별 상품 내역

5. **stock_movements** (재고 이동)
   - 입고/출고/조정 이력

## 🚀 API 엔드포인트

### 상품 관리
- `GET /api/products` - 상품 목록 조회
- `GET /api/products/:id` - 상품 상세 조회
- `POST /api/products` - 상품 등록
- `PUT /api/products/:id` - 상품 수정
- `DELETE /api/products/:id` - 상품 삭제
- `GET /api/products/alerts/low-stock` - 재고 부족 상품
- `GET /api/products/meta/categories` - 카테고리 목록

### 고객 관리
- `GET /api/customers` - 고객 목록 조회
- `GET /api/customers/:id` - 고객 상세 조회
- `POST /api/customers` - 고객 등록
- `PUT /api/customers/:id` - 고객 수정
- `DELETE /api/customers/:id` - 고객 삭제
- `GET /api/customers/:id/purchases` - 고객 구매 이력

### 판매 관리
- `GET /api/sales` - 판매 목록 조회
- `GET /api/sales/:id` - 판매 상세 조회
- `POST /api/sales` - 판매 등록
- `PUT /api/sales/:id/cancel` - 판매 취소
- `GET /api/sales/stats/summary` - 판매 통계
- `GET /api/sales/stats/bestsellers` - 베스트셀러

### 재고 관리
- `GET /api/stock/movements` - 재고 이동 내역
- `GET /api/stock/movements/:productId` - 상품별 재고 이동
- `POST /api/stock/in` - 재고 입고
- `POST /api/stock/out` - 재고 출고
- `POST /api/stock/adjust` - 재고 조정
- `GET /api/stock/summary` - 재고 현황 요약

### 대시보드
- `GET /api/dashboard/summary` - 주요 지표
- `GET /api/dashboard/sales-chart` - 매출 차트 데이터
- `GET /api/dashboard/category-stats` - 카테고리별 통계
- `GET /api/dashboard/bestsellers` - 베스트셀러 TOP 5
- `GET /api/dashboard/recent-sales` - 최근 판매 내역
- `GET /api/dashboard/low-stock-alerts` - 재고 부족 경고
- `GET /api/dashboard/vip-customers` - VIP 고객

## 📝 사용 가이드

### 대시보드
1. 메인 화면에서 오늘의 매출, 이번 달 매출, 재고 가치, 고객 수 확인
2. 매출 추이 차트로 최근 7일간의 매출 흐름 파악
3. 베스트셀러 TOP 5로 인기 상품 확인
4. 재고 부족 경고로 발주 필요 상품 확인

### 상품 관리
1. "상품 등록" 버튼으로 새 상품 추가
2. 검색창으로 상품명 또는 SKU 검색
3. 카테고리 필터로 특정 카테고리 상품만 조회
4. "재고 부족 상품만 보기" 체크박스로 발주 필요 상품 확인
5. 수정/삭제 버튼으로 상품 정보 관리

### 고객 관리
1. "고객 등록" 버튼으로 신규 고객 추가
2. 고객 목록에서 총 구매액과 구매 횟수 확인
3. VIP 등급 고객 별도 표시
4. 수정/삭제 버튼으로 고객 정보 관리

## 🔧 개발 환경 설정

### 로컬 개발

```bash
# 의존성 설치
npm install

# 데이터베이스 마이그레이션
npm run db:migrate:local

# 테스트 데이터 시드
npm run db:seed

# 프로젝트 빌드
npm run build

# 개발 서버 시작
npm run dev:sandbox

# 또는 PM2로 시작
pm2 start ecosystem.config.cjs
```

### 데이터베이스 관리

```bash
# 데이터베이스 리셋 (마이그레이션 + 시드)
npm run db:reset

# 로컬 데이터베이스 콘솔
npm run db:console:local

# 프로덕션 데이터베이스 마이그레이션
npm run db:migrate:prod
```

### 유용한 스크립트

```bash
# 포트 3000 정리
npm run clean-port

# 서버 테스트
npm run test

# 빌드 후 미리보기
npm run preview
```

## 📈 현재 완료된 기능

### Phase 1 (MVP) ✅
- [x] 프로젝트 초기 설정
- [x] 데이터베이스 스키마 구축
- [x] 상품 관리 API (CRUD)
- [x] 재고 관리 API
- [x] 기본 대시보드

### Phase 2 (핵심 기능) ✅
- [x] 고객 관리 API (CRUD)
- [x] 판매 관리 API
- [x] 판매-재고 연동
- [x] 통계 및 차트 API
- [x] 대시보드 UI
- [x] 상품 관리 UI
- [x] 고객 관리 UI

### Phase 3 (고급 기능) 🔄
- [ ] 재고 관리 UI (입고/출고/조정)
- [ ] 판매 관리 UI (판매 등록/조회)
- [ ] 상품/고객 등록 모달
- [ ] 검색 및 필터링 고도화
- [ ] 데이터 내보내기 (Excel/CSV)
- [ ] 인쇄 기능

## 🎯 다음 개발 단계

1. **재고 관리 UI 완성**
   - 입고/출고/조정 화면
   - 재고 이동 내역 조회

2. **판매 관리 UI 완성**
   - 판매 등록 화면 (상품 선택, 고객 선택)
   - 판매 내역 조회 및 상세
   - 판매 취소 기능

3. **모달 기능 구현**
   - 상품 등록/수정 모달
   - 고객 등록/수정 모달
   - 판매 등록 모달

4. **고급 기능**
   - 실시간 검색
   - 날짜 범위 필터
   - 엑셀 내보내기
   - 인쇄 기능

## 🗃️ 테스트 데이터

시스템에는 다음과 같은 테스트 데이터가 포함되어 있습니다:

- 상품 8개 (전자제품, 가구, 액세서리)
- 고객 4명 (VIP 2명 포함)
- 판매 내역 3건
- 재고 이동 내역 10건

## 📄 배포 정보

- **플랫폼**: Cloudflare Pages (전세계 엣지 배포)
- **데이터베이스**: Cloudflare D1 (프로덕션)
  - Database ID: 463de385-2845-4930-b64e-c0c4e872e01a
  - Region: ENAM (유럽/북미)
- **프로덕션 URL**: https://wow-smart-manager.pages.dev
- **Pages**: `wow-smart-manager`
- **D1**: `smart-link-f-db` (binding: `DB`)
- **R2**: `smart-link-f-assets` (binding: `R2`)
- **상태**: ✅ 프로덕션 배포 완료
- **최종 업데이트**: 2025-10-31

## 🎨 최근 디자인 변경사항 (2025-10-31)

### 브랜딩
- ✅ WOW-Smart Manager 브랜드 적용
- ✅ "WOW-Smart Manager" 타이틀 적용
- ✅ 중앙 정렬 로고 섹션

### UI/UX 개선
- ✅ 블루 계열 컬러 스킴 적용
- ✅ 로고 섹션: 흰색 배경
- ✅ 페이지 헤더: 연한 블루 그라디언트
- ✅ 대시보드 메뉴: 밝은 블루 강조
- ✅ 대시보드 카드: 4색 그라디언트 (Blue, Indigo, Purple, Cyan)
- ✅ 호버 효과 및 그림자 추가
- ✅ Noto Sans KR 폰트 적용

## 🔐 보안 고려사항

현재 버전은 인증 기능이 없는 MVP입니다. 프로덕션 배포 시 다음 사항을 추가해야 합니다:

- 사용자 인증 및 권한 관리
- API 요청 검증 강화
- HTTPS 강제 적용
- 세션 관리
- 비밀번호 해싱

## 📞 문의

이 시스템은 PRD를 기반으로 개발되었으며, 지속적으로 업데이트됩니다.

---

**License**: MIT
**Version**: 1.0.0
**Last Updated**: 2025-10-31
