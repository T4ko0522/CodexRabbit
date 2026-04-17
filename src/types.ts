export type EventKind = "push" | "pull_request" | "issues";

/** GitHub Actions から送られてくる HTTP ペイロード本体 */
export interface IncomingWebhook {
  event: EventKind;
  repository: string; // owner/name
  sender: string;
  payload: Record<string, any>; // GitHub event の raw payload
  deliveredAt?: string;
}

/** キューへ積むレビュージョブ */
export interface ReviewJob {
  kind: EventKind;
  repo: string; // owner/name
  repoUrl: string; // https://github.com/owner/name
  /** push: head_commit.id / PR: pull_request.head.sha */
  sha?: string;
  /** push: before / PR: pull_request.base.sha */
  baseSha?: string;
  /** push: ref / PR: pull_request.head.ref */
  ref?: string;
  baseRef?: string;
  title: string;
  htmlUrl: string;
  sender: string;
  /** PR 番号 or issue 番号 */
  number?: number;
  /** PR/issue の本文 */
  body?: string;
  /** PR の action (opened / synchronize / ...) */
  action?: string;
  /** push のコミット一覧などから作るサマリ文 */
  summary?: string;
  isDraft?: boolean;
}

export interface ThreadRecord {
  threadId: string;
  repo: string;
  sha?: string;
  kind: EventKind;
  number?: number;
  createdAt: number;
}

export interface MessageRecord {
  threadId: string;
  role: "review" | "user" | "assistant";
  content: string;
  createdAt: number;
}
