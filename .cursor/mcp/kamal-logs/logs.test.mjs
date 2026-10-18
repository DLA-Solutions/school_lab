import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildKamalArgs,
  DEFAULT_LINES,
  kamalLogs,
  KAMAL_LOGS_TOOL,
  MAX_LINES,
  runCommand,
  SERVICE_DIRS,
  stderrNote,
  truncateOutput,
} from "./logs.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dir, "../../..");

test("tool schema is a single read-only logs tool", () => {
  assert.equal(KAMAL_LOGS_TOOL.name, "kamal_logs");
  assert.deepEqual(KAMAL_LOGS_TOOL.inputSchema.required, ["destination", "service"]);
  assert.deepEqual(KAMAL_LOGS_TOOL.inputSchema.properties.destination.enum, ["staging", "production"]);
  assert.deepEqual(KAMAL_LOGS_TOOL.inputSchema.properties.service.enum, ["web", "app", "backoffice", "site"]);
  assert.match(KAMAL_LOGS_TOOL.description, /Read-only/);
  assert.match(KAMAL_LOGS_TOOL.description, /LGPD/);
});

test("builds app logs argv for every service and destination without follow", () => {
  const services = Object.keys(SERVICE_DIRS);
  const destinations = ["staging", "production"];

  for (const service of services) {
    for (const destination of destinations) {
      const args = buildKamalArgs({ destination, service, lines: 40, grep: undefined, since: undefined });
      assert.deepEqual(args, ["app", "logs", "--lines", "40", "-d", destination]);
      assert.equal(args.includes("-f"), false);
      assert.equal(args.includes("--follow"), false);
    }
  }
});

test("passes Kamal --grep and --since when those filters are set", () => {
  const args = buildKamalArgs({
    destination: "staging",
    service: "web",
    lines: DEFAULT_LINES,
    grep: "ERROR",
    since: "10m",
  });
  assert.deepEqual(args, [
    "app",
    "logs",
    "--lines",
    "100",
    "-d",
    "staging",
    "--since",
    "10m",
    "--grep",
    "ERROR",
  ]);
});

test("kamalLogs invokes the service bin/kamal with a mocked runner", async () => {
  const calls = [];
  const result = await kamalLogs(
    { destination: "production", service: "app", lines: 20, since: "2h", grep: "timeout" },
    {
      repoRoot,
      run: async (invocation) => {
        calls.push(invocation);
        return { code: 0, stdout: "app line\n", stderr: "" };
      },
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].cwd, path.join(repoRoot, "frontend/app"));
  assert.equal(calls[0].command, path.join(repoRoot, "frontend/app/bin/kamal"));
  assert.deepEqual(calls[0].args, [
    "app",
    "logs",
    "--lines",
    "20",
    "-d",
    "production",
    "--since",
    "2h",
    "--grep",
    "timeout",
  ]);
  assert.equal(calls[0].args.includes("-f"), false);
  assert.equal(calls[0].args.includes("--follow"), false);
  assert.equal(result.isError, false);
  assert.equal(result.text, "app line\n");
});

test("defaults lines and maps web, backoffice, and site directories", async () => {
  const seen = [];
  for (const service of ["web", "backoffice", "site"]) {
    await kamalLogs(
      { destination: "staging", service },
      {
        repoRoot,
        run: async (invocation) => {
          seen.push(invocation);
          return { code: 0, stdout: "", stderr: "" };
        },
      },
    );
  }

  assert.deepEqual(
    seen.map((call) => path.relative(repoRoot, call.cwd)),
    ["web", "frontend/backoffice", "site"],
  );
  for (const call of seen) {
    assert.equal(call.command, path.join(call.cwd, "bin", "kamal"));
    assert.deepEqual(call.args, ["app", "logs", "--lines", String(DEFAULT_LINES), "-d", "staging"]);
  }
});

test("rejects enums, extra tools arguments, follow, and unsafe filters before running", async () => {
  const run = async () => {
    throw new Error("runner must not be called");
  };
  const cases = [
    [{ destination: "prod", service: "web" }, /Unknown destination/],
    [{ destination: "staging", service: "mobile" }, /Unknown service/],
    [{ destination: "staging", service: "web", follow: true }, /Unknown argument: follow/],
    [{ destination: "staging", service: "web", lines: MAX_LINES + 1 }, /between 1 and 200/],
    [{ destination: "staging", service: "web", lines: 0 }, /between 1 and 200/],
    [{ destination: "staging", service: "web", lines: 1.5 }, /integer/],
    [{ destination: "staging", service: "web", grep: "bad\nline" }, /single line/],
    [{ destination: "staging", service: "web", grep: "--follow" }, /dash/],
    [{ destination: "staging", service: "web", since: "10m; id" }, /10m/],
    [{ destination: "staging", service: "web", since: "-f" }, /10m/],
  ];

  for (const [input, pattern] of cases) {
    await assert.rejects(() => kamalLogs(input, { repoRoot, run }), pattern);
  }
});

test("failure includes a short stderr note and success truncates oversized output", async () => {
  const failed = await kamalLogs(
    { destination: "staging", service: "web" },
    {
      repoRoot,
      run: async () => ({
        code: 2,
        stdout: "partial",
        stderr: `ssh failed ${"x".repeat(800)}`,
      }),
    },
  );
  assert.equal(failed.isError, true);
  assert.match(failed.text, /exit 2/);
  assert.match(failed.text, /stderr: ssh failed/);
  assert.ok(failed.text.length < 700);
  assert.equal(stderrNote("a".repeat(800)).length, 400);

  const huge = await kamalLogs(
    { destination: "staging", service: "site", lines: 200 },
    {
      repoRoot,
      run: async () => ({ code: 0, stdout: "y".repeat(70_000), stderr: "" }),
    },
  );
  assert.equal(huge.isError, false);
  assert.match(huge.text, /truncated/);
  assert.ok(huge.text.length < 70_000);
  assert.match(truncateOutput("abc", 2).text, /truncated 1/);
});

test("timeout and missing binary are errors and do not claim a live follow", async () => {
  const timedOut = await kamalLogs(
    { destination: "staging", service: "web" },
    {
      repoRoot,
      run: async () => ({ code: null, stdout: "partial line", stderr: "", timedOut: true }),
    },
  );
  assert.equal(timedOut.isError, true);
  assert.match(timedOut.text, /Timed out after 30s/);
  assert.match(timedOut.text, /not followed/);
  assert.match(timedOut.text, /partial line/);

  const missing = await kamalLogs(
    { destination: "production", service: "backoffice" },
    {
      repoRoot,
      run: async () => ({ code: 1, stdout: "", stderr: "", spawnError: "spawn ENOENT" }),
    },
  );
  assert.match(missing.text, /Could not start Kamal logs: spawn ENOENT/);
});

test("runCommand captures local stdout, caps oversized output, and stops a hung process", async () => {
  const ok = await runCommand({
    command: process.execPath,
    args: ["-e", "process.stdout.write('local-ok')"],
    cwd: dir,
    timeoutMs: 5_000,
  });
  assert.equal(ok.code, 0);
  assert.equal(ok.stdout, "local-ok");
  assert.equal(ok.timedOut, false);

  const huge = await runCommand({
    command: process.execPath,
    args: ["-e", "process.stdout.write('z'.repeat(70_000))"],
    cwd: dir,
    timeoutMs: 5_000,
  });
  assert.equal(huge.code, 0);
  assert.equal(huge.truncated, true);
  assert.equal(huge.stdout.length, 64_000);

  const capped = await kamalLogs(
    { destination: "staging", service: "web" },
    {
      repoRoot,
      run: async () => ({ code: 0, stdout: "y".repeat(64_000), stderr: "", truncated: true }),
    },
  );
  assert.match(capped.text, /\[truncated\]/);

  const hung = await runCommand({
    command: process.execPath,
    args: ["-e", "setTimeout(() => {}, 30_000)"],
    cwd: dir,
    timeoutMs: 300,
  });
  assert.equal(hung.timedOut, true);
});

test("MCP stdio lists only kamal_logs and dry-runs without fetching logs", async () => {
  const child = spawn(process.execPath, [path.join(dir, "server.mjs")], {
    env: { ...process.env, KAMAL_LOGS_DRY_RUN: "1", SCHOOL_LAB_ROOT: repoRoot },
    stdio: ["pipe", "pipe", "pipe"],
  });

  const lines = [];
  let buffer = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf("\n")) !== -1) {
      lines.push(JSON.parse(buffer.slice(0, index)));
      buffer = buffer.slice(index + 1);
    }
  });

  function send(message) {
    child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  async function nextMessage() {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      if (lines.length > 0) return lines.shift();
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error("Timed out waiting for MCP message");
  }

  send({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "0" } },
  });
  const init = await nextMessage();
  assert.equal(init.result.serverInfo.name, "school-lab-kamal-logs");
  assert.match(init.result.instructions, /Read-only container logs/);
  assert.match(init.result.instructions, /LGPD/);
  assert.match(init.result.instructions, /mail, deploy, or shell/);

  send({ jsonrpc: "2.0", method: "notifications/initialized" });
  send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  const listed = await nextMessage();
  assert.equal(listed.result.tools.length, 1);
  assert.equal(listed.result.tools[0].name, "kamal_logs");

  send({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "kamal_logs",
      arguments: { destination: "staging", service: "web", lines: 15, grep: "Request", since: "10m" },
    },
  });
  const called = await nextMessage();
  assert.equal(called.result.isError, undefined);
  assert.match(called.result.content[0].text, /Dry-run/);
  const payload = JSON.parse(called.result.content[0].text.split("\n").slice(1).join("\n"));
  assert.equal(payload.cwd, path.join(repoRoot, "web"));
  assert.equal(payload.command, path.join(repoRoot, "web/bin/kamal"));
  assert.deepEqual(payload.args, [
    "app",
    "logs",
    "--lines",
    "15",
    "-d",
    "staging",
    "--since",
    "10m",
    "--grep",
    "Request",
  ]);

  send({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: { name: "kamal_logs", arguments: { destination: "staging", service: "web", shell: "bash" } },
  });
  const rejected = await nextMessage();
  assert.equal(rejected.result.isError, true);
  assert.match(rejected.result.content[0].text, /Unknown argument: shell/);

  child.kill("SIGTERM");
  await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 500))]);
});
