import { describe, expect, it } from "vitest";
import { readPrismEndlessRoom } from "../../src/games/prism/endless.js";
import { createPrismRules, PRISM_PROFILES, type PrismProfileId } from "../../src/games/prism/rules.js";
import { createPrismPresentation } from "../../src/games/prism/presentation.js";
import { completePrismChallenge } from "./prism-completion.js";

const recipe = (round: number, choice: number) => ({ type: "prismEndlessRecipe" as const, version: "1.0.0" as const, round, choice });

export function registerEndlessCompletions(rounds: readonly number[]) {
  describe("bounded original Prism endless rooms", () => {
    const rooms = rounds.flatMap(round => Array.from({ length: 8 }, (_, choice) => ({ round, choice })));
    const scenarios = rooms.flatMap(item => Object.keys(PRISM_PROFILES).flatMap(profile =>
      [["one"], ["one", "two"]].map(slots => ({ ...item, profile: profile as PrismProfileId, slots }))));
    it.each(scenarios)("completes room $round/$choice with $profile/$slots and exact restore", ({ round, choice, profile, slots }) => {
      const { stage } = readPrismEndlessRoom(recipe(round, choice));
      const result = completePrismChallenge(stage, profile, slots);
      expect(result.final.phase).toBe("stage-complete"); expect(result.final.lives).toBeGreaterThan(0);
      expect(result.final.health.every(t => t.remaining === 0)).toBe(true);
      expect(result.final.score).toBe(stage.targets.reduce((sum, t) => sum + 100 + 25 * (t.health - 1), 0));
      expect(result.ticks).toBeLessThanOrEqual(36_000);
      expect(completePrismChallenge(stage, profile, slots, Math.floor(result.ticks / 2))).toEqual(result);
      expect(createPrismRules(stage, slots, profile).step(result.final, [])).toEqual(result.final);
      expect(createPrismPresentation(stage, slots, profile).project(result.final).tick).toBe(result.final.tick);
    }, 120_000);
  });
}
