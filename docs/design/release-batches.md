# Qualified release batches

The owner requested the first batch on the public site on 24 November 2026.
Tracked work: arcade-games #42, site Feature #2389 / Story #2421 / Task #2452.
This changes the earlier all-24 launch sequence, not any per-game acceptance
requirement. The 24-title catalogue and outstanding game work remain in scope.

## Contract and ownership

Reuse released `@plasius/schema`, the existing manifest/content/qualification
parsers and `inspectGameEvidence`. Add a metadata-only root contract; do not
import a game engine, fetch records, read flags or implement host authorization.

An `arcadeReleaseBatch` version `1.0.0` has a stable batch `id` and 1–24 unique
members. Each member pins a known `gameId`, exact `rulesVersion`, `contentVersion`
and implementation `artifact` reference/digest. The record is strict, detached
and limited to 16 KiB. It is a proposed release selection, not approval evidence.
An empty batch, unknown/duplicate identity, unsupported version, wildcard version,
unbounded record or extra field is invalid.

`inspectReleaseBatch` inspects exactly the supplied batch entries. It reports
missing members, duplicates, unexpected entries, malformed records, changed
versions/artifacts and every existing per-game structural evidence gap. It must
not automatically add other catalogue titles or select whichever entries happen
to pass. An unselected title's development status does not block a batch. The
output contains structural gaps only, never an authorization or readiness flag.
Any member gap also emits `incomplete-batch` at batch level, so a caller cannot
mistake a partly complete selection for a structurally complete batch.
All records used by inspection are validated and detached; caller mutation cannot
change earlier results. Input count is bounded by the 24-title catalogue.

The site must authenticate the current approved batch/evidence source and verify
immutable artifacts. It then composes stored master/platform/per-game controls,
backend capabilities, account/guardian eligibility and all required mode/service
evidence. Empty, untrusted, stale or incompletely qualified selections fail
closed. Qualified metadata alone grants no access. Rollback denies new admission
while preserving saves. No production selection or rollout changes in this work.

## Requirements to test before source changes

- One and multiple selected games can be structurally complete; a full 24-title
  batch remains supported without making it mandatory.
- Planned, missing, malformed, duplicated and unexpected entries cannot pass.
- Changed rules/content versions or artifact ID/digest cannot reuse evidence.
- Tutorial, 30 authored challenges, three profiles, mastery, validated endless,
  original rights, meaningful 600-minute predominantly-touch human review,
  desktop parity, independent depth review, devices, WCAG 2.2 AA, every declared
  online mode and approved delivery evidence are unchanged requirements.
- Strict record/entry bounds, deterministic diagnostics, input detachment and no
  imports or side effects during inspection; legacy APIs keep their behavior.
- New public APIs appear in both module formats and declarations, actual lazy
  boundaries and the existing exact package inventory remain verified.
- All changed source appears in combined LCOV, coverage stays at least 80%, and
  types/lint/build/security/privacy/pack/consumer checks pass before CI/release.

No automated fixture is human evidence. Actual game records remain planned and
unqualified. Publish through the approved main `cd.yml`/`production` route before
any site consumer imports this contract.
