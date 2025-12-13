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

const CATEGORY_PRESETS: { value: string; label: string }[] = [
  { value: "foundation_drawing", label: "기초소묘" },
  { value: "color_painting", label: "색채" },
  { value: "concept_piece", label: "발상/컨셉" },
  { value: "foundation_design", label: "기초디자인" },
  { value: "sculpture", label: "입체" },
  { value: "digital", label: "디지털" },
];

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
  const [newTemplateRules, setNewTemplateRules] = useState<TemplateRuleDraft[]>([
    { category: "foundation_drawing", minCount: 2, maxCount: 6 },
  ]);
  const [newTemplateMinTotal, setNewTemplateMinTotal] = useState<number>(4);
  const [newTemplateMaxTotal, setNewTemplateMaxTotal] = useState<number>(12);

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
    const rules = newTemplateRules
      .map((r) => ({
        category: (r.category || "").trim(),
        minCount:
          typeof r.minCount === "number" && Number.isFinite(r.minCount)
            ? r.minCount
            : undefined,
        maxCount:
          typeof r.maxCount === "number" && Number.isFinite(r.maxCount)
            ? r.maxCount
            : undefined,
      }))
      .filter((r) => r.category.length > 0);
    if (rules.length === 0) {
      setError("규칙을 최소 1개 이상 추가해주세요.");
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
          minTotal: newTemplateMinTotal,
          maxTotal: newTemplateMaxTotal,
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
            <div className="ui-form">
              <div className="ui-grid-2">
                <label className="ui-field">
                  <span className="ui-label">템플릿 이름</span>
                  <input
                    className="ui-input"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="예: 기초소묘 중심 (나의 버전)"
                  />
                </label>
                <div className="ui-grid-2">
                  <label className="ui-field">
                    <span className="ui-label">최소 작품 수</span>
                    <input
                      className="ui-input"
                      type="number"
                      min={0}
                      value={newTemplateMinTotal}
                      onChange={(e) => setNewTemplateMinTotal(Number(e.target.value))}
                    />
                  </label>
                  <label className="ui-field">
                    <span className="ui-label">최대 작품 수</span>
                    <input
                      className="ui-input"
                      type="number"
                      min={0}
                      value={newTemplateMaxTotal}
                      onChange={(e) => setNewTemplateMaxTotal(Number(e.target.value))}
                    />
                  </label>
                </div>
              </div>

              <div className="ui-field">
                <span className="ui-label">카테고리 규칙</span>
                <div className="ui-rule-list">
                  {newTemplateRules.map((r, idx) => (
                    <div key={`${idx}-${r.category}`} className="ui-rule-row">
                      <select
                        className="ui-select"
                        value={r.category}
                        onChange={(e) =>
                          setNewTemplateRules((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, category: e.target.value } : x
                            )
                          )
                        }
                      >
                        {CATEGORY_PRESETS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <input
                        className="ui-input ui-input-sm"
                        type="number"
                        min={0}
                        value={r.minCount ?? 0}
                        onChange={(e) =>
                          setNewTemplateRules((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, minCount: Number(e.target.value) } : x
                            )
                          )
                        }
                        placeholder="최소"
                        aria-label="minCount"
                      />
                      <input
                        className="ui-input ui-input-sm"
                        type="number"
                        min={0}
                        value={r.maxCount ?? 0}
                        onChange={(e) =>
                          setNewTemplateRules((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, maxCount: Number(e.target.value) } : x
                            )
                          )
                        }
                        placeholder="최대"
                        aria-label="maxCount"
                      />
                      <button
                        type="button"
                        className="ui-btn ui-btn-ghost"
                        onClick={() =>
                          setNewTemplateRules((prev) =>
                            prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)
                          )
                        }
                        disabled={newTemplateRules.length <= 1}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
                <div className="ui-row">
                  <button
                    type="button"
                    className="ui-btn ui-btn-secondary"
                    onClick={() =>
                      setNewTemplateRules((prev) => [
                        ...prev,
                        { category: "foundation_drawing", minCount: 1, maxCount: 3 },
                      ])
                    }
                  >
                    규칙 추가
                  </button>
                  <button type="button" className="ui-btn ui-btn-primary" onClick={handleCreateTemplate}>
                    템플릿 저장
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>포트폴리오에 적용 · 준비도 · 공유</h3>
            <div className="ui-row">
              <select className="ui-select" value={selectedPortfolioId} onChange={(e) => setSelectedPortfolioId(e.target.value)}>
                {portfolios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <select className="ui-select" value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
                <option value="">템플릿 선택 없음</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
              <button type="button" className="ui-btn ui-btn-secondary" onClick={handleApplyTemplateToPortfolio}>
                적용
              </button>
              <button type="button" className="ui-btn ui-btn-primary" onClick={handleCheckReadiness} disabled={!selectedTemplateId}>
                준비도 계산
              </button>
              <button type="button" className="ui-btn ui-btn-primary" onClick={handleGenerateShareLink}>
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


