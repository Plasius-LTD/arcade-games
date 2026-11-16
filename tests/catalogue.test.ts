import { describe, expect, it, vi } from "vitest";
import { catalogue, loadGameEntry, parseManifest, createEntryLoader } from "../src/index.js";
import { ids, manifestFixture } from "./fixtures.js";

describe("the approved original 24-game catalogue", () => {
  it("keeps stable identities, intended modes, touch-first instructions and missing evidence explicit", async () => {
    expect(catalogue.map(entry => entry.id)).toEqual(ids);
    expect(new Set(catalogue.map(entry => entry.titleKey)).size).toBe(24);
    for (const descriptor of catalogue) {
      const loaded = await loadGameEntry(descriptor.id);
      expect(loaded.status).toBe("loaded"); if (loaded.status !== "loaded") throw new Error("missing-entry");
      const { manifest, content, qualification } = loaded.entry;
      expect(manifest.id).toBe(descriptor.id); expect(manifest.titleKey).toBe(descriptor.titleKey);
      expect(manifest.category).toBe(descriptor.category);
      expect(manifest.hardware).toEqual({ renderer: "webgpu", dimensions: "spatial-3d", inputs: ["touch", "keyboard", "mouse"] });
      expect(manifest.implementation).toEqual({ status: "planned", artifact: null });
      expect(manifest.rights).toEqual({ edition: "original", recordId: `rights-${descriptor.id}`, clearance: "pending", approval: null, redistribution: "none" });
      expect(manifest.flagKey).toBe(`arcade.games.${descriptor.id}.enabled`);
      expect(Object.values(manifest.instructions)).toEqual(["touch", "keyboard", "mouse"].map(input => `arcade.games.${descriptor.id}.instructions.${input}`));
      expect(manifest.modes[0]).toMatchObject({ id: "solo", minPlayers: 1, maxPlayers: 1, kind: "solo" });
      expect(manifest.modes.slice(1).every(mode => mode.minPlayers >= 2 && mode.maxPlayers <= 4)).toBe(true);
      if (descriptor.id !== "vector-volley") {
        const kind = ["skyway-hopper", "apex-circuit"].includes(descriptor.id) ? "race"
          : ["voxel-cascade", "coil-runner", "photon-trails"].includes(descriptor.id) ? "versus"
          : descriptor.id === "prism-steps" ? "territory" : descriptor.id === "orbital-pinball" ? "tournament" : "co-op";
        const maxPlayers = ["prism-breaker", "clockwork-roost", "crystal-descent", "strata-shift", "cargo-circuit", "relic-canopy"].includes(descriptor.id) ? 2 : 4;
        expect(manifest.modes.slice(1)).toEqual([{ id: kind, kind, minPlayers: 2, maxPlayers }]);
      }
      expect(content).toBeNull(); expect(qualification).toBeNull();
    }
    const volley = await loadGameEntry("vector-volley");
    if (volley.status !== "loaded") throw new Error("missing-entry");
    expect(volley.entry.manifest.modes.slice(1).map(m => [m.id, m.minPlayers, m.maxPlayers])).toEqual([["duel", 2, 2], ["doubles", 4, 4]]);
    const first = await loadGameEntry("prism-breaker");
    if (first.status !== "loaded") throw new Error("missing-entry");
    first.entry.manifest.workingTitle = "modified";
    const second = await loadGameEntry("prism-breaker");
    expect(second.status === "loaded" && second.entry.manifest.workingTitle).toBe("Prism Breaker");
    expect(Object.isFrozen(catalogue)).toBe(true); expect(Object.isFrozen(catalogue[0])).toBe(true);
  });

  it("rejects future, malformed, mismatched and oversized manifest records", () => {
    const base = manifestFixture(); expect(parseManifest(JSON.stringify(base))).toEqual(base);
    for (const change of [{ type: undefined }, { version: "2.0.0" }, { id: "../private" }, { id: "unknown-game" },
      { rulesVersion: "current" }, { titleKey: "other.title" }, { flagKey: "arcade.games.other.enabled" }, { surprise: true },
      { workingTitle: "x".repeat(81) }, { hardware: { ...base.hardware, renderer: "canvas" } },
      { hardware: { ...base.hardware, inputs: ["keyboard", "touch", "mouse"] } }, { modes: [] },
      { modes: [base.modes[0], base.modes[0]] }, { modes: [{ ...base.modes[0], maxPlayers: 4 }] },
      { instructions: { ...base.instructions, touch: "arcade.other.instructions.touch" } },
      { implementation: { status: "implemented", artifact: null } },
      { rights: { ...base.rights, clearance: "approved", approval: null } },
      { rights: { ...base.rights, redistribution: "public" } }]) expect(() => parseManifest({ ...base, ...change })).toThrow();
    for (const value of [null, false, [], "{", "x".repeat(16_385)]) expect(() => parseManifest(value)).toThrow();
  });
});

describe("bounded statically registered lazy entry loading", () => {
  const module = () => ({ manifest: manifestFixture(), content: null, qualification: null });
  const imports = (load: () => Promise<unknown>) => Object.fromEntries(ids.map(id => [id, load]));
  it("does not import unknown games or pre-aborted work, and denies invalid registry/options", async () => {
    const importer = vi.fn(async () => module()); const load = createEntryLoader(imports(importer));
    expect((await load("../private")).status).toBe("unknown-game"); expect(importer).not.toHaveBeenCalled();
    const controller = new AbortController(); controller.abort();
    expect((await load("prism-breaker", { signal: controller.signal })).status).toBe("aborted"); expect(importer).not.toHaveBeenCalled();
    expect(() => createEntryLoader({})).toThrow(); expect(() => createEntryLoader({ ...imports(importer), unexpected: importer })).toThrow();
    const inherited = Object.assign(Object.create(imports(importer)), Object.fromEntries(ids.map((_, index) => [`unexpected-${index}`, importer])));
    expect(() => createEntryLoader(inherited)).toThrow();
    expect(() => createEntryLoader(imports(null as any))).toThrow();
    for (const timeoutMs of [0, 9, 30_001, NaN]) expect((await load("prism-breaker", { timeoutMs })).status).toBe("invalid-options");
    expect((await load("prism-breaker", { signal: {} as any })).status).toBe("invalid-options");
  });

  it("bounds pending imports across cancelled callers, ignores late failures and permits no hidden retry", async () => {
    vi.useFakeTimers();
    try {
      const pending: ((value: unknown) => void)[] = [];
      const importer = vi.fn(() => new Promise(resolve => pending.push(resolve)));
      const load = createEntryLoader(imports(importer));
      const controller = new AbortController();
      const calls = [load("prism-breaker", { signal: controller.signal }), ...Array.from({ length: 3 }, () => load("prism-breaker", { timeoutMs: 10 }))];
      expect((await load("prism-breaker")).status).toBe("capacity");
      controller.abort(); await vi.advanceTimersByTimeAsync(10);
      expect((await Promise.all(calls)).map(r => r.status)).toEqual(["aborted", "timeout", "timeout", "timeout"]);
      expect((await load("prism-breaker")).status).toBe("capacity");
      for (const settle of pending) settle(module()); await Promise.resolve(); await Promise.resolve();
      const next = load("prism-breaker"); pending.at(-1)!(module()); expect((await next).status).toBe("loaded");
      expect(importer).toHaveBeenCalledTimes(5); expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });

  it("validates loaded entry identity and content without leaking import errors", async () => {
    const failure = createEntryLoader(imports(async () => { throw new Error("synthetic private module path"); }));
    expect(await failure("prism-breaker")).toEqual({ status: "load-failed" });
    const sync = createEntryLoader(imports((() => { throw new Error("private"); }) as any));
    expect(await sync("prism-breaker")).toEqual({ status: "load-failed" });
    for (const value of [null, { ...module(), content: {} }, { ...module(), qualification: {} },
      { ...module(), manifest: { ...manifestFixture(), id: "vector-volley" } }]) {
      expect(await createEntryLoader(imports(async () => value))("prism-breaker")).toEqual({ status: "invalid-entry" });
    }
  });

  it("handles cancellation during listener registration and provider cleanup failures", async () => {
    const importer = vi.fn(async () => module()); const load = createEntryLoader(imports(importer));
    const signal = { aborted: false, addEventListener: (_name: string, callback: () => void) => callback(), removeEventListener: () => { throw new Error("synthetic private error"); } };
    expect(await load("prism-breaker", { signal: signal as any })).toEqual({ status: "aborted" });
    expect(importer).not.toHaveBeenCalled();
    const broken = { ...signal, addEventListener: () => { throw new Error("private error"); } };
    expect(await load("prism-breaker", { signal: broken as any })).toEqual({ status: "invalid-options" });
    expect((await load("prism-breaker")).status).toBe("loaded");
  });
});
