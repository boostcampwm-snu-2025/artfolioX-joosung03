import { AppHeader } from "../layout/AppHeader";

export default function DashboardPage() {
  return (
    <div className="app-root">
      <AppHeader />
      <main className="app-main">
        <h2>Dashboard</h2>
        <p>
          Works에서 작품을 등록하고, Portfolios에서 학교별 포트폴리오를 구성할 수 있습니다.
        </p>
      </main>
    </div>
  );
}
