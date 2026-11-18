import { sweepSphereAabb } from "@plasius/gpu-physics/collision";
import type { PrismStage, PrismVector } from "../../src/games/prism/rules.js";

/** Test-only optimistic clearance screening. It is NOT a controllable completion witness.
 * The ball follows a 1-unit orthogonal grid; contacted targets disappear and open relays.
 * Moving barriers conservatively occupy their entire travel envelope. Gravity, timing,
 * speed, lives and paddle control are deliberately not claimed by this geometric check.
 */
export function reachablePrismTargets(stage: PrismStage): Set<string> {
  const reached = new Set<string>(), open = new Set<string>();
  const directions: PrismVector[] = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];
  for (let pass = 0; pass <= stage.targets.length; pass++) {
    const before = reached.size, queue: PrismVector[] = [[0, 0, -7]], seen = new Set(["0,0,-7"]);
    for (let index = 0; index < queue.length; index++) {
      const position = queue[index]!;
      for (const delta of directions) {
        const next = position.map((n, axis) => n + delta[axis]!) as PrismVector;
        if (Math.abs(next[0]) > 6 || Math.abs(next[1]) > 4 || next[2] < -7 || next[2] > 13 || seen.has(next.join())) continue;
        const surfaces = [
          ...stage.targets.filter(t => !reached.has(t.id)).map(t => ({ id: t.id, bounds: t.bounds, target: t })),
          ...stage.barriers.filter(b => !open.has(b.id)).map(b => {
            const bounds = structuredClone(b.bounds);
            if (b.motion) bounds.max[b.motion.axis] += b.motion.travel;
            return { id: b.id, bounds, target: null };
          }),
        ];
        const contacts = surfaces.map(s => ({ ...s, hit: sweepSphereAabb({ center: position, radius: 0.18 }, delta, s.bounds) }))
          .filter(s => s.hit).sort((a, b) => a.hit!.time - b.hit!.time || a.id.localeCompare(b.id));
        const first = contacts[0];
        if (first) {
          if (first.target) { reached.add(first.id); first.target.opens.forEach(id => open.add(id)); }
          continue;
        }
        seen.add(next.join()); queue.push(next);
      }
    }
    if (reached.size === before) break;
  }
  return reached;
}
