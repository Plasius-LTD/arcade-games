import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readPrismChallenge } from "../../src/games/prism/challenges.js";
import { createPrismRules, PRISM_PROFILES, type PrismProfileId } from "../../src/games/prism/rules.js";
import { completePrismChallenge } from "./prism-completion.js";

const witnesses = JSON.parse(readFileSync(new URL("../fixtures/prism-completion-witnesses.json", import.meta.url), "utf8")) as {
  kind: string;
  records: Record<string, { contentSha256: string; inputsSha256: string; finalSha256: string; ticks: number }>;
};
const scenarios = (Object.keys(PRISM_PROFILES) as PrismProfileId[]).flatMap(profile =>
  [["a"], ["a", "b"]].map(slots => ({ profile, slots, players: slots.length }))
);

export function registerCampaignCompletions(ids: readonly number[]) {
  describe.each(ids.map(id => `pb-${String(id).padStart(2, "0")}`))("controlled completion of %s", id => {
    it.each(scenarios)("finishes through bounded intentions in $profile with $players players, including restore", ({ profile, slots }) => {
      const stage = readPrismChallenge(id);
      const result = completePrismChallenge(stage, profile, slots);
      const { final, ...record } = result;
      expect(final.phase).toBe("stage-complete");
      expect(final.health.every(target => target.remaining === 0)).toBe(true);
      expect(final.lives).toBeGreaterThan(0);
      expect(final.hits).toBe(stage.targets.reduce((sum, target) => sum + target.health, 0));
      expect(final.score).toBe(stage.targets.reduce((sum, target) => sum + 100 + 25 * (target.health - 1), 0));
      expect(final.paddleHits.every(hits => hits > 0)).toBe(true);
      expect(final.tick).toBeLessThanOrEqual(36_000);
      expect(record).toEqual(witnesses.records[`${id}/${profile}/${slots.length}`]);

      const restored = completePrismChallenge(stage, profile, slots, Math.floor(final.tick / 2));
      expect(restored).toEqual(result);
      const rules = createPrismRules(stage, slots, profile);
      expect(rules.step(final, slots.map(slot => ({ slot, x: 1, y: -1, launch: true })))).toEqual(final);
    }, 120_000);
  });
}
