import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../layout/AppHeader";
import { API_BASE_URL } from "../api/config";
import type { PortfolioReadiness, PortfolioVersion, Template } from "../portfolios/types";

type TemplateRuleDraft = {
  category: string;
  minCount?: number;
  maxCount?: number;
};

function safeJsonParseRules(text: string): TemplateRuleDraft[] | null {
  try {
    const raw = JSON.parse(text);
    if (!Array.isArray(raw)) return null;
    return raw as TemplateRuleDraft[];
  } catch {
    return null;
  }
}

export default function TemplatesPage() {
  const { user } = useAuth();
  const userEmail = user?.email ?? "";

  const [templates, setTemplates] = useState<Template[]>([]);
  const [portfolios, setPortfolios] = useState<PortfolioVersion[]>([]);

  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [readiness, setReadiness] = useState<PortfolioReadiness | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateRulesText, setNewTemplateRulesText] = useState(
    '[{"category":"foundation_drawing","minCount":2,"maxCount":6}]'
  );
  const [newTemplateMinTotal, setNewTemplateMinTotal] = useState("4");
  const [newTemplateMaxTotal, setNewTemplateMaxTotal] = useState("12");

  async function loadTemplates() {
    if (!userEmail) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/templates?userEmail=${encodeURIComponent(userEmail)}`
      );
      if (!res.ok) return;
      const data = (await res.json()) as Template[];
      setTemplates(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadPortfolios() {
    if (!userEmail) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/portfolios?userEmail=${encodeURIComponent(userEmail)}`
      );
      if (!res.ok) return;
      const data = (await res.json()) as PortfolioVersion[];
      data.sort((a, b) => b.updatedAt - a.updatedAt);
      setPortfolios(data);
      if (!selectedPortfolioId && data.length > 0) {
        setSelectedPortfolioId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadTemplates();
    loadPortfolios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  const selectedPortfolio = useMemo(
    () => portfolios.find((p) => p.id === selectedPortfolioId) ?? null,
    [portfolios, selectedPortfolioId]
  );

  useEffect(() => {
    setReadiness(null);
    setShareUrl(
      selectedPortfolio?.shareSlug
        ? `${window.location.origin}/share/${selectedPortfolio.shareSlug}`
        : null
    );
    setSelectedTemplateId(selectedPortfolio?.templateId ?? "");
  }, [selectedPortfolio?.id]);

  async function updatePortfolioRemote(id: string, patch: Partial<PortfolioVersion>) {
    const res = await fetch(`${API_BASE_URL}/portfolios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || "포트폴리오 업데이트에 실패했습니다.");
    }
    const updated = (await res.json()) as PortfolioVersion;
    setPortfolios((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function handleCreateTemplate() {
    if (!userEmail) return;
    const name = newTemplateName.trim();
    if (!name) {
      setError("템플릿 이름을 입력해주세요.");
      return;
    }
    const rules = safeJsonParseRules(newTemplateRulesText);
    if (!rules || rules.length === 0) {
      setError("규칙 JSON 형식이 올바르지 않습니다.");
      return;
    }
    try {
      setError(null);
      const res = await fetch(`${API_BASE_URL}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          name,
          rules,
          minTotal: newTemplateMinTotal.trim(),
          maxTotal: newTemplateMaxTotal.trim(),
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "템플릿 저장에 실패했습니다.");
      }
      const created = (await res.json()) as Template;
      await loadTemplates();
      setSelectedTemplateId(created.id);
      setNewTemplateName("");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "템플릿 저장 중 오류가 발생했습니다.");
    }
  }

  async function handleApplyTemplateToPortfolio() {
    if (!selectedPortfolio) return;
    try {
      setError(null);
      await updatePortfolioRemote(selectedPortfolio.id, {
        templateId: selectedTemplateId || null,
      });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "템플릿 적용 중 오류가 발생했습니다.");
    }
  }

  async function handleCheckReadiness() {
    if (!selectedPortfolio || !selectedTemplateId) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_BASE_URL}/portfolios/${selectedPortfolio.id}/readiness`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: selectedTemplateId }),
        }
      );
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "준비도 계산에 실패했습니다.");
      }
      const data = (await res.json()) as PortfolioReadiness;
      setReadiness(data);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "준비도 계산 중 오류가 발생했습니다.");
    }
  }

  async function handleGenerateShareLink() {
    if (!selectedPortfolio) return;
    try {
      setError(null);
      const res = await fetch(`${API_BASE_URL}/portfolios/${selectedPortfolio.id}/share`, {
        method: "POST",
      });
      if (!res.ok) {
        // fallback (되는척): create local url even if server fails
        const fallbackSlug = Math.random().toString(36).slice(2, 8);
        setShareUrl(`${window.location.origin}/share/${fallbackSlug}`);
        setError("서버 응답이 불안정해 임시 공유 링크를 생성했습니다.");
        return;
      }
      const data = (await res.json()) as { shareSlug: string; url: string };
      setShareUrl(`${window.location.origin}/share/${data.shareSlug}`);
      setPortfolios((prev) =>
        prev.map((p) => (p.id === selectedPortfolio.id ? { ...p, shareSlug: data.shareSlug } : p))
      );
    } catch (e) {
      console.error(e);
      // fallback (되는척)
      const fallbackSlug = Math.random().toString(36).slice(2, 8);
      setShareUrl(`${window.location.origin}/share/${fallbackSlug}`);
      setError("네트워크 오류로 임시 공유 링크를 생성했습니다.");
    }
  }

  if (!userEmail) {
    return (
      <div className="app-root">
        <p>로그인 후 템플릿을 관리할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="app-root">
      <AppHeader />
      <main className="app-main">
        <section className="card">
          <h2>Templates</h2>
          <p className="hint-text">
            템플릿 저장/관리 및 준비도/공유 기능은 여기에서 관리합니다.{" "}
            <Link to="/portfolios">포트폴리오</Link>에서 작품 구성은 편집하세요.
          </p>

          {error && <p className="error-text">{error}</p>}

          <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>내 템플릿 저장</h3>
            <div style={{ display: "grid", gap: 8 }}>
              <input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="템플릿 이름"
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  style={{ width: 140 }}
                  value={newTemplateMinTotal}
                  onChange={(e) => setNewTemplateMinTotal(e.target.value)}
                  placeholder="minTotal"
                />
                <input
                  style={{ width: 140 }}
                  value={newTemplateMaxTotal}
                  onChange={(e) => setNewTemplateMaxTotal(e.target.value)}
                  placeholder="maxTotal"
                />
                <button type="button" onClick={handleCreateTemplate}>
                  템플릿 저장
                </button>
              </div>
              <textarea
                rows={4}
                value={newTemplateRulesText}
                onChange={(e) => setNewTemplateRulesText(e.target.value)}
                placeholder='규칙 JSON 예: [{"category":"foundation_drawing","minCount":2,"maxCount":6}]'
              />
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>포트폴리오에 적용 · 준비도 · 공유</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={selectedPortfolioId}
                onChange={(e) => setSelectedPortfolioId(e.target.value)}
              >
                {portfolios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                <option value="">템플릿 선택 없음</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={handleApplyTemplateToPortfolio}>
                적용
              </button>
              <button type="button" onClick={handleCheckReadiness} disabled={!selectedTemplateId}>
                준비도 계산
              </button>
              <button type="button" onClick={handleGenerateShareLink}>
                공유 링크 생성
              </button>
            </div>

            {readiness && (
              <div className="tag-list" style={{ marginTop: 10 }}>
                <span className="tag-chip">{readiness.templateName}</span>
                <span className="tag-chip">
                  준비도 {readiness.summary.coveragePercent}% ({readiness.summary.status})
                </span>
              </div>
            )}

            {shareUrl && (
              <div className="hint-text" style={{ marginTop: 10 }}>
                공유 URL:{" "}
                <a href={shareUrl} target="_blank" rel="noreferrer">
                  {shareUrl}
                </a>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}


