import { defineConfig } from "tsup";
export default defineConfig({ dts: true, sourcemap: true, format: ["esm", "cjs"], target: "es2022", external: [/^\.\/games\//], splitting: false });
