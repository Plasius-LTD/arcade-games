# Lazy arcade catalogue and content contracts

Work: arcade-games #1; site Story #2421, Feature #2389, Epic #2382.
The approved product design is site `docs/Design/retro-arcade.md` and ADR 0192.
Live readback on 16 November 2026 confirms `arcade.catalogue.enabled` disabled
with zero rollout. `arcade.view`, `arcade.play`, each game flag and the complete
public launch barrier remain host-owned. This work does not enable any game.

## Package assessment and boundary

Create from the schema baseline, including Node/npm settings, legal/privacy
policy, docs, tests and approved GitHub CI/CD. Reuse released `@plasius/schema`
for strict versioned records. Runtime owns input, deterministic ticks, generation
state and checkpoints; multiplayer owns rooms and authoritative results; GPU,
physics, audio and shared UI retain their existing responsibilities. No engine,
simulation, WebGPU fallback, curriculum or site-local replacement belongs here.
Those packages are consumed by each game's implementation after approved release.

The root catalogue contains only small identity/category/translation descriptors
and statically enumerated dynamic imports. Each of the 24 stable game subpaths
exports its own manifest, independently of other entries. `loadGameEntry` checks
the known slug before invoking its import, verifies the returned identity and
schema, supports cancellation and a bounded deadline, and returns a detached
manifest. It never resolves a caller-controlled module path. Missing game rules
are explicit `implementation: planned`; manifest entries are not playable stubs.
Per-game tasks will add real rules/render/content exports to their existing
subpaths. No fake engine interface or unavailable runtime dependency is added.

## Manifest and content records

Strict manifest envelopes include stable slug, working title, rules/content
versions, category, translation keys for description/objectives and touch,
keyboard and mouse instructions, exact modes/player ranges, WebGPU/spatial-3D
hardware requirements, disabled-rollout flag key and rights-record reference.
Working titles require clearance. Original edition means intended authorship,
not permission to copy a classic. All initial rights records remain pending and
all implementation/content records remain unqualified.

Content inventory records bind game/rules/content versions and contain an explicit
tutorial reference, individually identified authored challenges with content
digests, three distinct difficulty profiles, mastery goals and an endless
generation validation reference. Puzzle generation requires solver or solution
witness validation; action generation requires reachability, safe starts,
reaction-time and bounded-difficulty validation. Duplicate challenges/digests do
not establish depth. Seed counts and elapsed idle time are not content evidence.
Null/missing inventory remains missing; parsers never fill invented challenges.

Qualification records are separately version-bound references to reviewed rights,
human play, device, accessibility, online-authority and delivery evidence. Human
evaluation requires at least 600 meaningful active minutes, predominantly touch,
desktop parity and independent depth approval. The library may validate and
report missing evidence; a parsed claim cannot authenticate a reviewer, confer
entitlement or enable a game. The host must retrieve trusted current records and
enforce all launch gates. Do not put identities or private legal evidence in the
public package; retain opaque evidence references and digests only.

Use explicit array/byte/time bounds, strict unknown-field/version handling,
canonical distinct identifiers and detached records. Metadata loading has no
network, credentials, telemetry, browser global or simulation side effect.
Abort/timeouts end delivery without hidden retry or queue; JavaScript imports
already in progress cannot be physically cancelled and late results are ignored.

## Requirement-derived checks before implementation

- Exact 24 stable slugs/titles/categories/modes and unique keys; touch first,
  desktop parity, original pending rights and no readiness claim in defaults.
- Reject malformed/future/oversized manifests, extra fields, mismatched slug/flag/
  translation keys, invalid mode bounds and unknown dynamic import identities.
- Verify independent lazy entry boundaries for root and all public subpaths;
  preserve cancellation/deadline behavior and no eager browser/engine import.
- Reject duplicate/forged/seed-only content, missing tutorial/difficulty/mastery,
  invalid puzzle/action generation guarantees and incompatible versions.
- Missing/untrusted/unreviewed or insufficient human evidence cannot establish
  qualification; exact mode/device/accessibility/rights/delivery evidence remains
  required. Parsed claims never constitute authority.
- Every source in combined LCOV and >=80% metrics; types/lint/build/audit, exact
  public tarball and isolated ESM/CJS/NodeNext subpath consumers; docs, protected
  pushed/main CI and approved CD before claiming published delivery.

First publication remains held under game-runtime #3/site #2531 and the existing
feedback qualification owner. No bootstrap credential, first release, game
exposure or ten-hour playtest is authorized or claimed by this source task.

## Local implementation evidence — 16 November 2026

All 24 planned manifests and their independent lazy subpaths are implemented.
No game rules, game assets or playable content is included. Published schema
1.5.0 supplies validation. The full dependency audit reports zero vulnerabilities.
The reviewed first-publication guard is unchanged; default-off preparation does
not authorize credential creation or release.

71 Vitest tests and 24 Node privacy tests pass, including actual ESM/CJS root
bundle verification, per-title modes, missing evidence, imported-registry identity,
deadline/cancellation and exact public inventory. Combined LCOV contains all 40
source/tooling files, with no missing changed source; all source lines are covered
and unchanged 80% gates pass. Types, lint, sequential full build, exact 153-path
tarball verification and diff checks pass.

`tests/consumer/entries.mjs` passes in an isolated npm tarball consumer for the
root and all 24 ESM/CJS subpaths, including lazy boundaries, metadata parity,
abort and explicit missing implementation/evidence. Strict NodeNext consumers
import every subpath as both `.mts` and `.cts`, without skipping library checks.
No browser/device/ten-hour playtest or cloud-service qualification is claimed.
Protected source/main CI and approved registration/CD remain delivery gates.
