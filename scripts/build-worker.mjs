import { build } from "esbuild";

await build({
  entryPoints: ["src/worker/index.ts"],
  outfile: "dist/worker/index.js",
  bundle: true,
  conditions: ["react-server"],
  external: ["bullmq", "ioredis"],
  format: "cjs",
  platform: "node",
  target: "node22",
  tsconfig: "tsconfig.json",
});
