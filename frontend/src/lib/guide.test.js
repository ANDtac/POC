import { describe, expect, test } from "vitest";
import {
  choiceLabel, countProgress, eligibleEntries, groupByPlace, matchesFilters, meetsRequirements,
  nextChoiceValues, pendingChoices, placeOf, spriteUrl,
} from "./guide.js";

const sections = [
  {
    id: "brock",
    choices: [{ key: "starter", title: null, cap: 1, options: [{ value: "bulbasaur" }, { value: "charmander" }] }],
    entries: [
      { id: "bulbasaur", name: "Bulbasaur", dex: 1, method: "Choose as Starter", requires: [{ key: "starter", value: "bulbasaur" }] },
      { id: "ivysaur", name: "Ivysaur", dex: 2, method: "Evolve from Bulbasaur at level 16", requires: [{ key: "starter", value: "bulbasaur" }] },
      { id: "charmander", name: "Charmander", dex: 4, method: "Choose as Starter", requires: [{ key: "starter", value: "charmander" }] },
      { id: "pidgey", name: "Pidgey", dex: 16, method: "Catch on Route 1" },
      { id: "caterpie", name: "Caterpie", dex: 10, method: "Catch in Viridian Forest" },
    ],
  },
  {
    id: "misty",
    choices: [{ key: "moon-stone-1", title: "Pick two", cap: 2, options: [{ value: "a" }, { value: "b" }, { value: "c" }] }],
    entries: [
      { id: "rattata", name: "Rattata", dex: 19, method: "Catch on Route 1" },
      { id: "spearow", name: "Spearow", dex: 21, method: "Route 22", requiresNot: [{ key: "starter", value: "charmander" }] },
    ],
  },
];

describe("guide helpers", () => {
  test("requirements follow requires and requiresNot", () => {
    expect(meetsRequirements(sections[0].entries[0], {})).toBe(false);
    expect(meetsRequirements(sections[0].entries[0], { starter: ["bulbasaur"] })).toBe(true);
    expect(meetsRequirements(sections[1].entries[1], { starter: ["charmander"] })).toBe(false);
    expect(eligibleEntries(sections[0], { starter: ["charmander"] }).map((e) => e.id)).toEqual(["charmander", "pidgey", "caterpie"]);
  });

  test("countProgress counts only rows unlocked by choices", () => {
    const caught = new Set(["pidgey", "bulbasaur"]);
    expect(countProgress(sections, {}, caught)).toEqual({ caught: 1, total: 4 });
    expect(countProgress(sections, { starter: ["bulbasaur"] }, caught)).toEqual({ caught: 2, total: 6 });
  });

  test("choice selection respects cap", () => {
    const single = sections[0].choices[0];
    const multi = sections[1].choices[0];
    expect(nextChoiceValues(single, ["bulbasaur"], "charmander")).toEqual(["charmander"]);
    expect(nextChoiceValues(single, ["bulbasaur"], "bulbasaur")).toEqual([]);
    expect(nextChoiceValues(multi, ["a", "b"], "c")).toEqual(["a", "b"]);
    expect(nextChoiceValues(multi, ["a"], "c")).toEqual(["a", "c"]);
    expect(choiceLabel(single)).toBe("Starter: choose one");
    expect(choiceLabel({ key: "moon-stone-1", cap: 2 })).toBe("Moon stone: choose 2");
    expect(choiceLabel(multi)).toBe("Pick two");
    expect(pendingChoices(sections[1], { "moon-stone-1": ["a"] })).toHaveLength(1);
    expect(pendingChoices(sections[1], { "moon-stone-1": ["a", "b"] })).toHaveLength(0);
  });

  test("search matches name, method text and dex number", () => {
    const caught = new Set(["pidgey"]);
    const keep = (filters) => sections[0].entries.filter((e) => matchesFilters(e, filters, caught)).map((e) => e.id);
    expect(keep({ query: "viridian" })).toEqual(["caterpie"]);
    expect(keep({ query: "#016" })).toEqual(["pidgey"]);
    expect(keep({ missingOnly: true })).not.toContain("pidgey");
  });

  test("places come from the guide's method text; evolutions are grouped last", () => {
    expect(placeOf({ method: "Catch on Route 1" })).toBe("Route 1");
    expect(placeOf({ method: "Route 22" })).toBe("Route 22");
    expect(placeOf({ method: "Evolve from Bulbasaur at level 16" })).toBe("Evolutions and items");
    const groups = groupByPlace(sections, () => true);
    expect(groups.map((g) => g.place)).toEqual([
      "Choose as Starter", "Route 1", "Viridian Forest", "Route 22", "Evolutions and items",
    ]);
    expect(groups.find((g) => g.place === "Route 1").entries.map((x) => x.entry.id)).toEqual(["pidgey", "rattata"]);
  });

  test("sprites use the game's sprite set and item sprites for fossils", () => {
    expect(spriteUrl({ spriteSet: "generation-i/yellow/transparent" }, { dex: 25 })).toMatch(/versions\/generation-i\/yellow\/transparent\/25\.png$/);
    expect(spriteUrl({}, { dex: 25 })).toMatch(/pokemon\/25\.png$/);
    expect(spriteUrl({}, { item: "dome-fossil" })).toMatch(/items\/dome-fossil\.png$/);
    expect(spriteUrl({}, {})).toBeNull();
  });
});
