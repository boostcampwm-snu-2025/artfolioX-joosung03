// src/pages/WorksPage.tsx
import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import type { Work } from "../works/types";

const WORKS_KEY_PREFIX = "artfoliox_works_";

function getWorksKey(email: string) {
  return `${WORKS_KEY_PREFIX}${email}`;
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function WorksPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [works, setWorks] = useState<Work[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 로그인한 유저의 작품 목록 로드
  useEffect(() => {
    if (!user?.email) {
      setWorks([]);
      return;
    }
    const key = getWorksKey(user.email);
    const raw = localStorage.getItem(key);
    if (!raw) {
      setWorks([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Work[];
      setWorks(parsed);
    } catch {
      setWorks([]);
    }
  }, [user]);

  function persist(updated: Work[]) {
    if (!user?.email) return;
    const key = getWorksKey(user.email);
    localStorage.setItem(key, JSON.stringify(updated));
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);

    if (!selected) {
      setPreviewUrl(null);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setPreviewUrl(result); // data URL
      }
    };
    reader.readAsDataURL(selected);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user?.email) {
      setError("로그인 상태가 아닙니다.");
      return;
    }
    if (!title.trim()) return;

    setSaving(true);
    setError(null);

    const newWork: Work = {
      id: makeId(),
      userEmail: user.email,
      title: title.trim(),
      description: description.trim() || null,
      createdAt: Date.now(),
      imageData: previewUrl ?? null,
    };

    const updated = [newWork, ...works];
    setWorks(updated);
    persist(updated);

    setTitle("");
    setDescription("");
    setFile(null);
    setPreviewUrl(null);
    setSaving(false);
  }

  if (!user?.email) {
    return (
      <div className="app-root">
        <p>로그인 후 작품을 관리할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1 className="app-title">ArtfolioX</h1>
      </header>

      <main className="app-main works-main">
        <section className="work-form-card">
          <h2>New work</h2>
          <p className="hint-text">
            작품 제목, 간단 메모, 사진 한 장부터 기록해 봅시다.
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

            <button type="submit" disabled={saving || !title.trim()}>
              {saving ? "Saving..." : "Save work"}
            </button>
          </form>
        </section>

        <section className="work-list">
          <h2>My works</h2>
          {works.length === 0 ? (
            <p className="hint-text">아직 등록된 작품이 없습니다.</p>
          ) : (
            <ul>
              {works.map((w) => (
                <li key={w.id} className="work-item">
                  <div className="work-item-main">
                    {w.imageData && (
                      <div className="work-image">
                        <img src={w.imageData} alt={w.title} />
                      </div>
                    )}
                    <div className="work-text">
                      <div className="work-title">{w.title}</div>
                      {w.description && (
                        <div className="work-desc">{w.description}</div>
                      )}
                      <div className="work-meta">
                        {new Date(w.createdAt).toLocaleString()}
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
