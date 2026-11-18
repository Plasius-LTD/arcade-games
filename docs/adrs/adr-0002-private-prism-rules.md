# ADR 0002: Test Prism Breaker rules before public game integration

Status: accepted for implementation. Date: 18 November 2026.
Task arcade-games #2; site Story #2423 / Feature #2391 / Epic #2382.

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
