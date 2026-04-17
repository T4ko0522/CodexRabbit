import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Store } from "./db.ts";

let store: Store;
let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "codex-review-test-"));
  store = new Store(dir);
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("Store", () => {
  describe("threads", () => {
    it("inserts and retrieves a thread", () => {
      store.insertThread({
        threadId: "t1",
        repo: "acme/app",
        sha: "abc123",
        kind: "push",
        number: undefined,
        createdAt: 1000,
      });
      const t = store.getThread("t1");
      expect(t).not.toBeNull();
      expect(t!.repo).toBe("acme/app");
      expect(t!.sha).toBe("abc123");
      expect(t!.kind).toBe("push");
    });

    it("returns null for nonexistent thread", () => {
      expect(store.getThread("nonexistent")).toBeNull();
    });

    it("upserts on duplicate thread_id", () => {
      store.insertThread({
        threadId: "t1",
        repo: "acme/app",
        sha: "aaa",
        kind: "push",
        createdAt: 1,
      });
      store.insertThread({
        threadId: "t1",
        repo: "acme/app",
        sha: "bbb",
        kind: "push",
        createdAt: 2,
      });
      const t = store.getThread("t1");
      expect(t!.sha).toBe("bbb");
    });

    it("handles optional fields (sha, number)", () => {
      store.insertThread({
        threadId: "t2",
        repo: "acme/app",
        kind: "issues",
        number: 42,
        createdAt: 1,
      });
      const t = store.getThread("t2");
      expect(t!.sha).toBeNull();
      expect(t!.number).toBe(42);
    });

    it("persists and restores the full ReviewJob via job field", () => {
      const job = {
        kind: "pull_request" as const,
        repo: "acme/app",
        repoUrl: "https://github.com/acme/app",
        sha: "abc",
        baseSha: "def",
        headRepoUrl: "https://github.com/forker/app",
        title: "PR title",
        htmlUrl: "https://github.com/acme/app/pull/7",
        sender: "alice",
        number: 7,
        action: "opened",
        body: "PR body",
      };
      store.insertThread({
        threadId: "t3",
        repo: job.repo,
        sha: job.sha,
        kind: job.kind,
        number: job.number,
        createdAt: 1,
        job,
      });
      const t = store.getThread("t3");
      expect(t!.job).toEqual(job);
    });

    it("returns job=undefined when no job was persisted", () => {
      store.insertThread({ threadId: "t4", repo: "a/b", kind: "push", createdAt: 1 });
      const t = store.getThread("t4");
      expect(t!.job).toBeUndefined();
    });
  });

  describe("messages", () => {
    it("adds and lists messages in order", () => {
      store.insertThread({ threadId: "t1", repo: "acme/app", kind: "push", createdAt: 1 });
      store.addMessage({ threadId: "t1", role: "review", content: "first", createdAt: 100 });
      store.addMessage({ threadId: "t1", role: "user", content: "second", createdAt: 200 });
      store.addMessage({ threadId: "t1", role: "assistant", content: "third", createdAt: 300 });

      const msgs = store.listMessages("t1");
      expect(msgs).toHaveLength(3);
      expect(msgs[0]!.role).toBe("review");
      expect(msgs[1]!.role).toBe("user");
      expect(msgs[2]!.role).toBe("assistant");
    });

    it("returns empty array for thread with no messages", () => {
      expect(store.listMessages("nonexistent")).toEqual([]);
    });

    it("isolates messages by thread", () => {
      store.insertThread({ threadId: "t1", repo: "a/b", kind: "push", createdAt: 1 });
      store.insertThread({ threadId: "t2", repo: "a/b", kind: "push", createdAt: 1 });
      store.addMessage({ threadId: "t1", role: "review", content: "for t1", createdAt: 1 });
      store.addMessage({ threadId: "t2", role: "review", content: "for t2", createdAt: 1 });

      expect(store.listMessages("t1")).toHaveLength(1);
      expect(store.listMessages("t1")[0]!.content).toBe("for t1");
    });

    it("preserves messages when insertThread is called twice on the same id", () => {
      // FK 有効 + INSERT OR REPLACE だと ON DELETE CASCADE で messages が消える。
      // UPSERT で保持されることを担保する。
      store.insertThread({ threadId: "t1", repo: "a/b", kind: "push", createdAt: 1 });
      store.addMessage({ threadId: "t1", role: "review", content: "keep me", createdAt: 1 });
      store.insertThread({ threadId: "t1", repo: "a/b", sha: "new", kind: "push", createdAt: 2 });

      expect(store.listMessages("t1")).toHaveLength(1);
      expect(store.listMessages("t1")[0]!.content).toBe("keep me");
      expect(store.getThread("t1")!.sha).toBe("new");
    });
  });

  describe("review_history (dedup)", () => {
    it("registers a fresh key and reports duplicate on second call", () => {
      expect(store.tryRegisterReview("push:acme/app:sha1")).toBe(true);
      expect(store.tryRegisterReview("push:acme/app:sha1")).toBe(false);
      expect(store.hasReview("push:acme/app:sha1")).toBe(true);
    });

    it("distinguishes unrelated keys", () => {
      expect(store.tryRegisterReview("a")).toBe(true);
      expect(store.tryRegisterReview("b")).toBe(true);
      expect(store.hasReview("a")).toBe(true);
      expect(store.hasReview("b")).toBe(true);
      expect(store.hasReview("c")).toBe(false);
    });

    it("unregister allows re-registration (retry after failure)", () => {
      expect(store.tryRegisterReview("k")).toBe(true);
      expect(store.tryRegisterReview("k")).toBe(false);
      store.unregisterReview("k");
      expect(store.hasReview("k")).toBe(false);
      expect(store.tryRegisterReview("k")).toBe(true);
    });
  });
});
