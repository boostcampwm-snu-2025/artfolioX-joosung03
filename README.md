## ArtfolioX (artfolioX-joosung03)

ArtfolioX는 미술 전공 학생들을 위한 **작품 / 포트폴리오 관리 웹 앱**입니다.  
1주차 구현에서는 최소한의 기능을 가진 **프론트엔드(React + Vite)** 와 **백엔드(Node + Express)** 를 함께 구성했습니다.

### 프로젝트 구조

- `web/` – React + TypeScript + Vite 기반 SPA
  - 이메일을 식별자로 사용하는 간단한 로그인
  - 작품(Works) CRUD: 이미지 업로드, 태그, 프로젝트/연도 메타데이터, 필터링
  - 포트폴리오(Portfolios) 빌더: 작품 선택, 순서 조정, 개별 제목/설명 오버라이드, 미리보기
- `server/` – Node.js + Express API
  - `multer` 를 이용해 `server/uploads` 디렉터리에 이미지 업로드
  - 작품과 포트폴리오 데이터를 JSON 파일로 저장
  - Vite 개발 서버(`http://localhost:5173`)를 위한 CORS 설정

### 1주차 구현 범위 (Week 1 scope)

1주차 목표는 **end-to-end로 동작하는 최소 기능**을 만드는 것입니다.

- 이메일 기반 “로그인” (비밀번호 없음), 클라이언트 측에 세션 유지
- Works 페이지
  - 작품 생성 / 수정 / 삭제
  - 선택 입력 필드: 프로젝트, 연도, 태그, 설명
  - 백엔드로 이미지 업로드 후 썸네일 표시
  - 텍스트 검색, 프로젝트별 필터
- Portfolios 페이지
  - 로그인한 사용자의 작품 목록 로드
  - 사용자별 여러 포트폴리오 버전 생성
  - 작품 추가/삭제, 순서 변경, 포트폴리오 단위의 Custom title/description 설정
  - 한글 IME(조합형 입력)에 대응하는 입력 필드 처리
  - 제출 시 최종 순서/텍스트가 어떻게 보이는지 미리 보는 Preview 섹션

### 기술 스택 (Tech stack)

- **Frontend**: React 19, TypeScript, Vite, React Router
- **Backend**: Node.js, Express, Multer, 파일 기반 저장소
- **Linting**: ESLint + TypeScript (`web/eslint.config.js` 참고)

### 실행 방법 (Getting started)

#### 1. Backend (server)

```bash
cd server
npm install
npm run dev      # or: npm start
```

위 명령을 실행하면 `http://localhost:4000` 에서 API 서버가 올라갑니다:

- `GET /api/works?userEmail=...`
- `POST /api/works` (multipart, image optional)
- `PUT /api/works/:id`
- `DELETE /api/works/:id`
- `GET /api/portfolios?userEmail=...`
- `POST /api/portfolios`
- `PUT /api/portfolios/:id`
- `DELETE /api/portfolios/:id`

업로드된 이미지는 `/uploads/...` 경로로 서빙됩니다.

#### 2. Frontend (web)

```bash
cd web
npm install
npm run dev
```

앱은 기본적으로 `http://localhost:5173` 에서 실행되며, 다음 설정을 통해 백엔드와 통신합니다.

- `web/src/api/config.ts` 의 `API_BASE_URL` (기본값: `http://localhost:4000/api`)

### 향후 설계 방향 및 로드맵 (요약)

아래 항목들은 1주차 이후에 순차적으로 확장할 예정인 방향입니다.

- **데이터 모델 확장**
  - `Work`(개별 작품) → 여러 이미지, 재료, 카테고리, 태그, 컨셉/피드백 메모까지 포함
  - `Project`(작품 묶음) → 시리즈·캠프·방학 과제 단위로 작품을 그룹핑하고 기간/목표/회고를 기록
  - `PortfolioVersion`(제출용 버전) → 학교·전공·연도별로 작품 순서, Custom title/description 을 별도로 관리
  - `Template`(학교·전공 템플릿) → 카테고리별 최소 개수, 총 작품 수 등 규칙을 정의하는 모델

- **핵심 기능 확장**
  - Works: 여러 장의 이미지 업로드(전체샷/디테일/과정), 카드 인라인 편집, 태그 자동 추천 등
  - Projects: 작품 묶음 보기, 순서 조정, 프로젝트 단위 회고 기록
  - Portfolios: 드래그 앤 드롭으로 순서 편집, 버전별 다른 텍스트 적용, 카테고리 비율 자동 체크

- **차별화 기능**
  - 템플릿 시스템: 학교·전공별 규칙(예: 기초소묘 최소 N점)을 정의하고 충족 여부/부족 카테고리 안내
  - 지도 선생님 모드: 포트폴리오 공유 링크, 작품별 코멘트와 평가 기준(구도/색채/발상 등) 기록
  - 성장 타임라인: before/after 비교 뷰, 월별/카테고리별 작업량 및 스타일 변화 차트
  - 자동 PDF/시트 생성: 선택한 포트폴리오 버전을 A4 레이아웃으로 자동 배치해 출력용 PDF 생성

### 2주차 설계 & 3주차 데모 준비 (요약)
- 필수 데모 범위: (1) 포트폴리오 공유 링크(뷰어), (2) 템플릿 규칙 충족도 표시, (3) 선생님 코멘트 수집(공개 뷰).
- BDD 핵심 시나리오:
  - 공유 링크: 편집 가능한 포트폴리오 → “공개 링크 만들기” → 고유 URL 생성·읽기 전용 뷰 확인.
  - 템플릿 검증: 템플릿 선택 → 규칙 적용 → 충족도/부족 카테고리 경고 표시.
  - 코멘트: 공유 뷰에서 코멘트 제출 → 서버 저장 → 학생 측 리스트 반영.
- 데이터 구조(요약): `PortfolioVersion`에 `templateId`, `shareSlug`; `Template`(rules, min/maxTotal); `FeedbackComment`(portfolioId, workId?, authorName, role?, text, createdAt); `Work`에 `category`, `materials`.
- 브랜치/작업 규칙: main 직접 커밋 금지, `feature/<scope>-<short>` 단위로 PR → main 머지(리뷰/스쿼시 권장). 예) `feature/portfolio-share-link`, `feature/template-check`, `feature/comments-collector`.
- 우선순위 제안: (1) 템플릿 검증 로직, (2) 공유 링크 뷰어, (3) 코멘트 폼/저장/리스트.
- 자세한 BDD·데이터 정의는 GitHub Wiki “2주차 설계 · 주제 선정 및 BDD 정리” 참고.

