import { describe, expect, it } from "vite-plus/test";
import { createGitHubClient } from "./client.ts";
import type { Env } from "../env.ts";
import pino from "pino";

const logger = pino({ level: "silent" });

const baseEnv: Env = {
	HTTP_HOST: "127.0.0.1",
	HTTP_PORT: 3000,
	WEBHOOK_SECRET: "test-secret-12345",
	GITHUB_TOKEN: "",
	GITHUB_APP_ID: "",
	GITHUB_APP_PRIVATE_KEY_PATH: "",
	GITHUB_APP_INSTALLATION_ID: "",
	DISCORD_BOT_TOKEN: "test",
	DISCORD_CHANNEL_ID: "123",
	CODEX_BIN: "codex",
	CODEX_EXTRA_ARGS: "",
	CODEX_TIMEOUT_MS: 900_000,
	WORKSPACES_DIR: "/tmp/ws",
	DATA_DIR: "/tmp/data",
	LOG_LEVEL: "info",
	CONFIG_FILE: "/tmp/config.yml",
};

describe("createGitHubClient", () => {
	it("returns null when no credentials are set", async () => {
		const result = await createGitHubClient(baseEnv, logger);
		expect(result).toBeNull();
	});

	it("returns Octokit with PAT when GITHUB_TOKEN is set", async () => {
		const env = { ...baseEnv, GITHUB_TOKEN: "ghp_test123" };
		const result = await createGitHubClient(env, logger);
		expect(result).not.toBeNull();
		expect(result!.octokit).toHaveProperty("rest");
		expect(result!.token).toBe("ghp_test123");
	});
});
