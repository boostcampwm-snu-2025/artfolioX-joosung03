// src/pages/LoginPage.tsx
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();

  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [pending, setPending] = useState(false);

  // 이미 로그인 되어 있으면 루트로 보내기
  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;
    setPending(true);

    login(email.trim());

    const from = (
      location.state as { from?: { pathname?: string } } | null
    )?.from?.pathname;
    navigate(from ?? "/", { replace: true });

    setPending(false);
  }

  return (
    <div className="app-root">
      <div className="login-card">
        <h1 className="app-title">ArtfolioX</h1>
        <p className="app-subtitle">Art portfolio manager for art students</p>

        <div className="mode-toggle">
          <button
            type="button"
            className={mode === "login" ? "mode-btn active" : "mode-btn"}
            onClick={() => setMode("login")}
          >
            Log in
          </button>
          <button
            type="button"
            className={mode === "signup" ? "mode-btn active" : "mode-btn"}
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            <span>Email (identifier)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <button type="submit" disabled={pending || !email.trim()}>
            {pending ? "Please wait..." : mode === "login" ? "Enter" : "Create"}
          </button>
        </form>
      </div>
    </div>
  );
}
