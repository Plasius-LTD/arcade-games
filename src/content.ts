import { createSchema, field } from "@plasius/schema";
import { bindingShape, distinct, exact, parseRecord, reference, slug, translation } from "./validation.js";
import type { EvidenceReference } from "./manifest.js";
import type { GameId } from "./identities.js";

export interface ContentBinding { gameId: GameId; rulesVersion: string; contentVersion: string }
export type EndlessValidation = { kind: "puzzle"; validation: EvidenceReference; method: "solver" | "solution-witness" }
  | { kind: "action"; validation: EvidenceReference; guarantees: ("bounded-difficulty" | "reachable-objectives" | "safe-starts" | "reaction-time")[] };
/** References to actual authored artifacts; counts/seeds alone are not playable content. */
export interface ContentInventory extends ContentBinding {
  type: "arcadeContentInventory"; version: "1.0.0"; tutorial: EvidenceReference | null;
  challenges: { id: string; kind: "authored"; artifact: EvidenceReference; objectives: string[] }[];
  difficulties: { id: "accessible" | "standard" | "expert"; profile: EvidenceReference }[];
  mastery: { id: string; objectiveKey: string }[]; endless: EndlessValidation | null;
}
export const MAX_CONTENT_BYTES = 256 * 1024;
const guarantees = ["bounded-difficulty", "reachable-objectives", "safe-starts", "reaction-time"];
const contentSchema = createSchema({ ...bindingShape, tutorial: reference().optional(),
  challenges: field.array(field.object({ id: slug(), kind: field.string().enum(["authored"]), artifact: reference(), objectives: field.array(slug()).min(1).max(16) })).max(300),
  difficulties: field.array(field.object({ id: field.string().enum(["accessible", "standard", "expert"]), profile: reference() })).max(3),
  mastery: field.array(field.object({ id: slug(), objectiveKey: translation() })).max(100),
  endless: field.object({ kind: field.string().enum(["action", "puzzle"]), validation: reference(), method: field.string().enum(["solver", "solution-witness"]).optional(),
    guarantees: field.array(field.string().enum(guarantees)).max(4).optional() }).optional(),
}, "arcadeContentInventory", exact);
/** Incomplete inventories stay incomplete; malformed/future records are never repaired or replaced. */
export function parseContentInventory(raw: unknown): ContentInventory {
  const value = parseRecord<ContentInventory>(raw, contentSchema, MAX_CONTENT_BYTES);
  value.tutorial ??= null; value.endless ??= null;
  if (!distinct(value.challenges.map(c => c.id)) || !distinct(value.challenges.map(c => c.artifact.id))
    || !distinct(value.challenges.map(c => c.artifact.sha256)) || value.challenges.some(c => !distinct(c.objectives))
    || !distinct(value.difficulties.map(d => d.id)) || !distinct(value.difficulties.map(d => d.profile.id)) || !distinct(value.difficulties.map(d => d.profile.sha256))
    || !distinct(value.mastery.map(m => m.id)) || !distinct(value.mastery.map(m => m.objectiveKey))
    || value.mastery.some(m => !m.objectiveKey.startsWith(`arcade.games.${value.gameId}.mastery.`))) throw new TypeError("invalid-game-content");
  if (value.endless) {
    const e = value.endless as EndlessValidation & { guarantees?: string[]; method?: string };
    if (e.kind === "action" ? e.method !== undefined || e.guarantees?.length !== 4 || !distinct(e.guarantees)
      : e.guarantees !== undefined || e.method === undefined) throw new TypeError("invalid-endless-validation");
  }
  return value;
}
