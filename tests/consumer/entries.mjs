import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import * as api from "@plasius/arcade-games";
const require = createRequire(import.meta.url);
const cjs = require("@plasius/arcade-games");
assert.equal(api.catalogue.length, 24);
assert.deepEqual(api.GAME_IDS, cjs.GAME_IDS);
assert.equal(Object.keys(require.cache).some(path => path.includes("/arcade-games/dist/games/")), false);
for (const root of [new URL(import.meta.resolve("@plasius/arcade-games")), require.resolve("@plasius/arcade-games")]) {
  const source = readFileSync(root, "utf8");
  assert.equal(source.includes("// src/games/"), false);
  for (const id of api.GAME_IDS) assert.ok(source.includes(`import("./games/${id}.js")`));
}
for (const id of api.GAME_IDS) {
  const esm = await import(`@plasius/arcade-games/games/${id}`);
  const common = require(`@plasius/arcade-games/games/${id}`);
  assert.deepEqual(api.parseManifest(esm.manifest), cjs.parseManifest(common.manifest));
  assert.equal(esm.manifest.id, id); assert.equal(common.manifest.id, id);
  for (const root of [api, cjs]) {
    const result = await root.loadGameEntry(id);
    assert.equal(result.status, "loaded");
    assert.deepEqual(result.entry.manifest, esm.manifest);
    assert.equal(result.entry.content, null); assert.equal(result.entry.qualification, null);
    assert.ok(root.inspectGameEvidence(result.entry.manifest, null, null).structuralGaps.includes("implementation"));
  }
}
const controller = new AbortController(); controller.abort();
assert.equal((await api.loadGameEntry("prism-breaker", { signal: controller.signal })).status, "aborted");
assert.equal((await cjs.loadGameEntry("../unregistered")).status, "unknown-game");
console.log("Packed root and all 24 ESM/CJS subpaths pass: lazy boundaries, metadata parity, cancellation and explicit missing implementation/evidence.");
