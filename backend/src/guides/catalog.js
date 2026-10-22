import fs from "fs";
import path from "path";

export const METHODS = [
  "catch", "evolve", "trade-evolve", "stone", "gift", "fossil",
  "static", "in-game-trade", "prize", "trade", "event",
];

const ENTRY_ID = /^\d{4}(-[a-z]+)?$/;

// Throws on malformed guide data so a bad JSON edit fails at startup, not mid-run.
export const validateGuide = (guide) => {
  const fail = (msg) => { throw new Error(`Guide "${guide.id ?? "?"}": ${msg}`); };
  if (!guide.id || !guide.name) fail("id and name are required");
  if (!Array.isArray(guide.versions) || guide.versions.length === 0) fail("versions must be a non-empty array");
  if (!Array.isArray(guide.sections) || guide.sections.length === 0) fail("sections must be a non-empty array");

  const versionIds = new Set(guide.versions.map((v) => v.id));
  const sectionIds = new Set();
  const entryIds = new Set();
  for (const section of guide.sections) {
    if (!section.id || !section.label) fail("each section needs id and label");
    if (sectionIds.has(section.id)) fail(`duplicate section ${section.id}`);
    sectionIds.add(section.id);
    for (const entry of section.entries ?? []) {
      if (!ENTRY_ID.test(entry.id ?? "")) fail(`bad entry id ${entry.id}`);
      if (entryIds.has(entry.id)) fail(`duplicate entry ${entry.id}`);
      entryIds.add(entry.id);
      if (!entry.name || !entry.location) fail(`entry ${entry.id} needs name and location`);
      if (!METHODS.includes(entry.method)) fail(`entry ${entry.id} has unknown method ${entry.method}`);
      for (const v of entry.versions ?? []) {
        if (!versionIds.has(v)) fail(`entry ${entry.id} names unknown version ${v}`);
      }
    }
  }
  return guide;
};

const loadGuides = (dir) => {
  const guides = new Map();
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const guide = validateGuide(JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")));
    guides.set(guide.id, guide);
  }
  return guides;
};

const guides = loadGuides(process.env.GUIDES_DIR || path.resolve("data/guides"));

export const getGuide = (id) => guides.get(id);

export const listGuides = () => [...guides.values()].map((g) => ({
  id: g.id,
  name: g.name,
  generation: g.generation,
  versions: g.versions,
  verified: Boolean(g.verified),
  sections: g.sections.length,
  entries: g.sections.reduce((n, s) => n + s.entries.length, 0),
}));

export const findEntry = (guide, entryId) => {
  for (const section of guide.sections) {
    const entry = section.entries.find((e) => e.id === entryId);
    if (entry) return entry;
  }
  return null;
};

export const isInVersion = (entry, version) => !entry.versions || entry.versions.includes(version);
