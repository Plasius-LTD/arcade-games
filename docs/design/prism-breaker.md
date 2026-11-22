# Prism Breaker implementation plan

Prepared 17 November 2026. Work: [arcade-games #2](https://github.com/Plasius-LTD/arcade-games/issues/2),
[site Story #2423](https://github.com/Plasius-LTD/plasius-ltd-site/issues/2423),
[Feature #2391](https://github.com/Plasius-LTD/plasius-ltd-site/issues/2391),
Epic #2382. This is the implementation/test plan, not evidence of a playable
game, authored release artifacts, rights clearance or ten-hour human evaluation.

The current manifest remains planned with null content/qualification and pending
rights. `arcade.games.prism-breaker.enabled` was read back as disabled with 0%
rollout. The host owns capabilities, pilot access and the full public launch
barrier. Disabling new sessions preserves checkpoints and earned progress.

### Internal rules increment, 18 November

Implement the deterministic game-owned rules privately before the host adapter.
Tests call one fixed game tick with slot, normalized X/Y intention and a launch
boolean; the released runtime adapter will later map validated `GameInput` into
that narrow intention. This does not introduce another clock, event queue,
browser input handler or random generator. Only published physics/schema are
consumed. The core is not imported by a public entry or included in its bundle
until runtime integration and public redistribution evidence are ready.

The initial core supports one bounded stage, including armour, relay links,
moving barriers, local forces, three explicit profiles and one/two paddles.
It does not itself establish authored-content solvability, endless generation,
account authority, presentation, device support or ten-hour depth. Stage-complete
and lost states freeze. The future progression adapter owns summary/next-stage
and campaign won transitions; it cannot silently reset terminal state.

Rules detail for this increment:

- Stage and state JSON are bounded to 64 KiB, with strict envelope/nested fields.
  Stage IDs and target order bind a checkpoint to the factory's detached content;
  the future runtime adds the immutable rules/content version binding.
- The sorted first slot serves; either slot may request launch. Omitted inputs
  preserve position and button-edge memory. Maximum paddle travel is 14 units/s
  in Euclidean distance, including diagonals. Ready-state ball position follows
  the serving paddle and stays outside its front face.
- Ball speed is fixed at the profile's 7/9/11 units/s. Gravity changes direction
  within that bound. Side/corner reflections retain a 20% minimum longitudinal
  component, explicitly preserving its direction; no target seeking is used.
- A nonfatal armour hit earns 25 points, destruction earns 100, and each target
  can take damage only once in a tick. Restored score/hit totals must equal
  target-health transitions. Combo resets on a drain. Completion/loss freeze.
- Gates use an even 120–7200 tick triangular period with bounded displacement;
  their full travel envelopes cannot intersect another solid. Relative sweeps
  account for paddle/gate movement. At most eight contacts are resolved, with a
  0.0001-unit separation bias; unused motion stops at the bound.
- Structural state validation cannot authenticate a play history. Only the
  host's trusted checkpoint/authority path can award progress; a shape-valid
  local checkpoint must never become an authoritative score submission.

The test-only stage fixtures are original geometric scenarios, not the thirty
authored challenges or public rights evidence. Automated replay duration is
regression coverage and provides no human play-depth qualification.

## Package boundaries and delivery order

Consume the approved releases of game-runtime and game-multiplayer before
implementing the production integration. Do not add a workspace or tarball
dependency as a substitute for publication. Existing package assessment:

- `@plasius/game-runtime`: fixed 60 Hz ticks, ordered slot inputs, seeded random
  stream, bounded snapshots, checkpoints, explicit migrations and lifecycle.
- `@plasius/gpu-physics/collision` from 0.1.19: swept sphere/AABB queries and
  kinematic integration. Reflection, target damage and paddle response are
  game rules; geometry queries must not be reimplemented here.
- `@plasius/gpu-renderer`: native WebGPU raster scene rendering, explicit GPU
  completion and owned disposal. Reuse scene/GPU geometry and camera utilities;
  add any missing generic primitive or projection capability in its owner.
- `@plasius/game-multiplayer`: room roster, authority, reconnect and immutable
  terminal result candidate. The site commits results and projects progress.
- Existing Plasius audio packages: original cue playback through injected host
  ports. No independent audio, persistence, authentication or network framework.

Keep executable rules and presentation behind the existing Prism Breaker subpath.
Root metadata loading must not import the game's engine or browser globals.
Headless rules run identically on client and authority; presentation reads their
snapshots. Preserve existing catalogue APIs and the exact reviewed package
boundary when adding exports. ADR 0001 governs this package separation.

## Spatial playfield and input

Use world coordinates X horizontal, Y vertical and Z into the chamber. Initial
arena bounds are X ±7, Y ±5, Z -13 to +14. A paddle moves in X/Y at Z -10;
targets and barriers occupy distinct X/Y/Z volumes ahead of it. A ball can hit
side, top, bottom and far walls, travel behind obstructions and return towards
the player. The near boundary is the drain. These are actual spatial collisions,
not depth offsets on a planar simulation.

Start with a ball radius of 0.18 and a paddle half-size of 0.9 by 0.7. The ball
begins attached to a paddle; explicit launch sends it into the chamber. Targets
are axis-aligned boxes with stable IDs. The first implementation bounds a stage
to 96 damageable targets, 12 barriers, four gravity fields and two paddles, with
one live ball. Increase a bound only with measured performance and test evidence.

`GameInput.axes.x/y` specify the desired normalised paddle centre; Z is zero.
The game clamps position to the arena and limits travel speed per tick. Touch
offers an absolute aiming region plus accessible directional nudge controls.
Mouse maps to the same target plane; arrows/WASD update the same target through
the host input adapter. Launch is one button bit with a rising-edge rule; holding
it cannot consume multiple lives or relaunch repeatedly. Unknown button bits
and nonzero Z are rejected by the game-specific input boundary.

The input adapter samples the current intention for each simulation tick. Missing
tick input is neutral: the paddle stays at its current position instead of
continuing towards an older target, and no launch occurs. Previous explicit
button state is retained only to identify edges; a drain requires an explicit
release before a fresh launch can be armed. A new pointer owner, cancellation,
focus loss or key release must not leave a stale action pressed. Do not permit two pointers to
silently compete for the same paddle. Pause/settings use semantic host controls,
not undocumented input bits. All visible instructions come from the owning site
translation bundle. Inputs never contain account identifiers or a score.

## Rules, response and bounds

Integrate bounded gravity with the published kinematic function, then sweep the
remaining displacement against walls, targets, barriers and paddles. Resolve the
earliest contact; equal times use a stable object-ID order. Perform at most eight
contacts per ball/tick. Ignore separating time-zero contact, apply a documented
small separation bias after response and stop unused displacement when the bound
is reached. No recursive solver or speed-dependent unbounded substeps.

Reflect off ordinary surfaces. Returning paddle hits steer X/Y from the contact
offset while maintaining a minimum forward Z component and bounded total speed;
the central hit is predictable. No input can teleport a paddle to intercept a
ball. Moving barriers use relative displacement with the same swept query and
bounded speed. Overlapping initial geometry is an authoring error, not something
to repair invisibly during play.

Damage is applied at most once per target per tick, and score is awarded only
for an actual state transition. Armoured targets visibly require two contacts.
Relay targets can remove an explicitly linked barrier; their connections have
shape/text cues as well as colour. Gravity fields have bounded local force and
visible direction. Gates move on known tick periods with adequate open windows.
All required targets must remain reachable; a decorative obstacle cannot make a
stage impossible. Avoid endless nearly parallel trajectories with a documented
minimum longitudinal speed, without secretly steering towards a target.

A drain consumes one team life, resets combo and returns to an explicit ready
state. Reaching the objective records one completion and enters a transition
state; it does not automatically skip the summary. States are ready, playing,
stage-complete, won and lost. Terminal states cannot score or mutate gameplay.
Attempts, lives, score, stage time and combo have finite integer bounds. Pause
belongs to runtime; frozen/elapsed real time never earns score or challenge credit.

Solo has one paddle. Co-op has two host-issued slots, each controlling a paddle
with the same physical travel bound. Equal-contact ownership is deterministic;
one collision cannot award both slots a hit. Team targets, lives and completion
are shared. Disconnection does not pause authority or silently replace a player;
the host's existing reconnect/abandonment policy applies. Ranked solo also uses
authority. Local practice scores cannot be promoted to verified results.

## Thirty authored challenge briefs

### Private authored-geometry increment, 18 November

Implement the thirty briefs below as individually specified, versioned stage
definitions in the private Prism module. Each definition has explicit target
coordinates, armour/relay links, barrier geometry/motion and local fields;
helpers only construct boxes and records, never generate a campaign from seeds.
The private reader validates and returns detached stages. Unknown challenge IDs
fail rather than silently choosing another stage. Keep all geometry outside the
public catalogue and package inventory until integration and qualification.

Requirement tests precede the definitions: exactly thirty ordered identities;
distinct geometry after removing names/IDs; stage-parser validity; declared
mechanic progression matching the briefs; independent reader results; valid
initial state and deterministic real-rule launch/restore for all profiles and
solo/co-op. Add bounded geometric route checks and negative sealed-room fixtures
to catch authoring errors. Such route checks establish clearance only: a
collision-free route is not a controllable ball trajectory or a completion
witness. Automated tests must not be labelled human play or ten-hour evidence.

Record these as candidate authored artifacts, not completed content inventory.
All three-profile solo/co-op completion witnesses, separate tutorial, endless
generation, touch presentation, rights review and human depth review remain
explicit delivery work. No qualification record changes in this increment.

### Controlled completion verification

A test-only deterministic controller can now seek remaining targets through
direct and wall-bank approaches. It submits only bounded ordinary paddle/launch
intentions to the actual rules from their initial state; it cannot set the ball,
health, score, lives or gate phase. Co-op routes assign the returning ball to a
paddle by horizontal region and move its partner clear, with the same physical
travel limits enforced by the rules. No game assistance is added to production.

Convert this probe into regression witnesses for every authored candidate in
all three profiles and solo/co-op. Bound each attempt to 36,000 ticks. Require
all targets destroyed, the rules' terminal completion, derived correct score,
remaining lives, both co-op paddles contributing, and immutable terminal state.
Record content, intention-stream and final-state SHA-256 digests with simulated
ticks. Repeat with a JSON state round trip during play and require identical
digests/outcome. Tests exercise the actual rule step, not substituted collisions.

These witnesses establish a particular controllable completion path under the
headless rules. They do not establish human reaction fairness, touch usability,
presentation, ten-hour depth, a runtime/account checkpoint or authority. The
controller reads exact state and predicts bounces, so its timings are explicitly
automated simulation, never human qualification. Keep the public inventory null.

Run each of the 180 profile/roster combinations as its own instrumented test case,
including its restore replay and digest assertions. Combining six independent
scenarios into one test exhausted its two-minute limit on the CI runner for the
finale, although the local suite passed. Preserve that two-minute per-case limit,
the 36,000-tick simulation bound, the complete matrix and all coverage gates;
isolate scenarios instead of changing the budgets or omitting instrumentation.

These are distinct authoring requirements. Each needs actual versioned geometry,
objectives, validation and a unique content digest before it counts in the
inventory. New colours, reordered IDs or a random seed do not create a distinct
authored challenge. Names below are internal authoring labels, not final UI copy.

| ID | Authored spatial problem | Required demonstration |
| --- | --- | --- |
| pb-01 | Three separated target clusters at near, middle and far depth | Read depth and deliberately reach each cluster |
| pb-02 | Targets on opposite vertical corners with a clear central corridor | Aim in both paddle axes rather than sweep one line |
| pb-03 | A staggered diagonal ladder across four depth planes | Use changing rebound angles to traverse the sequence |
| pb-04 | Two side galleries around a solid central pier | Reach both galleries through bank shots |
| pb-05 | Far targets behind an offset near screen with two broad apertures | Choose an aperture and redirect on the far wall |
| pb-06 | Armoured anchor targets surrounded by single-hit targets | Maintain controlled repeat hits as sightlines change |
| pb-07 | One upward field and a target shelf above its exit | Account for a predictable local deflection |
| pb-08 | One downward field between vertically separated shelves | Route through or around the field for each shelf |
| pb-09 | Left/right opposing fields separated in depth | Choose which field to cross and preserve a safe return |
| pb-10 | Four target pockets around a broad field-free shaft | Alternate direct shots and influenced approaches |
| pb-11 | A slow horizontal gate before two far clusters | Time a shot through a visible opening |
| pb-12 | A vertical gate crossing a side-gallery entrance | Combine height aiming and the opening cycle |
| pb-13 | Two gates with offset periods and a clear waiting chamber | Plan a multi-stage route without a permanently blocked path |
| pb-14 | A moving gate plus an armoured far anchor | Re-enter the far volume on separate safe cycles |
| pb-15 | Two relays open independent side chambers | Select and complete both spatial routes |
| pb-16 | A near relay opens the route to a far relay and final cluster | Understand visible dependencies and route order |
| pb-17 | Three relays at different heights open a central chamber | Use independent approaches rather than one repeated volley |
| pb-18 | A relay removes a deflector, changing the best far-wall route | Adapt after a meaningful geometry change |
| pb-19 | Upper and lower galleries share a central return channel | Keep returning trajectories within controllable reach |
| pb-20 | An asymmetric corridor bends around two offset barriers | Use multiple surfaces while retaining a visible return |
| pb-21 | Gravity changes entry angle to a periodically opened vault | Combine local force reading and timing |
| pb-22 | A relay opens access to a field-controlled side vault | Sequence objectives and then adjust for local force |
| pb-23 | Armoured targets sit on both sides of a moving screen | Alternate routes as openings and target health change |
| pb-24 | Three depth chambers each require a different entry height | Change aiming strategy between authored chambers |
| pb-25 | A broad central refuge offers a safe path around two fields | Choose between reliable and precise approaches |
| pb-26 | An outer ring and a protected inner core share relay openings | Finish separate spatial objectives without trapping the ball |
| pb-27 | Mirrored side rooms have different gate periods and relay links | Read each room independently; appearance does not imply timing |
| pb-28 | A rising gallery and descending gallery converge on far targets | Select complementary routes in co-op or switch routes in solo |
| pb-29 | Three linked vaults combine armour, a bounded field and one gate | Apply the learned mechanics through a visible dependency chain |
| pb-30 | An original multi-chamber finale with two relays and changing sightlines | Sustain planning across distinct phases, with all routes validated |

Every challenge supports solo and co-op without an objective requiring two
simultaneous presses. Co-op adds shared interception and route coordination,
not exclusive content that makes solo incomplete. The tutorial is separate from
the thirty: aiming both axes, launch/return, depth cues, bank shots, armour,
relays/fields and co-op responsibilities are introduced in short replayable steps.

## Difficulty, endless and mastery

Three named profiles begin with ball speeds of 7, 9 and 11 world units/second,
five, four and three lives respectively, and corresponding paddle/field/gate
budgets. These are initial tuning values, not validated fairness. Difficulty
must change explicit decision demands and available recovery without hiding
mechanics or defeating accessibility. Ranked partitions include profile and
gameplay-affecting assists; visual-only preferences do not affect rank eligibility.

Endless play composes validated authored room grammar, not arbitrary boxes.
Each candidate is bounded by target/barrier/field counts, disjoint solids, an
acyclic relay graph, reachable required targets, safe launch clearance and a
minimum return/reaction interval. Limit candidate attempts and return a known
validated fallback for that tier. Seed, selected rooms and random state must
survive save/restore exactly. Do not publish endless-validation evidence until
tests run the actual generator and rules, including adversarial seeds.

Progression alternates banks, timing, relay dependencies and gravity choices;
speed reaches a ceiling. Each cleared stage offers a checkpoint. Meaningful
mastery includes all authored challenges, separate difficulty completion,
controlled bank-shot goals, consecutive no-drain stages and co-op shared-hit
goals. Prevent idle time, repeated checkpoint restore and duplicate terminal
projection from awarding mastery again. The host owns account achievements.

The intended depth combines distinct authored routes, mastery and varied endless
decisions. No estimated duration or automated soak proves ten hours. Retain
600 meaningful human-play minutes, predominantly touch, desktop parity and
independent depth/variety review before the title's qualification can pass.

## State, authority and presentation

### Private scene projection, 22 November

Reuse the published `@plasius/gpu-shared/game-scene@1.11.2` contract and released
`@plasius/gpu-renderer@0.2.69` for a private presentation increment. A game-owned
factory prepares original chamber, target, paddle, ball, field and health-marker
meshes and projects strictly admitted rule states into `GameSceneSnapshot` data.
It owns no canvas, clock, input, GPU resource, network, checkpoint or authority.
The shared adapter remains responsible for transforms, bounded GPU submission,
resize, cancellation and disposal. Keep both dependencies development-only until
the qualified public game entry is implemented through released runtime packages.

Visual positions must come from the same arena, ball/paddle dimensions and gate
position calculation used by collisions. Omit destroyed targets and relay-opened
barriers; show remaining armour through one/two physical markers, and distinguish
the co-op paddles by geometry as well as colour. Represent bounded gravity regions
with open frames and direction arrows, not opaque boxes obscuring the ball.
Use a perspective behind the paddle, fitted to a bounded viewport aspect ratio
(0.4–3) with a 15% chamber margin. Open paddle frames keep the attached ball
visible; one/two raised bars distinguish the slots without covering the centre.
An original dark floor/backplate replaces the renderer's outdoor background in
the visible game area. Side/ceiling boundaries remain open frames so they do not
shadow every far target. These are authored game meshes, not a new renderer option.
Map logical forward Z to native -Z, preserving X/Y, so increasing input X moves
right on screen and the native directional light reaches the visible faces.
Correct triangle winding/normals consistently with that reflection. Use static
geometry and simulation time, with no extra camera shake, flashes or idle motion.

Prepare at most 128 meshes and 120,000 vertices and keep expanded snapshots within
the published adapter's instance/vertex limits, including the rule parser's
maximum 96 targets, 12 barriers, four fields and two paddles. Return fresh owned
mesh buffers and detached snapshot trees. Reject foreign/malformed state through
the existing rule parser before projection; presentation cannot amend gameplay.
The host will provide translated semantic HUD and instructions outside the
canvas. This increment does not establish accessible controls or human/device
qualification and remains outside every public bundle and content inventory.

Requirement tests precede implementation: genuine X/Y/Z bounds, projection/input
direction, outward normals and finite material channels; health, relay and moving
gate transitions; profile-specific paddles; exact snapshot identity/time; detached
inputs/outputs and rejection of foreign state; all authored stages/profiles/
rosters and worst-case admitted geometry fit the shared limits. Exercise the
published adapter with an injected renderer to inspect the actual expanded frame,
and separately inspect a native browser frame. A stubbed adapter proves contract
compatibility only; browser smoke is not phone performance or touch qualification.

Parse a strict, versioned game-owned state: selected challenge/tier/profile,
slot/paddle targets and button edges, ball position/velocity, target health,
relay/barrier state, gate phase, bounded score/lives/combo, objectives and terminal
state. Reject foreign IDs, nonfinite or out-of-range coordinates, impossible
health/progress, duplicate IDs, illegal roster changes and future versions.
Validate cross-field invariants, not just field types. Mutating a returned
snapshot must not mutate live rules state. No migration exists until explicitly
implemented and tested against a real prior version.

Authority's terminal evaluator reads the actual final snapshot. It captures
fixed game/rules/content/profile/assist partitions and team outcome; clients
never supply final score or eligibility. Repeated finalisation returns the same
candidate. Host transaction/outbox handling must not award progress twice.

The native raster view provides clear object depth, paddle/ball contrast,
projected return guidance and target-health/relay cues. Use original geometry
and audio with recorded provenance. No copied layouts, classic sprite silhouettes
or recordings. Pending working-title review remains separate from asset authorship.
Sound events are bounded per tick and have visual equivalents. HUD/objectives,
pause, launch, remaining lives and completion are semantic outside the canvas.

Respect reduced motion, colour-independent cues, 44 CSS-pixel controls,
handedness, orientation/safe areas, keyboard focus and non-drag controls. Device
loss preserves an account-scoped checkpoint where permitted and disposes owned
GPU resources; unsupported WebGPU is an explicit state, not a renderer fallback.
Scene replacement and hidden solo tabs dispose/pause through existing lifecycle.
Online UI reports reconnect/leave instead of implying a client pauses the room.

## Requirement-derived verification before source implementation

| Boundary | Required tests / evidence |
| --- | --- |
| Input | Equivalent touch/mouse/keyboard target sequences; launch edges and release-after-drain; neutral missing ticks; pointer cancellation; movement bound; invalid slots/axes/bits; left/right-handed controls |
| Geometry | High-speed face/corner sweeps without tunnelling, separating time-zero contact, stable equal-hit order, bounded eight-contact handling, no shared-target double damage/score |
| Rules | Genuine X/Y/Z target reach, steering speed bounds, armour/relay/gate/field transitions, drain/life handling, terminal immutability and safe score caps |
| Content | Thirty distinct authored artifacts/objective routes, no intersecting or unreachable mandatory geometry, separate tutorial, all three real profiles and co-op/solo completion witnesses |
| Generation | Fixed-seed replay, safe starts, solvable relay graph, reachable targets and reaction budget, bounded candidate attempts and known fallback; actual rule execution validates representative/adversarial seeds |
| Checkpoints | Exact replay after restore, random/gate/button continuity, rejected foreign/future/impossible states, no implicit migration, account boundaries delegated to runtime/host |
| Authority | Client score forgery rejection, roster identity, reconnect continuity, immutable result partitions, duplicate result/outbox projection and abandoned-match behavior |
| Presentation | Native WebGPU on supported phone/tablet/desktop; visible depth/collisions; semantic HUD, non-drag controls, focus/reflow, colour/reduced-motion/audio alternatives; GPU loss/disposal |
| Distribution | Root remains lazy; only selected game code loads; isolated ESM/CJS/strict type consumers; exact public inventory and rights evidence; released Plasius dependencies only |
| Qualification | Human ten-hour record, independent depth review, real device/thermal/long-session evidence, 100-player authority/cost qualification and approved package/site CI/CD remain separate |

All changed source must appear in combined LCOV and each coverage metric stay at
least 80%. Verify types, lint, full build, dependency audit and packed consumers.
Update README, Unreleased, translation ownership and original-rights records with
the implemented behavior. No network request, per-frame telemetry, identity or
raw input enters a public metric; game hooks hand bounded counts to host-owned
analytics/NFR transport. Do not mark Task #2 complete from this plan alone.
