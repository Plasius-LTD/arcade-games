import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PRISM_TUTORIAL_IDS, readPrismTutorial } from "../src/games/prism/tutorial.js";
import { parsePrismStage, createPrismRules, PRISM_PROFILES } from "../src/games/prism/rules.js";
import { createPrismPresentation } from "../src/games/prism/presentation.js";
import { listPrismChallenges, readPrismChallenge } from "../src/games/prism/challenges.js";
import { completePrismChallenge } from "./helpers/prism-completion.js";

describe("six original private Prism tutorial lessons", () => {
  it("authors distinct lesson geometry, ordered mechanics and owned instruction keys", () => {
    expect(PRISM_TUTORIAL_IDS).toEqual(["pt-01", "pt-02", "pt-03", "pt-04", "pt-05", "pt-06"]);
    expect(Object.isFrozen(PRISM_TUTORIAL_IDS)).toBe(true);
    const lessons = PRISM_TUTORIAL_IDS.map(readPrismTutorial);
    expect(lessons.map(lesson => lesson.mechanic)).toEqual(["launch-return", "depth-aiming", "wall-banks", "armour-relay", "moving-gate", "gravity"]);
    const geometry = (stage: unknown) => createHash("sha256").update(JSON.stringify(stage,
      (key, value) => key === "id" ? undefined : value)).digest("hex");
    const hashes = lessons.map(lesson => geometry(lesson.stage));
    expect(new Set(hashes).size).toBe(6);
    const campaign = listPrismChallenges().map(id => geometry(readPrismChallenge(id)));
    expect(hashes.some(hash => campaign.includes(hash))).toBe(false);
    for (const lesson of lessons) {
      expect(lesson.stage.id).toBe(lesson.id);
      expect(parsePrismStage(lesson.stage)).toEqual(lesson.stage);
      expect(lesson.instructionKey).toBe(`arcade.games.prism-breaker.tutorial.${lesson.id}.instruction`);
      expect(lesson.objectiveKey).toBe(`arcade.games.prism-breaker.tutorial.${lesson.id}.objective`);
      expect(lesson.stage.targets.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("introduces mechanics gradually with readable targets and a real relay obstruction", () => {
    const lessons = PRISM_TUTORIAL_IDS.map(readPrismTutorial);
    for (const lesson of lessons.slice(0, 2)) {
      expect(lesson.stage.barriers).toEqual([]); expect(lesson.stage.fields).toEqual([]);
      expect(lesson.stage.targets.every(target => target.health === 1 && target.opens.length === 0)).toBe(true);
    }
    const depth = lessons[1]!.stage.targets.map(target => target.bounds.min);
    for (const axis of [0, 1, 2]) expect(new Set(depth.map(position => position[axis])).size).toBe(3);
    expect(lessons[2]!.stage.barriers).toHaveLength(1);
    const relay = lessons[3]!.stage;
    const key = relay.targets.find(target => target.id === "relay")!, door = relay.barriers.find(barrier => barrier.id === "door")!;
    expect(key.health).toBe(2); expect(key.opens).toEqual([door.id]);
    expect(key.bounds.max[2]).toBeLessThan(door.bounds.min[2]);
    expect(relay.targets.find(target => target.id === "beyond")!.bounds.min[2]).toBeGreaterThan(door.bounds.max[2]);
    expect(relay.barriers.map(barrier => barrier.id)).toEqual(["back", "bottom", "door", "left", "right", "top"]);
    expect(lessons[4]!.stage.barriers[0]!.motion).not.toBeNull();
    expect(lessons[5]!.stage.fields).toHaveLength(1);
  });

  it("keeps the lesson's relay door solid until both armour contacts complete", () => {
    const stage = readPrismTutorial("pt-04").stage, rules = createPrismRules(stage, ["one"], "standard");
    let state = rules.initialState(); state.phase = "playing";
    for (let hits = 0; hits <= 2; hits++) {
      state.ball.position = [1, -0.5, 3.65]; state.ball.velocity = [0, 0, 9];
      const throughDoor = rules.step(state, []);
      expect(Math.sign(throughDoor.ball.velocity[2])).toBe(hits === 2 ? 1 : -1);
      if (hits < 2) {
        state.ball.position = [-3, 2, -0.5]; state.ball.velocity = [0, 0, 9];
        state = rules.step(state, []);
      }
    }
  });

  it("detaches all authored geometry and rejects unknown lesson identities", () => {
    const first = readPrismTutorial("pt-01"), expected = structuredClone(first);
    first.stage.targets[0]!.bounds.min[0] = 99; first.stage.targets.length = 0;
    first.instructionKey = "mutated";
    expect(readPrismTutorial("pt-01")).toEqual(expected);
    for (const id of ["pb-01", "pt-00", "pt-07", "toString", "../private", null, 1]) {
      expect(() => readPrismTutorial(id as string)).toThrow("unknown-prism-tutorial");
    }
  });

  const scenarios = PRISM_TUTORIAL_IDS.flatMap(id => Object.keys(PRISM_PROFILES).flatMap(profile =>
    [["one"], ["one", "two"]].map(slots => ({ id, profile: profile as keyof typeof PRISM_PROFILES, slots }))));
  it.each(scenarios)("completes $id with $profile/$slots and preserves exact restore and projection", ({ id, profile, slots }) => {
    const { stage } = readPrismTutorial(id);
    const result = completePrismChallenge(stage, profile, slots);
    expect(result.final.phase).toBe("stage-complete");
    expect(result.final.lives).toBeGreaterThan(0);
    expect(result.ticks).toBeLessThanOrEqual(36_000);
    expect(result.final.health.every(target => target.remaining === 0)).toBe(true);
    expect(result.final.score).toBe(stage.targets.reduce((sum, target) => sum + 100 + 25 * (target.health - 1), 0));
    expect(completePrismChallenge(stage, profile, slots, Math.floor(result.ticks / 2))).toEqual(result);
    const rules = createPrismRules(stage, slots, profile);
    expect(rules.step(result.final, [])).toEqual(result.final);
    const view = createPrismPresentation(stage, slots, profile);
    expect(view.project(result.final).tick).toBe(result.final.tick);
    expect(view.readMeshes().length).toBeGreaterThan(0);
  }, 120_000);
});
