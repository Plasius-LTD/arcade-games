# Private Prism scene verification

22 November 2026. Task [arcade-games #2](https://github.com/Plasius-LTD/arcade-games/issues/2),
site Story #2423 / Feature #2391 / Epic #2382. The public entry is still planned
and has no content or qualification record.

## Requirements and implementation

The requirement suite failed before `presentation.ts` existed. Browser inspection
then found a distant fixed camera, a held ball hidden by solid paddles and dim
far targets. Additional failing regressions required viewport fitting and a clear
central paddle sightline. Open paddle meshes preserve the collision extents;
one/two raised bars and relay diamonds provide shape cues. Logical forward maps
to the native renderer's -Z axis with reversed winding. An original floor and
backplate provide depth; open side/ceiling frames preserve illumination.

Thirty authored stages in every profile and roster produce strict detached
`gameScene/1.0.0` snapshots. Tests cover genuine X/Y/Z geometry, finite channels,
triangle normals/winding, actual damage and relay transitions, both gate axes,
foreign-state rejection and copied meshes. Maximum rule content (96 targets,
12 barriers, four fields, two paddles) passes through the real published
game-scene adapter and its expanded-frame limits with an injected renderer.
That renderer test is contract evidence, not a native GPU result.

Local validation passed on Node 24.18.0/npm 11.19.1: 385 Vitest cases plus 24
privacy tests, type checking, lint, a clean lockfile install and the full dual
build. The instrumented suite took 209 seconds and reproduced every unchanged
completion digest. Combined LCOV is 95.46% lines, 95.69% branches and 99.58%
functions. All three changed game source files are present: presentation and
authored challenges have 100% coverage; rules have 100% lines/functions and
97.35% branches. Full npm audit including development dependencies reports zero
findings. This audit result does not satisfy the separately tracked Picomatch
removal; its replacement remains pending published `@plasius/glob` adoption.

## Reproduce the native browser check

After `npm ci`, run the local installed Vite server:

```sh
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4186 --strictPort
```

Open `http://127.0.0.1:4186/tests/fixtures/prism-scene.html` in a WebGPU-capable
desktop browser. The fixture is development-only and excluded from the package.
Choose pb-01 and pb-29; advance gates, move the first paddle right/up, and launch.
The controls use ordinary intentions and real rule ticks, without a second game
clock or public runtime. The status panel reports rule and presentation state.

The 24 November endless increment extends the same selector with all 96 finite
room recipes. Select each family at tier 2 and reflected choices to inspect
vault sightlines, moving-shutter reflection and local current arrows. These
are direct recipe reads with the same ordinary tick controls, not a seeded
runtime, interactive game host or new animation loop.

The 24 November native desktop smoke rendered reflected tier-two bank, shutter,
relay and current rooms. Ordinary movement/launch reached tick 80 for relay and
current rooms, and gate advancement reached tick 150 for bank/shutter rooms;
their reported renderer queues were empty with no adapter error. The current
room also rendered after the interrupted browser-control session recovered.
The attempted narrow-view helper check was interrupted before a result returned,
so narrow-view state preservation, disposal and browser-log checks for this
increment remain unverified. Far targets and current arrows need further
readability assessment in the playable host. These observations do not qualify
touch controls, physical devices, performance or human play depth.

For a separate narrow view, call `await prismSmoke.resize(320, 560)` in that
fixture's developer console. This test helper explicitly destroys and recreates
the adapter at the new viewport, retaining rule state; it does not qualify a
production resize policy or claim continuous GPU-resource reuse. Call
`prismSmoke.destroy()` to inspect teardown. Restart the development server after
edits if filesystem watching retains a stale transformed module.

## Observed native result and limits

Native frames rendered at 960×540 and 320×560. In pb-29 the fixture advanced to
tick 230 through gate progression, right/up paddle movement and a launch; the
ball was playing at its real 3D position. Four offers produced four completed
desktop frames with no queued/in-flight work. Recreating the narrow adapter
rendered the same tick without changing rule state. Explicit teardown returned
destroyed with zero queued/in-flight work. The inspected browser console had
zero errors or warnings. Captures are local validation artifacts under
`output/playwright/`, not shipped game assets.

This is one desktop browser and a narrower canvas, not a physical phone test,
touch control evaluation, contrast/accessibility certification, sustained frame
rate or thermal run. Small far targets/ball visibility, host HUD and guidance,
camera updates while paused, real touch/keyboard input, audio, GPU recovery and
long-session qualification still need the published-runtime host implementation.
Tutorial/endless, authority, rights approval and ten-hour human review remain
required. No package publication or production arcade availability is asserted.
