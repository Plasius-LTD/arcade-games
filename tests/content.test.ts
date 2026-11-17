import { describe, expect, it } from "vitest";
import { parseContentInventory, parseQualification, inspectGameEvidence } from "../src/index.js";
import { manifestFixture, contentFixture, qualificationFixture, evidence } from "./fixtures.js";

describe("authored content and trusted-evidence structural contracts", () => {
  it("does not infer readiness from missing records or seed counts", () => {
    expect(inspectGameEvidence(manifestFixture(), null, null).structuralGaps).toEqual([
      "implementation", "rights", "content", "human-play", "devices", "accessibility", "authority", "delivery",
    ]);
    expect(() => parseContentInventory({ ...contentFixture(), seeds: 1_000_000 })).toThrow();
    const content = contentFixture(); content.challenges = [];
    expect(inspectGameEvidence(manifestFixture(), content, null).structuralGaps).toContain("authored-challenges");
  });

  it("requires actual distinct authored references and explicit generation guarantees", () => {
    const base = contentFixture(); expect(parseContentInventory(JSON.stringify(base))).toEqual(base);
    for (const change of [{ version: "2.0.0" }, { type: undefined }, { gameId: "foreign" }, { extra: true },
      { challenges: [base.challenges[0], base.challenges[0]] },
      { challenges: [{ ...base.challenges[0], kind: "generated" }] },
      { challenges: [{ ...base.challenges[0], artifact: evidence("same") }, { ...base.challenges[1], artifact: evidence("same") }] },
      { challenges: [{ ...base.challenges[0], objectives: [] }] },
      { difficulties: [base.difficulties[0], base.difficulties[0]] },
      { difficulties: base.difficulties.map(p => ({ ...p, profile: evidence("same-profile") })) },
      { mastery: [base.mastery[0], base.mastery[0]] },
      { mastery: [{ id: "one", objectiveKey: base.mastery[0]!.objectiveKey }, { id: "two", objectiveKey: base.mastery[0]!.objectiveKey }] },
      { endless: { ...base.endless, guarantees: ["safe-starts"] } },
      { endless: { kind: "puzzle", validation: evidence(), method: "seed-count" } }]) expect(() => parseContentInventory({ ...base, ...change })).toThrow();
    const puzzle = { ...base, endless: { kind: "puzzle", validation: evidence(), method: "solution-witness" } };
    expect(parseContentInventory(puzzle).endless?.kind).toBe("puzzle");
    expect(parseContentInventory({ ...puzzle, endless: { ...puzzle.endless, method: "solver" } }).endless?.kind).toBe("puzzle");
    const incomplete = { ...base, tutorial: null, challenges: base.challenges.slice(0, 29), difficulties: [], mastery: [], endless: null };
    expect(inspectGameEvidence(manifestFixture(), incomplete, null).structuralGaps).toEqual(expect.arrayContaining(["tutorial", "authored-challenges", "difficulties", "mastery", "endless"]));
    expect(() => parseContentInventory("x".repeat(256 * 1024 + 1))).toThrow();
    expect(() => parseContentInventory({ ...base, challenges: Array(301).fill(base.challenges[0]) })).toThrow();
  });

  it("binds all evidence to exact versions/artifact and preserves incomplete human/device/online review", () => {
    const manifest = { ...manifestFixture(), implementation: { status: "implemented", artifact: evidence("implementation") },
      rights: { ...manifestFixture().rights, clearance: "approved", approval: evidence("rights"), redistribution: "public" } };
    const content = contentFixture(); const qualification = qualificationFixture();
    expect(parseQualification(JSON.stringify(qualification))).toEqual(qualification);
    expect(inspectGameEvidence(manifest, content, qualification)).toEqual({ structuralGaps: [] });
    for (const key of ["gameId", "rulesVersion", "contentVersion"]) {
      expect(() => inspectGameEvidence(manifest, { ...content, [key]: key === "gameId" ? "vector-volley" : "2.0.0" }, qualification)).toThrow();
      expect(() => inspectGameEvidence(manifest, content, { ...qualification, [key]: key === "gameId" ? "vector-volley" : "2.0.0" })).toThrow();
    }
    expect(inspectGameEvidence(manifest, content, { ...qualification, artifact: evidence("different") }).structuralGaps).toContain("artifact-evidence");
    for (const change of [{ activeMinutes: 599 }, { touchMinutes: 300 }, { desktopParity: false }, { independentDepthApproval: false }]) {
      expect(inspectGameEvidence(manifest, content, { ...qualification, humanPlay: { ...qualification.humanPlay, ...change } }).structuralGaps).toContain("human-play");
    }
    for (const key of ["humanPlay", "devices", "accessibility", "authority", "delivery"]) {
      expect(inspectGameEvidence(manifest, content, { ...qualification, [key]: null }).structuralGaps.length).toBeGreaterThan(0);
    }
    expect(inspectGameEvidence(manifest, content, { ...qualification, devices: { ...qualification.devices, passed: false } }).structuralGaps).toContain("devices");
    expect(inspectGameEvidence(manifest, content, { ...qualification, accessibility: { ...qualification.accessibility, passed: false } }).structuralGaps).toContain("accessibility");
    expect(inspectGameEvidence(manifest, content, { ...qualification, authority: { ...qualification.authority, modes: ["solo"] } }).structuralGaps).toContain("authority");
    expect(inspectGameEvidence(manifest, content, { ...qualification, delivery: { ...qualification.delivery, mainCd: false } }).structuralGaps).toContain("delivery");
    for (const change of [{ version: "2.0.0" }, { reviewerEmail: "synthetic-private" }, { humanPlay: { ...qualification.humanPlay, activeMinutes: -1 } },
      { humanPlay: { ...qualification.humanPlay, touchMinutes: 601 } }, { authority: { ...qualification.authority, modes: ["solo", "solo"] } },
      { accessibility: { ...qualification.accessibility, standard: "wcag-2.1-aa" } }]) expect(() => parseQualification({ ...qualification, ...change })).toThrow();
  });
});
