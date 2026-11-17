import { createRequire } from "node:module";
import fs, { readFileSync } from "node:fs";
import childProcess from "node:child_process";
import Module from "node:module";
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as root from "../src/index.js";
// @ts-expect-error The JS build command is exercised through its injected process runner.
import { buildPackage } from "../scripts/build-package.mjs";
const require = createRequire(import.meta.url);
const pack = vi.spyOn(childProcess, "execFileSync");
const { ENTRY_NAMES, EXPECTED_PACKED_PATHS, EXPECTED_EXPORTS } = require("../scripts/package-boundary.cjs");
const { verifyPackageContents, verifyPackagePathInventory, main } = require("../scripts/verify-public-package.cjs");
const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const entries = new Map<string, unknown>();
beforeAll(async () => {
  for (const id of root.GAME_IDS) {
    const result = await root.loadGameEntry(id);
    if (result.status !== "loaded") throw new Error("missing-entry");
    entries.set(id, result.entry);
  }
});
const load = (path: string) => path.endsWith("/index.cjs") ? root : entries.get(path.split("/").at(-1)!.replace(/\.cjs$/, ""));

describe("independent public package and lazy build boundaries", () => {
  it("seals exactly the root and all 24 independent ESM/CJS/maps/declaration entries", () => {
    expect(ENTRY_NAMES).toEqual(["index", ...root.GAME_IDS.map(id => `games/${id}`)]);
    expect(EXPECTED_PACKED_PATHS).toHaveLength(153); expect(manifest.exports).toEqual(EXPECTED_EXPORTS);
    verifyPackagePathInventory(EXPECTED_PACKED_PATHS); verifyPackageContents({ packageJson: manifest }, load);
    for (const paths of [EXPECTED_PACKED_PATHS.slice(1), [...EXPECTED_PACKED_PATHS, "dist/accidental.js"], [...EXPECTED_PACKED_PATHS, "legal/cla-registry.csv"]]) {
      expect(() => verifyPackagePathInventory(paths)).toThrow();
    }
    expect(() => verifyPackageContents({ packageJson: { ...manifest, exports: {} } }, load)).toThrow();
    expect(() => verifyPackageContents({ packageJson: { ...manifest, name: "@plasius/other" } }, load)).toThrow();
    for (const name of ["parseManifest", "parseContentInventory", "parseQualification", "inspectGameEvidence", "createEntryLoader", "loadGameEntry"]) {
      expect(() => verifyPackageContents({ packageJson: manifest }, (path: string) => path.endsWith("/index.cjs") ? { ...root, [name]: undefined } : load(path))).toThrow();
    }
    expect(() => verifyPackageContents({ packageJson: manifest }, (path: string) => path.endsWith("/index.cjs") ? { ...root, GAME_IDS: [] } : load(path))).toThrow();
  });

  it("rejects missing, misidentified or unapproved game content before a public tarball can pass", () => {
    const entry = structuredClone(entries.get("prism-breaker")) as any;
    for (const replacement of [undefined, { ...entry, manifest: { ...entry.manifest, id: "foreign" } },
      { ...entry, extraPrivateExport: "synthetic private content" },
      { ...entry, manifest: { ...entry.manifest, implementation: { status: "implemented", artifact: { id: "engine", sha256: "a".repeat(64) } } } }]) {
      expect(() => verifyPackageContents({ packageJson: manifest }, (path: string) => path.endsWith("/prism-breaker.cjs") ? replacement : load(path))).toThrow();
    }
  });

  it("builds self-contained entries sequentially and fails immediately on a broken build", () => {
    const run = vi.fn(); buildPackage(run);
    expect(run).toHaveBeenCalledTimes(25);
    expect(run.mock.calls[0]![1]).toContain("--clean");
    expect(run.mock.calls.slice(1).every(call => !call[1].includes("--clean"))).toBe(true);
    expect(run.mock.calls.map(call => call[1][1])).toEqual(ENTRY_NAMES.map((name: string) => `src/${name}.ts`));
    const failed = vi.fn(() => { throw new Error("build-failure"); });
    expect(() => buildPackage(failed)).toThrow("build-failure"); expect(failed).toHaveBeenCalledOnce();
  });

  it("checks the actual npm inventory and module loading, suppressing process diagnostics on failure", () => {
    const original = (Module as any)._load;
    const loader = vi.spyOn(Module as any, "_load").mockImplementation((...args: any[]) =>
      /\/dist\/(index|games\/[a-z-]+)\.cjs$/.test(args[0]) ? load(args[0]) : original(...args));
    const remove = vi.spyOn(fs, "rmSync").mockImplementation(() => {});
    try {
      pack.mockReturnValue(JSON.stringify([{ files: EXPECTED_PACKED_PATHS.map((path: string) => ({ path })) }]));
      main([]); expect(remove).toHaveBeenCalledWith(expect.stringContaining(".npm-cache-packcheck"), { force: true, recursive: true });
      pack.mockReturnValue("not JSON"); expect(() => main([])).toThrow("Could not find npm pack JSON");
      pack.mockReturnValue("[]"); expect(() => main([])).toThrow("exact allowlist");
      pack.mockImplementation(() => { throw new Error("synthetic private details"); });
      expect(() => main([])).toThrow("inventory could not be produced; details were not logged");
      expect(() => main(["--unsupported"])).toThrow("Unsupported");
    } finally { loader.mockRestore(); remove.mockRestore(); }
  });

  it("rejects broadened package files and preserves exact sealed inventories from stdin", () => {
    const read = fs.readFileSync; const spy = vi.spyOn(fs, "readFileSync");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      spy.mockImplementation((...args: any[]) => {
        if (args[0] === 0) return Buffer.from(EXPECTED_PACKED_PATHS.join("\n"));
        if (String(args[0]).endsWith("/package.json")) return JSON.stringify({ ...manifest, files: ["*"] });
        return (read as any)(...args);
      });
      expect(() => main([])).toThrow("files policy failed");
      main(["--inventory-stdin"]); expect(log).toHaveBeenCalledWith("Sealed package inventory check passed.");
      spy.mockImplementation((...args: any[]) => args[0] === 0 ? Buffer.alloc(16 * 1024 * 1024 + 1) : (read as any)(...args));
      expect(() => main(["--inventory-stdin"])).toThrow("16 MiB");
    } finally { spy.mockRestore(); log.mockRestore(); }
  });
});
