// src/pages/DashboardPage.tsx
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1 className="app-title">ArtfolioX</h1>
        <div>
          <Link to="/works" className="header-link" style={{ marginRight: 16 }}>
            Works
          </Link>
          {user && (
            <span style={{ fontSize: 12, opacity: 0.7, marginRight: 12 }}>
              {user.email}
            </span>
          )}
          <button className="header-link" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="app-main">
        <h2>Dashboard</h2>
        <p>왼쪽 상단 Works 링크를 눌러 작품을 등록해 보세요.</p>
      </main>
    </div>
  );
}
