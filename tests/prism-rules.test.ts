import { describe, expect, it } from "vitest";
import { createPrismRules, parsePrismStage, PRISM_PROFILES, type PrismStage, type PrismBox } from "../src/games/prism/rules.js";

const box = (x: number, y: number, z: number, half = 0.5): PrismBox => ({ min: [x-half, y-half, z-half], max: [x+half, y+half, z+half] });
function stage(): PrismStage {
  return { type: "prismStage", version: "1.0.0", id: "fixture-depth", targets: [
    { id: "near", bounds: box(-3, -2, 0), health: 1, opens: [] },
    { id: "middle", bounds: box(0, 2, 5), health: 2, opens: ["screen"] },
    { id: "far", bounds: box(3, -1, 10), health: 1, opens: [] },
  ], barriers: [{ id: "screen", bounds: box(3, -1, 7), motion: null }], fields: [] };
}
const intent = (slot = "one", x = 0, y = 0, launch = false) => ({ slot, x, y, launch });

describe("Prism Breaker deterministic spatial rule requirements", () => {
  it("keeps three explicit profiles and detached initial states", () => {
    expect(Object.values(PRISM_PROFILES).map(p => [p.speed, p.lives])).toEqual([[7, 5], [9, 4], [11, 3]]);
    const rules = createPrismRules(stage(), ["one"], "standard");
    const a = rules.initialState(); const b = rules.initialState();
    a.ball.position[0] = 3; a.health[0]!.remaining = 0;
    expect(b.ball.position).toEqual([0, 0, -9.5699]);
    expect(b.health[0]!.remaining).toBe(1);
    expect(b.phase).toBe("ready"); expect(b.lives).toBe(4);
  });

  it("bounds diagonal paddle motion, treats missing inputs as neutral and requires a launch edge", () => {
    const rules = createPrismRules(stage(), ["one"], "standard");
    const start = rules.initialState();
    const move = rules.step(start, [intent("one", 1, 1)]);
    expect(Math.hypot(move.paddles[0]!.x, move.paddles[0]!.y)).toBeCloseTo(14 / 60);
    const omitted = rules.step(move, []);
    expect(omitted.paddles).toEqual(move.paddles);
    expect(start.paddles[0]!.x).toBe(0);
    const launch = rules.step(omitted, [intent("one", 1, 1, true)]);
    expect(launch.phase).toBe("playing"); expect(launch.ball.velocity[2]).toBeGreaterThan(0);
    expect(rules.step(launch, [intent("one", 1, 1, true)]).lives).toBe(4);
  });

  it("sweeps targets at separate X/Y/Z positions without tunnelling or duplicate damage", () => {
    const rules = createPrismRules(stage(), ["one"], "expert");
    for (const target of stage().targets) {
      const state = rules.initialState(); state.phase = "playing";
      state.ball.position = [(target.bounds.min[0]! + target.bounds.max[0]!) / 2,
        (target.bounds.min[1]! + target.bounds.max[1]!) / 2, target.bounds.min[2]! - 0.20];
      state.ball.velocity = [0, 0, 11];
      const next = rules.step(state, []);
      expect(next.health.find(h => h.id === target.id)!.remaining).toBe(target.health - 1);
      expect(next.hits).toBe(1); expect(next.ball.velocity[2]).toBeLessThan(0);
      expect(next.score).toBe(target.health === 1 ? 100 : 25);
      expect(state.health.find(h => h.id === target.id)!.remaining).toBe(target.health);
    }
  });

  it("uses explicit release after a drain even when a missing tick follows a held button", () => {
    const rules = createPrismRules(stage(), ["one"], "standard");
    const state = rules.step(rules.initialState(), [intent("one", 0, 0, true)]);
    state.ball.position = [5, 0, -12.8]; state.ball.velocity = [0, 0, -9];
    const drained = rules.step(state, [intent("one", 0, 0, true)]);
    expect(drained.phase).toBe("ready"); expect(drained.lives).toBe(3); expect(drained.drains).toBe(1);
    expect(rules.step(rules.step(drained, []), [intent("one", 0, 0, true)]).phase).toBe("ready");
    const released = rules.step(drained, [intent()]);
    expect(rules.step(released, [intent("one", 0, 0, true)]).phase).toBe("playing");
  });

  it("steers a returning ball on either paddle axis and bounds speed", () => {
    const rules = createPrismRules(stage(), ["one"], "standard");
    for (const offset of [[0, 0], [0.6, 0], [0, 0.5]]) {
      const state = rules.initialState(); state.phase = "playing";
      state.ball.position = [offset[0]!, offset[1]!, -9.55]; state.ball.velocity = [0, 0, -9];
      const next = rules.step(state, []);
      expect(next.ball.velocity[2]).toBeGreaterThan(1.8);
      expect(Math.hypot(...next.ball.velocity)).toBeCloseTo(9);
      if (offset[0]) expect(next.ball.velocity[0]).toBeGreaterThan(0);
      if (offset[1]) expect(next.ball.velocity[1]).toBeGreaterThan(0);
      expect(next.paddleHits).toEqual([1]);
    }
  });

  it("freezes completion and loss without scoring, movement or hidden relaunch", () => {
    const content = stage(); content.targets = [content.targets[0]!]; content.barriers = [];
    const rules = createPrismRules(content, ["one"], "expert");
    const state = rules.initialState(); state.phase = "playing";
    state.ball.position = [-3, -2, -0.7]; state.ball.velocity = [0, 0, 11];
    const complete = rules.step(state, []);
    expect(complete.phase).toBe("stage-complete"); expect(complete.score).toBe(100);
    expect(rules.step(complete, [intent("one", 1, 1, true)])).toEqual(complete);
    const doomed = rules.initialState(); doomed.phase = "playing"; doomed.tick = 2; doomed.drains = 2; doomed.lives = 1;
    doomed.ball.position = [5, 0, -12.8]; doomed.ball.velocity = [0, 0, -11];
    const lost = rules.step(doomed, []);
    expect(lost.phase).toBe("lost"); expect(lost.lives).toBe(0);
    expect(rules.step(lost, [])).toEqual(lost);
  });

  it("restores exact replay state and rejects inconsistent or foreign checkpoints", () => {
    const rules = createPrismRules(stage(), ["one"], "standard");
    let state = rules.step(rules.initialState(), [intent("one", 0, 0, true)]);
    for (let n = 0; n < 30; n++) state = rules.step(state, []);
    let restored = rules.parseState(JSON.stringify(state));
    expect(restored).toEqual(state);
    for (let n = 0; n < 120; n++) {
      const commands = [intent("one", Math.sin(n / 10), Math.cos(n / 10))];
      state = rules.step(state, commands); restored = rules.step(restored, commands);
    }
    expect(restored).toEqual(state);
    for (const patch of [{ version: "2.0.0" }, { stageId: "foreign" }, { score: state.score+1 },
      { lives: 99 }, { profile: "expert" }, { combo: 500 }, { extra: true },
      { health: [] }, { ball: { position: [NaN, 0, 0], velocity: [0, 0, 9] } }]) {
      expect(() => rules.parseState({ ...state, ...patch })).toThrow();
    }
  });

  it("rejects malformed content, overlaps, foreign relay links and uncontrolled intentions", () => {
    for (const patch of [{ version: "2.0.0" }, { targets: [] }, { unknown: true },
      { targets: [stage().targets[0], stage().targets[0]] },
      { targets: [{ ...stage().targets[0], opens: ["missing"] }] }]) {
      expect(() => parsePrismStage({ ...stage(), ...patch })).toThrow();
    }
    const overlap = stage(); overlap.barriers[0]!.bounds = structuredClone(overlap.targets[0]!.bounds);
    expect(() => parsePrismStage(overlap)).toThrow();
    const rules = createPrismRules(stage(), ["one"], "standard"); const state = rules.initialState();
    for (const commands of [[intent("foreign")], [intent("one", 2)], [intent("one", 0, NaN)],
      [intent(), intent()], [{ ...intent(), score: 20 }], [{ ...intent(), launch: 1 }]]) {
      expect(() => rules.step(state, commands as any)).toThrow();
      expect(state).toEqual(rules.initialState());
    }
  });

  it("reflects all five enclosing walls and ignores a separating zero-time contact", () => {
    const rules = createPrismRules(stage(), ["one"], "standard");
    for (const [axis, sign] of [[0, -1], [0, 1], [1, -1], [1, 1], [2, 1]]) {
      const state = rules.initialState(); state.phase = "playing"; state.ball.position = [0, 0, -2];
      state.ball.position[axis!] = ([6.81, 4.81, 13.81][axis!]!) * sign!;
      state.ball.velocity = [0, 0, axis === 2 ? 9 : 2];
      if (axis !== 2) state.ball.velocity[axis!] = Math.sqrt(77) * sign!;
      const next = rules.step(state, []);
      expect(next.contacts).toBeGreaterThan(0); expect(next.ball.velocity[axis!]! * sign!).toBeLessThan(0);
      expect(Math.hypot(...next.ball.velocity)).toBeCloseTo(9);
    }
    const separating = rules.initialState(); separating.phase = "playing";
    separating.ball.position = [6.82, 0, -2]; separating.ball.velocity = [-Math.sqrt(77), 0, 2];
    const next = rules.step(separating, []);
    expect(next.contacts).toBe(0); expect(next.ball.position[0]).toBeLessThan(6.82);
  });

  it("resolves glancing target corners using the published rounded-box sweep", () => {
    const rules = createPrismRules(stage(), ["one"], "expert");
    const state = rules.initialState(); state.phase = "playing";
    state.ball.position = [-3.6, -2.6, -0.65]; state.ball.velocity = [0, 0, 11];
    const next = rules.step(state, []);
    expect(next.hits).toBe(1); expect(next.ball.velocity[0]).toBeLessThan(0); expect(next.ball.velocity[1]).toBeLessThan(0);
    expect(Math.hypot(...next.ball.velocity)).toBeCloseTo(11);
  });

  it("requires two armour contacts and opens only the linked relay barrier", () => {
    const rules = createPrismRules(stage(), ["one"], "standard");
    let state = rules.initialState(); state.phase = "playing";
    for (let hit = 1; hit <= 2; hit++) {
      state.ball.position = [0, 2, 4.3]; state.ball.velocity = [0, 0, 9];
      state = rules.step(state, []);
      expect(state.health.find(h => h.id === "middle")!.remaining).toBe(2 - hit);
      expect(state.hits).toBe(hit); expect(state.score).toBe(hit === 1 ? 25 : 125);
    }
    state.ball.position = [3, -1, 6.3]; state.ball.velocity = [0, 0, 9];
    const open = rules.step(state, []); expect(open.ball.velocity[2]).toBeGreaterThan(0);
    const closed = rules.initialState(); closed.phase = "playing"; closed.ball = structuredClone(state.ball);
    expect(rules.step(closed, []).ball.velocity[2]).toBeLessThan(0);
  });

  it("damages armour only once when a narrow far-wall rebound hits it repeatedly in one tick", () => {
    const content = stage(); content.targets = [content.targets[0]!, { id: "armour", bounds: box(0, 0, 13.1), health: 2, opens: [] }]; content.barriers = [];
    const rules = createPrismRules(content, ["one"], "standard");
    const state = rules.initialState(); state.phase = "playing"; state.ball.position = [0, 0, 13.8]; state.ball.velocity = [0, 0, -9];
    const next = rules.step(state, []);
    expect(next.contacts).toBeGreaterThan(2); expect(next.contacts).toBeLessThanOrEqual(8);
    expect(next.hits).toBe(1); expect(next.score).toBe(25);
    expect(next.health.find(h => h.id === "armour")!.remaining).toBe(1);
  });

  it("keeps glancing returns out of a perpetual plane without seeking targets", () => {
    const rules = createPrismRules(stage(), ["one"], "standard");
    const state = rules.initialState(); state.phase = "playing";
    state.ball.position = [-3.5 - 0.18 / Math.sqrt(2), -2, -0.7]; state.ball.velocity = [0, 0, 9];
    const next = rules.step(state, []);
    expect(next.hits).toBe(1); expect(Math.abs(next.ball.velocity[2])).toBeCloseTo(1.8);
    expect(Math.hypot(...next.ball.velocity)).toBeCloseTo(9);
    expect(next.ball.velocity[0]).toBeLessThan(0);
  });

  it("keeps co-op equal-contact ownership stable and never teleports a paddle to a returning ball", () => {
    const rules = createPrismRules(stage(), ["two", "one"], "standard");
    let state = rules.initialState();
    for (let n = 0; n < 20; n++) {
      const commands = [intent("two"), intent("one")];
      expect(rules.step(state, commands)).toEqual(rules.step(state, [...commands].reverse()));
      state = rules.step(state, commands);
    }
    state.phase = "playing"; state.ball.position = [0, 0, -9.55]; state.ball.velocity = [0, 0, -9];
    expect(rules.step(state, []).paddleHits).toEqual([1, 0]);
    state.ball.position = [5, 0, -9.55];
    const missed = rules.step(state, [intent("one", 1)]);
    expect(missed.ball.velocity[2]).toBeLessThan(0); expect(missed.paddleHits).toEqual([0, 0]);
    expect(missed.paddles[0]!.x).toBeCloseTo(14 / 60);
  });

  it("applies only local gravity and preserves the profile's speed bound", () => {
    const content = stage(); content.fields = [{ id: "lift", bounds: { min: [-1, -1, -3], max: [1, 1, -1] }, force: [6, 4, 0] }];
    for (const profile of ["accessible", "standard", "expert"] as const) {
      const rules = createPrismRules(content, ["one"], profile);
      const state = rules.initialState(); state.phase = "playing"; state.ball.position = [0, 0, -2];
      state.ball.velocity = [0, 0, PRISM_PROFILES[profile].speed];
      const next = rules.step(state, []);
      expect(next.ball.velocity[0]).toBeGreaterThan(0); expect(next.ball.velocity[1]).toBeGreaterThan(0);
      expect(Math.hypot(...next.ball.velocity)).toBeCloseTo(PRISM_PROFILES[profile].speed);
      state.ball.position[0] = 2;
      expect(rules.step(state, []).ball.velocity).toEqual(state.ball.velocity);
    }
  });

  it("uses deterministic moving-gate phase across checkpoint restore and reversal", () => {
    const content = stage(); content.barriers[0] = { id: "screen", bounds: box(-2, 0, 3), motion: { axis: 0, travel: 2, periodTicks: 120, phaseTicks: 0 } };
    const rules = createPrismRules(content, ["one"], "standard");
    for (const tick of [0, 29, 59, 60, 119]) {
      const state = rules.initialState(); state.phase = "playing"; state.tick = tick;
      const phase = tick / 120, x = -2 + 2 * (1 - Math.abs(2 * phase - 1));
      state.ball.position = [x, 0, 2.3]; state.ball.velocity = [0, 0, 9];
      const next = rules.step(state, []);
      expect(next.ball.velocity[2]).toBeLessThan(0);
      expect(rules.step(rules.parseState(JSON.stringify(state)), [])).toEqual(next);
    }
  });

  it("rejects excessive motion, invalid rosters and cross-field checkpoint contradictions", () => {
    for (const motion of [{ axis: 2, travel: 1, periodTicks: 120, phaseTicks: 0 },
      { axis: 0, travel: 8, periodTicks: 120, phaseTicks: 0 }, { axis: 0, travel: 1, periodTicks: 121, phaseTicks: 0 },
      { axis: 0, travel: 1, periodTicks: 120, phaseTicks: 120 }]) {
      const content = stage(); content.barriers[0]!.motion = motion as any;
      expect(() => parsePrismStage(content)).toThrow();
    }
    for (const slots of [[], ["one", "one"], ["one", "two", "three"], ["invalid slot"]]) expect(() => createPrismRules(stage(), slots, "standard")).toThrow();
    expect(() => createPrismRules(stage(), ["one"], "toString" as any)).toThrow();
    const rules = createPrismRules(stage(), ["one"], "standard"); const state = rules.initialState();
    for (const patch of [{ lives: 0 }, { hits: 1 }, { phase: "stage-complete" }, { phase: "lost" },
      { paddleHits: [1] }, { paddleHits: [0, 0] }, { ball: { position: [0, 0, 0], velocity: [0, 0, 0] } },
      { paddles: [{ ...state.paddles[0], slot: "foreign" }] }, { paddles: [{ ...state.paddles[0], pressed: true }] },
      { health: state.health.map(h => ({ ...h, remaining: 2 })) }, { ball: { position: [0, 0, -9.5699], velocity: [0, 0, 9] } }]) {
      expect(() => rules.parseState({ ...state, ...patch })).toThrow();
    }
    const exhausted = rules.initialState(); exhausted.tick = 0x7fffffff;
    expect(() => rules.step(exhausted, [])).toThrow("prism-tick-limit");
  });

  it("detaches authoring inputs and bounds collision work through a sustained 3D replay", () => {
    const content = stage(), copy = structuredClone(content);
    const rules = createPrismRules(content, ["one"], "standard"); content.targets = [];
    const reverse = structuredClone(copy); reverse.targets.reverse();
    const same = createPrismRules(reverse, ["one"], "standard");
    let a = rules.initialState(), b = same.initialState();
    for (let n = 0; n < 3600; n++) {
      const command = intent("one", Math.sin(n / 83), Math.cos(n / 111), n % 120 === 0);
      a = rules.step(a, [command]); b = same.step(b, [command]);
      expect(a.contacts).toBeLessThanOrEqual(8); expect(a).toEqual(b);
    }
    expect(a.tick).toBeGreaterThan(100);
  });
});
