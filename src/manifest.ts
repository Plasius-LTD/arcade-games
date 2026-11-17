import { createSchema, field } from "@plasius/schema";
import { GAME_IDS, type GameCategory, type GameId } from "./identities.js";
import { distinct, exact, integer, parseRecord, reference, slug, translation } from "./validation.js";

/** Opaque public evidence reference, never private documents, identities or credentials. */
export interface EvidenceReference { id: string; sha256: string }
export interface GameMode { id: string; kind: "solo" | "co-op" | "versus" | "duel" | "doubles" | "race" | "territory" | "tournament"; minPlayers: number; maxPlayers: number }
/** Metadata describes a title; it neither proves readiness nor confers access. */
export interface GameManifest {
  type: "arcadeGameManifest"; version: "1.0.0"; id: GameId; workingTitle: string; category: GameCategory;
  titleKey: string; descriptionKey: string; objectivesKey: string; rulesVersion: string; contentVersion: string; flagKey: string;
  instructions: { touch: string; keyboard: string; mouse: string };
  hardware: { renderer: "webgpu"; dimensions: "spatial-3d"; inputs: ["touch", "keyboard", "mouse"] };
  modes: GameMode[]; implementation: { status: "planned" | "implemented"; artifact: EvidenceReference | null };
  rights: { edition: "original"; recordId: string; clearance: "pending" | "approved" | "rejected"; approval: EvidenceReference | null; redistribution: "none" | "public" | "restricted" };
}
export const MAX_MANIFEST_BYTES = 16 * 1024;
const manifestSchema = createSchema({ id: field.string().enum(GAME_IDS), workingTitle: field.string().min(1).max(80).pattern(/^[A-Za-z0-9][A-Za-z0-9 '-]*$/),
  category: field.string().enum(["action", "shooter", "puzzle", "racing", "sport", "exploration"]),
  titleKey: translation(), descriptionKey: translation(), objectivesKey: translation(),
  rulesVersion: field.version().max(64), contentVersion: field.version().max(64), flagKey: translation(),
  instructions: field.object({ touch: translation(), keyboard: translation(), mouse: translation() }),
  hardware: field.object({ renderer: field.string().enum(["webgpu"]), dimensions: field.string().enum(["spatial-3d"]),
    inputs: field.array(field.string().enum(["touch", "keyboard", "mouse"])).min(3).max(3) }),
  modes: field.array(field.object({ id: slug(), kind: field.string().enum(["solo", "co-op", "versus", "duel", "doubles", "race", "territory", "tournament"]), minPlayers: integer(1, 4), maxPlayers: integer(1, 4) })).min(2).max(8),
  implementation: field.object({ status: field.string().enum(["planned", "implemented"]), artifact: reference().optional() }),
  rights: field.object({ edition: field.string().enum(["original"]), recordId: slug(), clearance: field.string().enum(["pending", "approved", "rejected"]), approval: reference().optional(), redistribution: field.string().enum(["none", "public", "restricted"]) }),
}, "arcadeGameManifest", exact);

/** Validate exact translation/flag identity, player ranges, rights and implementation evidence. */
export function parseManifest(raw: unknown): GameManifest {
  const value = parseRecord<GameManifest>(raw, manifestSchema, MAX_MANIFEST_BYTES);
  const prefix = `arcade.games.${value.id}`;
  value.implementation.artifact ??= null; value.rights.approval ??= null;
  if (value.titleKey !== `${prefix}.title` || value.descriptionKey !== `${prefix}.description` || value.objectivesKey !== `${prefix}.objectives`
    || value.flagKey !== `${prefix}.enabled` || value.rights.recordId !== `rights-${value.id}`
    || ["touch", "keyboard", "mouse"].some(input => value.instructions[input as keyof typeof value.instructions] !== `${prefix}.instructions.${input}`)
    || value.hardware.inputs.join(",") !== "touch,keyboard,mouse" || !distinct(value.modes.map(m => m.id))
    || value.modes[0]?.id !== "solo" || value.modes[0].kind !== "solo"
    || value.modes.some(m => m.minPlayers > m.maxPlayers || (m.kind === "solo" ? m.id !== "solo" || m.minPlayers !== 1 || m.maxPlayers !== 1 : m.minPlayers < 2))
    || (value.implementation.status === "implemented") !== (value.implementation.artifact !== null)
    || (value.rights.clearance === "approved") !== (value.rights.approval !== null)
    || (value.rights.redistribution === "public" && value.rights.clearance !== "approved")) throw new TypeError("invalid-game-manifest");
  return value;
}
