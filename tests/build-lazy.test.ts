import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { GAME_IDS } from "../src/identities.js";

it("keeps each real built ESM/CJS game import external to the root payload", () => {
  const output = mkdtempSync(join(tmpdir(), "arcade-root-build-"));
  try {
    execFileSync(process.execPath, ["scripts/build-package.mjs", "--entry", "index", "--out-dir", output], { stdio: "pipe" });
    for (const extension of ["js", "cjs"]) {
      const bundle = readFileSync(join(output, `index.${extension}`), "utf8");
      expect(bundle.includes("// src/games/")).toBe(false);
      for (const id of GAME_IDS) expect(bundle).toContain(`import("./games/${id}.js")`);
      expect(bundle).not.toContain("function plannedManifest");
    }
  } finally { rmSync(output, { recursive: true, force: true }); }
}, 30_000);
