import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function AppHeader() {
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
  }

  return (
    <header className="app-header">
      <h1 className="app-title">ArtfolioX</h1>
      <div>
        <Link
          to="/works"
          className="header-link"
          style={{ marginRight: 16 }}
        >
          Works
        </Link>
        <Link
          to="/portfolios"
          className="header-link"
          style={{ marginRight: 16 }}
        >
          Portfolios
        </Link>
        <Link
          to="/templates"
          className="header-link"
          style={{ marginRight: 16 }}
        >
          Templates
        </Link>
        {user && (
          <span style={{ fontSize: 12, opacity: 0.7, marginRight: 12 }}>
            {user.email}
          </span>
        )}
        <button
          className="pill-button logout-btn"
          type="button"
          onClick={handleLogout}
        >
          Log out
        </button>
      </div>
    </header>
  );
}
