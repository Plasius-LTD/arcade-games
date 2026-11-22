import { createSchema, field } from "@plasius/schema";
import { integrateKinematic, intersectAabbs, sweepSphereAabb, type CollisionSweepHit } from "@plasius/gpu-physics/collision";
import { distinct, exact, integer, parseRecord, slug } from "../../validation.js";

export type PrismVector = [number, number, number];
export interface PrismBox { min: PrismVector; max: PrismVector }
export interface PrismTarget { id: string; bounds: PrismBox; health: number; opens: string[] }
export interface PrismMotion { axis: 0 | 1; travel: number; periodTicks: number; phaseTicks: number }
export interface PrismBarrier { id: string; bounds: PrismBox; motion: PrismMotion | null }
/** Authoring geometry, not evidence of solvability or launch qualification. */
export interface PrismStage {
  type: "prismStage"; version: "1.0.0"; id: string;
  targets: PrismTarget[]; barriers: PrismBarrier[];
  fields: { id: string; bounds: PrismBox; force: PrismVector }[];
}
export type PrismProfileId = "accessible" | "standard" | "expert";
export const PRISM_PROFILES = Object.freeze({
  accessible: Object.freeze({ speed: 7, lives: 5, paddleX: 1.2, paddleY: 0.9, force: 0.75 }),
  standard: Object.freeze({ speed: 9, lives: 4, paddleX: 0.9, paddleY: 0.7, force: 1 }),
  expert: Object.freeze({ speed: 11, lives: 3, paddleX: 0.75, paddleY: 0.6, force: 1.2 }),
});
/** Game-specific intention; the runtime adapter owns generic input validation/ordering. */
export interface PrismIntent { slot: string; x: number; y: number; launch: boolean }
export interface PrismPaddle { slot: string; x: number; y: number; pressed: boolean; armed: boolean }
export interface PrismState {
  type: "prismState"; version: "1.0.0"; stageId: string; profile: PrismProfileId;
  phase: "ready" | "playing" | "stage-complete" | "lost"; tick: number;
  paddles: PrismPaddle[]; ball: { position: PrismVector; velocity: PrismVector };
  health: { id: string; remaining: number }[];
  score: number; hits: number; combo: number; lives: number; drains: number;
  paddleHits: number[]; contacts: number;
}

/** Shared game-owned geometry for collision and private scene projection. */
export const PRISM_WORLD = Object.freeze({
  minimum: Object.freeze([-7, -5, -13] as const), maximum: Object.freeze([7, 5, 14] as const),
  tickSeconds: 1 / 60, ballRadius: 0.18, paddleZ: -10, paddleHalfDepth: 0.25,
});
const DT = PRISM_WORLD.tickSeconds, RADIUS = PRISM_WORLD.ballRadius, PADDLE_Z = PRISM_WORLD.paddleZ, SEPARATION = 0.0001;
const MAX_TICK = 0x7fffffff, CONTACT_LIMIT = 8, MAX_BYTES = 64 * 1024;
const ARENA_MIN = PRISM_WORLD.minimum, ARENA_MAX = PRISM_WORLD.maximum;
const number = (min: number, max: number) => field.number().validator(n => Number.isFinite(n) && n >= min && n <= max);
const vector = (min: number, max: number) => field.array(number(min, max)).min(3).max(3);
const bounds = () => field.object({ min: vector(-14, 14), max: vector(-14, 14) });
const stageSchema = createSchema({
  id: slug(),
  targets: field.array(field.object({ id: slug(), bounds: bounds(), health: integer(1, 2), opens: field.array(slug()).max(12) })).min(1).max(96),
  barriers: field.array(field.object({ id: slug(), bounds: bounds(), motion: field.object({ axis: integer(0, 1), travel: number(0.1, 8),
    periodTicks: integer(120, 7200), phaseTicks: integer(0, 7199) }).optional() })).max(12),
  fields: field.array(field.object({ id: slug(), bounds: bounds(), force: vector(-6, 6) })).max(4),
}, "prismStage", exact);
const stateSchema = createSchema({
  stageId: slug(), profile: field.string().enum(Object.keys(PRISM_PROFILES)), phase: field.string().enum(["ready", "playing", "stage-complete", "lost"]),
  tick: integer(0, MAX_TICK), paddles: field.array(field.object({ slot: field.string().pattern(/^[a-zA-Z0-9_-]{1,32}$/),
    x: number(-7, 7), y: number(-5, 5), pressed: field.boolean(), armed: field.boolean() })).min(1).max(2),
  ball: field.object({ position: vector(-14, 14), velocity: vector(-11, 11) }),
  health: field.array(field.object({ id: slug(), remaining: integer(0, 2) })).min(1).max(96),
  score: integer(0, 12000), hits: integer(0, 192), combo: integer(0, 192), lives: integer(0, 5), drains: integer(0, 5),
  paddleHits: field.array(integer(0, MAX_TICK * CONTACT_LIMIT)).min(1).max(2), contacts: integer(0, CONTACT_LIMIT),
}, "prismState", exact);

const add = (a: readonly number[], b: readonly number[], scale = 1): PrismVector => [a[0]! + b[0]! * scale, a[1]! + b[1]! * scale, a[2]! + b[2]! * scale];
const scale = (a: readonly number[], amount: number): PrismVector => [a[0]! * amount, a[1]! * amount, a[2]! * amount];
const dot = (a: readonly number[], b: readonly number[]) => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const compareId = (a: { id: string }, b: { id: string }) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

function validBox(box: PrismBox) {
  const min = [-6.6, -4.6, -6], max = [6.6, 4.6, 13.6];
  return box.min.every((n, axis) => n >= min[axis]! && box.max[axis]! <= max[axis]! && box.max[axis]! - n >= 0.05);
}

/** Strict detached content parsing rejects intersections throughout each gate's travel. */
export function parsePrismStage(raw: unknown): PrismStage {
  const stage = parseRecord<PrismStage>(raw, stageSchema, MAX_BYTES);
  const objects = [...stage.targets, ...stage.barriers, ...stage.fields];
  if (!distinct(objects.map(o => o.id)) || objects.some(o => !validBox(o.bounds))) throw new TypeError("invalid-prism-stage");
  stage.barriers.forEach(b => { b.motion ??= null; });
  const solids = [...stage.targets.map(t => t.bounds), ...stage.barriers.map(b => {
    if (!b.motion) return b.bounds;
    const m = b.motion, envelope = structuredClone(b.bounds);
    if (m.periodTicks % 2 || m.phaseTicks >= m.periodTicks) throw new TypeError("invalid-prism-motion");
    envelope.max[m.axis] += m.travel;
    if (!validBox(envelope)) throw new TypeError("invalid-prism-motion");
    return envelope;
  })];
  if (solids.some((a, i) => solids.slice(i + 1).some(b => intersectAabbs(a, b)))) throw new TypeError("overlapping-prism-solids");
  const barrierIds = new Set(stage.barriers.map(b => b.id));
  if (stage.targets.some(t => !distinct(t.opens) || t.opens.some(id => !barrierIds.has(id)))) throw new TypeError("invalid-prism-relay");
  stage.targets.sort(compareId); stage.barriers.sort(compareId); stage.fields.sort(compareId);
  return stage;
}

function targetScore(target: PrismTarget, remaining: number) {
  return (target.health - remaining) * 25 + (remaining === 0 ? 75 : 0);
}

/** Position for an already validated barrier and rule tick; shared by collision and presentation. */
export function prismBarrierAt(barrier: PrismBarrier, tick: number): PrismBox {
  if (!barrier.motion) return barrier.bounds;
  const { axis, travel, periodTicks, phaseTicks } = barrier.motion;
  const phase = ((tick + phaseTicks) % periodTicks) / periodTicks;
  const offset: PrismVector = [0, 0, 0]; offset[axis] = travel * (1 - Math.abs(2 * phase - 1));
  return { min: add(barrier.bounds.min, offset), max: add(barrier.bounds.max, offset) };
}

function withSpeed(vector: PrismVector, speed: number, zSign: number): PrismVector {
  const length = Math.hypot(...vector);
  let velocity = length > 1e-10 ? scale(vector, speed / length) : [0, 0, speed * zSign] as PrismVector;
  // Explicit, direction-preserving longitudinal floor prevents perpetual planar volleys.
  if (Math.abs(velocity[2]) < speed * 0.2) {
    const xy = Math.hypot(velocity[0], velocity[1]);
    const sideSpeed = speed * Math.sqrt(0.96);
    velocity = [xy ? velocity[0] * sideSpeed / xy : 0, xy ? velocity[1] * sideSpeed / xy : 0, speed * 0.2 * zSign];
  }
  return velocity;
}

type Surface = { id: string; kind: "wall" | "drain" | "target" | "barrier" | "paddle";
  bounds: PrismBox; velocity: PrismVector; index: number };
const still: PrismVector = [0, 0, 0];
const wallSurfaces: Surface[] = [0, 1, 2].flatMap(axis => [-1, 1].map(side => {
  const min: PrismVector = [-8, -6, -14], max: PrismVector = [8, 6, 15];
  if (side < 0) max[axis] = ARENA_MIN[axis]!; else min[axis] = ARENA_MAX[axis]!;
  return { id: `wall-${axis}-${side}`, kind: axis === 2 && side < 0 ? "drain" as const : "wall" as const, bounds: { min, max }, velocity: still, index: -1 };
}));

/** Internal single-stage rules. No public bundle, clock, browser, storage, I/O or authority. */
export function createPrismRules(rawStage: unknown, rawSlots: readonly string[], profileId: PrismProfileId) {
  const stage = parsePrismStage(rawStage);
  if (!Array.isArray(rawSlots) || rawSlots.length < 1 || rawSlots.length > 2 || !distinct([...rawSlots])
    || rawSlots.some(s => typeof s !== "string" || !/^[a-zA-Z0-9_-]{1,32}$/.test(s))
    || !Object.hasOwn(PRISM_PROFILES, profileId)) throw new TypeError("invalid-prism-options");
  const slots = [...rawSlots].sort(), profile = PRISM_PROFILES[profileId];
  const xLimit = 7 - profile.paddleX, yLimit = 5 - profile.paddleY;
  const attached = (paddle: PrismPaddle): PrismVector => [paddle.x, paddle.y, PADDLE_Z + PRISM_WORLD.paddleHalfDepth + RADIUS + SEPARATION];

  function initialState(): PrismState {
    const paddles = slots.map((slot, index) => ({ slot, x: slots.length === 1 ? 0 : index ? 2 : -2, y: 0, pressed: false, armed: true }));
    return { type: "prismState", version: "1.0.0", stageId: stage.id, profile: profileId, phase: "ready", tick: 0,
      paddles, ball: { position: attached(paddles[0]!), velocity: [0, 0, 0] }, health: stage.targets.map(t => ({ id: t.id, remaining: t.health })),
      score: 0, hits: 0, combo: 0, lives: profile.lives, drains: 0, paddleHits: slots.map(() => 0), contacts: 0 };
  }

  function parseState(raw: unknown): PrismState {
    const state = parseRecord<PrismState>(raw, stateSchema, MAX_BYTES);
    if (state.stageId !== stage.id || state.profile !== profileId || state.paddles.length !== slots.length
      || state.paddles.some((p, i) => p.slot !== slots[i] || Math.abs(p.x) > xLimit || Math.abs(p.y) > yLimit || (p.armed && p.pressed))
      || state.health.length !== stage.targets.length || state.health.some((h, i) => h.id !== stage.targets[i]!.id || h.remaining > stage.targets[i]!.health)
      || state.paddleHits.length !== slots.length || state.paddleHits.some(h => h > state.tick * CONTACT_LIMIT)
      || state.lives + state.drains !== profile.lives || state.drains > state.tick || state.hits > state.tick * CONTACT_LIMIT
      || state.paddleHits.reduce((sum, h) => sum + h, 0) > state.tick * CONTACT_LIMIT) throw new TypeError("invalid-prism-state");
    const hits = state.health.reduce((sum, h, i) => sum + stage.targets[i]!.health - h.remaining, 0);
    const score = state.health.reduce((sum, h, i) => sum + targetScore(stage.targets[i]!, h.remaining), 0);
    const complete = state.health.every(h => h.remaining === 0);
    if (state.hits !== hits || state.score !== score || state.combo > hits || (state.phase === "lost") !== (state.lives === 0)
      || (state.phase === "stage-complete") !== complete || (state.phase === "lost" && complete)
      || ((state.phase === "ready" || state.phase === "lost") && state.combo !== 0)) throw new TypeError("invalid-prism-progress");
    const moving = state.phase === "playing";
    if (moving ? Math.abs(Math.hypot(...state.ball.velocity) - profile.speed) > 1e-7 || Math.abs(state.ball.velocity[2]) < profile.speed * 0.2 - 1e-7
      : state.ball.velocity.some(n => n !== 0)) throw new TypeError("invalid-prism-ball");
    if (state.ball.position.some((n, axis) => n < ARENA_MIN[axis]! + RADIUS - SEPARATION * 2 || n > ARENA_MAX[axis]! - RADIUS + SEPARATION * 2)
      || (state.phase === "ready" && state.ball.position.some((n, axis) => Math.abs(n - attached(state.paddles[0]!)[axis]!) > 1e-9))) throw new TypeError("invalid-prism-position");
    return state;
  }

  function validateIntents(commands: readonly PrismIntent[]): void {
    if (!Array.isArray(commands) || commands.length > slots.length || !distinct(commands.map(c => c?.slot)) || commands.some(c => !c
      || Object.keys(c).sort().join() !== "launch,slot,x,y" || !slots.includes(c.slot) || typeof c.launch !== "boolean"
      || !Number.isFinite(c.x) || Math.abs(c.x) > 1 || !Number.isFinite(c.y) || Math.abs(c.y) > 1)) throw new TypeError("invalid-prism-intentions");
  }

  function surfaces(state: PrismState, previous: PrismPaddle[], elapsed: number): Surface[] {
    const open = new Set(stage.targets.flatMap((t, i) => state.health[i]!.remaining === 0 ? t.opens : []));
    const results = [...wallSurfaces];
    stage.targets.forEach((t, index) => {
      if (state.health[index]!.remaining) results.push({ id: `target-${t.id}`, kind: "target", bounds: t.bounds, velocity: still, index });
    });
    stage.barriers.forEach((b, index) => {
      if (open.has(b.id)) return;
      const before = prismBarrierAt(b, state.tick - 1), after = prismBarrierAt(b, state.tick);
      const delta = add(after.min, before.min, -1);
      results.push({ id: `barrier-${b.id}`, kind: "barrier", bounds: { min: add(before.min, delta, elapsed), max: add(before.max, delta, elapsed) }, velocity: scale(delta, 1 / DT), index });
    });
    state.paddles.forEach((p, index) => {
      const before = previous[index]!, delta: PrismVector = [p.x - before.x, p.y - before.y, 0];
      const center: PrismVector = [before.x + delta[0] * elapsed, before.y + delta[1] * elapsed, PADDLE_Z];
      results.push({ id: `paddle-${p.slot}`, kind: "paddle", bounds: { min: add(center, [-profile.paddleX, -profile.paddleY, -PRISM_WORLD.paddleHalfDepth]),
        max: add(center, [profile.paddleX, profile.paddleY, PRISM_WORLD.paddleHalfDepth]) }, velocity: scale(delta, 1 / DT), index });
    });
    return results.sort(compareId);
  }

  function step(raw: Readonly<PrismState>, commands: readonly PrismIntent[]): PrismState {
    const state = parseState(raw); validateIntents(commands);
    if (state.phase === "lost" || state.phase === "stage-complete") return state;
    if (state.tick === MAX_TICK) throw new RangeError("prism-tick-limit");
    state.tick++; state.contacts = 0;
    const previous = structuredClone(state.paddles);
    let launch = false;
    for (const command of commands) {
      const paddle = state.paddles.find(p => p.slot === command.slot)!;
      const dx = command.x * xLimit - paddle.x, dy = command.y * yLimit - paddle.y;
      const distance = Math.hypot(dx, dy), amount = Math.min(1, (14 * DT) / (distance || 1));
      paddle.x += dx * amount; paddle.y += dy * amount;
      if (!command.launch) paddle.armed = true;
      if (command.launch && !paddle.pressed && paddle.armed) launch = true;
      if (command.launch) paddle.armed = false;
      paddle.pressed = command.launch;
    }
    if (state.phase === "ready") {
      state.ball.position = attached(state.paddles[0]!);
      if (!launch) return state;
      state.phase = "playing"; state.ball.velocity = [0, 0, profile.speed];
    }
    const force: PrismVector = [0, 0, 0];
    for (const field of stage.fields) if (state.ball.position.every((n, axis) => n >= field.bounds.min[axis]! && n <= field.bounds.max[axis]!)) {
      for (const axis of [0, 1, 2]) force[axis]! += field.force[axis]! * profile.force;
    }
    const integrated = integrateKinematic(state.ball, force, DT);
    state.ball.velocity = withSpeed([...integrated.velocity], profile.speed, state.ball.velocity[2] < 0 ? -1 : 1);
    const damaged = new Set<number>();
    let elapsed = 0;
    while (elapsed < 1 - 1e-10 && state.contacts < CONTACT_LIMIT) {
      const seconds = (1 - elapsed) * DT;
      let contact: { surface: Surface; hit: CollisionSweepHit } | undefined;
      for (const surface of surfaces(state, previous, elapsed)) {
        const relative = add(state.ball.velocity, surface.velocity, -1);
        const hit = sweepSphereAabb({ center: state.ball.position, radius: RADIUS }, scale(relative, seconds), surface.bounds);
        if (!hit || (hit.time <= 1e-9 && hit.penetration <= 1e-8 && dot(relative, hit.normal) >= -1e-9)) continue;
        if (!contact || hit.time < contact.hit.time - 1e-10) contact = { surface, hit };
      }
      if (!contact) { state.ball.position = add(state.ball.position, state.ball.velocity, seconds); break; }
      const { surface, hit } = contact;
      state.contacts++;
      state.ball.position = add(state.ball.position, state.ball.velocity, seconds * hit.time);
      elapsed += (1 - elapsed) * hit.time;
      if (surface.kind === "drain") {
        state.drains++; state.lives--; state.combo = 0; state.phase = state.lives ? "ready" : "lost";
        state.ball = { position: attached(state.paddles[0]!), velocity: [0, 0, 0] };
        state.paddles.forEach(p => { p.armed = false; });
        break;
      }
      state.ball.position = add(state.ball.position, hit.normal, hit.penetration + SEPARATION);
      if (surface.kind === "target" && !damaged.has(surface.index)) {
        const health = state.health[surface.index]!;
        health.remaining--; state.hits++; state.combo++; state.score += health.remaining === 0 ? 100 : 25;
        damaged.add(surface.index);
        if (state.health.every(h => h.remaining === 0)) { state.phase = "stage-complete"; state.ball.velocity = [0, 0, 0]; break; }
      }
      const relative = add(state.ball.velocity, surface.velocity, -1);
      if (surface.kind === "paddle" && relative[2] < 0 && hit.normal[2] > 0.5) {
        const before = previous[surface.index]!, after = state.paddles[surface.index]!;
        const x = before.x + (after.x - before.x) * elapsed, y = before.y + (after.y - before.y) * elapsed;
        const aim: PrismVector = [clamp((state.ball.position[0] - x) / profile.paddleX, -1, 1) * 0.85,
          clamp((state.ball.position[1] - y) / profile.paddleY, -1, 1) * 0.85, 1];
        state.ball.velocity = withSpeed(aim, profile.speed, 1); state.paddleHits[surface.index]!++;
      } else if (dot(relative, hit.normal) < 0) {
        const reflected = add(add(relative, hit.normal, -2 * dot(relative, hit.normal)), surface.velocity);
        state.ball.velocity = withSpeed(reflected, profile.speed, reflected[2] < 0 ? -1 : 1);
      }
    }
    return parseState(state);
  }
  return { initialState, parseState, step };
}
