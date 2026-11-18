import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { listPrismChallenges, readPrismChallenge } from "../src/games/prism/challenges.js";
import { createPrismRules, parsePrismStage, PRISM_PROFILES, type PrismStage } from "../src/games/prism/rules.js";
import { reachablePrismTargets } from "./helpers/prism-clearance.js";

const ids = Array.from({ length: 30 }, (_, i) => `pb-${String(i + 1).padStart(2, "0")}`);
const signature = (stage: PrismStage) => createHash("sha256").update(JSON.stringify({
  targets: stage.targets.map(t => [t.bounds, t.health, t.opens.map(id => stage.barriers.findIndex(b => b.id === id))]).sort(),
  barriers: stage.barriers.map(b => [b.bounds, b.motion]).sort(), fields: stage.fields.map(f => [f.bounds, f.force]).sort(),
})).digest("hex");

it("provides thirty ordered, individually distinct candidate geometries, independent of their labels", () => {
  expect(listPrismChallenges()).toEqual(ids);
  expect(new Set(ids.map(id => signature(readPrismChallenge(id)))).size).toBe(30);
  expect(() => readPrismChallenge("pb-00")).toThrow("unknown-prism-challenge");
  expect(() => readPrismChallenge("__proto__")).toThrow("unknown-prism-challenge");
  expect(() => readPrismChallenge("pb-01 ")).toThrow("unknown-prism-challenge");
});

it("returns detached geometry and identities so one session cannot alter another", () => {
  const stage = readPrismChallenge("pb-29"), original = structuredClone(stage);
  stage.targets[0]!.bounds.min[0] = 900; stage.barriers.length = 0; stage.fields[0]!.force[0] = 900;
  const listed = listPrismChallenges(); listed.length = 0;
  expect(readPrismChallenge("pb-29")).toEqual(original);
  expect(listPrismChallenges()).toEqual(ids);
});

it("implements the authored mechanic progression and actual depth/height choices", () => {
  for (const id of ids) {
    const stage = readPrismChallenge(id);
    expect(new Set(stage.targets.map(t => t.bounds.min[2])).size).toBeGreaterThanOrEqual(2);
    expect(new Set(stage.targets.map(t => t.bounds.min[1])).size).toBeGreaterThanOrEqual(2);
    expect(stage.targets.length).toBeGreaterThanOrEqual(5);
  }
  expect(readPrismChallenge("pb-06").targets.filter(t => t.health === 2).length).toBeGreaterThanOrEqual(2);
  for (const id of ["pb-07", "pb-08", "pb-09", "pb-10", "pb-21", "pb-22", "pb-25", "pb-29"])
    expect(readPrismChallenge(id).fields.length).toBeGreaterThan(0);
  for (const id of ["pb-11", "pb-12", "pb-13", "pb-14", "pb-21", "pb-23", "pb-27", "pb-29"])
    expect(readPrismChallenge(id).barriers.some(b => b.motion !== null)).toBe(true);
  for (const id of ["pb-15", "pb-16", "pb-17", "pb-18", "pb-22", "pb-26", "pb-27", "pb-29", "pb-30"])
    expect(readPrismChallenge(id).targets.some(t => t.opens.length > 0)).toBe(true);
  expect(readPrismChallenge("pb-09").fields.map(f => Math.sign(f.force[0]))).toEqual([-1, 1]);
  expect(new Set(readPrismChallenge("pb-13").barriers.filter(b => b.motion).map(b => b.motion!.periodTicks)).size).toBe(2);
  expect(readPrismChallenge("pb-17").targets.filter(t => t.opens.length).length).toBe(3);
});

describe.each(ids)("candidate %s", id => {
  it("passes strict solids/relay validation and bounded sphere-clearance screening", () => {
    const stage = readPrismChallenge(id);
    expect(parsePrismStage(stage)).toEqual(stage);
    expect(JSON.stringify(stage).length).toBeLessThan(64 * 1024);
    expect([...reachablePrismTargets(stage)].sort()).toEqual(stage.targets.map(t => t.id).sort());
  });

  it("starts, launches and restores deterministically in actual solo/co-op rules for every profile", () => {
    const stage = readPrismChallenge(id);
    for (const profile of Object.keys(PRISM_PROFILES) as (keyof typeof PRISM_PROFILES)[]) {
      for (const slots of [["a"], ["a", "b"]]) {
        const rules = createPrismRules(stage, slots, profile);
        let state = rules.initialState();
        for (let tick = 0; tick < 120; tick++) state = rules.step(state, slots.map((slot, i) => ({
          slot, x: i ? 0.4 : -0.4, y: i ? -0.3 : 0.3, launch: tick === 20,
        })));
        let restored = rules.parseState(JSON.parse(JSON.stringify(state)));
        for (let tick = 0; tick < 30; tick++) {
          state = rules.step(state, []); restored = rules.step(restored, []);
          expect(restored).toEqual(state);
        }
        expect(state.tick).toBe(150);
        expect(state.phase).toBe("playing");
      }
    }
  }, 30_000);
});

it("does not mistake a sealed pocket or self-locked relay for a clearance route", () => {
  const stage: PrismStage = {
    type: "prismStage", version: "1.0.0", id: "sealed",
    targets: [{ id: "inside", health: 1, opens: ["front"], bounds: { min: [-0.5, -0.5, 2.5], max: [0.5, 0.5, 3.5] } }],
    barriers: [
      { id: "left", bounds: { min: [-2.4, -2.5, 0.5], max: [-2, 2.5, 5.5] }, motion: null },
      { id: "right", bounds: { min: [2, -2.5, 0.5], max: [2.4, 2.5, 5.5] }, motion: null },
      { id: "bottom", bounds: { min: [-1.95, -2.4, 0.5], max: [1.95, -2, 5.5] }, motion: null },
      { id: "top", bounds: { min: [-1.95, 2, 0.5], max: [1.95, 2.4, 5.5] }, motion: null },
      { id: "front", bounds: { min: [-1.95, -1.95, 0.6], max: [1.95, 1.95, 1] }, motion: null },
      { id: "back", bounds: { min: [-1.95, -1.95, 5], max: [1.95, 1.95, 5.4] }, motion: null },
    ], fields: [],
  };
  expect(reachablePrismTargets(parsePrismStage(stage)).size).toBe(0);
  stage.barriers = stage.barriers.filter(b => b.id !== "front"); stage.targets[0]!.opens = [];
  expect([...reachablePrismTargets(parsePrismStage(stage))]).toEqual(["inside"]);
});
