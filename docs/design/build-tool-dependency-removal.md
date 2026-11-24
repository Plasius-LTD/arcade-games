# Remove Picomatch implementations from arcade build tooling

The owner chose dependency removal on 18 November 2026. Site #2539 and glob#1
retain their existing owner for the new published `@plasius/glob` adapter. The
arcade release work must also remove the Picomatch 4.0.3 implementation embedded
inside `tsup@8.5.1/dist/rollup.js`; a package alias cannot replace bundled code.

No current Plasius package owns JavaScript/declaration bundling. `road-map` owns
governance and `gpu-shader` owns WGSL tooling, neither this capability. Preserve
the first-party package/build orchestration and use the existing esbuild
compiler directly, with `dts-bundle-generator` for declarations from TypeScript.
Evaluate published `esbuild@0.28.2` and `dts-bundle-generator@10.0.0` before
selection. The installed-code regression rejected `rolldown@1.3.3`: its
`dist/utils-index.mjs` embeds Picomatch 4.0.7. Do not add tsdown: its current
wrapper brings another direct Picomatch dependency.
Do not write a custom glob matcher or declaration compiler.

Requirements before replacement:

1. Capture exact entry/ESM/CJS/declaration/source-map inventories and API behavior.
2. Add a regression rejecting tsup and embedded Picomatch source from the selected
   builder's installed modules. Separately retain the full lock/audit check for
   externally resolved Picomatch; a clean lock alone is insufficient.
3. Build independent entries from explicit source paths. Keep runtime dependencies
   external and the root arcade game's dynamic imports lazy in both formats.
4. Retain the reviewed packed path inventory, public export surface and private
   artifact checks. Compare isolated strict TypeScript/ESM/CJS consumers and
   complete test discovery/coverage. Do not hide extra declaration chunks or
   silently exclude source/tests to pass.
5. Verify source maps, legal notices and cross-platform Node 24 builds. Full
   coverage, type/lint/build/audit checks and exact-head CI remain required.
6. Once the existing owner publishes the verified `@plasius/glob`, consume that
   released version for remaining external Vite/Vitest/tinyglobby callers and
   rerun the full dependency and installed-code scans. No unpublished dependency,
   renamed vulnerable implementation, exception or scanner suppression.

Changes apply to game-runtime, game-multiplayer and arcade-games, with one tracked
Task per repository under site Story #2416 / Feature #2384 / Epic #2382. Inherit
the stored, disabled `arcade.runtime.enabled` flag; build integrity checks are
unconditional and this maintenance grants no product capability.

The approved first-registration guard, main/cd.yml/production path, package API
and release-note preparation remain unchanged. Publication and OIDC handover wait
for the actual dependency-removal and site CI/CD prerequisites. Record each
candidate's validation; no package, game or arcade launch is inferred from build
tool replacement.

Lockfile portability: use the Node 24.18.0/npm 11.19.1 client used by CI and
its existing `--legacy-peer-deps` mode when generating and verifying the lock.
The first catalogue CI run reproduced missing optional `@emnapi/core` and
`@emnapi/runtime` WASI dependencies after the older local npm client pruned them.
Regenerate through npm, then verify `npm ci --no-fund --no-audit
--legacy-peer-deps` from the resulting lock. Do not hand-edit resolved packages
or omit optional dependencies to mask a portability failure.

## Current-main integration — 24 November 2026

The candidate now integrates the batch contract and private Prism challenge,
tutorial and native-projection work from main `bd1b9459`. Preserve those source
files, completion witnesses and installed Plasius versions. Regenerate the lock
through the approved npm client from main's lock, retaining optional dependencies.
Run every current test and record a fresh discovery baseline before the later
matcher override: the earlier 90-case baseline predates the new content tests.
The public boundary remains the same 153 paths, excluding private game code.

The shared matcher owner has moved glob to the Schema OIDC template. Its former
custom first-registration exception is retired in the site policy. Do not restore
that route or consume an unpublished matcher. The three arcade packages retain
their separately approved release route; full dependency removal, publication and
OIDC handover remain uncompleted gates.

The integrated candidate passes 442 Vitest tests plus 24 privacy checks, types,
lint, complete dual builds, lazy/private exclusion, the 153-path package check,
packed ESM/CJS/strict NodeNext consumers and full audit. Combined LCOV is 95.65%
lines, 96.01% branches and 99.60% functions; the changed builder has 100%
lines/functions and 97.14% branches. All four private Prism sources remain in
LCOV and their rules/content/witnesses are unchanged. The new Prism bundle test
was moved to the replacement builder, retaining all exclusion assertions.

Before a matcher override, the sorted compact discovery record contains 442
cases, SHA-256 `0a96903c008682508a92d2e6fb7919f638cd4aff6d333da56efb31e3034cf2d1`.
The 24 Node privacy cases run separately. Require discovery parity after adoption.

The full installed-code scan additionally finds embedded Picomatch in
playwright-core's utilsBundle.js and serverRegistry.js. It arrives through
gpu-shader's optional qualification dependency via asset-contracts. Track the
runtime/qualification dependency boundary in gpu-shader #49; retain real shader
runner tests and consume its verified published fix before final arcade removal.
External picomatch remains too. Do not claim complete removal from the builder
change, omit optional dependencies, or suppress the installed-code finding.

### Published shader adoption and clean-install repair

gpu-shader 0.1.13 now has successful approved main CD (45469760973), exact
registry/tarball/provenance/tag identity at
`f153f329b11ee787f117fe9bd02f739f2ccabfdf`, and the unchanged 30-path public
package policy. Adopt that released transitive version through the lock; its
optional qualification peer keeps Playwright out of ordinary consumers while
the owning shader package retains its real development/runner tests.

A fresh npm 11.19.1 install exposed the missing required React peer for the
already-pinned gpu-physics 0.1.19. Regenerating the lock adds React 19.3.1 without
changing any other existing dependency version except the targeted shader fix.
Run a genuinely clean install with ordinary peer/optional handling. Extend the
installed-code regression across the dependency tree to catch bundled copies,
while explicitly retaining the separate external matcher release hold. Preserve
all 442 existing discoveries and the new dependency-boundary regression before
adopting the retained owner's published glob release. No audit exception applies.

Validation after adoption: 443 Vitest and 24 privacy cases, normal clean install,
types/lint, full build, 153-path pack/privacy, isolated ESM/CJS and strict NodeNext
consumers, and full audit pass. The original 442 discovery records retain their
exact hash above; including the new installation boundary regression gives
`d3c018979c75a1fcc57fdfc86eb2ee3d73eeff7510c813617338a8b4adc134bd`.
Combined LCOV remains 1209/1264 lines, 745/776 branches and 250/251 functions.
The installed source scan finds only the still-external Picomatch implementation.
