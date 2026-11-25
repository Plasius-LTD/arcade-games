import { createSchema, field } from "@plasius/schema";
import { distinct, exact, integer, parseRecord } from "../../validation.js";
import { listPrismChallenges, readPrismChallenge } from "./challenges.js";
import { createPrismRules, type PrismProfileId } from "./rules.js";

/** Private game facts. Shape validation does not authenticate their history. */
export interface PrismMasteryProgress {
  type: "prismMasteryProgress"; version: "1.0.0";
  records: { challengeId: string; profile: PrismProfileId; players: 1 | 2; clean: boolean; shared: boolean }[];
}
/** Read-only objective projection for the future host-owned achievement UI. */
export interface PrismMasteryGoal {
  id: string; objectiveKey: string; current: number; target: number; complete: boolean;
}
const profiles = ["accessible", "standard", "expert"] as const;
const challengeIds = listPrismChallenges();
const progressSchema = createSchema({ records: field.array(field.object({
  challengeId: field.string().enum(challengeIds), profile: field.string().enum(profiles),
  players: integer(1, 2), clean: field.boolean(), shared: field.boolean(),
})).max(180) }, "prismMasteryProgress", exact);
const key = (record: PrismMasteryProgress["records"][number]) => `${record.challengeId}/${record.profile}/${record.players}`;

/** Strict, canonical, detached facts; no silent repair or unknown-stage credit. */
export function parsePrismMasteryProgress(raw: unknown): PrismMasteryProgress {
  const progress = parseRecord<PrismMasteryProgress>(raw, progressSchema, 64 * 1024);
  if (!distinct(progress.records.map(key)) || progress.records.some(r => r.players === 1 && r.shared))
    throw new TypeError("invalid-prism-mastery");
  progress.records.sort((a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);
  return progress;
}

/** Fresh empty game-owned progress; persistence belongs to the host. */
export function createPrismMasteryProgress(): PrismMasteryProgress {
  return { type: "prismMasteryProgress", version: "1.0.0", records: [] };
}

/** Finite distinct objectives; elapsed time and repeated clears never add credit. */
export function inspectPrismMastery(raw: unknown): PrismMasteryGoal[] {
  const { records } = parsePrismMasteryProgress(raw);
  const goal = (id: string, identities: string[], target: number): PrismMasteryGoal => {
    const current = new Set(identities).size;
    return { id, objectiveKey: `arcade.games.prism-breaker.mastery.${id}`, current, target, complete: current === target };
  };
  return [
    ...profiles.map(profile => goal(`campaign-${profile}`, records.filter(r => r.profile === profile).map(r => r.challengeId), 30)),
    goal("clean-campaign", records.filter(r => r.clean).map(r => r.challengeId), 30),
    goal("shared-campaign", records.filter(r => r.shared).map(r => r.challengeId), 30),
    goal("all-profiles", records.map(r => `${r.challengeId}/${r.profile}`), 90),
  ];
}

/** Pure monotonic projection of a host-trusted terminal result onto current progress.
 * The host must authenticate outcomes and commit against current account state;
 * this function is not a score-submission endpoint or transaction store.
 */
export function applyPrismChallengeMastery(rawProgress: unknown, challengeId: string, slots: readonly string[],
  profile: PrismProfileId, rawState: unknown): { progress: PrismMasteryProgress; unlocked: string[] } {
  const before = parsePrismMasteryProgress(rawProgress);
  const final = createPrismRules(readPrismChallenge(challengeId), slots, profile).parseState(rawState);
  if (final.phase !== "stage-complete") throw new TypeError("prism-mastery-requires-completion");
  const next = { challengeId, profile, players: slots.length as 1 | 2,
    clean: final.drains === 0, shared: slots.length === 2 && final.paddleHits.every(n => n > 0) };
  const previous = before.records.find(r => key(r) === key(next));
  if (previous) { next.clean ||= previous.clean; next.shared ||= previous.shared; }
  const progress = parsePrismMasteryProgress({ ...before, records: [...before.records.filter(r => key(r) !== key(next)), next] });
  const completed = new Set(inspectPrismMastery(before).filter(g => g.complete).map(g => g.id));
  return { progress, unlocked: inspectPrismMastery(progress).filter(g => g.complete && !completed.has(g.id)).map(g => g.id) };
}
