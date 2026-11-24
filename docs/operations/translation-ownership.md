# Translation and host ownership

Task #1. The package owns stable translation keys and game/mode identities. The
site owns translated strings, locale selection, typography, semantic HUD and
accessible interaction. Keys are validated against each stable game slug:

- `arcade.games.<slug>.title`
- `arcade.games.<slug>.description`
- `arcade.games.<slug>.objectives`
- `arcade.games.<slug>.instructions.touch`
- `arcade.games.<slug>.instructions.keyboard`
- `arcade.games.<slug>.instructions.mouse`
- Authored mastery keys under `arcade.games.<slug>.mastery.`

The initial manifest working title is provisional and must not replace title
clearance or translated UI copy. Per-game tasks must document actual controls and
objectives before site translation/QA. Touch remains primary with keyboard/mouse
parity. Side panels, focus, non-drag controls, safe areas and 44-pixel targets
belong to the shared workspace/site integration and device qualification.

The backend evaluates capabilities and stored flags; the frontend consumes those
decisions. The package neither fetches policy nor trusts environment overrides.
Public unavailable states must reflect missing implementation/evidence. Disabling
a title stops new admission without deleting saves. Every title and specified
mode in an explicitly approved batch must qualify before that batch launches;
unselected titles remain unavailable. See
[ADR 0003](../adrs/adr-0003-qualified-release-batches.md) for the owner's
24 November 2026 sequencing change and the host's exact selection/evidence duties.
