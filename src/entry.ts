import { parseManifest, type GameManifest, type GameMode } from "./manifest.js";
import { parseContentInventory, type ContentInventory } from "./content.js";
import { inspectGameEvidence, parseQualification, type GameQualification } from "./qualification.js";
import type { GameCategory, GameId } from "./identities.js";
/** A metadata/content entry is not a playable engine or an authorization decision. */
export interface GameEntry { manifest: GameManifest; content: ContentInventory | null; qualification: GameQualification | null }
/** Internal initial authoring record: explicitly no implementation, content or qualification claim. */
export function plannedManifest(id: GameId, workingTitle: string, category: GameCategory, onlineModes: GameMode[]): GameManifest {
  const prefix = `arcade.games.${id}`;
  return parseManifest({ type: "arcadeGameManifest", version: "1.0.0", id, workingTitle, category,
    titleKey: `${prefix}.title`, descriptionKey: `${prefix}.description`, objectivesKey: `${prefix}.objectives`,
    rulesVersion: "1.0.0", contentVersion: "1.0.0", flagKey: `${prefix}.enabled`,
    instructions: { touch: `${prefix}.instructions.touch`, keyboard: `${prefix}.instructions.keyboard`, mouse: `${prefix}.instructions.mouse` },
    hardware: { renderer: "webgpu", dimensions: "spatial-3d", inputs: ["touch", "keyboard", "mouse"] },
    modes: [{ id: "solo", kind: "solo", minPlayers: 1, maxPlayers: 1 }, ...onlineModes],
    implementation: { status: "planned", artifact: null },
    rights: { edition: "original", recordId: `rights-${id}`, clearance: "pending", approval: null, redistribution: "none" },
  });
}
export function parseEntry(raw: unknown, id: GameId): GameEntry {
  if (!raw || typeof raw !== "object") throw new TypeError("invalid-game-entry");
  const value = raw as GameEntry;
  const manifest = parseManifest(value.manifest);
  if (manifest.id !== id) throw new TypeError("incompatible-game-entry");
  const content = value.content === null ? null : parseContentInventory(value.content);
  const qualification = value.qualification === null ? null : parseQualification(value.qualification);
  inspectGameEvidence(manifest, content, qualification);
  return { manifest, content, qualification };
}
