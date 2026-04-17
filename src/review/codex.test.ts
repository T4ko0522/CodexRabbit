import { describe, expect, it } from "vite-plus/test";
import { stripAnsi } from "./codex.ts";

describe("stripAnsi", () => {
	it("removes color codes", () => {
		expect(stripAnsi("\x1b[31mred\x1b[0m")).toBe("red");
	});

	it("removes bold/underline codes", () => {
		expect(stripAnsi("\x1b[1mbold\x1b[22m \x1b[4munderline\x1b[24m")).toBe("bold underline");
	});

	it("returns plain text unchanged", () => {
		expect(stripAnsi("hello world")).toBe("hello world");
	});

	it("handles empty string", () => {
		expect(stripAnsi("")).toBe("");
	});

	it("strips complex SGR sequences", () => {
		expect(stripAnsi("\x1b[38;5;196mcolored\x1b[0m")).toBe("colored");
	});
});
