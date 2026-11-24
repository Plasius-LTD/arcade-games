import { createSchema, field } from "@plasius/schema";
import { GAME_IDS, type GameId } from "./identities.js";
import { bindingShape, distinct, exact, parseRecord, reference, slug } from "./validation.js";
import { parseManifest, type EvidenceReference } from "./manifest.js";
import type { ContentBinding } from "./content.js";
import { parseEntry, type GameEntry } from "./entry.js";
import { inspectGameEvidence } from "./qualification.js";

/** An explicit release selection. Parsing cannot approve it or authenticate evidence. */
export interface ReleaseBatch {
  type: "arcadeReleaseBatch"; version: "1.0.0"; id: string;
  members: (ContentBinding & { artifact: EvidenceReference })[];
}
/** Structural diagnostics only; the host retains all access and evidence authority. */
export interface ReleaseBatchInspection {
  batchId: string; structuralGaps: string[];
  games: { gameId: GameId; structuralGaps: string[] }[];
}
export const MAX_RELEASE_BATCH_BYTES = 16 * 1024;
const batchSchema = createSchema({ id: slug(),
  members: field.array(field.object({ ...bindingShape, artifact: reference() })).min(1).max(GAME_IDS.length),
}, "arcadeReleaseBatch", exact);

/** Parse a detached, nonempty selection with exact game/version/artifact bindings. */
export function parseReleaseBatch(raw: unknown): ReleaseBatch {
  const value = parseRecord<ReleaseBatch>(raw, batchSchema, MAX_RELEASE_BATCH_BYTES);
  if (!distinct(value.members.map(member => member.gameId))) throw new TypeError("duplicate-release-member");
  return value;
}

/**
 * Inspect exactly the selected entries without importing games or choosing a passing subset.
 * Empty diagnostics do not prove authentic/current evidence, enable flags or grant access.
 */
export function inspectReleaseBatch(rawBatch: unknown, rawEntries: unknown): ReleaseBatchInspection {
  const batch = parseReleaseBatch(rawBatch);
  if (!Array.isArray(rawEntries) || rawEntries.length > GAME_IDS.length) throw new TypeError("invalid-release-entries");
  const entries = new Map<GameId, GameEntry>(), gaps = new Set<string>();
  const selected = new Set(batch.members.map(member => member.gameId));
  for (const raw of rawEntries) {
    try {
      const manifest = parseManifest(raw?.manifest);
      const entry = parseEntry(raw, manifest.id);
      if (!selected.has(manifest.id)) gaps.add("unexpected-entry");
      if (entries.has(manifest.id)) gaps.add("duplicate-entry");
      else entries.set(manifest.id, entry);
    } catch { gaps.add("invalid-entry"); }
  }
  const games = batch.members.map(member => {
    const entry = entries.get(member.gameId);
    if (!entry) return { gameId: member.gameId, structuralGaps: ["missing-entry"] };
    const { manifest, content, qualification } = entry;
    const structuralGaps: string[] = [];
    if (member.rulesVersion !== manifest.rulesVersion || member.contentVersion !== manifest.contentVersion) structuralGaps.push("version-binding");
    if (member.artifact.id !== manifest.implementation.artifact?.id || member.artifact.sha256 !== manifest.implementation.artifact?.sha256) structuralGaps.push("artifact-binding");
    structuralGaps.push(...inspectGameEvidence(manifest, content, qualification).structuralGaps);
    return { gameId: member.gameId, structuralGaps };
  });
  if (games.some(game => game.structuralGaps.length > 0)) gaps.add("incomplete-batch");
  return { batchId: batch.id, structuralGaps: [...gaps].sort(), games };
}
