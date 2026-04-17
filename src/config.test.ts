import { describe, expect, it } from "vite-plus/test";
import { branchAllowed, repoAllowed } from "./config.ts";

describe("repoAllowed", () => {
  it("allows all when list is empty", () => {
    expect(repoAllowed([], "any/thing")).toBe(true);
  });

  it("matches exact name", () => {
    expect(repoAllowed(["acme/widget"], "acme/widget")).toBe(true);
    expect(repoAllowed(["acme/widget"], "acme/other")).toBe(false);
  });

  it("matches owner wildcard", () => {
    expect(repoAllowed(["acme/*"], "acme/widget")).toBe(true);
    expect(repoAllowed(["acme/*"], "acme/other")).toBe(true);
    expect(repoAllowed(["acme/*"], "notacme/widget")).toBe(false);
  });

  it("accepts mixed list", () => {
    expect(repoAllowed(["acme/*", "foo/bar"], "foo/bar")).toBe(true);
    expect(repoAllowed(["acme/*", "foo/bar"], "foo/baz")).toBe(false);
  });
});

describe("branchAllowed", () => {
  it("allows all when list is empty", () => {
    expect(branchAllowed([], "refs/heads/feature")).toBe(true);
  });

  it("matches simple branch name", () => {
    expect(branchAllowed(["main"], "refs/heads/main")).toBe(true);
    expect(branchAllowed(["main"], "refs/heads/develop")).toBe(false);
  });

  it("accepts name without refs/heads prefix", () => {
    expect(branchAllowed(["main"], "main")).toBe(true);
  });

  it("rejects when ref is missing", () => {
    expect(branchAllowed(["main"], undefined)).toBe(false);
  });
});
