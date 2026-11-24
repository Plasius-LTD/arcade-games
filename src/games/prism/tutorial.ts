import { parsePrismStage, type PrismBox, type PrismStage, type PrismTarget } from "./rules.js";

/** Original practice content; excluded from public entries pending host integration and qualification. */
export interface PrismTutorialLesson {
  id: string;
  mechanic: "launch-return" | "depth-aiming" | "wall-banks" | "armour-relay" | "moving-gate" | "gravity";
  instructionKey: string; objectiveKey: string; stage: PrismStage;
}
const box = (x: number, y: number, z: number, width: number, height: number, depth: number): PrismBox => ({
  min: [x - width / 2, y - height / 2, z - depth / 2], max: [x + width / 2, y + height / 2, z + depth / 2],
});
const target = (id: string, x: number, y: number, z: number, health = 1, opens: string[] = []): PrismTarget =>
  ({ id, bounds: box(x, y, z, 1.4, 1, 0.6), health, opens });
function lesson(id: string, mechanic: PrismTutorialLesson["mechanic"], targets: PrismTarget[],
  barriers: PrismStage["barriers"] = [], fields: PrismStage["fields"] = []): PrismTutorialLesson {
  const prefix = `arcade.games.prism-breaker.tutorial.${id}`;
  return { id, mechanic, instructionKey: `${prefix}.instruction`, objectiveKey: `${prefix}.objective`,
    stage: { type: "prismStage", version: "1.0.0", id, targets, barriers, fields } };
}
const lessons = [
  lesson("pt-01", "launch-return", [target("serve", 0, 0, -1), target("return", 1.6, 0.8, 5)]),
  lesson("pt-02", "depth-aiming", [target("near", -3, -2, -1), target("middle", 0, 2, 5), target("far", 3, -1, 11)]),
  lesson("pt-03", "wall-banks", [target("left", -3.5, 1.5, 7), target("right", 3.5, -1.5, 11)], [
    { id: "pier", bounds: box(0, 0, 6, 2.4, 8, 6), motion: null },
  ]),
  lesson("pt-04", "armour-relay", [target("relay", -3, 2, 0, 2, ["door"]), target("beyond", 1, -0.5, 9)], [
    { id: "left", bounds: box(-1.65, -0.5, 8, 0.3, 4.6, 8.4), motion: null },
    { id: "right", bounds: box(3.65, -0.5, 8, 0.3, 4.6, 8.4), motion: null },
    { id: "bottom", bounds: box(1, -2.65, 8, 4.9, 0.3, 8.4), motion: null },
    { id: "top", bounds: box(1, 1.65, 8, 4.9, 0.3, 8.4), motion: null },
    { id: "door", bounds: box(1, -0.5, 4, 4.9, 3.9, 0.3), motion: null },
    { id: "back", bounds: box(1, -0.5, 12, 4.9, 3.9, 0.3), motion: null },
  ]),
  lesson("pt-05", "moving-gate", [target("left", -3, 2, 7), target("right", 3, -2, 11), target("above", 0, 3.5, 12)], [
    { id: "gate", bounds: box(-2, 0, 3, 1.3, 7, 0.4), motion: { axis: 0, travel: 4, periodTicks: 720, phaseTicks: 0 } },
  ]),
  lesson("pt-06", "gravity", [target("lower", -2, -1, 8), target("upper", 2, 2, 11)], [], [
    { id: "lift", bounds: box(0, 0, 3, 6, 6, 4), force: [0, 1.2, 0] },
  ]),
];
/** Stable practice sequence, independent of the thirty campaign challenges. */
export const PRISM_TUTORIAL_IDS: readonly string[] = Object.freeze(lessons.map(value => value.id));

/** Read a detached lesson. The host owns translated prompts and interactive progression. */
export function readPrismTutorial(id: string): PrismTutorialLesson {
  const value = lessons.find(candidate => candidate.id === id);
  if (!value) throw new TypeError("unknown-prism-tutorial");
  return { ...value, stage: parsePrismStage(value.stage) };
}
