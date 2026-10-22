import { describe, expect, test } from "vitest";
import { countProgress, formatDex, groupByLocation, matchesFilters, spriteUrl } from "./guide.js";

const guide = {
  versions: [{ id: "red", name: "Red" }, { id: "blue", name: "Blue" }],
  sections: [
    {
      id: "a",
      entries: [
        { id: "0016", name: "Pidgey", location: "Route 1", method: "catch" },
        { id: "0023", name: "Ekans", location: "Route 4", method: "catch", versions: ["red"] },
      ],
    },
    {
      id: "b",
      entries: [
        { id: "0027", name: "Sandshrew", location: "Route 4", method: "catch", versions: ["blue"] },
        { id: "0065", name: "Alakazam", location: "Evolve Kadabra", method: "trade-evolve" },
        { id: "0019", name: "Rattata", location: "Route 1", method: "catch" },
      ],
    },
  ],
};
const entries = guide.sections.flatMap((s) => s.entries);

describe("guide helpers", () => {
  test("formatDex and spriteUrl use the national dex number", () => {
    expect(formatDex("0025")).toBe("#025");
    expect(spriteUrl("0052-alola")).toMatch(/\/52\.png$/);
  });

  test("countProgress ignores other-version exclusives", () => {
    const caught = new Set(["0016", "0027"]);
    expect(countProgress(entries, "red", caught)).toEqual({ caught: 1, total: 4 });
    expect(countProgress(entries, "blue", caught)).toEqual({ caught: 2, total: 4 });
  });

  test("matchesFilters combines version, missing, method and search", () => {
    const caught = new Set(["0016"]);
    const keep = (filters) => entries.filter((e) => matchesFilters(e, filters, "red", caught)).map((e) => e.id);
    expect(keep({})).toEqual(["0016", "0023", "0065", "0019"]);
    expect(keep({ showOtherVersions: true })).toHaveLength(5);
    expect(keep({ missingOnly: true })).toEqual(["0023", "0065", "0019"]);
    expect(keep({ method: "trade-evolve" })).toEqual(["0065"]);
    expect(keep({ query: "route 4" })).toEqual(["0023"]);
    expect(keep({ query: "#019" })).toEqual(["0019"]);
  });

  test("groupByLocation orders groups by first milestone", () => {
    const groups = groupByLocation(guide, () => true);
    expect(groups.map((g) => g.location)).toEqual(["Route 1", "Route 4", "Evolutions"]);
    expect(groups[0].entries.map((x) => x.sectionIndex)).toEqual([0, 1]);
  });
});
