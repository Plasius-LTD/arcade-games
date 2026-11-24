import { describe, expect, it } from "vitest";
import { GAME_IDS, loadGameEntry, inspectReleaseBatch, parseReleaseBatch, MAX_RELEASE_BATCH_BYTES } from "../src/index.js";
import { contentFixture, evidence, manifestFixture, qualificationFixture } from "./fixtures.js";

// Synthetic structural claims only. These records are never production qualification.
function complete() {
  const manifest = manifestFixture();
  return { manifest: { ...manifest, implementation: { status: "implemented", artifact: evidence("implementation") },
    rights: { ...manifest.rights, clearance: "approved", approval: evidence("rights"), redistribution: "public" } },
  content: contentFixture(), qualification: qualificationFixture() };
}
const member = (entry = complete()) => ({ gameId: entry.manifest.id, rulesVersion: entry.manifest.rulesVersion,
  contentVersion: entry.manifest.contentVersion, artifact: entry.manifest.implementation.artifact });
const batch = () => ({ type: "arcadeReleaseBatch", version: "1.0.0", id: "first-batch", members: [member()] });

describe("explicit qualified release-batch structure", () => {
  it("supports a single selected title without granting authorization or requiring all 24", () => {
    expect(inspectReleaseBatch(batch(), [complete()])).toEqual({ batchId: "first-batch", structuralGaps: [],
      games: [{ gameId: "prism-breaker", structuralGaps: [] }] });
  });

  it("supports multiple and complete-catalogue batches in selected order", async () => {
    const entries = [];
    for (const id of GAME_IDS) {
      const loaded = await loadGameEntry(id);
      if (loaded.status !== "loaded") throw new Error("fixture-not-loaded");
      const fixture = complete();
      entries.push({ ...fixture, manifest: { ...loaded.entry.manifest,
        implementation: fixture.manifest.implementation, rights: { ...fixture.manifest.rights, recordId: `rights-${id}` } },
      content: { ...fixture.content, gameId: id, mastery: [{ id: "mastery-a", objectiveKey: `arcade.games.${id}.mastery.a` }] },
      qualification: { ...fixture.qualification, gameId: id,
        authority: { ...fixture.qualification.authority, modes: loaded.entry.manifest.modes.map(mode => mode.id) } } });
    }
    for (const count of [2, 24]) {
      const selected = entries.slice(0, count);
      const proposed = { ...batch(), members: selected.map(entry => member(entry as ReturnType<typeof complete>)).reverse() };
      const result = inspectReleaseBatch(proposed, selected);
      expect(result.structuralGaps).toEqual([]);
      expect(result.games).toEqual(proposed.members.map(({ gameId }) => ({ gameId, structuralGaps: [] })));
    }
  });

  it("rejects empty, unknown, duplicate, future, wildcard and oversized batch records", () => {
    const base = batch();
    for (const patch of [{ type: undefined }, { version: "2.0.0" }, { id: "../unsafe" }, { members: [] },
      { members: [member(), member()] }, { members: Array(25).fill(member()) }, { extra: true },
      { members: [{ ...member(), gameId: "unknown-game" }] }, { members: [{ ...member(), rulesVersion: "*" }] },
      { members: [{ ...member(), contentVersion: "^1.0.0" }] }, { members: [{ ...member(), artifact: null }] },
      { members: [{ ...member(), artifact: { ...evidence(), sha256: "invalid" } }] },
      { members: [{ ...member(), enabled: true }] }]) expect(() => parseReleaseBatch({ ...base, ...patch })).toThrow();
    for (const value of [null, [], false, "{", "x".repeat(MAX_RELEASE_BATCH_BYTES + 1)]) {
      expect(() => parseReleaseBatch(value)).toThrow();
    }
  });

  it("detaches parsed records and results from later caller changes", () => {
    const source = batch(), entry = complete();
    const parsed = parseReleaseBatch(JSON.stringify(source));
    const result = inspectReleaseBatch(source, [entry]);
    source.members[0]!.artifact.sha256 = "b".repeat(64);
    entry.qualification.humanPlay.activeMinutes = 1;
    expect(parsed.members[0]!.artifact.sha256).toBe("a".repeat(64));
    expect(result.games[0]!.structuralGaps).toEqual([]);
    parsed.members.length = 0;
    expect(source.members).toHaveLength(1);
  });

  it("reports missing, duplicate, unexpected and malformed entries without selecting a passing subset", async () => {
    expect(inspectReleaseBatch(batch(), []).games).toEqual([{ gameId: "prism-breaker", structuralGaps: ["missing-entry"] }]);
    expect(inspectReleaseBatch(batch(), [complete(), complete()]).structuralGaps).toEqual(["duplicate-entry"]);
    const extra = await loadGameEntry("vector-volley");
    if (extra.status !== "loaded") throw new Error("fixture-not-loaded");
    expect(inspectReleaseBatch(batch(), [complete(), extra.entry]).structuralGaps).toEqual(["unexpected-entry"]);
    for (const invalid of [null, {}, { ...complete(), manifest: { ...complete().manifest, id: "unknown-game" } },
      { ...complete(), content: undefined }, { ...complete(), qualification: { ...qualificationFixture(), rulesVersion: "2.0.0" } }]) {
      const result = inspectReleaseBatch(batch(), [invalid]);
      expect(result.structuralGaps).toEqual(["incomplete-batch", "invalid-entry"]);
      expect(result.games[0]!.structuralGaps).toEqual(["missing-entry"]);
    }
    expect(inspectReleaseBatch(batch(), [null, null]).structuralGaps).toEqual(["incomplete-batch", "invalid-entry"]);
    for (const entries of [null, {}, "[]", Array(25).fill(complete())]) {
      expect(() => inspectReleaseBatch(batch(), entries)).toThrow("invalid-release-entries");
    }
  });

  it.each(["rulesVersion", "contentVersion"] as const)("rejects changed %s despite otherwise complete evidence", key => {
    const proposed = batch(); proposed.members[0]![key] = "2.0.0";
    expect(inspectReleaseBatch(proposed, [complete()]).games[0]!.structuralGaps).toEqual(["version-binding"]);
  });

  it.each(["id", "sha256"] as const)("rejects changed implementation artifact %s", key => {
    const proposed = batch(); proposed.members[0]!.artifact[key] = key === "id" ? "changed-engine" : "b".repeat(64);
    expect(inspectReleaseBatch(proposed, [complete()]).games[0]!.structuralGaps).toEqual(["artifact-binding"]);
  });

  it("retains planned-game and all per-title evidence gaps", async () => {
    const loaded = await loadGameEntry("prism-breaker");
    if (loaded.status !== "loaded") throw new Error("fixture-not-loaded");
    expect(inspectReleaseBatch(batch(), [loaded.entry]).games[0]!.structuralGaps).toEqual([
      "artifact-binding", "implementation", "rights", "content", "human-play", "devices", "accessibility", "authority", "delivery",
    ]);
    const entry = complete();
    entry.content.tutorial = null as any; entry.content.challenges = entry.content.challenges.slice(0, 29);
    entry.content.difficulties = []; entry.content.mastery = []; entry.content.endless = null as any;
    entry.qualification.humanPlay.activeMinutes = 599;
    entry.qualification.devices.passed = false; entry.qualification.accessibility.passed = false;
    entry.qualification.authority.modes = ["solo"]; entry.qualification.delivery.mainCd = false;
    expect(inspectReleaseBatch(batch(), [entry]).games[0]!.structuralGaps).toEqual([
      "tutorial", "authored-challenges", "difficulties", "mastery", "endless", "human-play", "devices", "accessibility", "authority", "delivery",
    ]);
  });

  it("does not confuse batch membership with predominantly-touch or independent depth approval", () => {
    for (const patch of [{ touchMinutes: 300 }, { desktopParity: false }, { independentDepthApproval: false }]) {
      const entry = complete(); Object.assign(entry.qualification.humanPlay, patch);
      expect(inspectReleaseBatch(batch(), [entry]).games[0]!.structuralGaps).toEqual(["human-play"]);
    }
  });

  it("reports the entire batch incomplete when one selected title lacks evidence", async () => {
    const selected = await loadGameEntry("clockwork-roost");
    if (selected.status !== "loaded") throw new Error("fixture-not-loaded");
    const proposed = { ...batch(), members: [member(), { ...member(), gameId: "clockwork-roost" }] };
    const result = inspectReleaseBatch(proposed, [complete(), selected.entry]);
    expect(result.structuralGaps).toEqual(["incomplete-batch"]);
    expect(result.games.map(game => game.gameId)).toEqual(["prism-breaker", "clockwork-roost"]);
    expect(result.games[0]!.structuralGaps).toEqual([]);
    expect(result.games[1]!.structuralGaps).toContain("implementation");
    expect(inspectReleaseBatch(batch(), []).structuralGaps).toEqual(["incomplete-batch"]);
  });
});
