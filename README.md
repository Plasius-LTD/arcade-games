# @plasius/arcade-games

Lazy catalogue and original spatial game content contracts for the Plasius arcade.
This package is under development and unpublished. No game is playable or
qualified by these catalogue records. All 24 game implementations, rights
clearance and human/device/online evidence remain required before public launch.

Work: [Task #1](https://github.com/Plasius-LTD/arcade-games/issues/1),
[Feature #2389](https://github.com/Plasius-LTD/plasius-ltd-site/issues/2389),
[Epic #2382](https://github.com/Plasius-LTD/plasius-ltd-site/issues/2382).
See [design](docs/design/catalogue-and-content.md).

Use the schema template's Node/npm setup. Tests are derived from the Project
acceptance criteria before implementation. Every source must appear in combined
LCOV with at least 80% coverage; types, lint, build, audit, public tarball checks
and isolated dual-module consumers are required. Publish only through protected
main `.github/workflows/cd.yml` and GitHub `production`, after the reviewed
first-registration route and operator authorization. Never publish locally.

The host evaluates `arcade.catalogue.enabled`, game/platform controls and
capabilities. All remain disabled; rollback stops new admission and preserves
progress. No environment override or catalogue readiness shortcut exists.

Apache-2.0. Public legal templates are in `legal/`; private contributor records
and private rights evidence must remain outside this repository/package.
