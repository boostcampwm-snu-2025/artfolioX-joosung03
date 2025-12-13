## ArtfolioX Server (Node.js + Express)

### 실행
```bash
cd server
npm install
npm run dev   # or: npm start
```

### 주요 엔드포인트
- Works: `GET/POST/PUT/DELETE /api/works`
- Portfolios: `GET/POST/PUT/DELETE /api/portfolios`
- Templates: `GET /api/templates`, `GET /api/templates/:id`, `POST /api/templates`
- 준비도 계산: `POST /api/portfolios/:id/readiness` (`{ templateId }`)
- 공유 링크 발급: `POST /api/portfolios/:id/share`
- 공유 뷰 데이터: `GET /api/shared/:slug`
- 공유 뷰 코멘트: `GET|POST /api/shared/:slug/comments`

### 데이터 필드 (요약)
- Work: 기본 필드 + `category`, `materials` (템플릿 매칭/메타데이터)
- PortfolioVersion: 기본 필드 + `templateId`, `shareSlug`
- Template: `id`, `name`, `rules[{ category, minCount?, maxCount? }]`, `minTotal?`, `maxTotal?`
- FeedbackComment: `portfolioId`, `workId?`, `authorName`, `role?`, `text`, `createdAt`

### 데이터 저장/주의사항
- 저장소는 파일 기반이며 런타임 데이터는 `server/data/*.json` 아래에 생성됩니다.
- `server/data/*.json` 는 커밋하지 않도록 `.gitignore` 에서 제외합니다.

### 참고
- 2주차 위키(“설계 · 주제 선정 및 BDD 정리”)에 공유 링크/템플릿 준비도/코멘트 수집 BDD와 데이터 구조가 정리되어 있습니다.

