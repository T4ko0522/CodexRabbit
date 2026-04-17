import { describe, expect, it } from "vite-plus/test";
import { createGitHubClient } from "./client.ts";
import pino from "pino";

const logger = pino({ level: "silent" });

describe("createGitHubClient", () => {
	it("returns null when token is undefined", () => {
		expect(createGitHubClient(undefined, logger)).toBeNull();
	});

	it("returns null when token is empty string", () => {
		expect(createGitHubClient("", logger)).toBeNull();
	});

	it("returns Octokit instance when token is provided", () => {
		const client = createGitHubClient("ghp_test123", logger);
		expect(client).not.toBeNull();
		expect(client).toHaveProperty("rest");
	});
});
