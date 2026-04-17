import { readFileSync } from "node:fs";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import type { Env } from "../env.ts";
import type { Logger } from "../logger.ts";

export interface GitHubClientResult {
  octokit: Octokit;
  /** git clone 用のトークン (Installation Token or PAT) */
  token: string;
}

/**
 * GitHub App 認証 → PAT フォールバックで Octokit を生成する。
 * App 認証時は Installation Token を都度発行し、clone にも同じトークンを使う。
 */
export async function createGitHubClient(
  env: Env,
  logger: Logger,
): Promise<GitHubClientResult | null> {
  // GitHub App 認証 (優先)
  if (env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY_PATH && env.GITHUB_APP_INSTALLATION_ID) {
    const privateKey = readFileSync(env.GITHUB_APP_PRIVATE_KEY_PATH, "utf8");
    const appId = Number(env.GITHUB_APP_ID);
    const installationId = Number(env.GITHUB_APP_INSTALLATION_ID);

    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: { appId, privateKey, installationId },
    });

    // Installation Token を取得 (clone 用)
    const { token } = (await octokit.auth({
      type: "installation",
    })) as { token: string };

    logger.info({ appId, installationId }, "GitHub App authentication enabled");
    return { octokit, token };
  }

  // PAT フォールバック
  if (env.GITHUB_TOKEN) {
    logger.info("GitHub PAT authentication enabled");
    return {
      octokit: new Octokit({ auth: env.GITHUB_TOKEN }),
      token: env.GITHUB_TOKEN,
    };
  }

  logger.info("no GitHub credentials, GitHub feedback disabled");
  return null;
}
