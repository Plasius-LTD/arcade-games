import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const { ENTRY_NAMES } = require("./package-boundary.cjs");
/** Independent entries avoid common declaration chunks and keep game imports lazy in both module formats. */
export function buildPackage(run = execFileSync) {
  const cli = require.resolve("tsup/dist/cli-default.js");
  for (const name of ENTRY_NAMES) {
    const args = [cli, `src/${name}.ts`, ...(name === "index" ? ["--clean"] : ["--out-dir", "dist/games"])];
    run(process.execPath, args, { stdio: "inherit" });
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildPackage();
