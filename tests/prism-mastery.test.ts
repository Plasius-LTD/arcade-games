import { describe, expect, it } from "vitest";
import { applyPrismChallengeMastery, createPrismMasteryProgress, inspectPrismMastery, parsePrismMasteryProgress } from "../src/games/prism/mastery.js";
import { listPrismChallenges, readPrismChallenge } from "../src/games/prism/challenges.js";
import { createPrismRules, PRISM_PROFILES, type PrismProfileId } from "../src/games/prism/rules.js";
import { completePrismChallenge } from "./helpers/prism-completion.js";

const profiles = ["accessible", "standard", "expert"] as const;
const fact = (challengeId = "pb-01", profile: PrismProfileId = "standard", players: 1 | 2 = 1) =>
  ({ challengeId, profile, players, clean: false, shared: false });
const envelope = (records = [fact()]) => ({ type: "prismMasteryProgress", version: "1.0.0", records });
const goals = (progress: unknown) => Object.fromEntries(inspectPrismMastery(progress).map(goal => [goal.id, goal]));

// Policy fixtures are structurally valid terminal states, not play-history evidence.
function terminal(id = "pb-01", slots = ["one"], profile: PrismProfileId = "standard", clean = true, shared = false) {
  const stage = readPrismChallenge(id), state = createPrismRules(stage, slots, profile).initialState();
  state.phase = "stage-complete"; state.tick = 10_000;
  state.health.forEach(h => { h.remaining = 0; });
  state.hits = stage.targets.reduce((sum, t) => sum + t.health, 0);
  state.score = stage.targets.reduce((sum, t) => sum + 100 + 25 * (t.health - 1), 0);
  state.drains = clean ? 0 : 1; state.lives = PRISM_PROFILES[profile].lives - state.drains;
  state.paddleHits = slots.map((_, index) => index === 0 || shared ? 1 : 0);
  return state;
}

describe("private Prism challenge mastery requirements", () => {
  it("starts with six finite incomplete goals and stable instruction keys", () => {
    const progress = createPrismMasteryProgress(), list = inspectPrismMastery(progress);
    expect(progress).toEqual(envelope([])); expect(list).toHaveLength(6);
    expect(list.map(g => g.id)).toEqual(["campaign-accessible", "campaign-standard", "campaign-expert", "clean-campaign", "shared-campaign", "all-profiles"]);
    expect(list.map(g => g.target)).toEqual([30, 30, 30, 30, 30, 90]);
    for (const goal of list) {
      expect(goal.current).toBe(0); expect(goal.complete).toBe(false);
      expect(goal.objectiveKey).toBe(`arcade.games.prism-breaker.mastery.${goal.id}`);
    }
  });

  it("counts distinct challenges and profile pairs, without double-counting modes", () => {
    const all = listPrismChallenges().flatMap(id => profiles.flatMap(profile => [
      { ...fact(id, profile, 1), clean: true }, { ...fact(id, profile, 2), shared: true },
    ]));
    const complete = goals(envelope(all));
    expect(Object.values(complete).every(g => g.complete && g.current === g.target)).toBe(true);
    const partial = goals(envelope([fact(), fact("pb-01", "standard", 2), { ...fact("pb-02", "expert"), clean: true }]));
    expect(partial["campaign-accessible"]!.current).toBe(0);
    expect(partial["campaign-standard"]!.current).toBe(1);
    expect(partial["campaign-expert"]!.current).toBe(1);
    expect(partial["all-profiles"]!.current).toBe(2);
    expect(partial["clean-campaign"]!.current).toBe(1);
    expect(partial["shared-campaign"]!.current).toBe(0);
  });

  it("unlocks only on crossing the objective and is idempotent after duplicate projection and JSON restore", () => {
    const before = envelope(listPrismChallenges().slice(0, 29).map(id => fact(id)));
    const final = terminal("pb-30", ["one"], "standard", false);
    const applied = applyPrismChallengeMastery(before, "pb-30", ["one"], "standard", final);
    expect(applied.unlocked).toEqual(["campaign-standard"]);
    const restored = parsePrismMasteryProgress(JSON.stringify(applied.progress));
    expect(applyPrismChallengeMastery(restored, "pb-30", ["one"], "standard", final)).toEqual({ progress: applied.progress, unlocked: [] });
    expect(before.records).toHaveLength(29);
  });

  it("merges clean and shared accomplishments monotonically without fabricating either", () => {
    const slots = ["one", "two"], initial = createPrismMasteryProgress();
    const weak = applyPrismChallengeMastery(initial, "pb-01", slots, "standard", terminal("pb-01", slots, "standard", false));
    expect(weak.progress.records).toEqual([fact("pb-01", "standard", 2)]);
    const strong = applyPrismChallengeMastery(weak.progress, "pb-01", slots, "standard", terminal("pb-01", slots, "standard", true, true));
    expect(strong.progress.records).toEqual([{ ...fact("pb-01", "standard", 2), clean: true, shared: true }]);
    const repeated = applyPrismChallengeMastery(strong.progress, "pb-01", slots, "standard", terminal("pb-01", slots, "standard", false));
    expect(repeated.progress).toEqual(strong.progress); expect(repeated.unlocked).toEqual([]);
    expect(goals(weak.progress)["shared-campaign"]!.current).toBe(0);
    expect(goals(strong.progress)["shared-campaign"]!.current).toBe(1);
  });

  it("cannot award from idle, ready, lost, malformed or foreign outcomes", () => {
    const progress = createPrismMasteryProgress(), rules = createPrismRules(readPrismChallenge("pb-01"), ["one"], "standard");
    const ready = rules.initialState(); ready.tick = 10_000;
    const playing = rules.step(rules.initialState(), [{ slot: "one", x: 0, y: 0, launch: true }]);
    const lost = rules.initialState(); lost.phase = "lost"; lost.tick = 100; lost.drains = 4; lost.lives = 0;
    for (const state of [ready, playing, lost, null, { ...terminal(), score: 1 }, { ...terminal(), extra: true }])
      expect(() => applyPrismChallengeMastery(progress, "pb-01", ["one"], "standard", state)).toThrow();
    for (const id of ["pb-31", "private-endless-room", "launch-return"])
      expect(() => applyPrismChallengeMastery(progress, id, ["one"], "standard", terminal())).toThrow();
    expect(() => applyPrismChallengeMastery(progress, "pb-02", ["one"], "standard", terminal())).toThrow();
    expect(() => applyPrismChallengeMastery(progress, "pb-01", ["two"], "standard", terminal())).toThrow();
    expect(() => applyPrismChallengeMastery(progress, "pb-01", ["one"], "expert", terminal())).toThrow();
    expect(progress.records).toEqual([]);
  });

  it("strictly bounds canonical progress and rejects conflicting identities or invented accomplishments", () => {
    for (const raw of [null, [], {}, { ...envelope(), type: "foreign" }, { ...envelope(), version: "2.0.0" },
      { ...envelope(), extra: true }, envelope([fact(), fact()]), envelope([{ ...fact(), shared: true }]),
      envelope([{ ...fact(), challengeId: "pb-00" }]), envelope([{ ...fact(), profile: "unknown" } as any]),
      envelope([{ ...fact(), players: 3 } as any]), envelope([{ ...fact(), clean: 1 } as any]),
      envelope([{ ...fact(), score: 100 } as any]), envelope(Array(181).fill(fact())), " ".repeat(65537)])
      expect(() => parsePrismMasteryProgress(raw)).toThrow();
    const reversed = envelope([fact("pb-03", "expert", 2), fact("pb-01"), fact("pb-03", "accessible")]);
    const parsed = parsePrismMasteryProgress(reversed);
    expect(parsed.records.map(r => `${r.challengeId}/${r.profile}/${r.players}`)).toEqual(["pb-01/standard/1", "pb-03/accessible/1", "pb-03/expert/2"]);
    expect(parsePrismMasteryProgress(JSON.stringify(parsed))).toEqual(parsed);
    parsed.records[0]!.clean = true;
    expect(reversed.records.every(r => !r.clean)).toBe(true);
    const first = inspectPrismMastery(reversed); first[0]!.current = 999;
    expect(inspectPrismMastery(reversed)[0]!.current).toBe(1);
  });

  it.each(profiles.flatMap(profile => [["one"], ["one", "two"]].map(slots => ({ profile, slots }))))(
    "projects real completion and restored mastery for $profile/$slots", ({ profile, slots }) => {
      const completed = completePrismChallenge(readPrismChallenge("pb-01"), profile, slots);
      expect(completed.final.phase).toBe("stage-complete");
      const applied = applyPrismChallengeMastery(createPrismMasteryProgress(), "pb-01", slots, profile, completed.final);
      expect(applied.progress.records).toEqual([{ ...fact("pb-01", profile, slots.length as 1 | 2),
        clean: completed.final.drains === 0, shared: slots.length === 2 && completed.final.paddleHits.every(n => n > 0) }]);
      expect(goals(applied.progress)[`campaign-${profile}`]!.current).toBe(1);
      expect(applyPrismChallengeMastery(JSON.stringify(applied.progress), "pb-01", slots, profile,
        JSON.stringify(completed.final))).toEqual({ progress: applied.progress, unlocked: [] });
    }, 120_000,
  );
});
