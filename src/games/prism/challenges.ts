import { parsePrismStage, type PrismBarrier, type PrismBox, type PrismMotion, type PrismStage, type PrismTarget, type PrismVector } from "./rules.js";

// Original, individually authored candidate geometry. This private module is not
// a public content inventory, completion witness, rights approval or depth claim.
const box = (x: number, y: number, z: number, width: number, height: number, depth: number): PrismBox => ({
  min: [x - width / 2, y - height / 2, z - depth / 2], max: [x + width / 2, y + height / 2, z + depth / 2],
});
const target = (id: string, x: number, y: number, z: number, health = 1, opens: string[] = []): PrismTarget =>
  ({ id, bounds: box(x, y, z, 1.1, 0.8, 0.65), health, opens });
const barrier = (id: string, x: number, y: number, z: number, width: number, height: number, depth: number,
  motion: PrismMotion | null = null): PrismBarrier => ({ id, bounds: box(x, y, z, width, height, depth), motion });
const field = (id: string, x: number, y: number, z: number, width: number, height: number, depth: number, force: PrismVector) =>
  ({ id, bounds: box(x, y, z, width, height, depth), force });
const motion = (axis: 0 | 1, travel: number, periodTicks: number, phaseTicks = 0): PrismMotion => ({ axis, travel, periodTicks, phaseTicks });
const stage = (id: string, targets: PrismTarget[], barriers: PrismBarrier[] = [], fields: PrismStage["fields"] = []): PrismStage =>
  ({ type: "prismStage", version: "1.0.0", id, targets, barriers, fields });

// A box-room construction primitive, not a campaign generator. The 0.05-unit
// seams keep solids disjoint while excluding the 0.36-unit ball. The door is a
// separately addressable solid; every use below authors its location and links.
function room(id: string, x: number, y: number, near: number, far: number, width: number, height: number): PrismBarrier[] {
  const z = (near + far) / 2, depth = far - near + 0.4;
  return [
    barrier(`${id}-left`, x - width / 2 - 0.15, y, z, 0.3, height + 0.6, depth),
    barrier(`${id}-right`, x + width / 2 + 0.15, y, z, 0.3, height + 0.6, depth),
    barrier(`${id}-bottom`, x, y - height / 2 - 0.15, z, width - 0.1, 0.3, depth),
    barrier(`${id}-top`, x, y + height / 2 + 0.15, z, width - 0.1, 0.3, depth),
    barrier(`${id}-door`, x, y, near, width - 0.1, height - 0.1, 0.3),
    barrier(`${id}-back`, x, y, far, width - 0.1, height - 0.1, 0.3),
  ];
}

const challenges: PrismStage[] = [
  // Near/middle/far clusters do not obscure each other's launch sightlines.
  stage("pb-01", [
    target("near-low", -3.8, -1.8, -1), target("near-high", -3.8, 0.2, -1),
    target("middle-low", 0, -0.8, 5), target("middle-high", 0, 1.2, 5),
    target("far-low", 3.8, 0.6, 11.5), target("far-high", 3.8, 2.6, 11.5),
  ]),
  stage("pb-02", [
    target("upper-left-near", -4.8, 3.4, 1), target("upper-left-far", -3.3, 3.4, 10),
    target("lower-right-near", 4.8, -3.4, 2), target("lower-right-far", 3.3, -3.4, 11),
    target("upper-right", 4.8, 2.2, 7), target("lower-left", -4.8, -2.2, 8),
  ]),
  stage("pb-03", [
    target("step-a", -4.5, -3, -2), target("step-b", -3, -2, 1),
    target("step-c", -1.5, -1, 4), target("step-d", 0, 0, 7),
    target("step-e", 1.5, 1, 10), target("step-f", 3.2, 2.5, 12.5),
  ]),
  stage("pb-04", [
    target("left-near", -4, -2, 2), target("left-middle", -4, 1, 6), target("left-far", -3.5, 3, 11),
    target("right-near", 4, 2, 3), target("right-middle", 4, -1, 7), target("right-far", 3.5, -3, 12),
  ], [barrier("pier", 0, 0, 5, 2.4, 7.4, 7)]),
  stage("pb-05", [
    target("left-window", -4.2, -2, 7), target("right-window", 4.3, 2.2, 8),
    target("far-left", -2.5, 2.7, 12), target("far-middle", 0, 0, 12),
    target("far-right", 2.7, -2.7, 12), target("near-marker", -4.6, 2.8, -2),
  ], [barrier("offset-screen", -0.7, 0, 2.8, 5.2, 6, 0.6)]),
  stage("pb-06", [
    target("anchor-low", -2.8, -1.8, 7, 2), target("anchor-high", 2.8, 1.8, 11, 2),
    target("low-outer", -4.4, -2.8, 4), target("low-inner", -1.2, -0.6, 4),
    target("high-inner", 1.2, 0.6, 8), target("high-outer", 4.4, 2.8, 8),
  ]),
  stage("pb-07", [
    target("shelf-left", -2.5, 3.2, 9), target("shelf-middle", 0, 3.2, 10), target("shelf-right", 2.5, 3.2, 11),
    target("lower-left", -4.5, -2.5, 3), target("lower-right", 4.5, -1.5, 7),
  ], [], [field("updraft", 0, -0.2, 3.5, 5.6, 5.6, 5, [0, 2, 0])]),
  stage("pb-08", [
    target("upper-left", -3.3, 3, 2), target("upper-right", 3.3, 3, 3),
    target("lower-left", -3.3, -3.1, 10), target("lower-middle", 0, -3.1, 11), target("lower-right", 3.3, -3.1, 12),
  ], [], [field("downdraft", 0, 0.5, 6.5, 6, 6.4, 4, [0, -2.2, 0])]),
  stage("pb-09", [
    target("near-left", -4.6, 1.8, 2), target("near-right", 4.6, -1.8, 3),
    target("far-left", -4, -2.7, 11), target("far-middle", 0, 2.7, 11.5), target("far-right", 4, 0.8, 12),
  ], [], [field("a-left", 0, 0, 1, 5, 7, 4, [-2, 0, 0]), field("b-right", 0, 0, 8, 5, 7, 4, [2, 0, 0])]),
  stage("pb-10", [
    target("pocket-nw", -4.4, 2.8, 7), target("pocket-sw", -4.4, -2.8, 10),
    target("pocket-ne", 4.4, 2.8, 10), target("pocket-se", 4.4, -2.8, 7),
    target("shaft-high", 0, 1.2, 12.5), target("shaft-low", 0, -1.2, 12.5),
  ], [], [field("left-inflow", -4, 0, 4, 3, 7.6, 5, [1.8, 0, 0]), field("right-inflow", 4, 0, 4, 3, 7.6, 5, [-1.8, 0, 0])]),
  stage("pb-11", [
    target("left-high", -3.6, 2.6, 9), target("left-low", -3.6, -1.6, 11),
    target("right-high", 3.6, 1.6, 11), target("right-low", 3.6, -2.6, 9), target("centre-far", 0, 0, 12.5),
  ], [barrier("horizontal-gate", -2.7, 0, 3, 1.6, 6.4, 0.4, motion(0, 5.4, 600))]),
  stage("pb-12", [
    target("gallery-upper", 4.2, 2.8, 7), target("gallery-lower", 4.2, -2.8, 11), target("gallery-middle", 4.2, 0, 12),
    target("left-upper", -3.8, 2.4, 4), target("left-lower", -3.8, -2.4, 9),
  ], [barrier("gallery-pier", 0.6, 0, 6, 1.8, 6.8, 6),
    barrier("vertical-gate", 4, -2.4, 2, 3.2, 1.2, 0.4, motion(1, 4.8, 720, 180))]),
  stage("pb-13", [
    target("waiting-low", -4.3, -2.8, 4.5), target("waiting-high", 4.3, 2.8, 5),
    target("far-low", -3.3, -2, 11.5), target("far-high", 3.3, 2, 11.5), target("far-middle", 0, 0, 12.5),
  ], [barrier("entry-gate", -2.5, 0, 1, 1.2, 6.8, 0.4, motion(0, 5, 600)),
    barrier("exit-gate", 0, -2.5, 8, 7, 1.2, 0.4, motion(1, 5, 840, 210))]),
  stage("pb-14", [
    target("anchor", 0, 0, 12, 2), target("left-guard", -3.2, 2.6, 10), target("right-guard", 3.2, -2.6, 10),
    target("near-left", -4.5, -2.6, 1), target("near-right", 4.5, 2.6, 3),
  ], [barrier("anchor-gate", -2, 0, 7, 2, 6.4, 0.6, motion(0, 4, 960, 240))]),
  stage("pb-15", [
    target("left-relay", -3.5, 2.9, -1, 1, ["west-door"]), target("right-relay", 3.5, -2.9, 0, 1, ["east-door"]),
    target("west-low", -3.5, -0.6, 6), target("west-high", -3.5, 0.6, 9),
    target("east-low", 3.5, -0.6, 6.5), target("east-high", 3.5, 0.6, 9.5), target("central-far", 0, 2.7, 12),
  ], [...room("west", -3.5, 0, 3, 11, 3, 3), ...room("east", 3.5, 0, 3.5, 11.5, 3, 3)]),
  stage("pb-16", [
    target("first-relay", -3, -2.8, -1, 1, ["chain-door"]), target("second-relay", -1.5, 0.8, 3, 1, ["partition"]),
    target("entry-low", 1.5, -0.8, 3.5), target("final-left", -1.5, -0.8, 9),
    target("final-right", 1.5, 0.8, 10), target("final-middle", 0, 0, 11),
  ], [...room("chain", 0, 0, 0.5, 12, 6, 3.6), barrier("partition", 0, 0, 6, 5.9, 3.5, 0.3)]),
  stage("pb-17", [
    target("high-relay", -4.5, 3.2, 0, 1, ["upper-door"]), target("mid-relay", 4.5, 0, 1, 1, ["middle-door"]),
    target("low-relay", -4.5, -3.2, 2, 1, ["lower-door"]),
    target("upper-core", 0, 2, 9), target("middle-core", 1.2, 0, 10), target("lower-core", -1.2, -2, 11),
  ], [...room("core", 0, 0, 5, 12.5, 5.2, 6.6).filter(b => b.id !== "core-door"),
    barrier("lower-door", 0, -2.2, 5, 5.1, 2.1, 0.3), barrier("middle-door", 0, 0, 5, 5.1, 2.1, 0.3),
    barrier("upper-door", 0, 2.2, 5, 5.1, 2.1, 0.3)]),
  stage("pb-18", [
    target("deflector-relay", -4.5, 2.7, 0, 1, ["deflector"]),
    target("far-left", -3.6, -2.8, 11), target("far-right", 3.6, 2.8, 12),
    target("far-centre", 0.5, 0.6, 12.5), target("side-low", 4.7, -2.5, 4), target("side-high", -4.7, 0.5, 7),
  ], [barrier("deflector", -0.8, 0.4, 6.5, 4.4, 5.8, 0.7)]),
  stage("pb-19", [
    target("upper-entry", -3, 3.5, 1), target("upper-deep", 3, 3.5, 10), target("upper-anchor", 0, 3.5, 12, 2),
    target("lower-entry", 3, -3.5, 2), target("lower-deep", -3, -3.5, 9), target("lower-anchor", 0, -3.5, 11, 2),
  ], [barrier("upper-divider", 0, 1.8, 6, 9.4, 0.4, 7), barrier("lower-divider", 0, -1.8, 6, 9.4, 0.4, 7)]),
  stage("pb-20", [
    target("entry-right", 4.8, 2.4, 1), target("bend-low", 2.7, -2.8, 5),
    target("bend-left", -4.7, -1.5, 8), target("exit-high", -2.7, 3, 11), target("exit-low", 2.7, -2.7, 12),
  ], [barrier("near-offset", -2, 0.6, 3, 5.8, 5.8, 0.6), barrier("far-offset", 2, -0.6, 8.8, 5.8, 5.8, 0.6)]),
  stage("pb-21", [
    target("upper-vault", -1.8, 2.9, 11), target("lower-vault", 1.8, -2.9, 12), target("central-vault", 0, 0, 12.5),
    target("entry-left", -4.6, -2.4, 1), target("entry-right", 4.6, 2.4, 4),
  ], [barrier("vault-gate", 0, -2.4, 8, 7.6, 1.2, 0.5, motion(1, 4.8, 900, 225))],
  [field("vault-updraft", 0, -0.7, 4, 5.6, 5.6, 4, [0, 2.4, 0])]),
  stage("pb-22", [
    target("vault-relay", -4.3, 2.7, 0, 1, ["side-door"]), target("vault-high", 3.2, 1.5, 7.5),
    target("vault-low", 3.2, -1.5, 10.5), target("left-low", -3.8, -2.7, 5), target("left-high", -3.8, 2.7, 11),
  ], room("side", 3.2, 0, 3, 12.5, 3.6, 4.4), [field("vault-pull", 3.2, 0, 6, 3.2, 4, 5, [0, 1.8, 0])]),
  stage("pb-23", [
    target("near-armour-left", -3.5, -2.5, 3, 2), target("near-armour-right", 3.5, 2.5, 3, 2),
    target("far-armour-left", -3.5, 2.5, 10, 2), target("far-armour-right", 3.5, -2.5, 10, 2),
    target("far-low", 0, -1.5, 12), target("far-high", 0, 1.5, 12),
  ], [barrier("moving-screen", -2.5, 0, 6, 2, 7.2, 0.5, motion(0, 5, 780, 390))]),
  stage("pb-24", [
    target("first-high", -3.8, 3.3, 1), target("first-low", 3.8, 2.5, 2),
    target("second-low", -3.8, -3.3, 6), target("second-high", 3.8, -2.5, 7),
    target("third-left", -3.8, 0, 11), target("third-right", 3.8, 0, 12),
  ], [barrier("low-entry-screen", 0, -1, -0.5, 10.8, 5.6, 0.4),
    barrier("high-middle-screen", 0, 1, 4, 10.8, 5.6, 0.4),
    barrier("far-top-screen", 0, 3.2, 9, 10.8, 2.2, 0.4), barrier("far-bottom-screen", 0, -3.2, 9, 10.8, 2.2, 0.4)]),
  stage("pb-25", [
    target("refuge-high", 0, 1.4, 10), target("refuge-low", 0, -1.4, 12),
    target("left-high", -4.8, 2.8, 7), target("left-low", -4.8, -2.8, 11),
    target("right-high", 4.8, 2.8, 11), target("right-low", 4.8, -2.8, 7),
  ], [], [field("left-downdraft", -4.2, 0, 4, 3.2, 7.6, 6, [0, -2.3, 0]),
    field("right-updraft", 4.2, 0, 4, 3.2, 7.6, 6, [0, 2.3, 0])]),
  stage("pb-26", [
    target("ring-high-relay", 0, 3.5, 2, 1, ["inner-door"]), target("ring-low-relay", 0, -3.5, 5, 1, ["inner-door"]),
    target("ring-left", -4.6, 0, 7), target("ring-right", 4.6, 0, 9),
    target("inner-low", -1, -0.8, 7), target("inner-high", 1, 0.8, 10, 2),
  ], room("inner", 0, 0, 4, 12, 4.8, 3.8)),
  stage("pb-27", [
    target("west-relay", -4.8, 2.9, -1, 1, ["west-partition"]), target("east-relay", 4.8, -2.9, -1, 1, ["east-partition"]),
    target("west-upper", -3.7, 2.5, 10), target("west-lower", -3.7, -2.5, 12),
    target("east-upper", 3.7, 2.5, 12), target("east-lower", 3.7, -2.5, 10),
  ], [barrier("central-divider", 0, 0, 7, 0.4, 7.6, 10),
    barrier("west-gate", -3.7, -2.3, 2, 4.4, 1.2, 0.4, motion(1, 4.6, 600)),
    barrier("east-gate", 3.7, -2.3, 2, 4.4, 1.2, 0.4, motion(1, 4.6, 1020, 255)),
    barrier("west-partition", -3.7, 0, 7, 4.4, 5.4, 0.4), barrier("east-partition", 3.7, 0, 8, 4.4, 5.4, 0.4)]),
  stage("pb-28", [
    target("rise-start", -4.5, -2.8, -1), target("rise-middle", -3.4, -0.8, 4), target("rise-end", -2.3, 1.2, 9),
    target("fall-start", 4.5, 2.8, -1), target("fall-middle", 3.4, 0.8, 4), target("fall-end", 2.3, -1.2, 9),
    target("convergence-high", 0, 1.2, 12), target("convergence-low", 0, -1.2, 12),
  ], [barrier("rise-shelf", -3.7, -2.6, 5.5, 3.4, 0.4, 3), barrier("fall-shelf", 3.7, 2.6, 5.5, 3.4, 0.4, 3)]),
  stage("pb-29", [
    target("first-relay", -4.5, -2.8, -2, 1, ["vaults-door"]),
    target("first-armour", 1.5, -0.8, 2, 2), target("second-relay", -1.5, 0.8, 2.8, 1, ["second-door"]),
    target("third-relay", 1.5, -0.8, 7.3, 1, ["third-door"]),
    target("final-low", -1.5, -0.8, 10, 2), target("final-high", 1.5, 0.8, 11, 2),
  ], [...room("vaults", 0, 0, 0, 12.5, 6, 4),
    barrier("second-door", 0, 0, 4, 5.9, 3.9, 0.3), barrier("third-door", 0, 0, 8.5, 5.9, 3.9, 0.3),
    barrier("vault-gate", -1.2, 0, 6, 0.8, 3, 0.3, motion(0, 2.4, 1080, 270))],
  [field("middle-field", 0, 0, 5.5, 5.5, 3.4, 2, [0, 1.2, 0])]),
  stage("pb-30", [
    target("west-key", -4.7, -2.9, -1, 2, ["west-final-door"]),
    target("west-phase-low", -3.3, -0.8, 6), target("east-key", -3.3, 0.8, 9.5, 2, ["east-final-door"]),
    target("east-phase-low", 3.3, -0.8, 7, 2), target("east-phase-high", 3.3, 0.8, 10, 2),
    target("centre-final-low", 0, -2.6, 12), target("centre-final-high", 0, 2.6, 12.5),
  ], [...room("west-final", -3.3, 0, 3, 11.5, 3.4, 3.6), ...room("east-final", 3.3, 0, 4, 12, 3.4, 3.6)]),
];

/** Private authoring sequence; returned identifiers are detached from the source. */
export function listPrismChallenges(): string[] { return challenges.map(challenge => challenge.id); }

/** Read a validated, detached candidate. Unknown IDs never select fallback content. */
export function readPrismChallenge(id: string): PrismStage {
  const challenge = challenges.find(candidate => candidate.id === id);
  if (!challenge) throw new RangeError("unknown-prism-challenge");
  return parsePrismStage(challenge);
}
