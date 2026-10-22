export const METHOD_LABELS = {
  catch: "Catch",
  evolve: "Level up",
  stone: "Stone",
  "trade-evolve": "Trade evo",
  gift: "Gift",
  fossil: "Fossil",
  static: "Static",
  "in-game-trade": "NPC trade",
  prize: "Prize",
  trade: "Trade",
  event: "Event",
};

// Methods that can't be finished alone in one cartridge.
export const NEEDS_TRADE = new Set(["trade-evolve", "trade"]);

export const dexNumber = (entryId) => Number(entryId.slice(0, 4));

export const formatDex = (entryId) => `#${String(dexNumber(entryId)).padStart(3, "0")}`;

// Regional forms ("0052-alola") need a sprite id map once such guides exist; base sprite until then.
export const spriteUrl = (entryId) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexNumber(entryId)}.png`;

export const isInVersion = (entry, version) => !entry.versions || entry.versions.includes(version);

export const versionLabel = (guide, versionIds) =>
  versionIds.map((id) => guide.versions.find((v) => v.id === id)?.name ?? id).join("/");

export function countProgress(entries, version, caught) {
  let total = 0;
  let done = 0;
  for (const entry of entries) {
    if (!isInVersion(entry, version)) continue;
    total += 1;
    if (caught.has(entry.id)) done += 1;
  }
  return { caught: done, total };
}

export const allEntries = (guide) => guide.sections.flatMap((s) => s.entries);

export function matchesFilters(entry, filters, version, caught) {
  const { query = "", method = "all", missingOnly = false, showOtherVersions = false } = filters;
  if (!showOtherVersions && !isInVersion(entry, version)) return false;
  if (missingOnly && caught.has(entry.id)) return false;
  if (method !== "all" && entry.method !== method) return false;
  const q = query.trim().toLowerCase();
  if (q) {
    const haystack = `${entry.name} ${entry.location} ${formatDex(entry.id)} ${dexNumber(entry.id)}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

// Evolutions happen wherever the player is, so they are not tied to a place.
export const EVOLUTION_METHODS = new Set(["evolve", "stone", "trade-evolve"]);
export const EVOLUTIONS_GROUP = "Evolutions";

// Groups entries by location, ordered by the first milestone where each location appears.
// Evolutions are collected into one trailing group.
export function groupByLocation(guide, keep) {
  const groups = new Map();
  const evolutions = { location: EVOLUTIONS_GROUP, firstSection: Infinity, entries: [] };
  guide.sections.forEach((section, sectionIndex) => {
    for (const entry of section.entries) {
      if (!keep(entry)) continue;
      if (EVOLUTION_METHODS.has(entry.method)) {
        evolutions.entries.push({ entry, sectionIndex });
        continue;
      }
      if (!groups.has(entry.location)) {
        groups.set(entry.location, { location: entry.location, firstSection: sectionIndex, entries: [] });
      }
      groups.get(entry.location).entries.push({ entry, sectionIndex });
    }
  });
  const sorted = [...groups.values()].sort(
    (a, b) => a.firstSection - b.firstSection || a.location.localeCompare(b.location),
  );
  return evolutions.entries.length ? [...sorted, evolutions] : sorted;
}
