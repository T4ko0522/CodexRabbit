import { pino } from "pino";

export function createLogger(level: string) {
  return pino({
    level,
    transport: process.stdout.isTTY
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } }
      : undefined,
    base: { app: "codex-review" },
  });
}

export type Logger = ReturnType<typeof createLogger>;
