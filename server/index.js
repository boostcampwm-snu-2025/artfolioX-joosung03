const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { readWorks, writeWorks } = require("./worksStore");
const { readTemplates, writeTemplates } = require("./templatesStore");
const { readComments, writeComments } = require("./commentsStore");
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
    return raw
      .map((t) => (typeof t === "string" ? t.trim() : ""))
      .filter(Boolean);
  }
  return [];
}

function generateSlug() {
  return Math.random().toString(36).slice(2, 8);
}

function buildWorksMap() {
  const works = readWorks();
  const map = new Map();
  works.forEach((w) => map.set(w.id, w));
  return map;
}

function computeReadiness(portfolio, template, worksMap) {
  if (!template || !Array.isArray(template.rules)) return null;

  function normalizeCategory(raw) {
    const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    if (!s) return "uncategorized";
    // accept Korean labels / variants too
    if (s.includes("기초소묘") || s.includes("소묘")) return "foundation_drawing";
    if (s.includes("색채") || s.includes("채색")) return "color_painting";
    if (s.includes("발상") || s.includes("컨셉") || s.includes("구상"))
      return "concept_piece";
    if (s.includes("기초디자인") || s.includes("디자인")) return "foundation_design";
    return s;
  }

  const totals = {
    total: portfolio.items.length,
    minTotal: template.minTotal ?? null,
    maxTotal: template.maxTotal ?? null,
  };

  let missingCount = 0;
  let missingRulesCount = 0;
  let totalRequired = 0;

  const rules = template.rules.map((rule) => {
    const required = rule.minCount ?? 0;
    totalRequired += required;
    const current = portfolio.items.reduce((acc, item) => {
      const work = worksMap.get(item.workId);
      if (!work) return acc;
      const category = normalizeCategory(work.category);
      return category === normalizeCategory(rule.category) ? acc + 1 : acc;
    }, 0);

    const missing = Math.max(0, required - current);
    missingCount += missing;
    missingRulesCount += missing;
    const maxExceeded =
      typeof rule.maxCount === "number" && rule.maxCount >= 0
        ? Math.max(0, current - rule.maxCount)
        : undefined;

    let status = "ok";
    if (missing > 0) status = "missing";
    else if (maxExceeded && maxExceeded > 0) status = "exceed";

    return {
      category: rule.category,
      required,
      current,
      status,
      missing,
      maxExceeded,
    };
  });

  // total coverage check
  if (typeof totals.minTotal === "number" && totals.minTotal > 0) {
    if (totals.total < totals.minTotal) {
      missingCount += totals.minTotal - totals.total;
    }
  }

  let summaryStatus = "ok";
  if (missingCount > 0) summaryStatus = "missing";
  else {
    const exceedsTotal =
      typeof totals.maxTotal === "number" && totals.total > totals.maxTotal;
    if (exceedsTotal) summaryStatus = "exceed";
    if (totals.total === 0) summaryStatus = "empty";
  }

  // coverage is based on rule requirements only (minTotal affects summary.missingCount, not coverage%)
  const coveragePercent =
    totalRequired > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((totalRequired - missingRulesCount) / totalRequired) * 100
            )
          )
        )
      : 100;

  return {
    portfolioId: portfolio.id,
    templateId: template.id,
    templateName: template.name,
    summary: {
      status: summaryStatus,
      missingCount,
      coveragePercent,
      total: totals.total,
    },
    rules,
  };
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

// ---------- Templates API ----------

function normalizeTemplateRule(raw) {
  if (!raw || typeof raw !== "object") return null;
  const category =
    typeof raw.category === "string" ? raw.category.trim() : "";
  if (!category) return null;
  const min =
    typeof raw.minCount === "number"
      ? raw.minCount
      : typeof raw.minCount === "string"
      ? Number(raw.minCount)
      : undefined;
  const max =
    typeof raw.maxCount === "number"
      ? raw.maxCount
      : typeof raw.maxCount === "string"
      ? Number(raw.maxCount)
      : undefined;
  return {
    category,
    minCount: Number.isFinite(min) ? min : undefined,
    maxCount: Number.isFinite(max) ? max : undefined,
  };
}

app.get("/api/templates", (req, res) => {
  const templates = readTemplates();
  const userEmail = req.query.userEmail;
  if (userEmail && typeof userEmail === "string") {
    // show global templates (no userEmail) + templates created by this user
    return res.json(
      templates.filter((t) => !t.userEmail || t.userEmail === userEmail)
    );
  }
  res.json(templates);
});

// create a user template
app.post("/api/templates", (req, res) => {
  const { userEmail, name, rules, minTotal, maxTotal } = req.body || {};
  if (!userEmail || typeof userEmail !== "string") {
    return res.status(400).send("userEmail is required");
  }
  if (!name || typeof name !== "string") {
    return res.status(400).send("name is required");
  }
  if (!Array.isArray(rules)) {
    return res.status(400).send("rules must be an array");
  }

  const normalizedRules = rules
    .map(normalizeTemplateRule)
    .filter(Boolean);
  if (normalizedRules.length === 0) {
    return res.status(400).send("at least one valid rule is required");
  }

  const minT =
    typeof minTotal === "number"
      ? minTotal
      : typeof minTotal === "string"
      ? Number(minTotal)
      : undefined;
  const maxT =
    typeof maxTotal === "number"
      ? maxTotal
      : typeof maxTotal === "string"
      ? Number(maxTotal)
      : undefined;

  const templates = readTemplates();
  const now = Date.now();
  const id = `tpl-${now}-${Math.random().toString(16).slice(2, 6)}`;
  const tpl = {
    id,
    userEmail: userEmail.trim(),
    name: name.trim(),
    rules: normalizedRules,
    minTotal: Number.isFinite(minT) ? minT : undefined,
    maxTotal: Number.isFinite(maxT) ? maxT : undefined,
  };

  templates.unshift(tpl);
  writeTemplates(templates);
  res.status(201).json(tpl);
});

app.get("/api/templates/:id", (req, res) => {
  const templates = readTemplates();
  const tpl = templates.find((t) => t.id === req.params.id);
  if (!tpl) return res.status(404).send("Template not found");
  res.json(tpl);
});

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
    templateId = null,
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
    templateId:
      typeof templateId === "string" ? templateId.trim() || null : null,
    shareSlug: null,
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
  const { title, targetSchool, targetMajor, year, items, templateId } =
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

  if (typeof templateId === "string") {
    updated.templateId = templateId.trim() || null;
  }
  if (templateId === null) {
    updated.templateId = null;
  }

  updated.updatedAt = Date.now();

  all[idx] = updated;
  writePortfolios(all);

  res.json(updated);
});

// POST /api/portfolios/:id/share -> generate share slug
app.post("/api/portfolios/:id/share", (req, res) => {
  const id = req.params.id;
  const all = readPortfolios();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).send("Portfolio not found");
  }

  const existing = all[idx];
  const slug = existing.shareSlug || generateSlug();

  const updated = {
    ...existing,
    shareSlug: slug,
    updatedAt: Date.now(),
  };
  all[idx] = updated;
  writePortfolios(all);

  // Share URL should point to the frontend route (/share/:slug)
  const baseUrl =
    process.env.FRONTEND_BASE_URL ||
    req.headers.origin ||
    "http://localhost:5173";
  res.json({
    shareSlug: slug,
    url: `${baseUrl}/share/${slug}`,
  });
});

// POST /api/portfolios/:id/readiness { templateId }
app.post("/api/portfolios/:id/readiness", (req, res) => {
  const id = req.params.id;
  const { templateId } = req.body || {};
  if (!templateId || typeof templateId !== "string") {
    return res.status(400).send("templateId is required");
  }

  const all = readPortfolios();
  const portfolio = all.find((p) => p.id === id);
  if (!portfolio) {
    return res.status(404).send("Portfolio not found");
  }

  const templates = readTemplates();
  const template = templates.find((t) => t.id === templateId);
  if (!template) {
    return res.status(404).send("Template not found");
  }

  const worksMap = buildWorksMap();
  const readiness = computeReadiness(portfolio, template, worksMap);
  res.json(readiness);
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

// ---------- Public shared view & comments ----------

function findPortfolioBySlug(slug) {
  if (!slug) return null;
  const all = readPortfolios();
  return all.find((p) => p.shareSlug === slug) || null;
}

app.get("/api/shared/:slug", (req, res) => {
  const slug = req.params.slug;
  const portfolio = findPortfolioBySlug(slug);
  if (!portfolio) return res.status(404).send("Shared portfolio not found");

  const worksMap = buildWorksMap();
  const templates = readTemplates();
  const template = portfolio.templateId
    ? templates.find((t) => t.id === portfolio.templateId) || null
    : null;

  const items = portfolio.items.map((item) => {
    const work = worksMap.get(item.workId);
    return {
      item,
      work: work ? toApiWork(work) : null,
    };
  });

  const readiness = template
    ? computeReadiness(portfolio, template, worksMap)
    : null;

  const comments = readComments().filter(
    (c) => c.portfolioId === portfolio.id
  );

  res.json({
    portfolio,
    template,
    readiness,
    items,
    comments,
  });
});

app.get("/api/shared/:slug/comments", (req, res) => {
  const slug = req.params.slug;
  const portfolio = findPortfolioBySlug(slug);
  if (!portfolio) return res.status(404).send("Shared portfolio not found");
  const comments = readComments().filter(
    (c) => c.portfolioId === portfolio.id
  );
  res.json(comments);
});

app.post("/api/shared/:slug/comments", (req, res) => {
  const slug = req.params.slug;
  const portfolio = findPortfolioBySlug(slug);
  if (!portfolio) return res.status(404).send("Shared portfolio not found");

  const { authorName, role = null, text, workId = null } = req.body || {};
  if (!authorName || !text) {
    return res.status(400).send("authorName and text are required");
  }

  const now = Date.now();
  const id = `${now}-${Math.random().toString(16).slice(2)}`;

  const comments = readComments();
  const comment = {
    id,
    portfolioId: portfolio.id,
    workId: typeof workId === "string" ? workId : null,
    authorName: String(authorName).trim(),
    role: typeof role === "string" ? role.trim() || null : null,
    text: String(text).trim(),
    createdAt: now,
  };
  comments.unshift(comment);
  writeComments(comments);

  res.status(201).json(comment);
});

// ---------- 헬스 체크 ----------

app.get("/", (req, res) => {
  res.send("ArtfolioX server is running");
});

app.listen(PORT, () => {
  console.log(`ArtfolioX server running on http://localhost:${PORT}`);
});
