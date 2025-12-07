import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import WorksPage from "./pages/WorksPage";
import PortfoliosPage from "./pages/PortfoliosPage";
import { RequireAuth } from "./auth/RequireAuth";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />

        <Route
          path="/works"
          element={
            <RequireAuth>
              <WorksPage />
            </RequireAuth>
          }
        />

        <Route
          path="/portfolios"
          element={
            <RequireAuth>
              <PortfoliosPage />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
