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
- Private Prism tutorial instruction/objective keys under
  `arcade.games.prism-breaker.tutorial.pt-01` through `pt-06`.

The tutorial's proposed English baseline below records intent for later site
translation and usability review. It is not a deployed translation bundle or
completed interactive tutorial. The host must provide non-drag directional
controls and desktop equivalents, pause/retry/advance and semantic feedback.

| Lesson | Instruction (`.instruction`) | Objective (`.objective`) |
| --- | --- | --- |
| `pt-01` | Position the paddle, then press Launch. Meet the returning ball with the paddle to send it back into the chamber. | Clear both practice targets. |
| `pt-02` | Move the paddle horizontally and vertically. Targets occupy different depths; use the ball's return to aim at the next target. | Clear the near, middle and far targets. |
| `pt-03` | The pillar blocks the centre. Use the side walls to change the ball's path around it. | Clear the targets on both sides of the pillar. |
| `pt-04` | Two bars mark armour. Strike the diamond-marked relay twice to open the chamber door. | Open the door and clear the target inside. |
| `pt-05` | Watch the gate move across the chamber. Aim through the opening or around the gate; a gate contact returns the ball. | Clear all three targets beyond the moving gate. |
| `pt-06` | The outlined field bends the ball upwards. Its arrow shows the force direction. Adjust your paddle position for the curved return. | Clear both targets beyond the gravity field. |

The initial manifest working title is provisional and must not replace title
clearance or translated UI copy. Per-game tasks must document actual controls and
objectives before site translation/QA. Touch remains primary with keyboard/mouse
parity. Side panels, focus, non-drag controls, safe areas and 44-pixel targets
belong to the shared workspace/site integration and device qualification.

The backend evaluates capabilities and stored flags; the frontend consumes those
decisions. The package neither fetches policy nor trusts environment overrides.
Public unavailable states must reflect missing implementation/evidence. Disabling
a title stops new admission without deleting saves. Following the owner's
24 November first-batch direction (site ADR 0198), every selected title and mode
must qualify before its batch launches; unselected titles remain unavailable.
