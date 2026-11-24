import { createHash } from "node:crypto";
import { createPrismRules, PRISM_PROFILES, type PrismIntent, type PrismProfileId, type PrismStage, type PrismState } from "../../src/games/prism/rules.js";

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const centre = (target: PrismStage["targets"][number]) => target.bounds.min.map((n, axis) => (n + target.bounds.max[axis]!) / 2);
const banks = [[0, 0, 0], [0, 0, 1], [-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1]];
function fold(value: number, limit: number) {
  const position = ((value + limit) % (4 * limit) + 4 * limit) % (4 * limit);
  return position <= 2 * limit ? position - limit : 3 * limit - position;
}

/** Test-only deterministic pilot. All gameplay state comes from the real rules.
 * Exact-state bounce prediction is verification assistance, not a touch-player
 * model, production assist or human-duration measurement. No RNG or I/O is used.
 */
export function completePrismChallenge(stage: PrismStage, profileId: PrismProfileId, slots: string[], restoreTick = -1): {
  contentSha256: string; inputsSha256: string; finalSha256: string; ticks: number; final: PrismState;
} {
  const profile = PRISM_PROFILES[profileId], rules = createPrismRules(stage, slots, profileId);
  const xLimit = 7 - profile.paddleX, yLimit = 5 - profile.paddleY;
  const intentions = createHash("sha256");
  let state = rules.initialState(), targetIndex = 0, lastHits = -1;
  for (let tick = 0; tick < 36_000 && state.phase !== "lost" && state.phase !== "stage-complete"; tick++) {
    if (tick === restoreTick) state = rules.parseState(JSON.parse(JSON.stringify(state)));
    const remaining = stage.targets.filter((_, index) => state.health[index]!.remaining > 0)
      .sort((a, b) => centre(a)[2]! - centre(b)[2]!);
    if (state.hits !== lastHits) { targetIndex = 0; lastHits = state.hits; }
    const desired = centre(remaining[targetIndex % remaining.length]!);
    const bank = banks[Math.floor(targetIndex / remaining.length) % banks.length]!;
    if (state.phase !== "ready") {
      if (bank[0]) desired[0] = bank[0] * 13.64 - desired[0]!;
      if (bank[1]) desired[1] = bank[1] * 9.64 - desired[1]!;
      if (bank[2]) desired[2] = 27.64 - desired[2]!;
    }
    let x = state.paddles[0]!.x, y = state.paddles[0]!.y, launch = false, active = slots[0]!;
    if (state.phase === "ready") {
      x = clamp(desired[0]!, xLimit); y = clamp(desired[1]!, yLimit);
      launch = Math.hypot(x - state.paddles[0]!.x, y - state.paddles[0]!.y) < 0.05 && !state.paddles[0]!.pressed && state.paddles[0]!.armed;
    } else if (state.ball.velocity[2] < 0) {
      const seconds = (-9.57 - state.ball.position[2]) / state.ball.velocity[2];
      const impactX = fold(state.ball.position[0] + state.ball.velocity[0] * seconds, 6.82);
      const impactY = fold(state.ball.position[1] + state.ball.velocity[1] * seconds, 4.82);
      if (slots.length === 2 && impactX >= 0) active = slots[1]!;
      const distance = desired[2]! + 9.57;
      x = clamp(impactX - clamp((desired[0]! - impactX) / distance, 0.78) * profile.paddleX / 0.85, xLimit);
      y = clamp(impactY - clamp((desired[1]! - impactY) / distance, 0.78) * profile.paddleY / 0.85, yLimit);
    }
    const commands: PrismIntent[] = state.paddles.map(p => ({ slot: p.slot,
      x: p.slot === active ? x / xLimit : active === slots[0] ? 1 : -1,
      y: p.slot === active ? y / yLimit : -Math.sign(y || 1), launch: p.slot === active && launch,
    }));
    intentions.update(JSON.stringify(commands) + "\n");
    const paddleHits = state.paddleHits.reduce((sum, count) => sum + count, 0);
    state = rules.step(state, commands);
    if (state.paddleHits.reduce((sum, count) => sum + count, 0) > paddleHits) targetIndex++;
  }
  return { contentSha256: digest(stage), inputsSha256: intentions.digest("hex"), finalSha256: digest(state), ticks: state.tick, final: state };
}
