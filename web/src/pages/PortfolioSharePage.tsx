import { useState } from "react";
import { useParams } from "react-router-dom";
import { useSharedPortfolio } from "../hooks/useSharedPortfolio";

export default function PortfolioSharePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading, error, submitting, submitComment } = useSharedPortfolio(slug);
  const [authorName, setAuthorName] = useState("");
  const [role, setRole] = useState("");
  const [text, setText] = useState("");
  const [targetWorkId, setTargetWorkId] = useState<string | "">("");
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmitComment() {
    if (!slug) return;
    if (!authorName.trim() || !text.trim()) {
      setLocalError("이름과 코멘트를 입력해주세요.");
      return;
    }
    setLocalError(null);
    try {
      await submitComment({
        authorName: authorName.trim(),
        role: role.trim(),
        text: text.trim(),
        workId: targetWorkId || null,
      });
      setText("");
      setTargetWorkId("");
    } catch (err) {
      // error message already set inside hook; keep local error for UI clarity
      setLocalError(err instanceof Error ? err.message : "코멘트 저장에 실패했습니다.");
    }
  }

  if (loading) {
    return (
      <div className="app-root">
        <p>불러오는 중...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="app-root">
        <p style={{ color: "#fca5a5" }}>{error || "데이터를 찾을 수 없습니다."}</p>
      </div>
    );
  }

  const { portfolio, template, readiness, comments } = data;
  const sortedItems = [...data.items].sort((a, b) => a.item.order - b.item.order);

  return (
    <div className="app-root">
      <main className="app-main">
        <header style={{ marginBottom: 16 }}>
          <h2 style={{ marginBottom: 8 }}>{portfolio.title}</h2>
          <p className="hint-text" style={{ marginBottom: 4 }}>
            공유 포트폴리오 (읽기 전용)
          </p>
          {template && readiness && (
            <div className="tag-list" style={{ marginTop: 8 }}>
              <span className="tag-chip">
                템플릿: {template.name}
              </span>
              <span className="tag-chip">
                준비도: {readiness.summary.coveragePercent}% (
                {readiness.summary.status})
              </span>
              {readiness.summary.missingCount > 0 && (
                <span className="tag-chip warning">
                  부족: {readiness.summary.missingCount}
                </span>
              )}
            </div>
          )}
        </header>

        <section className="portfolio-preview">
          <ol className="portfolio-preview-list">
            {sortedItems.map(({ item, work }) => {
              if (!work) {
                return (
                  <li key={item.workId} className="portfolio-preview-item">
                    <div>삭제되었거나 찾을 수 없는 작품</div>
                  </li>
                );
              }
              const effectiveTitle =
                (item.customTitle && item.customTitle.trim()) || work.title;
              const effectiveDesc =
                (item.customDescription && item.customDescription.trim()) ||
                work.description ||
                "";
              return (
                <li key={item.workId} className="portfolio-preview-item">
                  {work.imageUrl && (
                    <div className="preview-thumb">
                      <img src={work.imageUrl} alt={effectiveTitle} />
                    </div>
                  )}
                  <div className="preview-text">
                    <div className="work-title">{effectiveTitle}</div>
                    <div className="work-meta-line">
                      {work.project && <span>{work.project}</span>}
                      {work.project && work.year && <span> · </span>}
                      {work.year && <span>{work.year}</span>}
                      {work.category && (
                        <>
                          <span> · </span>
                          <span>#{work.category}</span>
                        </>
                      )}
                    </div>
                    {effectiveDesc && <p className="work-desc">{effectiveDesc}</p>}
                    {(work.tags?.length || 0) > 0 && (
                      <div className="tag-list">
                        {work.tags?.map((t) => (
                          <span key={t} className="tag-chip">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {readiness && (
          <section className="card" style={{ marginTop: 24 }}>
            <h3>템플릿 규칙 충족도</h3>
            <ul>
              {readiness.rules.map((rule) => (
                <li key={rule.category}>
                  <strong>{rule.category}</strong>: {rule.current}/
                  {rule.required}{" "}
                  {rule.status === "missing" && (
                    <span style={{ color: "#fca5a5" }}>
                      (부족 {rule.missing})
                    </span>
                  )}
                  {rule.status === "exceed" && (
                    <span style={{ color: "#fca5a5" }}>
                      (초과 {rule.maxExceeded})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card" style={{ marginTop: 24 }}>
          <h3>선생님 코멘트</h3>
          <div className="ui-form">
            <div className="ui-grid-3">
              <label className="ui-field">
                <span className="ui-label">이름</span>
                <input
                  type="text"
                  className="ui-input"
                  placeholder="이름"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                />
              </label>
              <label className="ui-field">
                <span className="ui-label">역할/소속</span>
                <input
                  type="text"
                  className="ui-input"
                  placeholder="역할/소속 (선택)"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </label>
              <label className="ui-field">
                <span className="ui-label">대상</span>
                <select
                  className="ui-select"
                  value={targetWorkId}
                  onChange={(e) => setTargetWorkId(e.target.value)}
                >
                  <option value="">전체 포트폴리오</option>
                  {sortedItems
                    .filter(({ work }) => work)
                    .map(({ item, work }) => (
                      <option key={item.workId} value={item.workId}>
                        작품: {work?.title}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <label className="ui-field">
              <span className="ui-label">코멘트</span>
              <textarea
                rows={3}
                className="ui-textarea"
                placeholder="코멘트를 남겨주세요"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>

            <div className="ui-actions">
              <button
                type="button"
                className="ui-btn ui-btn-primary"
                onClick={handleSubmitComment}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit comment"}
              </button>
            </div>
          </div>
          {(localError || error) && (
            <p className="error-text">{localError || error}</p>
          )}

          <div style={{ marginTop: 16 }}>
            {comments.length === 0 && (
              <p className="hint-text">아직 코멘트가 없습니다.</p>
            )}
            {comments.length > 0 && (
              <ul className="comment-list">
                {comments.map((c) => (
                  <li key={c.id} className="comment-item">
                    <div>
                      <strong>{c.authorName}</strong>
                      {c.role && <span style={{ marginLeft: 6 }}>{c.role}</span>}
                      {c.workId && (
                        <span className="tag-chip" style={{ marginLeft: 6 }}>
                          작품: {c.workId}
                        </span>
                      )}
                    </div>
                    <div className="work-desc" style={{ marginTop: 4 }}>
                      {c.text}
                    </div>
                    <div className="work-meta">
                      {new Date(c.createdAt).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

