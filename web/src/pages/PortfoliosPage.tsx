import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../layout/AppHeader";
import type { Work } from "../works/types";
import type {
  PortfolioVersion,
  PortfolioItem,
  Template,
  PortfolioReadiness,
} from "../portfolios/types";

type BasicFormState = {
  title: string;
  targetSchool: string;
  targetMajor: string;
  year: string;
};

const EMPTY_BASIC_FORM: BasicFormState = {
  title: "",
  targetSchool: "",
  targetMajor: "",
  year: "",
};

type ItemDraft = {
  customTitle: string;
  customDescription: string;
};
import { API_BASE_URL } from "../api/config";

export default function PortfoliosPage() {
  const { user } = useAuth();

  const [works, setWorks] = useState<Work[]>([]);
  const [portfolios, setPortfolios] = useState<PortfolioVersion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [basicForm, setBasicForm] = useState<BasicFormState>(EMPTY_BASIC_FORM);
  const isComposingRef = useRef(false);
  const [itemDrafts, setItemDrafts] = useState<Record<string, ItemDraft>>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [readiness, setReadiness] = useState<PortfolioReadiness | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // ----- 작품 목록: 서버에서 가져오기 -----
  useEffect(() => {
    if (!user?.email) {
      setWorks([]);
      return;
    }
    const email = user.email;

    async function loadWorks() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/works?userEmail=${encodeURIComponent(
            email
          )}`
        );
        if (!res.ok) {
          throw new Error("Failed to load works");
        }
        const data = (await res.json()) as Work[];
        data.sort((a, b) => b.createdAt - a.createdAt);
        setWorks(data);
      } catch (err) {
        console.error("loadWorks error", err);
        // 작품 없다고 해서 포트폴리오 전체가 막히진 않게 에러 메시지는 화면에 안 띄움
      }
    }

    loadWorks();
  }, [user]);

  // ----- 포트폴리오 목록: 서버에서 가져오기 -----
  async function reloadPortfolios(currentSelectedId?: string | null) {
    if (!user?.email) {
      setPortfolios([]);
      setSelectedId(null);
      return;
    }
    const email = user.email;

    try {
      setError(null);
      const res = await fetch(
        `${API_BASE_URL}/portfolios?userEmail=${encodeURIComponent(
          email
        )}`
      );
      if (!res.ok) {
        throw new Error("Failed to load portfolios");
      }
      const data = (await res.json()) as PortfolioVersion[];
      data.sort((a, b) => b.updatedAt - a.updatedAt);
      setPortfolios(data);

      if (data.length === 0) {
        setSelectedId(null);
      } else if (currentSelectedId) {
        const exists = data.some((p) => p.id === currentSelectedId);
        setSelectedId(exists ? currentSelectedId : data[0].id);
      } else {
        setSelectedId((prev) =>
          prev && data.some((p) => p.id === prev) ? prev : data[0].id
        );
      }
    } catch (err) {
      console.error("reloadPortfolios error", err);
      setError("포트폴리오를 불러오는 중 오류가 발생했습니다.");
    }
  }

  useEffect(() => {
    reloadPortfolios(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await fetch(`${API_BASE_URL}/templates`);
        if (!res.ok) return;
        const data = (await res.json()) as Template[];
        setTemplates(data);
      } catch (err) {
        console.error("loadTemplates error", err);
      }
    }
    loadTemplates();
  }, []);

  // 현재 선택된 포트폴리오
  const current = portfolios.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (!current) {
      setBasicForm(EMPTY_BASIC_FORM);
      setItemDrafts({});
      return;
    }
    setBasicForm({
      title: current.title ?? "",
      targetSchool: current.targetSchool ?? "",
      targetMajor: current.targetMajor ?? "",
      year: current.year ?? "",
    });
    setSelectedTemplateId(current.templateId ?? "");
    setShareUrl(
      current.shareSlug
        ? `${window.location.origin}/share/${current.shareSlug}`
        : null
    );
    setReadiness(null);
    const nextDrafts: Record<string, ItemDraft> = {};
    for (const item of current.items) {
      nextDrafts[item.workId] = {
        customTitle: item.customTitle ?? "",
        customDescription: item.customDescription ?? "",
      };
    }
    setItemDrafts(nextDrafts);
  }, [current?.id]);

  type BasicFieldKey = "title" | "targetSchool" | "targetMajor" | "year";

  function commitBasicFieldChange(field: BasicFieldKey, rawValue: string) {
    if (!current) return;
    if (field === "title") {
      handleBasicFieldChange("title", rawValue);
      return;
    }

    const normalized = rawValue.trim() === "" ? null : rawValue;
    if (field === "targetSchool") {
      handleBasicFieldChange("targetSchool", normalized);
    } else if (field === "targetMajor") {
      handleBasicFieldChange("targetMajor", normalized);
    } else {
      handleBasicFieldChange("year", normalized);
    }
  }

  function handleBasicInputChange(field: BasicFieldKey, value: string) {
    setBasicForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateItemDraft(
    workId: string,
    field: "customTitle" | "customDescription",
    value: string
  ) {
    setItemDrafts((prev) => {
      const prevForItem: ItemDraft = prev[workId] ?? {
        customTitle: "",
        customDescription: "",
      };
      return {
        ...prev,
        [workId]: {
          ...prevForItem,
          [field]: value,
        },
      };
    });
  }

  function commitItemDraft(
    workId: string,
    field: "customTitle" | "customDescription"
  ) {
    const draft = itemDrafts[workId];
    const value = draft?.[field] ?? "";
    handleItemCustomChange(workId, field, value);
  }

  async function handleCreatePortfolio(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user?.email) {
      setError("로그인 상태가 아닙니다.");
      return;
    }
    const title = newTitle.trim();
    if (!title) return;

    try {
      setError(null);
      const res = await fetch(`${API_BASE_URL}/portfolios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail: user.email,
          title,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "포트폴리오 생성에 실패했습니다.");
      }
      const created = (await res.json()) as PortfolioVersion;
      // 새로 로드하거나, 낙관적 갱신
      await reloadPortfolios(created.id);
      setNewTitle("");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "포트폴리오 생성 중 오류가 발생했습니다."
      );
    }
  }

  async function handleDeletePortfolio(id: string) {
    try {
      setError(null);
      const res = await fetch(`${API_BASE_URL}/portfolios/${id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const text = await res.text();
        throw new Error(text || "삭제에 실패했습니다.");
      }
      await reloadPortfolios(
        selectedId === id ? null : selectedId
      );
    } catch (err) {
      console.error(err);
      setError("포트폴리오 삭제 중 오류가 발생했습니다.");
    }
  }

  async function updatePortfolioRemote(
    id: string,
    patch: Partial<PortfolioVersion>
  ) {
    try {
      setError(null);
      const res = await fetch(`${API_BASE_URL}/portfolios/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "포트폴리오 저장에 실패했습니다.");
      }
      const updated = (await res.json()) as PortfolioVersion;
      setPortfolios((prev) => {
        const others = prev.filter((p) => p.id !== id);
        const next = [updated, ...others].sort(
          (a, b) => b.updatedAt - a.updatedAt
        );
        return next;
      });
    } catch (err) {
      console.error(err);
      setError("포트폴리오 업데이트 중 오류가 발생했습니다.");
    }
  }

  async function handleApplyTemplate() {
    if (!current) return;
    await updatePortfolioRemote(current.id, {
      templateId: selectedTemplateId || null,
    } as Partial<PortfolioVersion>);
  }

  async function handleCheckReadiness() {
    if (!current || !selectedTemplateId) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_BASE_URL}/portfolios/${current.id}/readiness`,
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
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "준비도 계산 중 오류가 발생했습니다."
      );
    }
  }

  async function handleGenerateShareLink() {
    if (!current) return;
    try {
      setError(null);
      const res = await fetch(
        `${API_BASE_URL}/portfolios/${current.id}/share`,
        { method: "POST" }
      );
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "공유 링크 생성에 실패했습니다.");
      }
      const data = (await res.json()) as { shareSlug: string; url: string };
      setShareUrl(data.url);
      setPortfolios((prev) =>
        prev.map((p) =>
          p.id === current.id ? { ...p, shareSlug: data.shareSlug } : p
        )
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "공유 링크 생성 중 오류가 발생했습니다."
      );
    }
  }

  function handleBasicFieldChange(
    field: "title" | "targetSchool" | "targetMajor" | "year",
    value: string | null
  ) {
    if (!current) return;

    let val: string | null = value;
    if (field === "title") {
      val = value ?? "";
    } else {
      val = !value || value.trim() === "" ? null : value;
    }

    updatePortfolioRemote(current.id, {
      [field]: val,
    } as Partial<PortfolioVersion>);
  }

  function handleAddWorkToCurrent(workId: string) {
    if (!current) return;
    const exists = current.items.some((i) => i.workId === workId);
    if (exists) return;

    const maxOrder =
      current.items.reduce(
        (max, i) => (i.order > max ? i.order : max),
        0
      ) ?? 0;

    const newItem: PortfolioItem = {
      workId,
      order: maxOrder + 1,
    };

    const items = [...current.items, newItem];
    updatePortfolioRemote(current.id, { items });
  }

  function handleRemoveWorkFromCurrent(workId: string) {
    if (!current) return;
    const remaining = current.items
      .filter((i) => i.workId !== workId)
      .sort((a, b) => a.order - b.order)
      .map((item, idx) => ({
        ...item,
        order: idx + 1,
      }));

    updatePortfolioRemote(current.id, { items: remaining });
  }

  function handleItemCustomChange(
    workId: string,
    field: "customTitle" | "customDescription",
    value: string
  ) {
    if (!current) return;
    const items = current.items.map((item) =>
      item.workId === workId
        ? { ...item, [field]: value || null }
        : item
    );
    updatePortfolioRemote(current.id, { items });
  }

  function handleMoveItem(workId: string, dir: "up" | "down") {
    if (!current) return;
    const sorted = [...current.items].sort(
      (a, b) => a.order - b.order
    );
    const index = sorted.findIndex((i) => i.workId === workId);
    if (index === -1) return;

    const swapIndex = dir === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) {
      return;
    }

    const tmp = sorted[index];
    sorted[index] = sorted[swapIndex];
    sorted[swapIndex] = tmp;

    const reOrdered = sorted.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));
    updatePortfolioRemote(current.id, { items: reOrdered });
  }

  if (!user?.email) {
    return (
      <div className="app-root">
        <p>로그인 후 포트폴리오를 관리할 수 있습니다.</p>
      </div>
    );
  }

  const availableWorksForCurrent: Work[] = current
    ? works.filter(
        (w) =>
          !current.items.some((i) => i.workId === w.id)
      )
    : works;

  const itemsWithWork =
    current?.items
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((item) => ({
        item,
        work: works.find((w) => w.id === item.workId),
      })) ?? [];

  const totalSelected = current?.items.length ?? 0;

  return (
    <div className="app-root">
      <AppHeader />

      <main className="app-main portfolio-main">
        {/* 왼쪽 사이드바: 포트폴리오 목록 및 생성 */}
        <aside className="portfolio-sidebar">
          <h2>Portfolios</h2>

          <form
            onSubmit={handleCreatePortfolio}
            className="portfolio-new-form"
          >
            <input
              type="text"
              placeholder="새 포트폴리오 제목"
              value={newTitle}
              onChange={(e) =>
                setNewTitle(e.target.value)
              }
            />
            <button
              type="submit"
              disabled={!newTitle.trim()}
            >
              Add
            </button>
          </form>
          {error && (
            <p
              className="error-text"
              style={{ marginTop: 4 }}
            >
              {error}
            </p>
          )}

          <ul className="portfolio-list">
            {portfolios.map((p) => (
              <li
                key={p.id}
                className={
                  p.id === selectedId
                    ? "portfolio-list-item selected"
                    : "portfolio-list-item"
                }
              >
                <button
                  type="button"
                  className="portfolio-list-button"
                  onClick={() => setSelectedId(p.id)}
                >
                  <div className="portfolio-list-title">
                    {p.title}
                  </div>
                  <div className="portfolio-list-meta">
                    {p.targetSchool && (
                      <span>{p.targetSchool}</span>
                    )}
                    {p.targetMajor && (
                      <>
                        {" "}
                        · <span>{p.targetMajor}</span>
                      </>
                    )}
                    <span>
                      {" "}
                      · {p.items.length} works
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  className="portfolio-delete-btn"
                  onClick={() =>
                    handleDeletePortfolio(p.id)
                  }
                >
                  ✕
                </button>
              </li>
            ))}
            {portfolios.length === 0 && (
              <li className="hint-text">
                아직 포트폴리오가 없습니다.
              </li>
            )}
          </ul>
        </aside>

        {/* 오른쪽: 편집 + 프리뷰 */}
        <section className="portfolio-editor">
          {!current ? (
            <p className="hint-text">
              왼쪽에서 포트폴리오를 선택하거나 새로
              생성하세요.
            </p>
          ) : (
            <>
              <div className="portfolio-basic">
                <h2>Portfolio info</h2>
                <div className="portfolio-basic-grid">
                  <label>
                    <span>Title</span>
                    <input
                      type="text"
                      value={basicForm.title}
                      onChange={(e) =>
                        handleBasicInputChange("title", e.target.value)
                      }
                      onCompositionStart={() => {
                        isComposingRef.current = true;
                      }}
                      onCompositionEnd={(e) => {
                        isComposingRef.current = false;
                        commitBasicFieldChange("title", e.currentTarget.value);
                      }}
                      onBlur={(e) => {
                        if (isComposingRef.current) return;
                        commitBasicFieldChange("title", e.currentTarget.value);
                      }}
                    />
                  </label>
                  <label>
                    <span>Target school</span>
                    <input
                      type="text"
                      value={basicForm.targetSchool}
                      onChange={(e) =>
                        handleBasicInputChange(
                          "targetSchool",
                          e.target.value
                        )
                      }
                      placeholder="예: 서울대 디자인과"
                      onCompositionStart={() => {
                        isComposingRef.current = true;
                      }}
                      onCompositionEnd={(e) => {
                        isComposingRef.current = false;
                        commitBasicFieldChange(
                          "targetSchool",
                          e.currentTarget.value
                        );
                      }}
                      onBlur={(e) => {
                        if (isComposingRef.current) return;
                        commitBasicFieldChange(
                          "targetSchool",
                          e.currentTarget.value
                        );
                      }}
                    />
                  </label>
                  <label>
                    <span>Target major</span>
                    <input
                      type="text"
                      value={basicForm.targetMajor}
                      onChange={(e) =>
                        handleBasicInputChange(
                          "targetMajor",
                          e.target.value
                        )
                      }
                      placeholder="예: 시각디자인"
                      onCompositionStart={() => {
                        isComposingRef.current = true;
                      }}
                      onCompositionEnd={(e) => {
                        isComposingRef.current = false;
                        commitBasicFieldChange(
                          "targetMajor",
                          e.currentTarget.value
                        );
                      }}
                      onBlur={(e) => {
                        if (isComposingRef.current) return;
                        commitBasicFieldChange(
                          "targetMajor",
                          e.currentTarget.value
                        );
                      }}
                    />
                  </label>
                  <label>
                    <span>Year</span>
                    <input
                      type="text"
                      value={basicForm.year}
                      onChange={(e) =>
                        handleBasicInputChange("year", e.target.value)
                      }
                      placeholder="예: 2026"
                      onCompositionStart={() => {
                        isComposingRef.current = true;
                      }}
                      onCompositionEnd={(e) => {
                        isComposingRef.current = false;
                        commitBasicFieldChange("year", e.currentTarget.value);
                      }}
                      onBlur={(e) => {
                        if (isComposingRef.current) return;
                        commitBasicFieldChange("year", e.currentTarget.value);
                      }}
                    />
                  </label>
                </div>
                <p
                  className="hint-text"
                  style={{ marginTop: 4 }}
                >
                  현재 포함된 작품 수 {totalSelected}개
                </p>
              </div>

              <div className="portfolio-builder">
                {/* 왼쪽: 사용 가능한 작품 리스트 */}
                <div className="portfolio-column">
                  <h3>Available works</h3>
                  <p className="hint-text">
                    이 포트폴리오에 추가할 작품을
                    선택하세요.
                  </p>
                  <div className="portfolio-work-list">
                    {availableWorksForCurrent.length === 0 ? (
                      <p className="hint-text">
                        추가 가능한 작품이 없습니다.
                        먼저 Works 페이지에서 작품을
                        등록하세요.
                      </p>
                    ) : (
                      availableWorksForCurrent.map((w) => (
                        <div
                          key={w.id}
                          className="portfolio-work-card"
                        >
                          {w.imageUrl && (
                            <div className="portfolio-work-thumb">
                              <img
                                src={w.imageUrl}
                                alt={w.title}
                              />
                            </div>
                          )}
                          <div className="portfolio-work-text">
                            <div className="work-title">
                              {w.title}
                            </div>
                            <div className="work-meta-line">
                              {w.project && (
                                <span>{w.project}</span>
                              )}
                              {w.project && w.year && (
                                <span> · </span>
                              )}
                              {w.year && (
                                <span>{w.year}</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="small-pill-btn"
                            onClick={() =>
                              handleAddWorkToCurrent(
                                w.id
                              )
                            }
                          >
                            Add
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 가운데: 선택된 작품 + 순서 / 텍스트 편집 */}
                <div className="portfolio-column">
                  <h3>
                    Selected works (order & text)
                  </h3>
                  <p className="hint-text">
                    순서를 조정하고, 이 포트폴리오에서만
                    사용할 제목과 설명을 적을 수
                    있습니다. 비워두면 원래 작품 정보를
                    사용합니다.
                  </p>
                  <div className="portfolio-work-list">
                    {itemsWithWork.length === 0 ? (
                      <p className="hint-text">
                        아직 선택된 작품이 없습니다.
                      </p>
                    ) : (
                      itemsWithWork.map(
                        ({ item, work }) =>
                          work && (
                            <div
                              key={item.workId}
                              className="portfolio-work-card"
                            >
                              {work.imageUrl && (
                                <div className="portfolio-work-thumb">
                                  <img
                                    src={work.imageUrl}
                                    alt={work.title}
                                  />
                                </div>
                              )}
                              <div className="portfolio-work-text">
                                <div className="work-title">
                                  {work.title}
                                </div>
                                <div className="work-meta-line">
                                  순서 {item.order}
                                </div>
                                <label>
                                  <span>Custom title</span>
                                  <input
                                    type="text"
                                    value={
                                      itemDrafts[item.workId]
                                        ?.customTitle ??
                                      item.customTitle ??
                                      ""
                                    }
                                    onChange={(
                                      e: ChangeEvent<HTMLInputElement>
                                    ) =>
                                      updateItemDraft(
                                        item.workId,
                                        "customTitle",
                                        e.target.value
                                      )
                                    }
                                    onCompositionStart={() => {
                                      isComposingRef.current = true;
                                    }}
                                    onCompositionEnd={() => {
                                      isComposingRef.current = false;
                                      commitItemDraft(
                                        item.workId,
                                        "customTitle"
                                      );
                                    }}
                                    onBlur={() => {
                                      if (isComposingRef.current) return;
                                      commitItemDraft(
                                        item.workId,
                                        "customTitle"
                                      );
                                    }}
                                    placeholder="비워두면 원래 제목 사용"
                                  />
                                </label>
                                <label>
                                  <span>Custom description</span>
                                  <textarea
                                    rows={2}
                                    value={
                                      itemDrafts[item.workId]
                                        ?.customDescription ??
                                      item.customDescription ??
                                      ""
                                    }
                                    onChange={(
                                      e: ChangeEvent<HTMLTextAreaElement>
                                    ) =>
                                      updateItemDraft(
                                        item.workId,
                                        "customDescription",
                                        e.target.value
                                      )
                                    }
                                    onCompositionStart={() => {
                                      isComposingRef.current = true;
                                    }}
                                    onCompositionEnd={() => {
                                      isComposingRef.current = false;
                                      commitItemDraft(
                                        item.workId,
                                        "customDescription"
                                      );
                                    }}
                                    onBlur={() => {
                                      if (isComposingRef.current) return;
                                      commitItemDraft(
                                        item.workId,
                                        "customDescription"
                                      );
                                    }}
                                    placeholder="비워두면 원래 메모/설명 사용"
                                  />
                                </label>
                                <div className="work-actions">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleMoveItem(
                                        item.workId,
                                        "up"
                                      )
                                    }
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleMoveItem(
                                        item.workId,
                                        "down"
                                      )
                                    }
                                  >
                                    ↓
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveWorkFromCurrent(
                                        item.workId
                                      )
                                    }
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                      )
                    )}
                  </div>
                </div>

                {/* 오른쪽: 프리뷰 */}
                <div className="portfolio-column">
                  <h3>Preview</h3>
                  <p className="hint-text">
                    실제 제출용 포트폴리오에서 보이는
                    순서와 텍스트를 미리 볼 수 있습니다.
                  </p>
                  <div className="portfolio-preview">
                    <h4>
                      {current.title}{" "}
                      {current.year && (
                        <span>({current.year})</span>
                      )}
                    </h4>
                    {current.targetSchool && (
                      <p>
                        {current.targetSchool}
                        {current.targetMajor && (
                          <>
                            {" "}
                            · {current.targetMajor}
                          </>
                        )}
                      </p>
                    )}
                    <ol className="portfolio-preview-list">
                      {itemsWithWork.map(
                        ({ item, work }) => {
                          if (!work) return null;
                          const effectiveTitle =
                            (item.customTitle &&
                              item.customTitle.trim()) ||
                            work.title;
                          const effectiveDesc =
                            (item.customDescription &&
                              item.customDescription.trim()) ||
                            work.description ||
                            "";
                          return (
                            <li
                              key={item.workId}
                              className="portfolio-preview-item"
                            >
                              {work.imageUrl && (
                                <div className="preview-thumb">
                                  <img
                                    src={work.imageUrl}
                                    alt={
                                      effectiveTitle
                                    }
                                  />
                                </div>
                              )}
                              <div className="preview-text">
                                <div className="preview-title">
                                  {item.order}.{" "}
                                  {effectiveTitle}
                                </div>
                                {effectiveDesc && (
                                  <div className="preview-desc">
                                    {effectiveDesc}
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        }
                      )}
                    </ol>
                  </div>

                  <div className="card" style={{ marginTop: 12 }}>
                    <h4>Template & Share</h4>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
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
                      <button type="button" onClick={handleApplyTemplate}>
                        템플릿 저장
                      </button>
                      <button
                        type="button"
                        onClick={handleCheckReadiness}
                        disabled={!selectedTemplateId}
                      >
                        준비도 계산
                      </button>
                      <button type="button" onClick={handleGenerateShareLink}>
                        공유 링크 생성
                      </button>
                    </div>

                    {readiness && (
                      <div className="tag-list" style={{ marginBottom: 8 }}>
                        <span className="tag-chip">
                          {readiness.templateName}
                        </span>
                        <span className="tag-chip">
                          준비도 {readiness.summary.coveragePercent}% (
                          {readiness.summary.status})
                        </span>
                        {readiness.summary.missingCount > 0 && (
                          <span className="tag-chip warning">
                            부족 {readiness.summary.missingCount}
                          </span>
                        )}
                      </div>
                    )}

                    {shareUrl ? (
                      <div className="hint-text">
                        공유 URL:{" "}
                        <a href={shareUrl} target="_blank" rel="noreferrer">
                          {shareUrl}
                        </a>
                      </div>
                    ) : (
                      <p className="hint-text">
                        공유 링크를 생성하면 로그인 없이 열람 가능한 URL이
                        만들어집니다.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
