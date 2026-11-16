export const ids = ["prism-breaker", "vector-volley", "skyway-hopper", "clockwork-roost", "crystal-descent", "tower-rescue", "depthguard", "swarmline", "rockdrift", "horizon-rescue", "shield-command", "reactor-siege", "voxel-cascade", "maze-signal", "strata-shift", "cargo-circuit", "coil-runner", "prism-steps", "jetpack-foundry", "relic-canopy", "tunnel-pulse", "photon-trails", "orbital-pinball", "apex-circuit"];
export const evidence = (id = "evidence-a") => ({ id, sha256: "a".repeat(64) });
export const binding = { gameId: "prism-breaker", rulesVersion: "1.0.0", contentVersion: "1.0.0" };
export const manifestFixture = () => ({ type: "arcadeGameManifest", version: "1.0.0", id: "prism-breaker", workingTitle: "Prism Breaker", category: "action",
  titleKey: "arcade.games.prism-breaker.title", descriptionKey: "arcade.games.prism-breaker.description", objectivesKey: "arcade.games.prism-breaker.objectives",
  rulesVersion: "1.0.0", contentVersion: "1.0.0", flagKey: "arcade.games.prism-breaker.enabled",
  instructions: { touch: "arcade.games.prism-breaker.instructions.touch", keyboard: "arcade.games.prism-breaker.instructions.keyboard", mouse: "arcade.games.prism-breaker.instructions.mouse" },
  hardware: { renderer: "webgpu", dimensions: "spatial-3d", inputs: ["touch", "keyboard", "mouse"] },
  modes: [{ id: "solo", kind: "solo", minPlayers: 1, maxPlayers: 1 }, { id: "co-op", kind: "co-op", minPlayers: 2, maxPlayers: 2 }],
  implementation: { status: "planned", artifact: null },
  rights: { edition: "original", recordId: "rights-prism-breaker", clearance: "pending", approval: null, redistribution: "none" },
});
export const contentFixture = () => ({ type: "arcadeContentInventory", version: "1.0.0", ...binding,
  tutorial: evidence("tutorial"),
  challenges: Array.from({ length: 30 }, (_, index) => ({ id: `challenge-${index + 1}`, kind: "authored", artifact: { id: `content-${index + 1}`, sha256: index.toString(16).padStart(64, "0") }, objectives: [`objective-${index + 1}`] })),
  difficulties: ["accessible", "standard", "expert"].map((id, index) => ({ id, profile: { id: `profile-${id}`, sha256: (index + 1).toString().repeat(64) } })),
  mastery: [{ id: "mastery-a", objectiveKey: "arcade.games.prism-breaker.mastery.a" }],
  endless: { kind: "action", validation: evidence("generation-validation"), guarantees: ["bounded-difficulty", "reachable-objectives", "safe-starts", "reaction-time"] },
});
export const qualificationFixture = () => ({ type: "arcadeQualification", version: "1.0.0", ...binding, artifact: evidence("implementation"),
  humanPlay: { review: evidence("human-review"), activeMinutes: 600, touchMinutes: 400, desktopParity: true, independentDepthApproval: true },
  devices: { review: evidence("device-review"), passed: true },
  accessibility: { review: evidence("accessibility-review"), standard: "wcag-2.2-aa", passed: true },
  authority: { review: evidence("authority-review"), modes: ["solo", "co-op"], passed: true },
  delivery: { review: evidence("delivery-review"), mainCd: true, secretRefs: true, publicArtifacts: true },
});
