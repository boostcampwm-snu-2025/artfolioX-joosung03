const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "templates.json");

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dataFile)) {
    const seed = [
      {
        id: "template-foundation-01",
        name: "기초소묘 중심 (서울 A대 회화과)",
        rules: [
          { category: "foundation_drawing", minCount: 2, maxCount: 6 },
          { category: "color_painting", minCount: 1, maxCount: 5 },
          { category: "concept_piece", minCount: 1, maxCount: 3 },
        ],
        minTotal: 4,
        maxTotal: 12,
      },
      {
        id: "template-design-01",
        name: "기초디자인 (B대 디자인과)",
        rules: [
          { category: "foundation_design", minCount: 2, maxCount: 5 },
          { category: "color_painting", minCount: 1, maxCount: 4 },
        ],
        minTotal: 4,
        maxTotal: 10,
      },
    ];
    fs.writeFileSync(dataFile, JSON.stringify(seed, null, 2), "utf-8");
  }
}

function readTemplates() {
  ensureDataFile();
  const text = fs.readFileSync(dataFile, "utf-8");
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) return data;
    return [];
  } catch {
    return [];
  }
}

function writeTemplates(templates) {
  ensureDataFile();
  fs.writeFileSync(dataFile, JSON.stringify(templates, null, 2), "utf-8");
}

module.exports = { readTemplates, writeTemplates };

