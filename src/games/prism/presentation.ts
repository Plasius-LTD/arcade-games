import type { GameSceneMesh, GameSceneSnapshot, GameSceneInstance } from "@plasius/gpu-shared/game-scene";
import { createPrismRules, parsePrismStage, prismBarrierAt, PRISM_PROFILES, PRISM_WORLD,
  type PrismBox, type PrismProfileId, type PrismVector } from "./rules.js";

// Original game-owned mesh authoring. GPU transforms, validation, scheduling and
// disposal belong to the published shared game-scene adapter, not this module.
type Colour = readonly [number, number, number];
const colours = {
  arena: [0.16, 0.24, 0.34], target: [0.035, 0.35, 0.62], relay: [0.3, 0.06, 0.55],
  barrier: [0.08, 0.13, 0.22], gate: [0.5, 0.25, 0.02], field: [0.06, 0.27, 0.21],
  ball: [1, 0.94, 0.52], mark: [0.94, 0.96, 1], a: [0.12, 0.52, 0.92], b: [0.9, 0.3, 0.06],
} satisfies Record<string, Colour>;
const add = (a: readonly number[], b: readonly number[], amount = 1): PrismVector =>
  [a[0]! + b[0]! * amount, a[1]! + b[1]! * amount, a[2]! + b[2]! * amount];
const cross = (a: readonly number[], b: readonly number[]): PrismVector =>
  [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!];
const mirror = ([x, y, z]: readonly number[]): PrismVector => [x!, y!, -z!];
const centre = (bounds: PrismBox): PrismVector => bounds.min.map((v, i) => (v + bounds.max[i]!) / 2) as PrismVector;
const halfSize = (bounds: PrismBox): PrismVector => bounds.min.map((v, i) => (bounds.max[i]! - v) / 2) as PrismVector;

function triangle(output: number[], a: PrismVector, b: PrismVector, c: PrismVector, colour: Colour) {
  // Logical forward becomes native -Z; reverse winding with the reflection.
  const points = [mirror(a), mirror(c), mirror(b)];
  const n = cross(add(points[1]!, points[0]!, -1), add(points[2]!, points[0]!, -1));
  const length = Math.hypot(...n), normal = n.map(v => v / length);
  for (const point of points) output.push(...point, ...normal, ...colour, 0.65, 0.05, 0);
}

function cuboid(output: number[], origin: PrismVector, half: PrismVector, colour: Colour) {
  const points = Array.from({ length: 8 }, (_, i) => origin.map((v, axis) => v + half[axis]! * ((i & (1 << axis)) ? 1 : -1)) as PrismVector);
  for (const [a, b, c, d] of [[0, 2, 3, 1], [4, 5, 7, 6], [0, 4, 6, 2], [1, 3, 7, 5], [0, 1, 5, 4], [2, 6, 7, 3]]) {
    triangle(output, points[a!]!, points[b!]!, points[c!]!, colour);
    triangle(output, points[a!]!, points[c!]!, points[d!]!, colour);
  }
}

function frame(output: number[], origin: PrismVector, half: PrismVector, thickness: number, colour: Colour) {
  for (let axis = 0; axis < 3; axis++) {
    const across = (axis + 1) % 3, vertical = (axis + 2) % 3;
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      const at: PrismVector = [...origin], size: PrismVector = [thickness, thickness, thickness];
      at[across]! += a * (half[across]! - thickness); at[vertical]! += b * (half[vertical]! - thickness);
      size[axis] = half[axis]!;
      cuboid(output, at, size, colour);
    }
  }
}

function arrow(output: number[], force: PrismVector, length: number) {
  const magnitude = Math.hypot(...force);
  if (!magnitude) return;
  const direction = force.map(v => v / magnitude) as PrismVector;
  const perpendicular = cross(direction, Math.abs(direction[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]);
  const size = Math.hypot(...perpendicular), right = perpendicular.map(v => v / size);
  const up = cross(right, direction), base = direction.map(v => -v * length / 2) as PrismVector;
  const tip = direction.map(v => v * length / 2) as PrismVector;
  const ring = [add(base, right, length * 0.2), add(base, up, length * 0.2), add(base, right, -length * 0.2), add(base, up, -length * 0.2)];
  for (let i = 0; i < 4; i++) triangle(output, tip, ring[(i + 1) % 4]!, ring[i]!, colours.mark);
  triangle(output, ring[0]!, ring[1]!, ring[2]!, colours.mark);
  triangle(output, ring[0]!, ring[2]!, ring[3]!, colours.mark);
}

const instance = (id: string, meshId: string, position: PrismVector): GameSceneInstance => ({
  id, meshId, position: mirror(position), scale: 1,
  basis: { right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, 1] },
});

/** Private pure projection; callers own runtime/authority, semantic UI and the released GPU adapter. */
export function createPrismPresentation(rawStage: unknown, slots: readonly string[], profileId: PrismProfileId) {
  const stage = parsePrismStage(rawStage), rules = createPrismRules(stage, slots, profileId), profile = PRISM_PROFILES[profileId];
  const prepared: GameSceneMesh[] = [];
  const mesh = (id: string, author: (output: number[]) => void) => {
    const output: number[] = []; author(output); prepared.push({ id, vertices: new Float32Array(output) });
  };
  mesh("arena", output => {
    const limits = { min: [...PRISM_WORLD.minimum] as PrismVector, max: [...PRISM_WORLD.maximum] as PrismVector };
    // Authored enclosure: open at the player, with a dark backplate beyond the
    // collision chamber. This does not change the shared renderer's sky policy.
    cuboid(output, [0, 0, 14.2], [100, 100, 0.05], [0.015, 0.025, 0.055]);
    // Keep the side/ceiling boundaries open frames so they cannot shadow every
    // far target. A floor and backplate still give depth and a stable backdrop.
    cuboid(output, [0, -5.04, 0.5], [7, 0.04, 13.5], [0.035, 0.05, 0.08]);
    frame(output, centre(limits), halfSize(limits), 0.035, colours.arena);
    for (const z of [-4, 3, 10]) {
      cuboid(output, [0, -4.97, z], [7, 0.03, 0.03], colours.arena);
      cuboid(output, [0, 4.97, z], [7, 0.03, 0.03], colours.arena);
    }
  });
  mesh("ball", output => {
    const r = PRISM_WORLD.ballRadius, equator: PrismVector[] = [[r, 0, 0], [0, 0, r], [-r, 0, 0], [0, 0, -r]];
    for (let i = 0; i < 4; i++) {
      triangle(output, [0, r, 0], equator[(i + 1) % 4]!, equator[i]!, colours.ball);
      triangle(output, [0, -r, 0], equator[i]!, equator[(i + 1) % 4]!, colours.ball);
    }
  });
  mesh("health-mark", output => cuboid(output, [0, 0, 0], [0.035, 0.08, 0.015], colours.mark));
  for (let i = 0; i < slots.length; i++) mesh(`paddle-${i}`, output => {
    const colour = i ? colours.b : colours.a, x = profile.paddleX, y = profile.paddleY, z = PRISM_WORLD.paddleHalfDepth;
    for (const side of [-1, 1]) cuboid(output, [side * (x - 0.075), 0, 0], [0.075, y, z], colour);
    cuboid(output, [0, -y + 0.075, 0], [x - 0.15, 0.075, z], colour);
    cuboid(output, [0, y - 0.075, 0.025], [x - 0.15, 0.075, z - 0.025], colour);
    for (let bar = 0; bar <= i; bar++) cuboid(output, [(bar - i / 2) * 0.22, y - 0.075, -0.225], [0.04, 0.055, 0.025], colours.mark);
  });
  stage.targets.forEach((target, i) => mesh(`target-${i}`, output => {
    const half = halfSize(target.bounds);
    cuboid(output, [0, 0, 0], half, target.opens.length ? colours.relay : colours.target);
    if (target.opens.length) {
      const r = Math.min(half[0], half[1]) * 0.85, z = -half[2] - 0.045;
      const ring: PrismVector[] = [[r, 0, z], [0, r, z], [-r, 0, z], [0, -r, z]];
      for (let corner = 0; corner < 4; corner++) {
        const a = ring[corner]!, b = ring[(corner + 1) % 4]!;
        const innerA: PrismVector = [a[0] * 0.75, a[1] * 0.75, z], innerB: PrismVector = [b[0] * 0.75, b[1] * 0.75, z];
        triangle(output, a, innerB, b, colours.mark); triangle(output, a, innerA, innerB, colours.mark);
      }
    }
  }));
  stage.barriers.forEach((barrier, i) => mesh(`barrier-${i}`, output => cuboid(output, [0, 0, 0], halfSize(barrier.bounds), barrier.motion ? colours.gate : colours.barrier)));
  stage.fields.forEach((field, i) => mesh(`field-${i}`, output => {
    const half = halfSize(field.bounds), minimum = Math.min(...half);
    frame(output, [0, 0, 0], half, Math.min(0.025, minimum / 8), colours.field);
    arrow(output, field.force, Math.min(1.2, minimum));
  }));

  /** Fresh buffers: preparing another adapter cannot mutate an existing scene. */
  function readMeshes(): GameSceneMesh[] {
    return prepared.map(({ id, vertices }) => ({ id, vertices: vertices.slice() }));
  }

  /** Admits actual game state without granting authority or changing gameplay. */
  function project(rawState: unknown, aspectRatio = 16 / 9): GameSceneSnapshot {
    if (!Number.isFinite(aspectRatio) || aspectRatio < 0.4 || aspectRatio > 3) throw new TypeError("invalid-prism-viewport");
    const state = rules.parseState(rawState), instances: GameSceneInstance[] = [instance("arena", "arena", [0, 0, 0]), instance("ball", "ball", state.ball.position)];
    state.paddles.forEach((paddle, i) => instances.push(instance(`paddle-${i}`, `paddle-${i}`, [paddle.x, paddle.y, PRISM_WORLD.paddleZ])));
    const opened = new Set<string>();
    stage.targets.forEach((target, i) => {
      const remaining = state.health[i]!.remaining;
      if (!remaining) { target.opens.forEach(id => opened.add(id)); return; }
      const at = centre(target.bounds);
      instances.push(instance(`target-${i}`, `target-${i}`, at));
      for (let bar = 0; bar < remaining; bar++) instances.push(instance(`health-${i}-${bar}`, "health-mark",
        [at[0] + (bar - (remaining - 1) / 2) * 0.14, at[1], target.bounds.min[2] - 0.02]));
    });
    stage.barriers.forEach((barrier, i) => {
      if (!opened.has(barrier.id)) instances.push(instance(`barrier-${i}`, `barrier-${i}`, centre(prismBarrierAt(barrier, state.tick))));
    });
    stage.fields.forEach((field, i) => instances.push(instance(`field-${i}`, `field-${i}`, centre(field.bounds))));
    const fov = 70, distance = Math.max(PRISM_WORLD.maximum[1], PRISM_WORLD.maximum[0] / aspectRatio) * 1.15 / Math.tan(fov * Math.PI / 360);
    return { type: "gameScene", version: "1.0.0", tick: state.tick, time: state.tick * PRISM_WORLD.tickSeconds,
      camera: { eye: [0, 0, distance - PRISM_WORLD.minimum[2]], target: [0, 0, -2], fov }, instances };
  }
  return { readMeshes, project };
}
