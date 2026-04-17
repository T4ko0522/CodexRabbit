import { describe, expect, it } from "vite-plus/test";
import { splitArgs } from "./env.ts";

describe("splitArgs", () => {
  it("returns empty array for empty string", () => {
    expect(splitArgs("")).toEqual([]);
  });

  it("splits on whitespace", () => {
    expect(splitArgs("--model gpt-5-codex --full-auto")).toEqual([
      "--model",
      "gpt-5-codex",
      "--full-auto",
    ]);
  });

  it("keeps double-quoted groups together", () => {
    expect(splitArgs('--name "hello world" --flag')).toEqual(["--name", "hello world", "--flag"]);
  });

  it("keeps single-quoted groups together", () => {
    expect(splitArgs("-m 'a b c' -n")).toEqual(["-m", "a b c", "-n"]);
  });
});
