## ArtfolioX Web (React + TypeScript + Vite)

이 디렉터리는 **ArtfolioX**의 프론트엔드 SPA입니다.  
미술 전공 학생들이 자신의 작품을 정리하고, 지원용 포트폴리오 버전을 여러 개 만들어볼 수 있도록 돕는 도구입니다.

React 19, TypeScript, Vite로 구성되어 있으며, `server/`에서 실행되는 백엔드 API와 통신합니다.

### 1주차 기능 (Features – Week 1)

- **Auth**
  - 비밀번호 없이 이메일만으로 “로그인” (identifier) 하는 방식
  - `AuthContext` 로 로그인 상태 관리
  - `RequireAuth` 를 이용한 간단한 보호 라우트

- **Works page**
  - 로그인한 사용자의 작품 생성 / 수정 / 삭제
  - 필드: `title`(필수), `description`, `project`, `year`, `tags` (선택)
  - 이미지 업로드 + 썸네일 프리뷰 (`/uploads` 폴더에 저장된 파일 사용)
  - 제목/설명/태그 기준 검색, 프로젝트별 필터
  - 서버 에러에 대한 간단한 에러 메시지 처리 및 폼 초기화 로직

- **Portfolios page**
  - 현재 로그인한 사용자의 작품 목록을 불러와 포트폴리오 “버전”을 여러 개 생성
  - 포트폴리오별 기본 정보: `title`, `target school`, `target major`, `year`
  - 포함할 작품 선택, 순서 변경, 포트폴리오 전용 Custom title/description 설정
  - 한글 IME(조합형 입력)를 고려한 입력 처리(조합 완료 시점에만 서버 업데이트)
  - 실제 제출 형태에 가까운 미리보기(순서, 제목, 설명을 반영해 리스트 출력)

### API 설정 (API configuration)

- 모든 API 호출은 `src/api/config.ts` 의 `API_BASE_URL` 을 사용합니다.
  - 기본값: `http://localhost:4000/api`
- 백엔드(`server/`)에서 제공하는 주요 엔드포인트:
  - `GET /api/works?userEmail=...`
  - `POST /api/works` (multipart, `image` 필드 선택)
  - `PUT /api/works/:id`
  - `DELETE /api/works/:id`
  - `GET /api/portfolios?userEmail=...`
  - `POST /api/portfolios`
  - `PUT /api/portfolios/:id`
  - `DELETE /api/portfolios/:id`

### 스크립트 (Scripts)

`web/` 디렉터리에서 실행:

```bash
npm install        # 의존성 설치
npm run dev        # Vite 개발 서버 실행 (http://localhost:5173)
npm run build      # 타입 체크 + 프로덕션 빌드
npm run preview    # 프로덕션 빌드 프리뷰
npm run lint       # ESLint 실행
```

### 개발 참고 (Development notes)

- 라우팅 설정 위치: `src/App.tsx`
  - `/login`, `/` (dashboard), `/works`, `/portfolios`
- Auth context 구현: `src/auth/AuthContext.tsx`
- 주요 페이지:
  - `src/pages/LoginPage.tsx`
  - `src/pages/WorksPage.tsx`
  - `src/pages/PortfoliosPage.tsx`
- 공용 헤더 / 내비게이션: `src/layout/AppHeader.tsx`
