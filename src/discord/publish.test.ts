import { describe, expect, it } from "vite-plus/test";
import { chunkMarkdown } from "./publish.ts";

describe("chunkMarkdown", () => {
  it("returns input unchanged when within limit", () => {
    const text = "hello world";
    expect(chunkMarkdown(text, 100)).toEqual(["hello world"]);
  });

  it("splits long text on newline boundaries", () => {
    const lines: string[] = [];
    for (let i = 0; i < 50; i++) lines.push(`line ${i} `.repeat(5));
    const full = lines.join("\n");
    const chunks = chunkMarkdown(full, 200);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(200);
  });

  it("closes and reopens code fences across chunks", () => {
    const body = Array.from({ length: 40 }, (_, i) => `console.log(${i});`).join("\n");
    const md = `prefix\n\`\`\`ts\n${body}\n\`\`\`\nsuffix`;
    const chunks = chunkMarkdown(md, 200);
    expect(chunks.length).toBeGreaterThan(1);
    // すべてのチャンク内でフェンスの数が偶数 (開閉が揃っている)
    for (const c of chunks) {
      const fenceCount = (c.match(/```/g) ?? []).length;
      expect(fenceCount % 2).toBe(0);
    }
    // 連結すればセマンティクスが保たれる (先頭以外はフェンスで始まるかチェック不要、閉じ具合のみ)
    const joined = chunks.join("\n");
    expect(joined).toContain("prefix");
    expect(joined).toContain("suffix");
  });

  it("handles empty string", () => {
    expect(chunkMarkdown("", 100)).toEqual([""]);
  });

  it("never exceeds the specified size even with code fences", () => {
    const body = Array.from({ length: 100 }, (_, i) => `line ${i}: ${"x".repeat(60)}`).join("\n");
    const md = `\`\`\`ts\n${body}\n\`\`\``;
    const limit = 2000;
    const chunks = chunkMarkdown(md, limit);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(limit);
    }
  });
});
