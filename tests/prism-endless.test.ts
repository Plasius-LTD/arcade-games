import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generatePrismEndlessRoom, parsePrismEndlessRecipe, readPrismEndlessRoom } from "../src/games/prism/endless.js";
import { parsePrismStage, prismBarrierAt, PRISM_PROFILES } from "../src/games/prism/rules.js";

const recipe = (round = 0, choice = 0) => ({ type: "prismEndlessRecipe" as const, version: "1.0.0" as const, round, choice });
const rounds = Array.from({ length: 3 }, (_, tier) => Array.from({ length: 4 }, (_, family) => tier * 8 + family)).flat();
const rooms = rounds.flatMap(round => Array.from({ length: 8 }, (_, choice) => ({ round, choice })));

describe("bounded original Prism endless rooms", () => {
  it("reconstructs all 96 distinct finite rooms without drawing randomness", () => {
    const identities = new Set<string>(), geometries = new Set<string>();
    for (const item of rooms) {
      const room = readPrismEndlessRoom(recipe(item.round, item.choice));
      expect(room.recipe).toEqual(recipe(item.round, item.choice));
      expect(room.family).toBe(["banks", "timing", "relay", "gravity"][item.round % 4]);
      expect(room.tier).toBe(Math.min(2, Math.floor(item.round / 8)));
      expect(parsePrismStage(room.stage)).toEqual(room.stage);
      expect(readPrismEndlessRoom(JSON.stringify(room.recipe))).toEqual(room);
      identities.add(room.key);
      geometries.add(createHash("sha256").update(JSON.stringify(room.stage, (key, value) => key === "id" ? undefined : value)).digest("hex"));
      const nearest = Math.min(...[...room.stage.targets, ...room.stage.barriers].map(o => o.bounds.min[2]));
      expect(2 * (nearest - 0.18 + 9.57) / PRISM_PROFILES.expert.speed).toBeGreaterThan(1);
      expect(room.stage.targets.length).toBe(6 + 2 * room.tier);
      expect(room.stage.barriers.length).toBeLessThanOrEqual(6);
      expect(room.stage.fields.length).toBeLessThanOrEqual(2);
    }
    expect(identities.size).toBe(96); expect(geometries.size).toBe(96);
    expect(readPrismEndlessRoom(recipe(1_000_000, 0)).tier).toBe(2);
  });

  it("reflects gate travel and local forces with the same geometry at every sampled tick", () => {
    for (const round of [1, 9, 17]) {
      const base = readPrismEndlessRoom(recipe(round, 0)).stage.barriers[0]!;
      const reflected = readPrismEndlessRoom(recipe(round, 1)).stage.barriers[0]!;
      for (const tick of [0, 1, 119, 300, 601, 10_000]) {
        const a = prismBarrierAt(base, tick), b = prismBarrierAt(reflected, tick);
        expect(b.min[0]).toBeCloseTo(-a.max[0]); expect(b.max[0]).toBeCloseTo(-a.min[0]);
      }
    }
    const base = readPrismEndlessRoom(recipe(19, 0)).stage.fields;
    const flipped = readPrismEndlessRoom(recipe(19, 3)).stage.fields;
    expect(flipped.map(f => f.force)).toEqual(base.map(f => [-f.force[0], -f.force[1], f.force[2]]));
  });

  it("caps random attempts, avoids recent recipes and selects an admitted fallback", () => {
    const first = generatePrismEndlessRoom(0, [], () => 0);
    expect(first.draws).toBe(1); expect(first.fallback).toBe(false);
    const recent = Array.from({ length: 4 }, (_, choice) => readPrismEndlessRoom(recipe(0, choice)).key);
    let calls = 0;
    const fallback = generatePrismEndlessRoom(4, recent, () => { calls++; return 0; });
    expect(calls).toBe(4); expect(fallback.draws).toBe(4); expect(fallback.fallback).toBe(true);
    expect(fallback.room.recipe).toEqual(recipe(4, 4)); expect(recent).not.toContain(fallback.room.key);
    const tape = [0, 0.125, 0.999999999], draw = () => tape.shift()!;
    const selected = generatePrismEndlessRoom(4, recent, draw);
    expect(selected.room.recipe.choice).toBe(7); expect(selected.draws).toBe(3); expect(selected.fallback).toBe(false);
    expect(readPrismEndlessRoom(JSON.stringify(selected.room.recipe))).toEqual(selected.room);
    expect(tape).toEqual([]);
  });

  it("rejects malformed recipes, histories, rounds and entropy without silent fallback", () => {
    for (const raw of [null, [], {}, { ...recipe(), version: "2.0.0" }, { ...recipe(), type: "foreign" },
      { ...recipe(), round: -1 }, { ...recipe(), round: 1.5 }, { ...recipe(), round: 1_000_001 },
      { ...recipe(), choice: 8 }, { ...recipe(), choice: NaN }, { ...recipe(), extra: true }, " ".repeat(2049)]) {
      expect(() => parsePrismEndlessRecipe(raw)).toThrow();
    }
    for (const history of [null, {}, ["unknown"], ["pe-banks-0-8"], ["pe-banks-3-0"],
      Array(5).fill("pe-banks-0-0"), ["pe-banks-0-0", "pe-banks-0-0"]]) {
      expect(() => generatePrismEndlessRoom(0, history as string[], () => 0)).toThrow();
    }
    for (const invalid of [-1, 1, NaN, Infinity, "0", null, undefined]) {
      expect(() => generatePrismEndlessRoom(0, [], () => invalid as number)).toThrow("invalid-prism-entropy");
    }
    expect(() => generatePrismEndlessRoom(-1, [], () => 0)).toThrow();
    expect(() => generatePrismEndlessRoom(0, [], null as any)).toThrow();
  });

  it("returns detached geometry and recipes", () => {
    const a = readPrismEndlessRoom(recipe(2, 0)), b = structuredClone(a);
    a.recipe.round = 123; a.stage.targets[0]!.bounds.min[0] = 999; a.stage.barriers.length = 0;
    expect(readPrismEndlessRoom(recipe(2, 0))).toEqual(b);
  });

});
