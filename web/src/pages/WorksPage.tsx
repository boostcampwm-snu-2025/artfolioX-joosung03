import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
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

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [works, setWorks] = useState<Work[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [filterText, setFilterText] = useState("");
  const [filterProject, setFilterProject] = useState("");

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

    const formData = new FormData();
    formData.append("userEmail", user.email);
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("project", project.trim());
    formData.append("year", year.trim());
    formData.append("tags", JSON.stringify(tags));
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
    setTitle(work.title);
    setDescription(work.description ?? "");
    setProject(work.project ?? "");
    setYear(work.year ?? "");
    setTagsInput(work.tags?.join(", ") ?? "");
    setSelectedFile(null);
    setPreviewUrl(work.imageUrl ?? null);
    setError(null);
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

  const visibleWorks = works.filter((w) => {
    const text = filterText.trim().toLowerCase();
    const proj = filterProject.trim().toLowerCase();

    const matchesText =
      !text ||
      w.title.toLowerCase().includes(text) ||
      (w.description ?? "").toLowerCase().includes(text) ||
      (w.tags ?? []).some((t) => t.toLowerCase().includes(text));

    const matchesProject =
      !proj || (w.project ?? "").toLowerCase().includes(proj);

    return matchesText && matchesProject;
  });

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
            <label>
              <span>Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>

            <label>
              <span>Project</span>
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="예: 입시 포트폴리오, 개인 작업"
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
              <span>Tags (comma separated)</span>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="예: 인물, 유화, 흑백"
              />
            </label>

            <label>
              <span>Note</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </label>

            <label>
              <span>Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
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
              {visibleWorks.map((w) => (
                <li key={w.id} className="work-item">
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
                      <div className="work-meta">
                        {new Date(w.createdAt).toLocaleString()}
                      </div>

                      <div className="work-actions">
                        <button type="button" onClick={() => handleEdit(w)}>
                          Edit
                        </button>
                        <button type="button" onClick={() => handleDelete(w.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
