import fs from "fs";
import path from "path";
import { validateGuide } from "../src/guides/catalog.js";

const dir = path.resolve("data/guides");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

// Highest national dex number per generation.
const DEX_LIMIT = { 1: 151, 2: 251, 3: 386, 4: 493, 5: 649, 6: 721, 7: 809, 8: 905, 9: 1025 };

describe("bundled guides", () => {
  test("are present", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  test.each(files)("%s is valid and credits its sources", (file) => {
    const guide = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    expect(() => validateGuide(guide)).not.toThrow();
    expect(`${guide.id}.json`).toBe(file);
    expect(guide.source.guide.name).toMatch(/mewlax84/);
    expect(guide.source.data.license).toBe("MIT");
  });

  test.each(files)("%s maps every Pokémon to a dex number from its generation", (file) => {
    const guide = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    const rows = guide.sections.flatMap((s) => [...s.entries, ...s.choices.flatMap((c) => c.options)]);
    const bad = rows.filter((r) => !r.item && !(r.dex >= 1 && r.dex <= DEX_LIMIT[guide.generation]));
    expect(bad.map((r) => `${r.name}:${r.dex}`)).toEqual([]);
  });
});
