import { createSchema, field } from "@plasius/schema";
import { bindingShape, distinct, exact, integer, parseRecord, reference, slug } from "./validation.js";
import { parseManifest, type EvidenceReference, type GameManifest } from "./manifest.js";
import { parseContentInventory, type ContentBinding } from "./content.js";

/** The host authenticates the current evidence source; this record contains no reviewer identity. */
export interface GameQualification extends ContentBinding {
  type: "arcadeQualification"; version: "1.0.0"; artifact: EvidenceReference;
  humanPlay: { review: EvidenceReference; activeMinutes: number; touchMinutes: number; desktopParity: boolean; independentDepthApproval: boolean } | null;
  devices: { review: EvidenceReference; passed: boolean } | null;
  accessibility: { review: EvidenceReference; standard: "wcag-2.2-aa"; passed: boolean } | null;
  authority: { review: EvidenceReference; modes: string[]; passed: boolean } | null;
  delivery: { review: EvidenceReference; mainCd: boolean; secretRefs: boolean; publicArtifacts: boolean } | null;
}
export const MAX_QUALIFICATION_BYTES = 16 * 1024;
const qualificationSchema = createSchema({ ...bindingShape, artifact: reference(),
  humanPlay: field.object({ review: reference(), activeMinutes: integer(0, 100_000), touchMinutes: integer(0, 100_000), desktopParity: field.boolean(), independentDepthApproval: field.boolean() }).optional(),
  devices: field.object({ review: reference(), passed: field.boolean() }).optional(),
  accessibility: field.object({ review: reference(), standard: field.string().enum(["wcag-2.2-aa"]), passed: field.boolean() }).optional(),
  authority: field.object({ review: reference(), modes: field.array(slug()).min(1).max(8), passed: field.boolean() }).optional(),
  delivery: field.object({ review: reference(), mainCd: field.boolean(), secretRefs: field.boolean(), publicArtifacts: field.boolean() }).optional(),
}, "arcadeQualification", exact);
/** Parse evidence claims only; validation cannot authenticate a review or grant production access. */
export function parseQualification(raw: unknown): GameQualification {
  const value = parseRecord<GameQualification>(raw, qualificationSchema, MAX_QUALIFICATION_BYTES);
  for (const key of ["humanPlay", "devices", "accessibility", "authority", "delivery"] as const) value[key] ??= null;
  if ((value.humanPlay && value.humanPlay.touchMinutes > value.humanPlay.activeMinutes)
    || (value.authority && !distinct(value.authority.modes))) throw new TypeError("invalid-game-qualification");
  return value;
}
function matches(manifest: GameManifest, value: ContentBinding): void {
  if (manifest.id !== value.gameId || manifest.rulesVersion !== value.rulesVersion || manifest.contentVersion !== value.contentVersion) throw new TypeError("incompatible-game-evidence");
}
/** Structural gaps only. An empty list neither proves real evidence nor replaces the host's full launch barrier. */
export function inspectGameEvidence(rawManifest: unknown, rawContent: unknown, rawQualification: unknown): { structuralGaps: string[] } {
  const manifest = parseManifest(rawManifest);
  const content = rawContent === null ? null : parseContentInventory(rawContent);
  const qualification = rawQualification === null ? null : parseQualification(rawQualification);
  if (content) matches(manifest, content); if (qualification) matches(manifest, qualification);
  const gaps: string[] = [];
  if (manifest.implementation.status !== "implemented") gaps.push("implementation");
  if (manifest.rights.clearance !== "approved") gaps.push("rights");
  if (!content) gaps.push("content");
  else {
    if (!content.tutorial) gaps.push("tutorial");
    if (content.challenges.length < 30) gaps.push("authored-challenges");
    if (content.difficulties.length !== 3) gaps.push("difficulties");
    if (content.mastery.length === 0) gaps.push("mastery");
    if (!content.endless) gaps.push("endless");
  }
  if (qualification && (qualification.artifact.id !== manifest.implementation.artifact?.id || qualification.artifact.sha256 !== manifest.implementation.artifact?.sha256)) gaps.push("artifact-evidence");
  const human = qualification?.humanPlay;
  if (!human || human.activeMinutes < 600 || human.touchMinutes <= human.activeMinutes / 2 || !human.desktopParity || !human.independentDepthApproval) gaps.push("human-play");
  if (!qualification?.devices?.passed) gaps.push("devices");
  if (!qualification?.accessibility?.passed) gaps.push("accessibility");
  const authority = qualification?.authority;
  if (!authority?.passed || authority.modes.length !== manifest.modes.length || manifest.modes.some(m => !authority.modes.includes(m.id))) gaps.push("authority");
  const delivery = qualification?.delivery;
  if (!delivery?.mainCd || !delivery.secretRefs || !delivery.publicArtifacts) gaps.push("delivery");
  return { structuralGaps: gaps };
}
