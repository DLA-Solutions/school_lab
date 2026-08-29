import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildPayload,
  HOSTS,
  parseWebhookUrl,
  publicUrl,
  resolveTransport,
  sanitizeNote,
  sanitizeSha,
} from "./notify.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const VALID_WEBHOOK =
  "https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN";

test("parseWebhookUrl accepts discord.com incoming webhooks", () => {
  assert.equal(
    parseWebhookUrl(`${VALID_WEBHOOK}?wait=true`),
    "https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN",
  );
});

test("parseWebhookUrl rejects placeholders and non-Discord hosts", () => {
  assert.throws(() => parseWebhookUrl(""), /missing/);
  assert.throws(
    () => parseWebhookUrl("https://discord.com/api/webhooks/000000000000000000/your_webhook_token_here"),
    /placeholder/,
  );
  assert.throws(() => parseWebhookUrl("http://discord.com/api/webhooks/1/abc"), /https/);
  assert.throws(
    () => parseWebhookUrl("https://discord.com.evil.example/api/webhooks/1/abc"),
    /discord\.com/,
  );
});

test("buildPayload is scoped to Scholar Premium and the requested layer", () => {
  const payload = buildPayload({
    layer: "web",
    destination: "staging",
    status: "success",
    smoke_ok: true,
    git_sha: "abc1234def",
    git_branch: "main",
    note: "db:migrate ran",
  });

  assert.equal(payload.username, "School Lab Deploy");
  assert.deepEqual(payload.allowed_mentions, { parse: [] });
  const embed = payload.embeds[0];
  assert.equal(embed.title, "Deploy concluído");
  assert.equal(embed.url, `${HOSTS.staging}/up`);
  assert.match(embed.description, /School Lab/);
  const values = Object.fromEntries(embed.fields.map((field) => [field.name, field.value]));
  assert.equal(values.Produto, "Scholar Premium");
  assert.equal(values.Ambiente, "Staging");
  assert.equal(values.Camada, "API");
  assert.equal(values.URL, `${HOSTS.staging}/up`);
  assert.equal(values.Nota, "db:migrate ran");
});

test("failure and failed smoke use distinct colors and titles", () => {
  const failed = buildPayload({ layer: "all", destination: "production", status: "failure" });
  const warn = buildPayload({
    layer: "frontend",
    destination: "staging",
    status: "success",
    smoke_ok: false,
  });
  assert.equal(failed.embeds[0].title, "Deploy falhou");
  assert.equal(failed.embeds[0].color, 0xed4245);
  assert.equal(warn.embeds[0].title, "Deploy concluído");
  assert.equal(warn.embeds[0].color, 0xfee75c);
  assert.equal(publicUrl("frontend", "staging"), `${HOSTS.staging}/app/`);
});

test("sanitizeNote strips mass mentions and truncates", () => {
  assert.equal(sanitizeNote("@everyone deploy"), "(everyone) deploy");
  assert.equal(sanitizeNote("a".repeat(600)).length, 500);
  assert.equal(sanitizeSha("not-a-sha"), undefined);
  assert.equal(sanitizeSha("deadbeef"), "deadbeef");
});

test("resolveTransport prefers a real webhook and falls back to bot + channel ID", () => {
  const webhook = resolveTransport({ DISCORD_DEPLOY_WEBHOOK_URL: VALID_WEBHOOK });
  assert.equal(webhook.mode, "webhook");

  const bot = resolveTransport({
    DISCORD_DEPLOY_WEBHOOK_URL: "https://discord.com/api/webhooks/000000000000000000/your_webhook_token_here",
    DISCORD_BOT_TOKEN: "BotTokenPlaceholderValueForTests12",
    DISCORD_DEPLOY_CHANNEL_ID: "123456789012345678",
  });
  assert.equal(bot.mode, "bot");
  assert.equal(bot.channelId, "123456789012345678");

  assert.throws(
    () =>
      resolveTransport({
        DISCORD_DEPLOY_WEBHOOK_URL: "https://discord.com/api/webhooks/000000000000000000/your_webhook_token_here",
        DISCORD_BOT_TOKEN: "your_discord_bot_token_here",
        DISCORD_DEPLOY_CHANNEL_ID: "000000000000000000",
      }),
    /DISCORD_BOT_TOKEN \+ DISCORD_DEPLOY_CHANNEL_ID/,
  );
});

test("MCP stdio handshake lists notify_deploy and dry-runs the tool", async () => {
  const child = spawn(process.execPath, [path.join(dir, "server.mjs")], {
    env: {
      ...process.env,
      DISCORD_DEPLOY_WEBHOOK_URL: VALID_WEBHOOK,
      DISCORD_DEPLOY_DRY_RUN: "1",
    },
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
  assert.equal(init.result.serverInfo.name, "school-lab-discord-deploy");
  assert.match(init.result.instructions, /notify_deploy/);

  send({ jsonrpc: "2.0", method: "notifications/initialized" });
  send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  const listed = await nextMessage();
  assert.equal(listed.result.tools[0].name, "notify_deploy");

  send({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "notify_deploy",
      arguments: { layer: "site", destination: "staging", status: "success", smoke_ok: true },
    },
  });
  const called = await nextMessage();
  assert.equal(called.result.isError, undefined);
  assert.match(called.result.content[0].text, /Dry-run/);
  assert.match(called.result.content[0].text, /Scholar Premium/);

  child.kill("SIGTERM");
  await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 500))]);
});

test("MCP stdio starts with bot token + channel ID when webhook is a placeholder", async () => {
  const child = spawn(process.execPath, [path.join(dir, "server.mjs")], {
    env: {
      ...process.env,
      DISCORD_DEPLOY_WEBHOOK_URL: "https://discord.com/api/webhooks/000000000000000000/your_webhook_token_here",
      DISCORD_BOT_TOKEN: "BotTokenPlaceholderValueForTests12",
      DISCORD_DEPLOY_CHANNEL_ID: "123456789012345678",
      DISCORD_DEPLOY_DRY_RUN: "1",
    },
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

  child.stdin.write(
    `${JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "0" } },
    })}\n`,
  );

  const deadline = Date.now() + 3000;
  let init;
  while (Date.now() < deadline) {
    if (lines.length > 0) {
      init = lines.shift();
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.equal(init?.result.serverInfo.name, "school-lab-discord-deploy");

  child.kill("SIGTERM");
  await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 500))]);
});
