import fs from "fs";
import path from "path";

const ENTRY_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Throws on malformed guide data so a bad JSON edit fails at startup, not mid-run.
export const validateGuide = (guide) => {
  const fail = (msg) => { throw new Error(`Guide "${guide.id ?? "?"}": ${msg}`); };
  if (!guide.id || !guide.name) fail("id and name are required");
  if (!Array.isArray(guide.versions) || guide.versions.length === 0) fail("versions must be a non-empty array");
  if (!Array.isArray(guide.sections) || guide.sections.length === 0) fail("sections must be a non-empty array");

  const sectionIds = new Set();
  const choiceKeys = new Set();
  const required = [];
  for (const section of guide.sections) {
    if (!section.id || !section.label) fail("each section needs id and label");
    if (sectionIds.has(section.id)) fail(`duplicate section ${section.id}`);
    sectionIds.add(section.id);
    for (const choice of section.choices ?? []) {
      if (!choice.key || !Number.isInteger(choice.cap) || choice.cap < 1) fail(`section ${section.id}: bad choice block`);
      if (!Array.isArray(choice.options) || choice.options.length === 0) fail(`choice ${choice.key} has no options`);
      choiceKeys.add(choice.key);
    }
    for (const entry of section.entries ?? []) {
      if (!ENTRY_ID.test(entry.id ?? "")) fail(`bad entry id ${entry.id}`);
      if (!entry.name || typeof entry.method !== "string") fail(`entry ${entry.id} needs name and method`);
      for (const r of [...(entry.requires ?? []), ...(entry.requiresNot ?? [])]) {
        if (!r.key || r.value === undefined) fail(`entry ${entry.id} has a malformed requirement`);
        required.push([entry.id, r.key]);
      }
    }
  }
  for (const [entryId, key] of required) {
    if (!choiceKeys.has(key)) fail(`entry ${entryId} requires unknown choice ${key}`);
  }
  return guide;
};

const loadGuides = (dir) => {
  const guides = new Map();
  if (!fs.existsSync(dir)) return guides;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const guide = validateGuide(JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")));
    guides.set(guide.id, guide);
  }
  return guides;
};

const guides = loadGuides(process.env.GUIDES_DIR || path.resolve("data/guides"));

const indexes = new WeakMap();

// Lookup tables per guide: entry ids and choice definitions (a key can span several sections).
export const guideIndex = (guide) => {
  if (!indexes.has(guide)) {
    const entryIds = new Set();
    const choices = new Map();
    for (const section of guide.sections) {
      for (const entry of section.entries ?? []) entryIds.add(entry.id);
      for (const choice of section.choices ?? []) {
        const def = choices.get(choice.key) ?? { cap: 1, values: new Set() };
        def.cap = Math.max(def.cap, choice.cap);
        for (const option of choice.options) def.values.add(option.value);
        choices.set(choice.key, def);
      }
    }
    indexes.set(guide, { entryIds, choices });
  }
  return indexes.get(guide);
};

export const getGuide = (id) => guides.get(id);

export const listGuides = () => [...guides.values()]
  .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.name.localeCompare(b.name))
  .map((g) => ({
    id: g.id,
    name: g.name,
    region: g.region ?? null,
    generation: g.generation ?? null,
    versions: g.versions,
    sections: g.sections.length,
    entries: guideIndex(g).entryIds.size,
  }));

// Same rule as the source tracker: every `requires` pair is selected, no `requiresNot` pair is.
export const meetsRequirements = (entry, choices) => {
  const has = ({ key, value }) => (choices?.[key] ?? []).includes(value);
  return (entry.requires ?? []).every(has) && !(entry.requiresNot ?? []).some(has);
};

export const progressOf = (guide, choices, caughtIds) => {
  const caught = new Set(caughtIds);
  let total = 0;
  let done = 0;
  for (const section of guide.sections) {
    for (const entry of section.entries ?? []) {
      if (!meetsRequirements(entry, choices)) continue;
      total += 1;
      if (caught.has(entry.id)) done += 1;
    }
  }
  return { caught: done, total };
};
