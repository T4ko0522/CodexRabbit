import { builtinModules } from "node:module";
import { defineConfig } from "vite-plus";

const nodeBuiltins = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);

export default defineConfig({
  // Node サーバー向け SSR ビルド。依存は全て externalize する。
  build: {
    target: "node20",
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    ssr: "src/index.ts",
    rollupOptions: {
      output: {
        format: "esm",
        entryFileNames: "index.js",
      },
      external: (id) => {
        if (nodeBuiltins.has(id)) return true;
        // 相対・絶対パス以外 (= npm 依存) は全て external
        return (
          !id.startsWith(".") &&
          !id.startsWith("/") &&
          !id.startsWith("\\") &&
          !/^[a-zA-Z]:/.test(id)
        );
      },
    },
  },
  ssr: {
    // Node 依存は bundler に取り込まない
    target: "node",
    noExternal: [],
  },
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/index.ts", "src/logger.ts", "src/types.ts"],
    },
  },
});
