const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { readWorks, writeWorks } = require("./worksStore");
const {
    readPortfolios,
    writePortfolios,
} = require("./portfoliosStore");

const PORT = process.env.PORT || 4000;
const UPLOAD_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const app = express();

// CORS: Vite 기본 포트 5173 기준
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

// JSON 바디 파싱 (파일 업로드 아닌 요청용)
app.use(express.json());

// 업로드 파일 정적 서빙
app.use("/uploads", express.static(UPLOAD_DIR));

// multer 설정
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const safeBase = base.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${safeBase}-${unique}${ext}`);
  },
});

const upload = multer({ storage });

// ---------- Works helper ----------

function toApiWork(work) {
  let imageUrl = null;
  if (work.imageFilename) {
    const baseUrl =
      process.env.BASE_URL || `http://localhost:${PORT}`;
    imageUrl = `${baseUrl}/uploads/${work.imageFilename}`;
  }
  return {
    id: work.id,
    userEmail: work.userEmail,
    title: work.title,
    description: work.description ?? null,
    project: work.project ?? null,
    year: work.year ?? null,
    tags: work.tags ?? [],
    category: work.category ?? null,
    materials: work.materials ?? [],
    createdAt: work.createdAt,
    imageUrl,
  };
}

function parseStringArray(raw) {
  if (typeof raw === "string") {
    if (raw.trim().length === 0) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((t) => (typeof t === "string" ? t.trim() : ""))
          .filter(Boolean);
      }
    } catch {
      // fall back to comma separated
    }
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  if (Array.isArray(raw)) {
    return raw.map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean);
  }
  return [];
}

// ---------- Works API ----------

// GET /api/works?userEmail=...
app.get("/api/works", (req, res) => {
  const userEmail = req.query.userEmail;
  if (!userEmail || typeof userEmail !== "string") {
    return res.status(400).send("userEmail query parameter is required");
  }
  const all = readWorks();
  const filtered = all.filter((w) => w.userEmail === userEmail);
  const sorted = filtered.sort((a, b) => b.createdAt - a.createdAt);
  res.json(sorted.map(toApiWork));
});

// POST /api/works
app.post("/api/works", upload.single("image"), (req, res) => {
  const {
    userEmail,
    title,
    description,
    project,
    year,
    tags,
    category,
    materials,
  } = req.body;
  if (!userEmail || !title) {
    return res.status(400).send("userEmail and title are required");
  }

  const parsedTags = parseStringArray(tags);
  const parsedMaterials = parseStringArray(materials);

  const all = readWorks();
  const now = Date.now();
  const id = `${now}-${Math.random().toString(16).slice(2)}`;

  const work = {
    id,
    userEmail,
    title: title.trim(),
    description: description?.trim() || null,
    project: project?.trim() || null,
    year: year?.trim() || null,
    tags: parsedTags,
    category: typeof category === "string" ? category.trim() || null : null,
    materials: parsedMaterials,
    createdAt: now,
    imageFilename: req.file ? req.file.filename : null,
  };

  all.push(work);
  writeWorks(all);

  res.status(201).json(toApiWork(work));
});

// PUT /api/works/:id
app.put("/api/works/:id", upload.single("image"), (req, res) => {
  const workId = req.params.id;
  const all = readWorks();
  const idx = all.findIndex((w) => w.id === workId);
  if (idx === -1) {
    return res.status(404).send("Work not found");
  }

  const existing = all[idx];
  const { title, description, project, year, tags, category, materials } =
    req.body;

  const parsedTags =
    typeof tags === "undefined" ? existing.tags || [] : parseStringArray(tags);
  const parsedMaterials =
    typeof materials === "undefined"
      ? existing.materials || []
      : parseStringArray(materials);

  let imageFilename = existing.imageFilename;
  if (req.file) {
    if (imageFilename) {
      const oldPath = path.join(UPLOAD_DIR, imageFilename);
      fs.promises.unlink(oldPath).catch(() => {});
    }
    imageFilename = req.file.filename;
  }

  const updated = {
    ...existing,
    title:
      typeof title === "string" && title.trim()
        ? title.trim()
        : existing.title,
    description:
      typeof description === "string"
        ? description.trim() || null
        : existing.description,
    project:
      typeof project === "string"
        ? project.trim() || null
        : existing.project,
    year:
      typeof year === "string"
        ? year.trim() || null
        : existing.year,
    tags: parsedTags,
    category:
      typeof category === "string"
        ? category.trim() || null
        : typeof category === "undefined"
        ? existing.category ?? null
        : existing.category ?? null,
    materials: parsedMaterials,
    imageFilename,
  };

  all[idx] = updated;
  writeWorks(all);

  res.json(toApiWork(updated));
});

// DELETE /api/works/:id
app.delete("/api/works/:id", (req, res) => {
  const workId = req.params.id;
  const all = readWorks();
  const idx = all.findIndex((w) => w.id === workId);
  if (idx === -1) {
    return res.status(404).send("Work not found");
  }

  const removed = all[idx];
  all.splice(idx, 1);
  writeWorks(all);

  if (removed.imageFilename) {
    const imgPath = path.join(UPLOAD_DIR, removed.imageFilename);
    fs.promises.unlink(imgPath).catch(() => {});
  }

  res.status(204).send();
});

// ---------- Portfolios helper ----------

function normalizePortfolioItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (!raw.workId || typeof raw.workId !== "string") return null;
  const order =
    typeof raw.order === "number"
      ? raw.order
      : parseInt(raw.order, 10) || 0;

  return {
    workId: raw.workId,
    order,
    customTitle:
      typeof raw.customTitle === "string"
        ? raw.customTitle || null
        : null,
    customDescription:
      typeof raw.customDescription === "string"
        ? raw.customDescription || null
        : null,
  };
}

// ---------- Portfolios API ----------

// GET /api/portfolios?userEmail=...
app.get("/api/portfolios", (req, res) => {
  const userEmail = req.query.userEmail;
  if (!userEmail || typeof userEmail !== "string") {
    return res.status(400).send("userEmail query parameter is required");
  }
  const all = readPortfolios();
  const filtered = all.filter((p) => p.userEmail === userEmail);
  const sorted = filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  res.json(sorted);
});

// POST /api/portfolios
app.post("/api/portfolios", (req, res) => {
  const {
    userEmail,
    title,
    targetSchool = null,
    targetMajor = null,
    year = null,
    items,
  } = req.body;

  if (!userEmail || !title) {
    return res.status(400).send("userEmail and title are required");
  }

  const all = readPortfolios();
  const now = Date.now();
  const id = `${now}-${Math.random().toString(16).slice(2)}`;

  let normalizedItems = [];
  if (Array.isArray(items)) {
    normalizedItems = items
      .map(normalizePortfolioItem)
      .filter(Boolean);
  }

  const portfolio = {
    id,
    userEmail,
    title: String(title).trim(),
    targetSchool:
      typeof targetSchool === "string"
        ? targetSchool.trim() || null
        : null,
    targetMajor:
      typeof targetMajor === "string"
        ? targetMajor.trim() || null
        : null,
    year:
      typeof year === "string" ? year.trim() || null : null,
    items: normalizedItems,
    createdAt: now,
    updatedAt: now,
  };

  all.push(portfolio);
  writePortfolios(all);

  res.status(201).json(portfolio);
});

// PUT /api/portfolios/:id
app.put("/api/portfolios/:id", (req, res) => {
  const id = req.params.id;
  const all = readPortfolios();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).send("Portfolio not found");
  }

  const existing = all[idx];
  const { title, targetSchool, targetMajor, year, items } =
    req.body;

  const updated = { ...existing };

  if (typeof title === "string") {
    const t = title.trim();
    updated.title = t || existing.title;
  }

  if (typeof targetSchool === "string") {
    updated.targetSchool = targetSchool.trim() || null;
  }
  if (targetSchool === null) {
    updated.targetSchool = null;
  }

  if (typeof targetMajor === "string") {
    updated.targetMajor = targetMajor.trim() || null;
  }
  if (targetMajor === null) {
    updated.targetMajor = null;
  }

  if (typeof year === "string") {
    updated.year = year.trim() || null;
  }
  if (year === null) {
    updated.year = null;
  }

  if (Array.isArray(items)) {
    updated.items = items
      .map(normalizePortfolioItem)
      .filter(Boolean);
  }

  updated.updatedAt = Date.now();

  all[idx] = updated;
  writePortfolios(all);

  res.json(updated);
});

// DELETE /api/portfolios/:id
app.delete("/api/portfolios/:id", (req, res) => {
  const id = req.params.id;
  const all = readPortfolios();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).send("Portfolio not found");
  }

  all.splice(idx, 1);
  writePortfolios(all);

  res.status(204).send();
});

// ---------- 헬스 체크 ----------

app.get("/", (req, res) => {
  res.send("ArtfolioX server is running");
});

app.listen(PORT, () => {
  console.log(`ArtfolioX server running on http://localhost:${PORT}`);
});
