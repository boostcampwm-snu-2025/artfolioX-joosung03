import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, MouseEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import type { Work } from "../works/types";
import { AppHeader } from "../layout/AppHeader";
import { API_BASE_URL } from "../api/config";

export default function WorksPage() {
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [project, setProject] = useState("");
  const [year, setYear] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [category, setCategory] = useState("");
  const [materialsInput, setMaterialsInput] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [works, setWorks] = useState<Work[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);

  const [filterText, setFilterText] = useState("");
  const [filterProject, setFilterProject] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasShellRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState("#111827");
  const [brushSize, setBrushSize] = useState(3);
  const [canvasLoadedImage, setCanvasLoadedImage] = useState<string | null>(
    null
  );
  const [toolMode, setToolMode] = useState<"draw" | "text" | "rect" | "eraser">(
    "draw"
  );
  const [textInputState, setTextInputState] = useState<{
    visible: boolean;
    x: number; // scaled canvas coords
    y: number;
    viewX: number; // CSS positioning in px within canvas shell
    viewY: number;
    value: string;
  }>({ visible: false, x: 0, y: 0, viewX: 0, viewY: 0, value: "" });
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const textBaseImageRef = useRef<ImageData | null>(null);
  const textValueRef = useRef<string>("");
  const caretOnRef = useRef<boolean>(true);
  const caretTimerRef = useRef<number | null>(null);
  const textPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafRenderRef = useRef<number | null>(null);
  const rectStartRef = useRef<{ x: number; y: number } | null>(null);
  const rectBaseImageRef = useRef<ImageData | null>(null);
  const rectRafRef = useRef<number | null>(null);

  async function reloadWorks() {
    if (!user?.email) {
      setWorks([]);
      return;
    }
    try {
      setError(null);
      const res = await fetch(
        `${API_BASE_URL}/works?userEmail=${encodeURIComponent(
          user.email
        )}`
      );
      if (!res.ok) {
        throw new Error("Failed to load works");
      }
      const data = (await res.json()) as Work[];
      data.sort((a, b) => b.createdAt - a.createdAt);
      setWorks(data);
    } catch (err) {
      console.error(err);
      setError("작품 목록을 불러오는 중 오류가 발생했습니다.");
    }
  }

  useEffect(() => {
    reloadWorks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setProject("");
    setYear("");
    setTagsInput("");
    setCategory("");
    setMaterialsInput("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setEditingId(null);
    setError(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user?.email) {
      setError("로그인 상태가 아닙니다.");
      return;
    }
    if (!title.trim()) return;

    setSaving(true);
    setError(null);

    const tags =
      tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0) ?? [];
    const materials =
      materialsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0) ?? [];

    const formData = new FormData();
    formData.append("userEmail", user.email);
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("project", project.trim());
    formData.append("year", year.trim());
    formData.append("tags", JSON.stringify(tags));
    formData.append("category", category.trim());
    formData.append("materials", JSON.stringify(materials));
    if (selectedFile) {
      formData.append("image", selectedFile);
    }

    const endpoint = editingId
      ? `${API_BASE_URL}/works/${editingId}`
      : `${API_BASE_URL}/works`;
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(endpoint, { method, body: formData });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "작품 저장에 실패했습니다.");
      }
      await reloadWorks();
      resetForm();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "작품 저장 중 알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(work: Work) {
    setEditingId(work.id);
    setSelectedWorkId(work.id);
    setTitle(work.title);
    setDescription(work.description ?? "");
    setProject(work.project ?? "");
    setYear(work.year ?? "");
    setTagsInput(work.tags?.join(", ") ?? "");
    setCategory(work.category ?? "");
    setMaterialsInput(work.materials?.join(", ") ?? "");
    setSelectedFile(null);
    setPreviewUrl(work.imageUrl ?? null);
    setError(null);
  }

  function handleSelectWork(work: Work) {
    setSelectedWorkId(work.id);
  }

  useEffect(() => {
    if (!selectedWorkId) {
      setCanvasLoadedImage(null);
      return;
    }
    const saved = localStorage.getItem(`work-canvas-${selectedWorkId}`);
    setCanvasLoadedImage(saved ?? null);
  }, [selectedWorkId]);

  // If we switch works while typing, close the edit cleanly
  useEffect(() => {
    if (textInputState.visible) {
      stopCaretTimer();
      textBaseImageRef.current = null;
      textValueRef.current = "";
      setTextInputState((prev) =>
        prev.visible ? { ...prev, visible: false, value: "" } : prev
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkId]);

  function initCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (canvasLoadedImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = canvasLoadedImage;
    }
  }

  useEffect(() => {
    initCanvas();
  }, [canvasLoadedImage, selectedWorkId]);

  useEffect(() => {
    if (textInputState.visible && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textInputState.visible]);

  function stopCaretTimer() {
    if (caretTimerRef.current) {
      window.clearInterval(caretTimerRef.current);
      caretTimerRef.current = null;
    }
  }

  function scheduleLiveTextRender(withCaret: boolean) {
    if (rafRenderRef.current) {
      window.cancelAnimationFrame(rafRenderRef.current);
      rafRenderRef.current = null;
    }
    rafRenderRef.current = window.requestAnimationFrame(() => {
      rafRenderRef.current = null;
      renderLiveTextOnCanvas({ withCaret });
    });
  }

  function renderLiveTextOnCanvas(options?: { withCaret?: boolean }) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const base = textBaseImageRef.current;
    if (!base) return;

    // restore snapshot (pixel space)
    ctx.putImageData(base, 0, 0);

    const text = textValueRef.current;
    const fontSize = Math.max(brushSize * 4, 16);
    ctx.fillStyle = brushColor;
    ctx.font = `${fontSize}px "Pretendard", "Noto Sans KR", "Segoe UI", sans-serif`;
    // caret/typing feels natural when the click point is on the baseline
    ctx.textBaseline = "alphabetic";

    const { x, y } = textPosRef.current;
    ctx.fillText(text, x, y);

    const withCaret = options?.withCaret ?? false;
    if (withCaret && caretOnRef.current) {
      const width = ctx.measureText(text).width;
      const caretX = x + width + 2;
      const caretY = y;
      ctx.beginPath();
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = 2;
      ctx.moveTo(caretX, caretY - fontSize);
      ctx.lineTo(caretX, caretY + 2);
      ctx.stroke();
    }
  }

  function beginCanvasTextEdit(x: number, y: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    stopCaretTimer();
    if (rafRenderRef.current) {
      window.cancelAnimationFrame(rafRenderRef.current);
      rafRenderRef.current = null;
    }

    // snapshot before typing
    textBaseImageRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    textValueRef.current = "";
    textPosRef.current = { x, y };
    caretOnRef.current = true;

    // initial render and caret blink
    scheduleLiveTextRender(true);
    caretTimerRef.current = window.setInterval(() => {
      caretOnRef.current = !caretOnRef.current;
      scheduleLiveTextRender(true);
    }, 500);
  }

  function endCanvasTextEdit(mode: "commit" | "cancel") {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    stopCaretTimer();
    if (rafRenderRef.current) {
      window.cancelAnimationFrame(rafRenderRef.current);
      rafRenderRef.current = null;
    }

    if (mode === "cancel") {
      const base = textBaseImageRef.current;
      if (ctx && base) {
        ctx.putImageData(base, 0, 0);
      }
    } else {
      // final render without caret
      renderLiveTextOnCanvas({ withCaret: false });
    }

    textBaseImageRef.current = null;
    textValueRef.current = "";
    setTextInputState({ visible: false, x: 0, y: 0, viewX: 0, viewY: 0, value: "" });
  }

  // Note: text input is now rendered directly onto the canvas while a hidden input captures keystrokes.

  useEffect(() => {
    function handleResize() {
      initCanvas();
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function getCanvasPos(e: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const scaleX = canvas.width / rect.width / dpr;
    const scaleY = canvas.height / rect.height / dpr;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function drawRectFrom(start: { x: number; y: number }, end: { x: number; y: number }) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const w = end.x - start.x;
    const h = end.y - start.y;
    ctx.strokeRect(start.x, start.y, w, h);
  }

  function scheduleRectPreviewRender(start: { x: number; y: number }, end: { x: number; y: number }) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const base = rectBaseImageRef.current;
    if (!base) return;

    if (rectRafRef.current) {
      window.cancelAnimationFrame(rectRafRef.current);
      rectRafRef.current = null;
    }
    rectRafRef.current = window.requestAnimationFrame(() => {
      rectRafRef.current = null;
      // restore snapshot first (pixel space), then draw preview rect
      ctx.putImageData(base, 0, 0);
      drawRectFrom(start, end);
    });
  }

  function handleCanvasDown(e: MouseEvent<HTMLCanvasElement>) {
    if (!selectedWorkId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pos = getCanvasPos(e);
    if (!pos) return;
    
    // 화면 좌표: 캔버스 왼쪽 위 기준으로 클릭 위치
    const viewX = e.clientX - rect.left;
    const viewY = e.clientY - rect.top;
    
    if (toolMode === "text") {
      // Make sure the click is used for text placement and doesn't get swallowed
      e.preventDefault();
      e.stopPropagation();
      setTextInputState({
        visible: true,
        x: pos.x,
        y: pos.y,
        viewX,
        viewY,
        value: "",
      });
      // start live canvas text editing (caret + realtime draw)
      // defer to after state is set so x/y are available for render
      window.requestAnimationFrame(() => {
        beginCanvasTextEdit(pos.x, pos.y);
        textInputRef.current?.focus();
      });
      return;
    }
    if (toolMode === "rect") {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      // snapshot for live preview while dragging
      rectBaseImageRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      rectStartRef.current = pos;
      setIsDrawing(true);
      return;
    }
    // draw or erase
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    ctx.globalCompositeOperation =
      toolMode === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = toolMode === "eraser" ? "#ffffff" : brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function handleCanvasMove(e: MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const pos = getCanvasPos(e);
    if (!pos) return;
    if (toolMode === "rect") {
      const start = rectStartRef.current;
      if (!start) return;
      scheduleRectPreviewRender(start, pos);
      return;
    }
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function handleCanvasUp(e?: MouseEvent<HTMLCanvasElement>) {
    if (toolMode === "rect" && rectStartRef.current && e) {
      const end = getCanvasPos(e);
      if (end) {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx) {
          const base = rectBaseImageRef.current;
          if (base) {
            ctx.putImageData(base, 0, 0);
          }
          drawRectFrom(rectStartRef.current, end);
        }
      }
      rectBaseImageRef.current = null;
      if (rectRafRef.current) {
        window.cancelAnimationFrame(rectRafRef.current);
        rectRafRef.current = null;
      }
    }
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.globalCompositeOperation = "source-over";
    }
    rectStartRef.current = null;
    setIsDrawing(false);
    // 텍스트 모드에서는 입력창을 유지
    if (toolMode !== "text") {
      setTextInputState((prev) => ({ ...prev, visible: false }));
    }
  }

  function handleCanvasLeave() {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.globalCompositeOperation = "source-over";
    }
    // cancel rect preview if leaving while dragging
    if (toolMode === "rect") {
      const base = rectBaseImageRef.current;
      if (ctx && base) {
        ctx.putImageData(base, 0, 0);
      }
      rectBaseImageRef.current = null;
      if (rectRafRef.current) {
        window.cancelAnimationFrame(rectRafRef.current);
        rectRafRef.current = null;
      }
    }
    rectStartRef.current = null;
    setIsDrawing(false);
    if (toolMode !== "text") {
      setTextInputState((prev) => ({ ...prev, visible: false }));
    }
  }

  function handleCanvasSave() {
    if (!selectedWorkId || !canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    localStorage.setItem(`work-canvas-${selectedWorkId}`, dataUrl);
    setCanvasLoadedImage(dataUrl);
  }

  function handleCanvasClear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    if (selectedWorkId) {
      localStorage.removeItem(`work-canvas-${selectedWorkId}`);
    }
    setCanvasLoadedImage(null);
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/works/${id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const text = await res.text();
        throw new Error(text || "삭제에 실패했습니다.");
      }
      await reloadWorks();
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      console.error(err);
      setError("작품 삭제 중 오류가 발생했습니다.");
    }
  }

  if (!user?.email) {
    return (
      <div className="app-root">
        <p>로그인 후 작품을 관리할 수 있습니다.</p>
      </div>
    );
  }

  const visibleWorks = useMemo(() => {
    const text = filterText.trim().toLowerCase();
    const proj = filterProject.trim().toLowerCase();
    return works.filter((w) => {
      const matchesText =
        !text ||
        w.title.toLowerCase().includes(text) ||
        (w.description ?? "").toLowerCase().includes(text) ||
        (w.tags ?? []).some((t) => t.toLowerCase().includes(text)) ||
        (w.category ?? "").toLowerCase().includes(text) ||
        (w.materials ?? []).some((m) => m.toLowerCase().includes(text));

      const matchesProject =
        !proj || (w.project ?? "").toLowerCase().includes(proj);

      return matchesText && matchesProject;
    });
  }, [filterProject, filterText, works]);

  // Auto-select first visible work so canvas opens on the right
  useEffect(() => {
    if (visibleWorks.length === 0) {
      setSelectedWorkId(null);
      return;
    }
    if (!selectedWorkId || !visibleWorks.some((w) => w.id === selectedWorkId)) {
      setSelectedWorkId(visibleWorks[0].id);
    }
  }, [selectedWorkId, visibleWorks]);

  return (
    <div className="app-root">
      <AppHeader />

      <main className="app-main works-main">
        <section className="work-form-card">
          <h2>{editingId ? "Edit work" : "New work"}</h2>
          <p className="hint-text">
            작품 제목, 프로젝트, 연도, 태그, 이미지를 서버에 저장합니다.
          </p>

          <form onSubmit={handleSubmit} className="work-form">
            <div className="work-form-grid">
              <label>
                <span>Title</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="작품 제목을 입력하세요"
                  required
                />
              </label>
              <label>
                <span>Project</span>
                <input
                  type="text"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  placeholder="예: 입시 포트폴리오 / 개인 작업"
                />
              </label>
              <label>
                <span>Year</span>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="예: 2024"
                />
              </label>
              <label>
                <span>Category</span>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="예: 기초소묘 / 색채 / 입체 / 디자인"
                />
              </label>
            </div>

            <div className="work-form-grid">
              <label>
                <span>Tags</span>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="예: 인물, 수채화, 포트폴리오"
                />
                <span className="input-hint">
                  콤마로 구분해 키워드를 적어주세요
                </span>
              </label>
              <label>
                <span>Materials</span>
                <input
                  type="text"
                  value={materialsInput}
                  onChange={(e) => setMaterialsInput(e.target.value)}
                  placeholder="예: 연필, 콘테, 아크릴"
                />
                <span className="input-hint">
                  콤마로 구분해 사용 재료를 적어주세요
                </span>
              </label>
            </div>

            <label>
              <span>Note</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="작업 의도, 진행 방식, 배운 점 등을 짧게 정리"
              />
            </label>

            <label>
              <span>Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              <span className="input-hint">JPG/PNG, 최대 1개 업로드</span>
              {previewUrl && (
                <div className="work-preview">
                  <img src={previewUrl} alt="preview" />
                </div>
              )}
            </label>

            {error && <p className="error-text">{error}</p>}

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="submit" disabled={saving || !title.trim()}>
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Save changes"
                  : "Save work"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    fontSize: 12,
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: "1px solid #4b5563",
                    background: "transparent",
                    color: "#e5e7eb",
                    cursor: "pointer",
                  }}
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>

        <div className="works-board">
          <section className="work-list">
            <h2>My works</h2>

            <div className="filter-bar">
              <input
                placeholder="Search title, note, tags"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
              <input
                placeholder="Filter by project"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
              />
            </div>

            {visibleWorks.length === 0 ? (
              <p className="hint-text">조건에 맞는 작품이 없습니다.</p>
            ) : (
              <ul>
                {visibleWorks.map((w) => {
                  const isSelected = selectedWorkId === w.id;
                  return (
                    <li
                      key={w.id}
                      className={`work-item ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSelectWork(w)}
                    >
                      <div className="work-item-main">
                        {w.imageUrl && (
                          <div className="work-image">
                            <img src={w.imageUrl} alt={w.title} />
                          </div>
                        )}
                        <div className="work-text">
                          <div className="work-title">{w.title}</div>
                          <div className="work-meta-line">
                            {w.project && <span>{w.project}</span>}
                            {w.project && w.year && <span> · </span>}
                            {w.year && <span>{w.year}</span>}
                          </div>
                          {w.description && (
                            <div className="work-desc">{w.description}</div>
                          )}
                          {w.tags && w.tags.length > 0 && (
                            <div className="tag-list">
                              {w.tags.map((t) => (
                                <span key={t} className="tag-chip">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                          {(w.category ||
                            (w.materials && w.materials.length > 0)) && (
                            <div className="tag-list">
                              {w.category && (
                                <span className="tag-chip">#{w.category}</span>
                              )}
                              {(w.materials ?? []).map((m) => (
                                <span key={m} className="tag-chip">
                                  {m}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="work-meta">
                            {new Date(w.createdAt).toLocaleString()}
                          </div>

                          <div className="work-actions">
                            <button type="button" onClick={() => handleEdit(w)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(w.id)}
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectWork(w)}
                              className={
                                selectedWorkId === w.id
                                  ? "small-pill-btn active"
                                  : "small-pill-btn"
                              }
                            >
                              Canvas
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="work-canvas-card">
            <h3>Work canvas & notes</h3>
            {selectedWorkId ? (
              <>
                <div className="canvas-toolbar">
                  <div className="toolbar-group">
                    <span className="toolbar-label">Tool</span>
                    <div className="toolbar-buttons">
                      <button
                        type="button"
                        className={`small-pill-btn ${
                          toolMode === "draw" ? "active" : ""
                        }`}
                        onClick={() => setToolMode("draw")}
                      >
                        펜
                      </button>
                      <button
                        type="button"
                        className={`small-pill-btn ${
                          toolMode === "text" ? "active" : ""
                        }`}
                        onClick={() => setToolMode("text")}
                      >
                        텍스트
                      </button>
                      <button
                        type="button"
                        className={`small-pill-btn ${
                          toolMode === "rect" ? "active" : ""
                        }`}
                        onClick={() => setToolMode("rect")}
                      >
                        박스
                      </button>
                      <button
                        type="button"
                        className={`small-pill-btn ${
                          toolMode === "eraser" ? "active" : ""
                        }`}
                        onClick={() => setToolMode("eraser")}
                      >
                        지우개
                      </button>
                    </div>
                  </div>

                  <div className="toolbar-group">
                    {toolMode !== "eraser" && (
                      <label className="toolbar-field">
                        <span>색상</span>
                        <input
                          type="color"
                          value={brushColor}
                          onChange={(e) => setBrushColor(e.target.value)}
                        />
                      </label>
                    )}
                    <label className="toolbar-field">
                      <span>두께</span>
                      <input
                        type="range"
                        min={1}
                        max={16}
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                      />
                      <span className="toolbar-value">{brushSize}px</span>
                    </label>
                  </div>

                  <div className="toolbar-actions">
                    <button type="button" className="template-btn" onClick={handleCanvasSave}>
                      저장
                    </button>
                    <button
                      type="button"
                      className="template-btn secondary"
                      onClick={handleCanvasClear}
                    >
                      비우기
                    </button>
                  </div>
                </div>
                <div className="canvas-shell" ref={canvasShellRef}>
                  <canvas
                    ref={canvasRef}
                    className={`memo-canvas tool-${toolMode}`}
                    onMouseDown={handleCanvasDown}
                    onMouseMove={handleCanvasMove}
                    onMouseUp={handleCanvasUp}
                    onMouseLeave={handleCanvasLeave}
                  />
                  {textInputState.visible && toolMode === "text" && (
                    <input
                      ref={textInputRef}
                      className="canvas-text-input-live"
                      style={{
                        left: textInputState.viewX,
                        top: textInputState.viewY,
                        fontSize: Math.max(brushSize * 4, 16),
                        color: brushColor,
                      }}
                      value={textInputState.value}
                      onChange={(e) =>
                        setTextInputState((prev) => {
                          const next = e.target.value;
                          textValueRef.current = next;
                          // render via rAF to avoid flicker with caret timer
                          caretOnRef.current = true;
                          scheduleLiveTextRender(true);
                          return { ...prev, value: next };
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          endCanvasTextEdit("commit");
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          endCanvasTextEdit("cancel");
                        }
                      }}
                      onBlur={() => {
                        if (!textInputState.visible) return;
                        if (textInputState.value.trim()) {
                          endCanvasTextEdit("commit");
                        } else {
                          endCanvasTextEdit("cancel");
                        }
                      }}
                      // hidden input: captures keystrokes, canvas shows the text
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      autoFocus
                    />
                  )}
                </div>
                <p className="hint-text">작품마다 별도의 캔버스 메모가 저장됩니다.</p>
              </>
            ) : (
              <p className="hint-text">
                왼쪽 목록에서 작품을 선택하면 오른쪽에 캔버스가 열립니다.
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
