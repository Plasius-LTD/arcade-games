# ADR 0003: Explicit qualified release batches

Status: accepted for implementation, 24 November 2026. Task #42; site Feature
#2389, Story #2421, host Task #2452, Epic #2382 and ADR 0198.

The owner requested first-batch public delivery. Replace the all-24 simultaneous
launch sequence with an explicit nonempty selection of exact game/rules/content
versions and implementation artifacts. Keep all 24 titles in the programme and
retain every content, rights, human-depth, device, accessibility, online and
delivery requirement for selected games.

Add `parseReleaseBatch` and `inspectReleaseBatch` to the metadata-only root.
Reuse released Plasius schema and existing entry/evidence parsers. Strict bounded
records and exact identity/version/digest binding prevent selection ambiguity.
The inspector reports both batch and per-title structural gaps. Any incomplete
member makes the whole batch structurally incomplete; never auto-select passing
members. Unknown/extra/duplicate/invalid entries also prevent an empty gap list.

The host owns current trusted selection/evidence retrieval, authentication,
artifact verification, stored controls, backend capabilities and eligibility.
No parsed record or empty structural-gap list is an authorization decision.
No game import, network, flag evaluation, credential or telemetry is added here.
Legacy per-game APIs and independent lazy subpaths keep their behavior.

Actual entries remain planned/null with pending rights. Release this contract
through approved main CD before consumer adoption. This decision does not claim
a published package, playable title, human qualification or public rollout.
