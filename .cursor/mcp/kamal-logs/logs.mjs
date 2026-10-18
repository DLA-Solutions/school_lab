/**
 * Read-only Kamal container logs for School Lab.
 * Runs `<service>/bin/kamal app logs` and never follow, shell, console, or deploy.
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_LINES = 100;
export const MAX_LINES = 200;
export const TIMEOUT_MS = 30_000;
export const MAX_OUTPUT_CHARS = 64_000;
export const MAX_STDERR_CHARS = 8_000;
export const STDERR_NOTE_CHARS = 400;
export const MAX_GREP_CHARS = 200;

const DESTINATIONS = new Set(["staging", "production"]);
const RELATIVE_SINCE = /^[1-9]\d{0,5}[smhd]$/;
const ABSOLUTE_SINCE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const ALLOWED_KEYS = new Set(["destination", "service", "lines", "grep", "since"]);

export const SERVICE_DIRS = {
  web: "web",
  app: "frontend/app",
  backoffice: "frontend/backoffice",
  site: "site",
};

export const KAMAL_LOGS_TOOL = {
  name: "kamal_logs",
  description:
    "Read recent container logs for one School Lab Kamal service (web, app, backoffice, or site) on staging or production. Read-only: runs bin/kamal app logs with a line cap and no --follow. Does not deploy, open a shell, or send mail. Logs may contain student or guardian PII (LGPD); paste only what you need.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["destination", "service"],
    properties: {
      destination: {
        type: "string",
        enum: ["staging", "production"],
        description: "Kamal destination.",
      },
      service: {
        type: "string",
        enum: ["web", "app", "backoffice", "site"],
        description: "web is the API, app is the school SPA, backoffice is the platform SPA, site is the landing page.",
      },
      lines: {
        type: "integer",
        minimum: 1,
        maximum: MAX_LINES,
        description: `How many log lines to fetch from each server. Default ${DEFAULT_LINES}. Hard cap ${MAX_LINES}.`,
      },
      grep: {
        type: "string",
        maxLength: MAX_GREP_CHARS,
        description: "Optional filter passed to Kamal --grep. Single line, no leading dash.",
      },
      since: {
        type: "string",
        description:
          "Optional window passed to Kamal --since. Relative duration such as 10m, 2h, 30s, or 1d, or a UTC timestamp like 2013-01-02T13:23:37Z.",
      },
    },
  },
};

export function defaultRepoRoot() {
  if (process.env.SCHOOL_LAB_ROOT) return process.env.SCHOOL_LAB_ROOT;
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
}

export function parseKamalLogsInput(input = {}) {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("arguments must be an object.");
  }

  for (const key of Object.keys(input)) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new Error(`Unknown argument: ${key}`);
    }
  }

  const destination = requireEnum(input.destination, DESTINATIONS, "destination");
  const service = requireEnum(input.service, new Set(Object.keys(SERVICE_DIRS)), "service");

  return {
    destination,
    service,
    lines: parseLines(input.lines),
    grep: parseGrep(input.grep),
    since: parseSince(input.since),
  };
}

export function buildKamalArgs(parsed) {
  const args = ["app", "logs", "--lines", String(parsed.lines), "-d", parsed.destination];
  if (parsed.since) args.push("--since", parsed.since);
  if (parsed.grep) args.push("--grep", parsed.grep);
  assertReadOnlyArgs(args);
  return args;
}

export function assertReadOnlyArgs(args) {
  if (args[0] !== "app" || args[1] !== "logs") {
    throw new Error("Refusing to run anything other than kamal app logs.");
  }

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    const isFollow = token === "-f" || token === "--follow" || token.startsWith("--follow=");
    if (!isFollow) continue;
    if (args[index - 1] === "--grep") continue;
    throw new Error("Refusing to follow logs.");
  }
}

export function truncateOutput(text, limit = MAX_OUTPUT_CHARS) {
  const value = text ?? "";
  if (value.length <= limit) return { text: value, truncated: false };
  const omitted = value.length - limit;
  return {
    text: `${value.slice(0, limit)}\n…[truncated ${omitted} characters]`,
    truncated: true,
  };
}

export function stderrNote(stderr) {
  if (stderr == null || stderr === "") return "";
  const cleaned = String(stderr).replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= STDERR_NOTE_CHARS) return cleaned;
  return `${cleaned.slice(0, STDERR_NOTE_CHARS - 1)}…`;
}

export function runCommand({ command, args, cwd, timeoutMs = TIMEOUT_MS }) {
  return new Promise((resolve) => {
    let settled = false;
    let timedOut = false;
    let stdout = "";
    let stderr = "";
    let truncated = false;
    let killTimer;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(killTimer);
      resolve(value);
    };

    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      killTimer = setTimeout(() => child.kill("SIGKILL"), 1_000);
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      const next = appendCapped(stdout, chunk, MAX_OUTPUT_CHARS);
      if (next.truncated) truncated = true;
      stdout = next.text;
    });
    child.stderr?.on("data", (chunk) => {
      const next = appendCapped(stderr, chunk, MAX_STDERR_CHARS);
      stderr = next.text;
    });

    child.on("error", (error) => {
      finish({
        code: 1,
        stdout,
        stderr,
        timedOut: false,
        truncated,
        spawnError: error.message,
      });
    });

    child.on("close", (code) => {
      finish({
        code: code ?? 1,
        stdout,
        stderr,
        timedOut,
        truncated,
      });
    });
  });
}

export async function kamalLogs(input, options = {}) {
  const parsed = parseKamalLogsInput(input);
  const repoRoot = options.repoRoot ?? defaultRepoRoot();
  const cwd = path.join(repoRoot, SERVICE_DIRS[parsed.service]);
  const command = path.join(cwd, "bin", "kamal");
  const args = buildKamalArgs(parsed);
  const invocation = { command, args, cwd };

  if (options.dryRun) {
    return {
      ...invocation,
      dryRun: true,
      isError: false,
      text: `Dry-run: logs were not fetched.\n${JSON.stringify(invocation, null, 2)}`,
    };
  }

  const run = options.run ?? runCommand;
  const result = await run({
    command,
    args,
    cwd,
    timeoutMs: options.timeoutMs ?? TIMEOUT_MS,
  });

  return { ...invocation, ...present(result) };
}

function present(result) {
  const stdout = visibleStdout(result);
  const note = stderrNote(result.stderr);

  if (result.spawnError) {
    return {
      isError: true,
      text: `Could not start Kamal logs: ${result.spawnError}`,
    };
  }

  if (result.timedOut) {
    const partial = stdout ? `\n${stdout}` : "";
    return {
      isError: true,
      text: `Timed out after ${TIMEOUT_MS / 1000}s. The log command was stopped and was not followed.${partial}`,
    };
  }

  if (result.code !== 0) {
    const stderrLine = note ? `\nstderr: ${note}` : "";
    const body = stdout ? `\n${stdout}` : "";
    return {
      isError: true,
      text: `Kamal logs failed (exit ${result.code}).${stderrLine}${body}`,
    };
  }

  return { isError: false, text: stdout.length > 0 ? stdout : "(no log lines)" };
}

function visibleStdout(result) {
  const stdout = truncateOutput(result.stdout ?? "");
  if (result.truncated && !stdout.truncated) {
    return `${stdout.text}\n…[truncated]`;
  }
  return stdout.text;
}

function requireEnum(value, allowed, label) {
  if (typeof value !== "string" || !allowed.has(value)) {
    const shown = typeof value === "string" ? value.slice(0, 80) : typeof value;
    throw new Error(`Unknown ${label}: ${shown}`);
  }
  return value;
}

function parseLines(value) {
  if (value == null) return DEFAULT_LINES;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error("lines must be an integer.");
  }
  if (value < 1 || value > MAX_LINES) {
    throw new Error(`lines must be between 1 and ${MAX_LINES}.`);
  }
  return value;
}

function parseGrep(value) {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") throw new Error("grep must be a string.");
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/[\r\n\0]/.test(trimmed)) throw new Error("grep must be a single line.");
  if (trimmed.length > MAX_GREP_CHARS) {
    throw new Error(`grep must be at most ${MAX_GREP_CHARS} characters.`);
  }
  if (trimmed.startsWith("-")) throw new Error("grep must not start with a dash.");
  return trimmed;
}

function parseSince(value) {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") throw new Error("since must be a string.");
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!RELATIVE_SINCE.test(trimmed) && !ABSOLUTE_SINCE.test(trimmed)) {
    throw new Error("since must look like 10m, 2h, 30s, 1d, or 2013-01-02T13:23:37Z.");
  }
  return trimmed;
}

function appendCapped(current, chunk, limit) {
  const piece = chunk.toString("utf8");
  if (current.length >= limit) return { text: current, truncated: true };
  const room = limit - current.length;
  if (piece.length <= room) return { text: current + piece, truncated: false };
  return { text: current + piece.slice(0, room), truncated: true };
}
