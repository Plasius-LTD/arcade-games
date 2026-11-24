import { describe, expect, it, vi } from "vitest";
import { createGameSceneAdapter, GAME_SCENE_LIMITS, parseGameSceneSnapshot, type GameSceneMesh } from "@plasius/gpu-shared/game-scene";
import type { NativeSceneFrame } from "@plasius/gpu-renderer";
import { listPrismChallenges, readPrismChallenge } from "../src/games/prism/challenges.js";
import { createPrismRules, PRISM_PROFILES, type PrismProfileId, type PrismStage } from "../src/games/prism/rules.js";
import { createPrismPresentation } from "../src/games/prism/presentation.js";

const profiles = Object.keys(PRISM_PROFILES) as PrismProfileId[];
const box = (x: number, y: number, z: number, size = 0.4) => ({
  min: [x - size / 2, y - size / 2, z - size / 2] as [number, number, number],
  max: [x + size / 2, y + size / 2, z + size / 2] as [number, number, number],
});
const stage = (): PrismStage => ({
  type: "prismStage", version: "1.0.0", id: "scene-regression",
  targets: [{ id: "armour", bounds: box(0, 0, 0), health: 2, opens: ["door"] },
    { id: "far", bounds: box(0, 0, 6), health: 1, opens: [] }],
  barriers: [{ id: "door", bounds: box(3, 0, 3), motion: null },
    { id: "gate", bounds: box(-4, 0, 3), motion: { axis: 0, travel: 1, periodTicks: 120, phaseTicks: 0 } }],
  fields: [{ id: "up", bounds: { min: [3, 1, 5], max: [5, 3, 7] }, force: [0, 2, 0] }],
});

function bounds(vertices: Float32Array) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < vertices.length; i += 12) for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis]!, vertices[i + axis]!);
    max[axis] = Math.max(max[axis]!, vertices[i + axis]!);
  }
  return { min, max };
}

function validMeshes(meshes: GameSceneMesh[]) {
  expect(meshes.length).toBeLessThanOrEqual(GAME_SCENE_LIMITS.maxMeshes);
  expect(new Set(meshes.map(mesh => mesh.id)).size).toBe(meshes.length);
  expect(meshes.reduce((count, mesh) => count + mesh.vertices.length / 12, 0)).toBeLessThanOrEqual(GAME_SCENE_LIMITS.maxVertices);
  for (const { vertices } of meshes) {
    expect(vertices.length % 36).toBe(0);
    expect([...vertices].every(Number.isFinite)).toBe(true);
    for (let i = 0; i < vertices.length; i += 36) {
      const a = [...vertices.subarray(i, i + 3)], b = [...vertices.subarray(i + 12, i + 15)], c = [...vertices.subarray(i + 24, i + 27)];
      const u = b.map((v, j) => v - a[j]!), v = c.map((n, j) => n - a[j]!);
      const cross = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
      const length = Math.hypot(...cross);
      expect(length).toBeGreaterThan(0);
      for (let j = 0; j < 3; j++) {
        const start = i + j * 12;
        expect(Math.hypot(...vertices.subarray(start + 3, start + 6))).toBeCloseTo(1, 5);
        expect(cross.reduce((sum, n, axis) => sum + n / length * vertices[start + 3 + axis]!, 0)).toBeCloseTo(1, 5);
        expect([...vertices.subarray(start + 6, start + 11)].every(n => n >= 0 && n <= 1)).toBe(true);
      }
    }
  }
}

it("fits the chamber to wide and narrow viewports and keeps the attached ball visible through each paddle", () => {
  const view = createPrismPresentation(stage(), ["a", "b"], "standard");
  const state = createPrismRules(stage(), ["a", "b"], "standard").initialState();
  for (const aspect of [0.4, 0.75, 16 / 9, 3]) {
    const scene = view.project(state, aspect);
    const distance = scene.camera.eye[2] - 13;
    const halfHeight = distance * Math.tan(scene.camera.fov * Math.PI / 360);
    expect(halfHeight).toBeGreaterThanOrEqual(5 * 1.15 - 1e-8);
    expect(halfHeight * aspect).toBeGreaterThanOrEqual(7 * 1.15 - 1e-8);
  }
  expect(view.project(state, 16 / 9).camera.eye[2]).toBeLessThan(view.project(state, 0.4).camera.eye[2]);
  for (const invalid of [0, 0.39, 3.01, Infinity, NaN]) expect(() => view.project(state, invalid)).toThrow("invalid-prism-viewport");
  for (const mesh of view.readMeshes().filter(mesh => mesh.id.startsWith("paddle-"))) {
    // No triangle crosses the central opening: the held ball's sightline is clear.
    for (let offset = 0; offset < mesh.vertices.length; offset += 36) {
      const x = [0, 12, 24].map(n => mesh.vertices[offset + n]!);
      const y = [1, 13, 25].map(n => mesh.vertices[offset + n]!);
      expect(Math.min(...x) > 0.18 || Math.max(...x) < -0.18 || Math.min(...y) > 0.18 || Math.max(...y) < -0.18).toBe(true);
    }
  }
});

it("projects physical depth, ball and profile-specific paddles with rightward logical input", () => {
  for (const profile of profiles) {
    const rules = createPrismRules(stage(), ["a", "b"], profile);
    const view = createPrismPresentation(stage(), ["a", "b"], profile);
    const state = rules.step(rules.initialState(), [{ slot: "a", x: 1, y: 1, launch: false }]);
    const snapshot = view.project(state);
    expect(parseGameSceneSnapshot(snapshot)).toEqual(snapshot);
    expect(snapshot).toMatchObject({ type: "gameScene", version: "1.0.0", tick: 1, time: 1 / 60 });
    expect(snapshot.camera.eye[2]).toBeGreaterThan(13);
    expect(snapshot.camera.target[2]).toBeLessThan(snapshot.camera.eye[2]);
    const paddle = snapshot.instances.find(i => i.id === "paddle-0")!;
    // Logical forward maps to native -Z; screen right remains logical +X.
    expect(paddle.position[0]).toBe(state.paddles[0]!.x);
    expect(paddle.position[1]).toBe(state.paddles[0]!.y);
    expect(paddle.position[2]).toBe(10);
    const meshes = view.readMeshes();
    const shape = bounds(meshes.find(m => m.id === paddle.meshId)!.vertices);
    expect(shape.min[0]).toBeCloseTo(-PRISM_PROFILES[profile].paddleX);
    expect(shape.max[1]).toBeCloseTo(PRISM_PROFILES[profile].paddleY);
    expect(shape.min[2]).toBeCloseTo(-0.25);
    expect(shape.max[2]).toBeCloseTo(0.25);
    const ball = snapshot.instances.find(i => i.id === "ball")!;
    expect(ball.position).toEqual([state.ball.position[0], state.ball.position[1], -state.ball.position[2]]);
    const ballBounds = bounds(meshes.find(m => m.id === ball.meshId)!.vertices);
    expect(ballBounds.min.every(n => Math.abs(n + 0.18) < 1e-7)).toBe(true);
    expect(ballBounds.max.every(n => Math.abs(n - 0.18) < 1e-7)).toBe(true);
    const left = meshes.find(m => m.id === "paddle-0")!, right = meshes.find(m => m.id === "paddle-1")!;
    expect(left.vertices.length).not.toBe(right.vertices.length); // One/two raised bars, not colour alone.
  }
});

it("reflects real damage and relay opening without scoring or changing rule state", () => {
  const rules = createPrismRules(stage(), ["a"], "standard");
  const view = createPrismPresentation(stage(), ["a"], "standard");
  const meshes = view.readMeshes();
  expect(meshes.find(m => m.id === "target-0")!.vertices.length).toBeGreaterThan(meshes.find(m => m.id === "target-1")!.vertices.length); // Relay diamond.
  let state = rules.initialState();
  const seen = new Set<number>();
  for (let tick = 0; tick < 600 && state.phase !== "stage-complete"; tick++) {
    const remaining = state.health[0]!.remaining;
    if (!seen.has(remaining)) {
      seen.add(remaining);
      const before = structuredClone(state), projected = view.project(state);
      expect(state).toEqual(before);
      expect(projected.instances.filter(i => i.id.startsWith("health-0-")).length).toBe(remaining);
      expect(projected.instances.some(i => i.id === "target-0")).toBe(remaining > 0);
      expect(projected.instances.some(i => i.id === "barrier-0")).toBe(remaining > 0);
    }
    state = rules.step(state, [{ slot: "a", x: 0, y: 0, launch: tick === 0 }]);
  }
  expect([...seen].sort()).toEqual([0, 1, 2]);
  expect(state.phase).toBe("stage-complete");
  expect(view.project(state).instances.some(i => i.id.startsWith("target-"))).toBe(false);
});

it("uses the collision gate phase, including both motion axes, and open field geometry", () => {
  for (const axis of [0, 1] as const) {
    const content = stage(); content.barriers[1]!.motion!.axis = axis;
    const rules = createPrismRules(content, ["a"], "standard"), view = createPrismPresentation(content, ["a"], "standard");
    let state = rules.initialState();
    for (let tick = 0; tick <= 120; tick++) {
      if (tick % 30 === 0) {
        const gate = view.project(state).instances.find(i => i.id === "barrier-1")!;
        const offset = 1 - Math.abs(2 * ((tick % 120) / 120) - 1);
        expect(gate.position).toEqual(axis === 0 ? [-4 + offset, 0, -3] : [-4, offset, -3]);
      }
      if (tick < 120) state = rules.step(state, []);
    }
    const mesh = view.readMeshes().find(m => m.id === "field-0")!;
    expect(mesh.vertices.length / 12).toBeGreaterThan(12 * 36); // Open edge rails plus direction arrow.
    validMeshes(view.readMeshes());
  }
});

it("detaches original content, returned meshes and snapshots and rejects incompatible rule states", () => {
  const content = stage(), rules = createPrismRules(content, ["a"], "standard");
  const view = createPrismPresentation(content, ["a"], "standard"), state = rules.initialState();
  const expected = view.project(state), meshes = view.readMeshes();
  content.targets.length = 0; meshes[0]!.vertices.fill(999); meshes.length = 0;
  const changed = view.project(state) as any;
  changed.instances[0].position[0] = 999; changed.camera.eye[0] = 999;
  expect(view.project(state)).toEqual(expected);
  expect(view.readMeshes()[0]!.vertices[0]).not.toBe(999);
  for (const bad of [{ ...state, stageId: "foreign" }, { ...state, score: 1 }, { ...state, version: "2.0.0" }, null]) {
    expect(() => view.project(bad)).toThrow();
  }
  expect(() => createPrismPresentation({}, ["a"], "standard")).toThrow();
  expect(() => createPrismPresentation(stage(), [], "standard")).toThrow();
});

describe.each(listPrismChallenges())("scene for %s", id => {
  it("fits every profile and roster into the published strict scene contract", () => {
    for (const profile of profiles) for (const slots of [["a"], ["a", "b"]]) {
      const content = readPrismChallenge(id), rules = createPrismRules(content, slots, profile);
      const view = createPrismPresentation(content, slots, profile), meshes = view.readMeshes();
      const snapshot = view.project(rules.initialState());
      expect(parseGameSceneSnapshot(snapshot)).toEqual(snapshot);
      expect(snapshot.instances.length).toBeLessThanOrEqual(GAME_SCENE_LIMITS.maxInstances);
      expect(snapshot.instances.every(instance => meshes.some(mesh => mesh.id === instance.meshId))).toBe(true);
      expect(snapshot.instances.reduce((sum, instance) => sum + meshes.find(mesh => mesh.id === instance.meshId)!.vertices.length / 12, 0)).toBeLessThanOrEqual(GAME_SCENE_LIMITS.maxVertices);
    }
  });
});

it("passes maximum rule geometry through the actual published adapter's frame expansion", async () => {
  const content: PrismStage = {
    type: "prismStage", version: "1.0.0", id: "maximum-scene",
    targets: Array.from({ length: 96 }, (_, i) => ({ id: `target-${i}`, bounds: box(-5.5 + i % 4 * 3.5, -3.6 + Math.floor(i / 4) % 4 * 2.4, -4 + Math.floor(i / 16) * 2.6, 0.2), health: 2, opens: [] })),
    barriers: Array.from({ length: 12 }, (_, i) => ({ id: `barrier-${i}`, bounds: box(-5.5 + i % 4 * 3.5, -2.4 + Math.floor(i / 4) * 2.4, 12, 0.2), motion: null })),
    fields: [[0, 0, 0], [2, 0, 0], [0, 0, -2], [1, 2, 3]].map((force, i) => ({ id: `field-${i}`, bounds: box(i - 2, 0, 4, 1), force: force as [number, number, number] })),
  };
  const rules = createPrismRules(content, ["a", "b"], "expert"), view = createPrismPresentation(content, ["a", "b"], "expert");
  validMeshes(view.readMeshes());
  const offered = view.project(rules.initialState()), frames: NativeSceneFrame[] = [];
  const nativeSnapshot = { backend: "webgpu-raster" as const, available: true, submittedFrames: 1, vertexCount: 0, shadowMapSize: 1, samples: 1, width: 640, height: 480 };
  const renderer = { render: vi.fn(() => nativeSnapshot), getSnapshot: () => nativeSnapshot, destroy: vi.fn(),
    renderAsync: vi.fn(async (frame: NativeSceneFrame) => { frames.push({ ...frame, vertices: frame.vertices.slice() }); return nativeSnapshot; }) };
  const adapter = await createGameSceneAdapter({ enabled: true, canvas: { width: 640, height: 480 } as HTMLCanvasElement,
    meshes: view.readMeshes(), width: 640, height: 480, navigator: { gpu: {} } as any,
    rendererLoader: async () => ({ createNativeSceneRenderer: async () => renderer }) });
  expect(adapter).not.toBeNull();
  try {
    expect(adapter!.offer(offered)).toBe("submitted");
    await adapter!.flush();
    expect(frames).toHaveLength(1);
    expect(frames[0]!.vertices.length / 12).toBeLessThanOrEqual(GAME_SCENE_LIMITS.maxVertices);
    expect(frames[0]!.camera).toEqual(offered.camera);
    expect(adapter!.getSnapshot()).toMatchObject({ status: "ready", presentedTick: 0, pendingSnapshots: 0, inFlightFrames: 0 });
  } finally { adapter!.destroy(); }
  expect(renderer.destroy).toHaveBeenCalledOnce();
});
