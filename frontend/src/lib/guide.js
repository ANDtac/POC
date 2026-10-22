const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites";

export const formatDex = (dex) => (dex ? `#${String(dex).padStart(3, "0")}` : "");

// Game-accurate sprite when the guide names a sprite set, the modern sprite otherwise.
export const spriteUrl = (guide, { dex, item }) => {
  if (item) return `${SPRITES}/items/${item}.png`;
  if (!dex) return null;
  return guide?.spriteSet ? `${SPRITES}/pokemon/versions/${guide.spriteSet}/${dex}.png` : `${SPRITES}/pokemon/${dex}.png`;
};

export const fallbackSpriteUrl = (dex) => (dex ? `${SPRITES}/pokemon/${dex}.png` : null);

// Same rule as the source tracker: every `requires` pair is selected, no `requiresNot` pair is.
export const meetsRequirements = (entry, choices) => {
  const has = ({ key, value }) => (choices?.[key] ?? []).includes(value);
  return (entry.requires ?? []).every(has) && !(entry.requiresNot ?? []).some(has);
};

export const eligibleEntries = (section, choices) => (section.entries ?? []).filter((e) => meetsRequirements(e, choices));

export function countProgress(sections, choices, caught) {
  let total = 0;
  let done = 0;
  for (const section of sections) {
    for (const entry of eligibleEntries(section, choices)) {
      total += 1;
      if (caught.has(entry.id)) done += 1;
    }
  }
  return { caught: done, total };
}

// "moon-stone-1" -> "Moon stone"
const humanize = (key) => {
  const words = key.replace(/[-_]+\d*$/, "").replace(/[-_]+/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : key;
};

// The guide's own title when it has one; otherwise a label built from the choice key.
export const choiceLabel = (choice) =>
  choice.title || `${humanize(choice.key)}: ${choice.cap === 1 ? "choose one" : `choose ${choice.cap}`}`;

// Choice blocks in a section that still have open picks.
export const pendingChoices = (section, choices) =>
  (section.choices ?? []).filter((c) => (choices?.[c.key]?.length ?? 0) < c.cap);

export function nextChoiceValues(choice, current, value) {
  const selected = current ?? [];
  if (selected.includes(value)) return selected.filter((v) => v !== value);
  if (choice.cap === 1) return [value];
  return selected.length < choice.cap ? [...selected, value] : selected;
}

export function matchesFilters(entry, { query = "", missingOnly = false }, caught) {
  if (missingOnly && caught.has(entry.id)) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${entry.name} ${entry.method} ${formatDex(entry.dex)} ${entry.dex ?? ""}`.toLowerCase().includes(q);
}

// Rows obtained by evolving or using an item happen wherever the player is, so they are not tied to a place.
const EVOLUTION = /^(evolve|use |level up|trade )/i;
export const EVOLUTIONS_GROUP = "Evolutions and items";

// "Catch on Route 1" and "Catch in Viridian Forest" group under the place as the guide wrote it.
export const placeOf = (entry) =>
  EVOLUTION.test(entry.method) ? EVOLUTIONS_GROUP : entry.method.replace(/^catch (on|in|at)\s+/i, "").trim() || "Other";

// Groups rows by place, ordered by the first section where each place appears; evolutions go last.
export function groupByPlace(sections, keep) {
  const groups = new Map();
  sections.forEach((section, sectionIndex) => {
    for (const entry of section.entries) {
      if (!keep(entry)) continue;
      const place = placeOf(entry);
      if (!groups.has(place)) groups.set(place, { place, firstSection: place === EVOLUTIONS_GROUP ? Infinity : sectionIndex, entries: [] });
      groups.get(place).entries.push({ entry, sectionIndex });
    }
  });
  return [...groups.values()].sort((a, b) => a.firstSection - b.firstSection || a.place.localeCompare(b.place));
}
