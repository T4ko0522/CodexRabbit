import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { loadEnv, resolveCodexFixArgs, splitArgs } from "./env.ts";

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

  it("merges quoted value attached to a flag", () => {
    expect(splitArgs('--foo="bar baz" --flag')).toEqual(["--foo=bar baz", "--flag"]);
  });

  it('unescapes \\" inside double quotes', () => {
    expect(splitArgs('--msg "say \\"hi\\""')).toEqual(["--msg", 'say "hi"']);
  });

  it("unescapes backslash-space outside quotes", () => {
    expect(splitArgs("foo\\ bar baz")).toEqual(["foo bar", "baz"]);
  });

  it("preserves empty quoted argument", () => {
    expect(splitArgs('--empty "" next')).toEqual(["--empty", "", "next"]);
  });
});

describe("loadEnv", () => {
  const original = { ...process.env };

  beforeEach(() => {
    // 必須値を設定
    process.env.WEBHOOK_SECRET = "test-secret-12345";
    process.env.GITHUB_APP_ID = "123456";
    process.env.GITHUB_APP_PRIVATE_KEY_PATH = "/tmp/key.pem";
    process.env.GITHUB_APP_INSTALLATION_ID = "789";
    process.env.DISCORD_BOT_TOKEN = "discord-token";
    process.env.DISCORD_CHANNEL_ID = "123456789";
  });

  afterEach(() => {
    // 元に戻す
    for (const key of Object.keys(process.env)) {
      if (!(key in original)) delete process.env[key];
      else process.env[key] = original[key];
    }
  });

  it("loads valid env with defaults", () => {
    const env = loadEnv();
    expect(env.HTTP_HOST).toBe("127.0.0.1");
    expect(env.HTTP_PORT).toBe(3000);
    expect(env.WEBHOOK_SECRET).toBe("test-secret-12345");
    expect(env.GITHUB_APP_ID).toBe(123456);
    expect(env.GITHUB_APP_INSTALLATION_ID).toBe(789);
    expect(env.CODEX_TIMEOUT_MS).toBe(900_000);
    expect(env.SHUTDOWN_TIMEOUT_MS).toBe(30_000);
  });

  it("throws when WEBHOOK_SECRET is too short", () => {
    process.env.WEBHOOK_SECRET = "short";
    expect(() => loadEnv()).toThrow("WEBHOOK_SECRET");
  });

  it("allows missing DISCORD_BOT_TOKEN (optional)", () => {
    delete process.env.DISCORD_BOT_TOKEN;
    const env = loadEnv();
    expect(env.DISCORD_BOT_TOKEN).toBeUndefined();
  });

  it("throws when GITHUB_APP_ID is missing", () => {
    delete process.env.GITHUB_APP_ID;
    expect(() => loadEnv()).toThrow("GITHUB_APP_ID");
  });

  it("coerces numeric values", () => {
    process.env.HTTP_PORT = "8080";
    process.env.CODEX_TIMEOUT_MS = "60000";
    process.env.SHUTDOWN_TIMEOUT_MS = "5000";
    const env = loadEnv();
    expect(env.HTTP_PORT).toBe(8080);
    expect(env.CODEX_TIMEOUT_MS).toBe(60_000);
    expect(env.SHUTDOWN_TIMEOUT_MS).toBe(5_000);
  });

  it("rejects non-positive SHUTDOWN_TIMEOUT_MS", () => {
    process.env.SHUTDOWN_TIMEOUT_MS = "0";
    expect(() => loadEnv()).toThrow("SHUTDOWN_TIMEOUT_MS");
  });

  it("provides defaults for fix-related env", () => {
    const env = loadEnv();
    expect(env.CODEX_FIX_ARGS).toBe("");
    expect(env.GIT_AUTHOR_NAME).toBe("codex-rabbit[bot]");
    expect(env.GIT_AUTHOR_EMAIL).toBe("codex-rabbit[bot]@users.noreply.github.com");
  });

  it("accepts overrides for git author and CODEX_FIX_ARGS", () => {
    process.env.CODEX_FIX_ARGS = "--full-auto --model gpt-5-codex";
    process.env.GIT_AUTHOR_NAME = "ai-bot";
    process.env.GIT_AUTHOR_EMAIL = "ai-bot@example.com";
    const env = loadEnv();
    expect(env.CODEX_FIX_ARGS).toBe("--full-auto --model gpt-5-codex");
    expect(env.GIT_AUTHOR_NAME).toBe("ai-bot");
    expect(env.GIT_AUTHOR_EMAIL).toBe("ai-bot@example.com");
  });
});

describe("resolveCodexFixArgs", () => {
  it("returns CODEX_FIX_ARGS when set", () => {
    expect(
      resolveCodexFixArgs({ CODEX_FIX_ARGS: "--full-auto", CODEX_EXTRA_ARGS: "--debug" }),
    ).toBe("--full-auto");
  });

  it("falls back to CODEX_EXTRA_ARGS when CODEX_FIX_ARGS is empty", () => {
    expect(resolveCodexFixArgs({ CODEX_FIX_ARGS: "", CODEX_EXTRA_ARGS: "--model x" })).toBe(
      "--model x",
    );
  });

  it("returns empty when neither is set", () => {
    expect(resolveCodexFixArgs({ CODEX_FIX_ARGS: "", CODEX_EXTRA_ARGS: "" })).toBe("");
  });

  it("treats whitespace-only CODEX_FIX_ARGS as unset", () => {
    expect(resolveCodexFixArgs({ CODEX_FIX_ARGS: "   ", CODEX_EXTRA_ARGS: "--m" })).toBe("--m");
  });
});
