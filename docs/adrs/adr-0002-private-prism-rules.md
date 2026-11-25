# ADR 0002: Test Prism Breaker rules before public game integration

Status: accepted for implementation. Date: 18 November 2026.
Task arcade-games #2; site Story #2423 / Feature #2391 / Epic #2382.

The 24 November tutorial increment adds six independently authored private
practice stages and stable instruction/objective keys. Existing strict rules and
scene projection remain their only game/graphics implementation. No additional
runtime, input framework, random generator or progression store is introduced.
Actual completion/restore tests cover three profiles and solo/co-op; interactive
lesson progression and human/device evaluation remain with the released host.
The lessons do not count toward thirty campaign challenges and are not shipped
through public entries before integration and qualification.

The three arcade packages await first publication and the site awaits the
published dependency replacement under site #2539. Rules development can proceed
using released schema and physics without importing an unpublished runtime or
claiming that a catalogue entry is playable.

Keep the single-stage rules in `src/games/prism/rules.ts`, absent from all public
entry imports. `@plasius/gpu-physics@0.1.19` is a development dependency while
this code is excluded from shipped bundles. Move it to a runtime dependency
when a separately reviewed game integration exports the engine. The exact
153-path public inventory, metadata-only root and pending rights/content records
stay intact. Test both the source behavior and real bundle exclusion.

The host adapter will consume published runtime inputs, timing, checkpoints,
randomness and multiplayer authority. This core accepts only bounded game-owned
intentions and executes one 1/60-second rule step; it opens no browser, clock,
queue, network, storage, telemetry or audio service. State parsing uses the
released schema; all sphere/box queries and kinematic integration use the
published physics collision entry. Game-specific reflection, steering and
damage remain here.

Use stable object/slot order, relative sweeps for moving paddles and gates,
eight contacts per tick, once-per-target-per-tick damage and detached state.
Retain an explicit release after a drain and neutral omitted input. Scoring
comes only from target health transitions and is checked against restored
health. Terminal state freezes. Runtime pause, campaign transitions and result
verification are outside this core.

Structural authoring checks reject intersecting solids and gate envelopes;
they do not prove reachability, reaction fairness or level solvability. This
increment supplies no authored challenge inventory, graphics, endless generator,
online integration or human depth evidence. None of those gates is relaxed.
`arcade.games.prism-breaker.enabled` and the complete public-launch barrier
remain disabled; the unpublished core adds no capability or rollout override.

The next increment adds thirty individually specified candidate stages in the
same private module boundary. Box/room helpers construct geometry only; they do
not generate campaign layouts or duplicate runtime randomness. Strict stage
parsing returns detached content and fails on unknown identities. Public entries
still do not import the rules or authored geometry, with real-bundle tests for
both exclusions. A future content release needs reviewed immutable artifacts
and an inventory; these private candidates do not populate that inventory.

Test-only route screening uses the published swept-sphere query on a bounded
one-unit grid. It conservatively treats a gate's entire travel envelope as solid,
removes geometrically contacted targets and follows their relay links. Negative
sealed/self-locked fixtures prevent trivial success. This detects some authoring
errors but deliberately ignores actual paddle control, gravity, lives and gate
timing; it is neither a ball-trajectory completion witness nor human evidence.
Actual rules launch/restore tests separately cover all candidates in every
profile with one/two slots. Solvability and fairness remain explicit later gates.

Controlled completion witnesses now supplement the geometric check. A test-only
pilot supplies legal intentions from initial state, and the real rule step alone
updates gameplay. Every candidate/profile/roster must reach completion within
36,000 ticks, retain lives, derive the correct score and have both co-op paddles
contribute. Content, intention-stream and final-state hashes bind each witness;
a mid-play state serialization round trip must reproduce it. Terminal gameplay
must remain frozen. The pilot uses exact-state bounce prediction, so these are
automated trajectory witnesses only. No public assist, human fairness/depth
evidence, host checkpoint or authority proof is introduced.

The private presentation increment uses the published gpu-shared 1.11.2
`game-scene` contract and gpu-renderer 0.2.69. The game owns original mesh data
and strict rule-state projection; the shared adapter owns validation, transforms,
GPU work, resize and disposal. It introduces no competing animation loop, input,
camera gesture handler or resource manager. Both packages stay development-only
while the public entries exclude this code.

Collision and presentation share frozen arena/ball/paddle dimensions and the
same gate-position function, preserving the recorded gameplay trajectories.
Projection admits state through the existing rules and returns detached scene
trees. Logical forward maps to native -Z with corrected triangle winding, keeping
input X rightward and lighting on visible faces. Camera fit accepts a bounded
viewport ratio. Mesh preparation and expansion must fit the published adapter's
limits even at maximum rule content. Real-adapter contract tests and a separate
native browser smoke complement the headless rules. This does not establish a
production host, full accessible presentation, physical-phone performance or
human qualification; those gates remain unchanged.

The private endless increment retains this boundary. Game-owned finite room
grammar and recipe validation live in `src/games/prism/endless.ts`; a caller
supplies random draws, and the future released runtime remains the sole owner
of seeded state and checkpoints. Recipe reconstruction performs no random draw.
Four bounded selection attempts followed by a known admitted nonrecent recipe
avoid unbounded regeneration. All finite geometry/profile/roster combinations
are exercised through the real rules, not a geometry-only solvability claim.
Public entries, rights records and qualification remain unchanged; automated
completion cannot establish human duration or fairness.

The private challenge mastery projection keeps achievement evaluation in the
game while account authority and atomic persistence stay in the host. It reuses
the canonical challenge and terminal-state parsers and stores only bounded,
monotonic per-challenge/profile/mode facts. A repeated terminal result or restored
copy cannot add another distinct clear or re-emit an already-complete goal when
applied to current progress. No elapsed time, database, ledger or shared
achievement framework is added. The existing player-system achievement read
model can display curated results later; it does not own these game rules.
Shape-valid input remains untrusted unless the host authenticates its origin and
commits against current account state. Public inclusion, bank/streak objectives
and human/device qualification remain pending.
