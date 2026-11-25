# @plasius/arcade-games

Lazy catalogue and original spatial game content contracts for the Plasius arcade.

Prism's private source now includes six original tutorial lessons, separate from
its thirty authored campaign stages. Tests complete every lesson in all three
profiles and solo/co-op using real bounded rule inputs, with exact save/restore
equality and native scene projection. This is automated content evidence; the
interactive tutorial host, touch prompts, translations and human/device review
remain required. Tutorial code is excluded from all public package entries.
This package is under development and unpublished. No game is playable or
qualified by these catalogue records. The 24-title programme can launch in
explicit qualified batches. Every selected game requires its complete implementation,
rights clearance and human/device/online evidence before public admission.

Work: [Task #1](https://github.com/Plasius-LTD/arcade-games/issues/1),
[Feature #2389](https://github.com/Plasius-LTD/plasius-ltd-site/issues/2389),
[Epic #2382](https://github.com/Plasius-LTD/plasius-ltd-site/issues/2382).
See [design](docs/design/catalogue-and-content.md).
The [Prism Breaker implementation plan](docs/design/prism-breaker.md) defines
the first game's rules, 30 challenge briefs and requirement-derived checks under
[Task #2](https://github.com/Plasius-LTD/arcade-games/issues/2). Its internal
single-stage rules are tested in `src/games/prism/rules.ts`: two-axis solo/co-op
paddles, spatial swept collisions, armour/relays, moving gates, local gravity,
three difficulty profiles and detached replay state. They are excluded from
public entries and bundles pending runtime integration and rights/content
qualification. See [ADR 0002](docs/adrs/adr-0002-private-prism-rules.md).

`src/games/prism/challenges.ts` now contains thirty individually authored candidate
layouts, including sealed relay rooms, distinct gate cycles, armour and local
fields. Private readers return strictly validated detached geometry. Tests check
unique geometry independent of names, conservative sphere clearance and actual
rules launch/restore for all profiles in solo/co-op. A test-only pilot also supplies
180 controlled completion witnesses through ordinary inputs, with content/input/
final-state digests and identical outcomes after a mid-play JSON state round trip.
Each profile/roster runs as a separate instrumented test with a two-minute limit
and a 36,000-tick simulation bound, retaining the full 180-scenario matrix.
Both paddles contribute in co-op. These are automated headless trajectories, not
human fairness, touch usability or play-depth evidence. The private tutorial,
endless rooms and scene projector are described below; released-runtime host
integration and qualification remain required. Candidate geometry is excluded
from public entries and packed artifacts.

`src/games/prism/presentation.ts` privately projects admitted rule state into the
published `@plasius/gpu-shared/game-scene` contract. It authors original meshes
for the chamber, targets, ball, open paddles, relay diamonds, armour markers and
gravity frames/arrows. `readMeshes()` returns fresh buffers; `project(state,
aspectRatio)` fits the camera to a 0.4–3 viewport ratio (default 16/9). It reuses
collision dimensions and gate positions and owns no clock, input or renderer.
Released gpu-shared 1.11.2 and gpu-renderer 0.2.69 remain development dependencies
until public host integration. See the [native smoke procedure and limits](docs/design/prism-scene-validation.md).
Browser snapshots are not touch/phone, accessibility or ten-hour qualification.

The private `src/games/prism/endless.ts` composes bounded original bank, shutter,
relay-vault and current rooms. Three capped tiers, two formations and X/Y
reflections yield 96 finite geometry combinations. Strict recipes reconstruct
the same detached room without drawing again. Selection consumes caller-owned
randomness, avoids the last four recipe keys, and uses a known admitted fallback
after four draws. It adds no PRNG, clock or checkpoint store. Real-rule tests
exercise every combination in all profiles and solo/co-op, including mid-play
restore; these are automated regression checks, not human depth or fairness
evidence. Runtime seed checkpoints, mastery, host progression and qualification
remain required before public game integration. Public entries exclude this code.

The private `src/games/prism/mastery.ts` projects six challenge objectives from
host-trusted completions: each profile's campaign, clean clears, shared co-op
clears and all challenge/profile pairs. Strict canonical facts are bounded to
180 records; repeated or worse outcomes cannot repeat an unlock or reduce earned
progress. The module has no storage or timer. The future host must authenticate
outcomes and apply the projection to current account state transactionally.
Bank-shot and consecutive-clear goals, account award integration and human
qualification remain pending. Public entries exclude this private module.

## Catalogue and entry loading

```ts
import { catalogue, loadGameEntry } from "@plasius/arcade-games";

// The host applies backend capabilities and stored rollout decisions first.
const result = await loadGameEntry(catalogue[0].id, {
  signal: abortController.signal,
  timeoutMs: 5000,
});
if (result.status === "loaded") {
  const { manifest, content, qualification } = result.entry;
  // Render the site's translations and explicit implementation/evidence state.
}
```

The root contains lightweight navigation descriptors and statically registered
dynamic imports. Each game has an independent `@plasius/arcade-games/games/<slug>`
entry with `manifest`, `content` and `qualification` exports. All initial entries
have `implementation.status: "planned"`, pending original rights, and null content
and qualification. They contain no playable engine. The corresponding game Tasks
add real rules, authored content and rendering after owning-package releases.

`loadGameEntry` accepts known stable slugs only. Its default deadline is 5 seconds
(allowed 10–30,000 ms); at most four actual imports may remain pending. Abort and
timeout stop delivery, remove timers/listeners and ignore late results. Module
evaluation already in progress cannot be cancelled, so its capacity stays reserved
until it settles. No retry, hidden queue, networking, credential use or simulation
starts here. `createEntryLoader` accepts a complete trusted registry of import
functions for testing/integration; never construct paths from caller input.

Results are detached from module state. Fixed failure statuses are `unknown-game`,
`invalid-options`, `aborted`, `timeout`, `capacity`, `load-failed` and `invalid-entry`.
Import errors never expose provider messages or paths. Both root module formats
retain dynamic game imports; direct ESM/CJS subpath consumers are also supported.

## Content and evidence

`parseManifest` validates explicit type/version, known identity, exact flag and
translation keys, touch/keyboard/mouse instructions, WebGPU/spatial-3D hardware,
solo/online player bounds and original rights references within 16 KiB. Working
titles require clearance; "original" is an intended edition, not remake rights.
The site owns translated title/description/objectives/instructions and UI labels.

`parseContentInventory` binds game/rules/content versions and validates tutorial,
up to 300 distinct authored challenge artifacts, three distinct difficulty
profiles, mastery goals and endless-validation references within 256 KiB.
Challenge IDs/artifact IDs/digests and difficulty profiles must be distinct.
Puzzle generators need a solver or solution witness; action generation needs
bounded difficulty, reachable objectives, safe starts and reaction-time checks.
Absent content stays absent. Individual game tests must establish these properties
in the actual rules and content; a valid metadata reference cannot do so.

`parseQualification` validates bounded, version/artifact-bound review references
for human play, devices, WCAG 2.2 AA, authority/modes and approved delivery. It
contains no reviewer identity or private legal evidence. `inspectGameEvidence`
returns `structuralGaps`, including missing implementation/rights/content,
fewer than 30 authored challenges, missing tutorial/difficulty/mastery/endless
records, less than 600 meaningful active minutes, predominantly-touch evaluation,
desktop parity, independent depth review or incomplete device/online/delivery
records. It rejects incompatible versions and reports artifact mismatch.

**An empty structural gap list is not qualification or permission to launch.**
The host must authenticate current reviewed evidence, verify referenced digests,
enforce immutable content/rules versions, account/guardian policy and all release
gates. Idle time, repeated deaths, cosmetic changes and seed counts do not establish
depth. Public packaging rejects implemented content without approved public
redistribution evidence. Private/licensed assets cannot be added by broadening
the package allowlist. See [rights register](docs/rights/original-catalogue.md).

## Release batches

`parseReleaseBatch` validates a detached `arcadeReleaseBatch` version `1.0.0`
record within 16 KiB. Its `id` identifies the selection; `members` contains 1–24
unique known game IDs, exact rules/content versions and implementation artifact
IDs/digests. Empty, duplicate, unknown, future and malformed selections fail.

`inspectReleaseBatch(batch, entries)` inspects exactly those selected entries.
It returns `batchId`, batch-level `structuralGaps` and per-game gap lists in member
order. Any incomplete game adds `incomplete-batch` at batch level; invalid,
unexpected and duplicate entries also produce batch gaps. Missing entries and
changed version/artifact bindings cannot reuse complete evidence. It never imports
games, chooses a passing subset, enables controls or returns authorization.

The host must authenticate the approved batch and current evidence, verify exact
artifacts and apply stored master/platform/game flags and backend capabilities.
Unselected titles remain unavailable. Every selected title retains all existing
qualification requirements; a completed batch need not wait for the other titles.
See [batch design](docs/design/release-batches.md) and
[ADR 0003](docs/adrs/adr-0003-qualified-release-batches.md). Current catalogue
entries remain planned and unqualified. Site consumption waits for approved CD.

Use the schema template's Node/npm setup. Tests are derived from the Project
acceptance criteria before implementation. Every source must appear in combined
LCOV with at least 80% coverage; types, lint, build, audit, public tarball checks
and isolated dual-module consumers are required. Publish only through protected
main `.github/workflows/cd.yml` and GitHub `production`, after the reviewed
first-registration route and operator authorization. Never publish locally.

Commands: `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test:coverage`,
`npm run build`, `npm run pack:check`, `npm run audit:npm`. The independent-entry
build is sequential to bound build resources and emit self-contained declarations.
The first-party build script calls esbuild for JavaScript and
`dts-bundle-generator` with the installed TypeScript compiler for declarations.
It uses explicit public entry paths, preserves legal comments and source maps,
and keeps runtime dependencies and lazy game imports external. See the
[build-tool decision](docs/adrs/adr-0005-build-tool-dependency-removal.md).
The installed-code regression checks the full installation for embedded
Picomatch as well as rejecting the former `tsup` dependency. The lock consumes
released gpu-shader 0.1.13, whose qualification-only browser automation is an
optional peer; normal installs no longer include Playwright's bundled matcher.
The required React peer for pinned gpu-physics is included in the lock so a clean
normal npm install succeeds. No optional or peer dependency is omitted. Upstream
`picomatch` imports now resolve to verified public `@plasius/glob@1.0.2` with its
exact Minimatch 11.0.9 engine. The name is a compatibility alias; package identity,
integrity and implementation remain Plasius. Full installed-code checks exclude
no matcher directory. The adapter intentionally rejects `makeRe()`; custom Vite
asset filters must use reviewed RegExp values rather than glob strings.
Complete discovery, coverage, package consumers and ordinary CI/CD remain required.
The exact public tarball has 153 paths: root plus 24 ESM/CJS/map/declaration entries,
README, LICENSE and package metadata. Runtime validation uses published
`@plasius/schema@1.5.0`; package and provider mechanics remain in their owning
Plasius packages. No unreleased runtime workspace dependency is installed.
Private rule tests use the published `@plasius/gpu-physics@0.1.19/collision`
subpath; physics is a development dependency until an engine is publicly exported.
No generic runtime, input queue or collision implementation is duplicated.

See [ADR 0001](docs/adrs/adr-0001-lazy-catalogue-and-evidence.md),
[TDR 0001](docs/tdrs/tdr-0001-content-and-loading-bounds.md),
[translation ownership](docs/operations/translation-ownership.md),
[contributing](CONTRIBUTING.md) and [security](SECURITY.md).

The host evaluates `arcade.catalogue.enabled`, game/platform controls and
capabilities. All remain disabled; rollback stops new admission and preserves
progress. No environment override or catalogue readiness shortcut exists.

Apache-2.0. Public legal templates are in `legal/`; private contributor records
and private rights evidence must remain outside this repository/package.

## Release notes

Add meaningful changes under `Unreleased`; the approved release pipeline alone
promotes versioned sections. Preparation and the merged-main check reuse
Schema's dependency-free `scripts/release-changelog.mjs`, reject placeholder or
empty release notes, and preserve published history on retries. See the
[release-note design](docs/design/release-notes.md) for the template revision
and validation contract. The first-registration and permanent OIDC handover
remain governed by the [publication route](docs/design/first-publication.md).

## Package registration and trusted publishing

The release workflow follows the shared `@plasius/schema` template. The reviewed
enrollment allows only `@plasius/arcade-games@0.1.0` through main `cd.yml` and the
`production` environment, using the standard temporary `NPM_TOKEN`. The default
release path remains OIDC. No package-specific secret is introduced. See the
[registration design](docs/design/shared-first-registration.md) and
[ADR 0004](docs/adrs/adr-0004-shared-schema-registration.md) for exact admission, credential cleanup
and the verified OIDC handover. Publication remains incomplete until CD and npm
registry integrity are verified.
