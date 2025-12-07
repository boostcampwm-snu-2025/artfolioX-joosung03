const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "works.json");

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, "[]", "utf-8");
  }
}

function readWorks() {
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

function writeWorks(works) {
  ensureDataFile();
  fs.writeFileSync(dataFile, JSON.stringify(works, null, 2), "utf-8");
}

module.exports = { readWorks, writeWorks };
