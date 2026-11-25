import { createSchema } from "@plasius/schema";
import { distinct, exact, integer, parseRecord } from "../../validation.js";
import { parsePrismStage, type PrismBarrier, type PrismBox, type PrismStage, type PrismTarget, type PrismVector } from "./rules.js";

/** Private content identity. The shared runtime owns the seed and random state. */
export interface PrismEndlessRecipe {
  type: "prismEndlessRecipe"; version: "1.0.0"; round: number; choice: number;
}
const families = ["banks", "timing", "relay", "gravity"] as const;
export interface PrismEndlessRoom {
  recipe: PrismEndlessRecipe; key: string; family: typeof families[number]; tier: number; stage: PrismStage;
}
const recipeSchema = createSchema({ round: integer(0, 1_000_000), choice: integer(0, 7) }, "prismEndlessRecipe", exact);

/** Reconstructing a checkpoint never consumes another random draw. */
export function parsePrismEndlessRecipe(raw: unknown): PrismEndlessRecipe {
  return parseRecord<PrismEndlessRecipe>(raw, recipeSchema, 1024);
}

const box = (x: number, y: number, z: number, width: number, height: number, depth: number): PrismBox => ({
  min: [x - width / 2, y - height / 2, z - depth / 2], max: [x + width / 2, y + height / 2, z + depth / 2],
});
const barrier = (id: string, x: number, y: number, z: number, width: number, height: number, depth: number): PrismBarrier =>
  ({ id, bounds: box(x, y, z, width, height, depth), motion: null });

function authorRoom(family: typeof families[number], tier: number, formation: number): PrismStage {
  // Two authored formations, not unconstrained positions. Each finite combination
  // is exercised by actual completion/restore tests before it can enter a release.
  const positions: PrismVector[] = family === "relay" ? [
    [-4, -2 + formation * 0.4, 0], [-3.8, 2.4, 8], [-0.8, 3.2, 11],
    [4.5, -2.8, 10], [1.5, -0.5, 8 + formation * 0.5], [1.5, 0.6, 10.5],
  ] : [
    [-4, -2.2 + formation * 0.4, 0], [4, 1.8 - formation * 0.5, 1],
    [-3.8, 2.4, 7], [3.8, -2.4, 8], [-1.5, -1.1, 11.5], [1.8, 1.1, 12.3],
  ];
  const extra: PrismVector[] = family === "relay" ? [
    [-4, 0, 4], [4.7, 2.8, 5], [-2.8, -3.5, 10], [4.8, 0, 12],
  ] : [[-4.5, -0.1, 3.8], [4.6, 0.2, 10], [-1.7, 3.7, 10.5], [1.8, -3.6, 10.5]];
  positions.push(...extra.slice(0, tier * 2));
  const targets: PrismTarget[] = positions.map(([x, y, z], index) => ({
    id: `target-${index}`, bounds: box(x, y, z, 1.1, 0.8, 0.65),
    health: index < tier ? 2 : 1, opens: family === "relay" && index === 0 ? ["vault-door"] : [],
  }));
  const barriers: PrismBarrier[] = [], fields: PrismStage["fields"] = [];
  if (family === "banks") barriers.push(barrier("bank-pier", formation * 0.4, 0, 5, 1.6, 6.2, 5));
  if (family === "timing") {
    const gate = barrier("shutter", -2.3, 0, 3, 1.2, 6, 0.4), periodTicks = 840 - tier * 120;
    gate.motion = { axis: 0, travel: 4.6, periodTicks, phaseTicks: formation * periodTicks / 4 };
    barriers.push(gate);
  }
  if (family === "relay") barriers.push(
    barrier("vault-left", -0.15, 0, 9, 0.3, 3.6, 7.4),
    barrier("vault-right", 3.15, 0, 9, 0.3, 3.6, 7.4),
    barrier("vault-bottom", 1.5, -1.65, 9, 2.9, 0.3, 7.4),
    barrier("vault-top", 1.5, 1.65, 9, 2.9, 0.3, 7.4),
    barrier("vault-door", 1.5, 0, 5.5, 2.9, 2.9, 0.3),
    barrier("vault-back", 1.5, 0, 12.5, 2.9, 2.9, 0.3),
  );
  if (family === "gravity") {
    const force = 0.8 + tier * 0.2;
    fields.push({ id: "near-current", bounds: box(0, 0, 3, 6, 7, 4), force: [force, formation ? 0.5 : -0.4, 0] });
    if (tier > 0) fields.push({ id: "far-current", bounds: box(0, 0, 9, 6, 6, 4), force: [-force, formation ? -0.4 : 0.5, 0] });
  }
  return { type: "prismStage", version: "1.0.0", id: "private-endless-room", targets, barriers, fields };
}

function reflect(stage: PrismStage, axis: 0 | 1): void {
  for (const object of [...stage.targets, ...stage.barriers, ...stage.fields]) {
    const previous = object.bounds.min[axis];
    object.bounds.min[axis] = -object.bounds.max[axis]; object.bounds.max[axis] = -previous;
  }
  for (const object of stage.barriers) {
    const motion = object.motion;
    if (motion?.axis === axis) {
      // Reflect the complete triangular motion, not just its tick-zero base box.
      object.bounds.min[axis] -= motion.travel; object.bounds.max[axis] -= motion.travel;
      motion.phaseTicks = (motion.phaseTicks + motion.periodTicks / 2) % motion.periodTicks;
    }
  }
  for (const field of stage.fields) field.force[axis] = -field.force[axis];
}

/** Read one bounded private room, detached and strictly validated by the real rules. */
export function readPrismEndlessRoom(raw: unknown): PrismEndlessRoom {
  const recipe = parsePrismEndlessRecipe(raw), family = families[recipe.round % 4]!, tier = Math.min(2, Math.floor(recipe.round / 8));
  const stage = authorRoom(family, tier, recipe.choice >> 2);
  if (recipe.choice & 1) reflect(stage, 0);
  if (recipe.choice & 2) reflect(stage, 1);
  stage.id = `pe-round-${recipe.round}-${recipe.choice}`;
  return { recipe, key: `pe-${family}-${tier}-${recipe.choice}`, family, tier, stage: parsePrismStage(stage) };
}

/** Select finite authored grammar using caller-owned randomness. Never owns a PRNG or save store. */
export function generatePrismEndlessRoom(round: number, recent: readonly string[], next: () => number): {
  room: PrismEndlessRoom; draws: number; fallback: boolean;
} {
  const base = parsePrismEndlessRecipe({ type: "prismEndlessRecipe", version: "1.0.0", round, choice: 0 });
  if (!Array.isArray(recent) || recent.length > 4 || !distinct([...recent])
    || recent.some(key => typeof key !== "string" || !/^pe-(banks|timing|relay|gravity)-[0-2]-[0-7]$/.test(key))
    || typeof next !== "function") throw new TypeError("invalid-prism-endless-options");
  const avoid = new Set(recent);
  for (let draws = 1; draws <= 4; draws++) {
    const value = next();
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value >= 1) throw new TypeError("invalid-prism-entropy");
    const room = readPrismEndlessRoom({ ...base, choice: Math.floor(value * 8) });
    if (!avoid.has(room.key)) return { room, draws, fallback: false };
  }
  // At most four distinct history keys exclude eight admitted candidates.
  const choice = Array.from({ length: 8 }, (_, n) => n).find(n => !avoid.has(readPrismEndlessRoom({ ...base, choice: n }).key))!;
  return { room: readPrismEndlessRoom({ ...base, choice }), draws: 4, fallback: true };
}
