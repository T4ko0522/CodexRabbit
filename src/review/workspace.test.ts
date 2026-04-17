import { describe, expect, it } from "vite-plus/test";
import { filterDiff } from "./workspace.ts";

const SAMPLE_DIFF = [
  "diff --git a/src/index.ts b/src/index.ts",
  "--- a/src/index.ts",
  "+++ b/src/index.ts",
  "@@ -1,3 +1,4 @@",
  " import foo;",
  "+import bar;",
  "diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml",
  "--- a/pnpm-lock.yaml",
  "+++ b/pnpm-lock.yaml",
  "@@ -1 +1 @@",
  "-old",
  "+new",
  "diff --git a/dist/bundle.js b/dist/bundle.js",
  "--- a/dist/bundle.js",
  "+++ b/dist/bundle.js",
  "@@ -1 +1 @@",
  "-old",
  "+new",
  "diff --git a/README.md b/README.md",
  "--- a/README.md",
  "+++ b/README.md",
  "@@ -1 +1 @@",
  "-old",
  "+new",
].join("\n");

describe("filterDiff", () => {
  it("returns raw diff when no filters are set", () => {
    const result = filterDiff(SAMPLE_DIFF, { includeExtensions: [], excludePaths: [] });
    expect(result).toBe(SAMPLE_DIFF);
  });

  it("excludes paths matching glob patterns", () => {
    const result = filterDiff(SAMPLE_DIFF, {
      includeExtensions: [],
      excludePaths: ["dist/**", "pnpm-lock.yaml"],
    });
    expect(result).toContain("src/index.ts");
    expect(result).toContain("README.md");
    expect(result).not.toContain("pnpm-lock.yaml");
    expect(result).not.toContain("dist/bundle.js");
  });

  it("includes only matching extensions", () => {
    const result = filterDiff(SAMPLE_DIFF, {
      includeExtensions: ["ts"],
      excludePaths: [],
    });
    expect(result).toContain("src/index.ts");
    expect(result).not.toContain("pnpm-lock.yaml");
    expect(result).not.toContain("README.md");
    expect(result).not.toContain("dist/bundle.js");
  });

  it("applies excludePaths before includeExtensions", () => {
    const result = filterDiff(SAMPLE_DIFF, {
      includeExtensions: ["ts", "js"],
      excludePaths: ["dist/**"],
    });
    expect(result).toContain("src/index.ts");
    expect(result).not.toContain("dist/bundle.js");
  });

  it("handles *.ext glob patterns", () => {
    const result = filterDiff(SAMPLE_DIFF, {
      includeExtensions: [],
      excludePaths: ["*.yaml"],
    });
    expect(result).not.toContain("pnpm-lock.yaml");
    expect(result).toContain("src/index.ts");
  });

  it("returns empty when all files are excluded", () => {
    const result = filterDiff(SAMPLE_DIFF, {
      includeExtensions: ["py"],
      excludePaths: [],
    });
    expect(result).toBe("");
  });
});
