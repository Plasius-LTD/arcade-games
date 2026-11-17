/** Stable save/permalink identities; display names may change after clearance. */
export const GAME_IDS = Object.freeze(["prism-breaker", "vector-volley", "skyway-hopper", "clockwork-roost", "crystal-descent", "tower-rescue", "depthguard", "swarmline", "rockdrift", "horizon-rescue", "shield-command", "reactor-siege", "voxel-cascade", "maze-signal", "strata-shift", "cargo-circuit", "coil-runner", "prism-steps", "jetpack-foundry", "relic-canopy", "tunnel-pulse", "photon-trails", "orbital-pinball", "apex-circuit"] as const);
export type GameId = typeof GAME_IDS[number];
/** Category labels are translated by the site. */
export type GameCategory = "action" | "shooter" | "puzzle" | "racing" | "sport" | "exploration";
export const isGameId = (value: unknown): value is GameId => typeof value === "string" && (GAME_IDS as readonly string[]).includes(value);
