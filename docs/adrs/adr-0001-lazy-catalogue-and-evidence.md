# ADR 0001: Lazy game subpaths and explicit evidence gaps

Status: accepted for implementation. Date: 16 November 2026. Task #1;
site Story #2421 / Feature #2389 / Epic #2382.

The all-24 simultaneous public barrier is refined by
[ADR 0003](adr-0003-qualified-release-batches.md), following the owner's
24 November 2026 first-batch delivery instruction. Per-game evidence and all
package/host authority boundaries below remain unchanged.

Keep stable save/permalink identities separate from working display names. Publish
one metadata-only root and independent statically enumerated game subpaths.
Retain actual dynamic imports in both module formats; declaration/build output
is self-contained per entry. The real built-bundle regression test enforces this
because a configuration string alone did not prevent the bundler inlining all
game modules. Sequential builds avoid concurrent cleanup and bound build work.

Reuse released Plasius schema for strict records. Runtime, multiplayer, GPU,
physics, audio and site account/graph capabilities retain their existing roles.
Initial manifests explicitly contain planned implementations, pending original
rights and null content/qualification. There are no playable placeholders or
unreleased workspace dependencies. Per-game Tasks add real rules/content after
owning-package releases, using these stable subpaths.

Content records identify authored artifacts, distinct difficulty profiles and
valid generation mechanisms. Separate qualification records bind reviewed
evidence to exact versions and implementation artifacts. Structural inspection
reports gaps without authenticating evidence or granting access. The host must
retrieve current trusted records and verify digests/immutable versions before
the full launch decision. No seeds, elapsed idle time or catalogue metadata can
replace human depth/device/authority/rights qualification.

The host evaluates stored `arcade.catalogue.enabled`, per-game/platform flags,
`arcade.view`/`arcade.play` and the complete public launch barrier. All remain
disabled. Rollback stops new admission while preserving saves and evidence.
No local/environment authorization override is introduced.

Opaque evidence IDs/digests belong in these public contracts. Private legal
documents, contributor acceptance and account identities remain in approved
stores. Public packaging rejects implemented content without approved public
redistribution evidence and enforces an exact artifact inventory.
