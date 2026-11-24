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
human fairness, touch usability or play-depth evidence. Tutorial, endless generation,
presentation, runtime integration and qualification remain required; the candidate
geometry is excluded from public entries and packed artifacts.

`src/games/prism/presentation.ts` privately projects admitted rule state into the
published `@plasius/gpu-shared/game-scene` contract. It authors original meshes
for the chamber, targets, ball, open paddles, relay diamonds, armour markers and
gravity frames/arrows. `readMeshes()` returns fresh buffers; `project(state,
aspectRatio)` fits the camera to a 0.4–3 viewport ratio (default 16/9). It reuses
collision dimensions and gate positions and owns no clock, input or renderer.
Released gpu-shared 1.11.2 and gpu-renderer 0.2.69 remain development dependencies
until public host integration. See the [native smoke procedure and limits](docs/design/prism-scene-validation.md).
Browser snapshots are not touch/phone, accessibility or ten-hour qualification.

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

Use the schema template's Node/npm setup. Tests are derived from the Project
acceptance criteria before implementation. Every source must appear in combined
LCOV with at least 80% coverage; types, lint, build, audit, public tarball checks
and isolated dual-module consumers are required. Publish only through protected
main `.github/workflows/cd.yml` and GitHub `production`, after the reviewed
first-registration route and operator authorization. Never publish locally.

Commands: `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test:coverage`,
`npm run build`, `npm run pack:check`, `npm run audit:npm`. The independent-entry
build is sequential to bound build resources and emit self-contained declarations.
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
