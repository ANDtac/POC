// Converts the per-game data of the Oak Challenge Tracker (https://github.com/EzraSkwarka/OakChallenge,
// MIT) into this app's guide JSON. Content is copied as-is: section titles, guide text, choice blocks,
// gating and method text. Only the shape changes.
//
// Usage: node scripts/import-oak-tracker.js <path-to-OakChallenge-checkout> [outDir]
import fs from "fs";
import path from "path";
import vm from "vm";
import { execFileSync } from "child_process";

const SPRITE_SETS = {
  red: "generation-i/red-blue/transparent",
  blue: "generation-i/red-blue/transparent",
  yellow: "generation-i/yellow/transparent",
  gold: "generation-ii/gold/transparent",
  silver: "generation-ii/silver/transparent",
  crystal: "generation-ii/crystal/transparent",
  ruby: "generation-iii/ruby-sapphire",
  sapphire: "generation-iii/ruby-sapphire",
  emerald: "generation-iii/emerald",
  firered: "generation-iii/firered-leafgreen",
  leafgreen: "generation-iii/firered-leafgreen",
  diamond: "generation-iv/diamond-pearl",
  pearl: "generation-iv/diamond-pearl",
  platinum: "generation-iv/platinum",
  heartgold: "generation-iv/heartgold-soulsilver",
  soulsilver: "generation-iv/heartgold-soulsilver",
};

const ALLOWED_TAGS = new Set(["p", "pre", "h5", "br", "strong", "em", "b", "i", "ul", "ol", "li", "a", "section"]);
const ALLOWED_ATTRS = new Set(["href", "target", "rel", "class"]);

const [srcDir, outDirArg] = process.argv.slice(2);
if (!srcDir) {
  console.error("Usage: node scripts/import-oak-tracker.js <path-to-OakChallenge-checkout> [outDir]");
  process.exit(1);
}
const outDir = path.resolve(outDirArg || "data/guides");
const read = (...p) => fs.readFileSync(path.join(srcDir, ...p), "utf8");

const runScripts = (files) => {
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  for (const file of files) vm.runInContext(read(...file), ctx, { filename: file.join("/") });
  return ctx.window;
};

const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/♀/g, "-f").replace(/♂/g, "-m")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const dexKey = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/♀/g, "f").replace(/♂/g, "m").toLowerCase().replace(/[^a-z0-9]/g, "");

// Same idea as the tracker's normalizeSummaryPreIndent: strip the source-code indentation from <pre> blocks.
const dedentPre = (html) => html.replace(/<pre>([\s\S]*?)<\/pre>/g, (_, body) => {
  const lines = body.replace(/\r/g, "").split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length));
  return `<pre>${lines.map((l) => l.slice(indent)).join("\n")}</pre>`;
});

const checkHtml = (html, where) => {
  for (const [, tag, attrs] of html.matchAll(/<\/?([a-zA-Z0-9]+)([^>]*)>/g)) {
    if (!ALLOWED_TAGS.has(tag.toLowerCase())) throw new Error(`${where}: tag <${tag}> not allowed`);
    for (const [, name] of attrs.matchAll(/([a-zA-Z-]+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/g)) {
      if (!ALLOWED_ATTRS.has(name.toLowerCase())) throw new Error(`${where}: attribute ${name} not allowed`);
    }
  }
  return html;
};

// Tag typos in the source markup. Text is never changed, only the broken tag names.
const TAG_TYPOS = [["<stron>", "<strong>"], ["</stron>", "</strong>"], ["</sttrong>", "</strong>"]];

const fixTagTypos = (html, where) => {
  let out = html;
  for (const [bad, good] of TAG_TYPOS) {
    const count = out.split(bad).length - 1;
    if (count) {
      console.log(`  fixed ${count}x ${bad} -> ${good} in ${where}`);
      out = out.split(bad).join(good);
    }
  }
  return out;
};

const cleanHtml = (html, where) => (html ? checkHtml(fixTagTypos(dedentPre(html.trim()), where), where) : null);

const normRequires = (req) => {
  if (!req) return undefined;
  const list = Array.isArray(req)
    ? req.map((r) => ({ key: r.key, value: r.value }))
    : Object.entries(req).map(([key, value]) => ({ key, value }));
  return list.map((r) => ({ key: r.key, value: String(r.value).trim().toLowerCase() }));
};

// Misspelled Pokémon names in the source rows. Fixed in the row name only; guide prose is untouched.
const NAME_FIXES = { Ninetails: "Ninetales", Azuril: "Azurill" };
const fixName = (name, where) => {
  if (!NAME_FIXES[name]) return name;
  console.log(`  fixed name ${name} -> ${NAME_FIXES[name]} in ${where}`);
  return NAME_FIXES[name];
};

// Choice options that are items (fossils) rather than Pokémon get an item sprite instead of a dex number.
const ITEMS = new Set(["dome-fossil", "helix-fossil", "old-amber", "claw-fossil", "root-fossil", "skull-fossil", "armor-fossil"]);

const pokedex = runScripts([["data", "pokemon-data.js"]]).POKEMON_DATA;
// The Pokédex also lists alternate forms (ids 10000+) under the base name; keep the base species.
const dexByName = new Map();
for (const p of Object.values(pokedex).sort((a, b) => a.dexNumber - b.dexNumber)) {
  if (!dexByName.has(dexKey(p.name))) dexByName.set(dexKey(p.name), p.dexNumber);
}
const missingDex = new Set();
const dexOf = (name) => {
  const dex = dexByName.get(dexKey(name));
  if (!dex) missingDex.add(name);
  return dex ?? null;
};

const commit = (() => {
  try { return execFileSync("git", ["-C", srcDir, "rev-parse", "HEAD"]).toString().trim(); } catch { return null; }
})();

const manifest = JSON.parse(read("data", "manifest.games.json")).games;
fs.mkdirSync(outDir, { recursive: true });
let written = 0;

for (const [order, game] of manifest.entries()) {
  const dir = path.join(srcDir, "data", game.id);
  if (!game.available || !fs.existsSync(path.join(dir, "progression.js"))) continue;

  const files = [["data", game.id, "progression.js"]];
  const hasPatch = fs.existsSync(path.join(dir, "patch.js"));
  if (hasPatch) files.push(["data", game.id, "patch.js"], ["assets", "js", "game-data-patcher.js"]);
  const win = runScripts(files);
  const data = hasPatch ? win.applyGameDataPatch(win.gameData, win.gameDataPatch).data : win.gameData;

  const sourceText = read("data", game.id, "progression.js");
  const guideUrl = sourceText.match(/Guide:\s*(https:\/\/docs\.google\.com\/\S+)/)?.[1]
    ?? data.aboutHtml?.match(/href="(https:\/\/docs\.google\.com\/[^"]+)"/)?.[1]
    ?? null;

  const sectionIds = new Set();
  const sections = Object.entries(data.progression).map(([key, def]) => {
    let id = slug(key) || "section";
    while (sectionIds.has(id)) id += "-2";
    sectionIds.add(id);
    const where = `${game.id}/${key}`;

    const choices = [];
    const entries = [];
    for (const row of def.rows ?? []) {
      if (row.type === "choice") {
        let block = choices.find((c) => c.key === row.choiceKey);
        if (!block) {
          block = { key: row.choiceKey, title: null, cap: 1, options: [] };
          choices.push(block);
        }
        block.title ??= row.choiceTitle?.trim() || def.choiceTitles?.[row.choiceKey]?.trim() || null;
        if (Number.isFinite(row.choiceCap) && row.choiceCap > 0) block.cap = Math.max(block.cap, Math.floor(row.choiceCap));
        const optionName = fixName(row.pokemon?.name ?? String(row.choiceValue), where);
        const item = ITEMS.has(slug(optionName)) ? slug(optionName) : null;
        block.options.push({
          value: String(row.choiceValue).trim().toLowerCase(),
          name: optionName,
          ...(item ? { item } : { dex: dexOf(optionName) }),
          method: row.method ?? "",
        });
        continue;
      }
      if (!row.pokemon?.name) throw new Error(`${where}: row without a Pokémon name`);
      const name = fixName(row.pokemon.name, where);
      entries.push({
        id: slug(name),
        name,
        dex: dexOf(name),
        method: row.method ?? "",
        ...(row.requires && { requires: normRequires(row.requires) }),
        ...(row.requiresNot && { requiresNot: normRequires(row.requiresNot) }),
      });
    }

    return {
      id,
      label: def.headerTitle || key,
      ...(def.summaryShort && { summaryShort: def.summaryShort.trim() }),
      ...(def.summaryHtml && { summaryHtml: cleanHtml(def.summaryHtml, where) }),
      ...(def.summaryOpen && { summaryOpen: true }),
      choices,
      entries,
    };
  });

  const guide = {
    id: game.id,
    name: game.name,
    region: game.region,
    order,
    generation: Number(String(game.gen).replace(/\D/g, "")) || null,
    versions: [{ id: game.id, name: game.name.replace(/^Pokémon\s+/, "") }],
    spriteSet: SPRITE_SETS[game.id] ?? null,
    about: cleanHtml(data.aboutHtml, `${game.id}/about`),
    source: {
      guide: { name: "Professor Oak Challenge guides by u/mewlax84", url: guideUrl },
      data: {
        name: "Oak Challenge Tracker by EzraSkwarka",
        url: "https://github.com/EzraSkwarka/OakChallenge",
        license: "MIT",
        commit,
      },
    },
    sections,
  };
  fs.writeFileSync(path.join(outDir, `${game.id}.json`), `${JSON.stringify(guide, null, 2)}\n`);
  written += 1;
  const rows = sections.reduce((n, s) => n + s.entries.length, 0);
  const options = sections.reduce((n, s) => n + s.choices.reduce((m, c) => m + c.options.length, 0), 0);
  console.log(`${game.id.padEnd(11)} ${sections.length} sections, ${rows} rows, ${options} choice options`);
}

if (missingDex.size) console.warn(`No dex number for: ${[...missingDex].join(", ")}`);
console.log(`Wrote ${written} guides to ${outDir}${commit ? ` (source ${commit.slice(0, 7)})` : ""}`);
