#!/usr/bin/env node
/**
 * Stdio MCP server: School Lab Discord deploy notifications.
 * Protocol: JSON-RPC 2.0 over newline-delimited JSON (MCP stdio).
 */

import { NOTIFY_DEPLOY_TOOL, notifyDeploy, resolveTransport } from "./notify.mjs";

const SERVER_INFO = {
  name: "school-lab-discord-deploy",
  version: "1.0.0",
};

const PROTOCOL_VERSIONS = new Set([
  "2024-11-05",
  "2025-03-26",
  "2025-06-18",
  "2025-11-25",
  "2026-07-28",
]);

const INSTRUCTIONS =
  "Notify the School Lab Discord channel when a Kamal deploy of Scholar Premium finishes. " +
  "Call notify_deploy after staging or production deploys of site, frontend, backoffice, web, or all — success or failure.";

try {
  resolveTransport(process.env);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

let stdinBuffer = Buffer.alloc(0);

process.stdin.on("data", (chunk) => {
  stdinBuffer = Buffer.concat([stdinBuffer, chunk]);
  processBuffer();
});

process.stdin.on("end", () => process.exit(0));
process.stdin.resume();

function processBuffer() {
  while (stdinBuffer.length > 0) {
    const headerEnd = indexOf(stdinBuffer, "\r\n\r\n");
    if (headerEnd !== -1) {
      const header = stdinBuffer.subarray(0, headerEnd).toString("utf8");
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (match) {
        const length = Number(match[1]);
        const start = headerEnd + 4;
        if (stdinBuffer.length < start + length) return;
        const json = stdinBuffer.subarray(start, start + length).toString("utf8");
        stdinBuffer = stdinBuffer.subarray(start + length);
        dispatch(json);
        continue;
      }
    }

    const newline = indexOf(stdinBuffer, "\n");
    if (newline === -1) return;
    const line = stdinBuffer.subarray(0, newline).toString("utf8").replace(/\r$/, "");
    stdinBuffer = stdinBuffer.subarray(newline + 1);
    if (!line.trim() || /^Content-Length:/i.test(line)) continue;
    dispatch(line);
  }
}

function indexOf(buffer, token) {
  const needle = Buffer.from(token);
  return buffer.indexOf(needle);
}

function dispatch(raw) {
  let message;
  try {
    message = JSON.parse(raw);
  } catch (error) {
    send({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: `Parse error: ${error.message}` },
    });
    return;
  }

  handle(message).catch((error) => {
    if (message.id == null) {
      console.error(error);
      return;
    }
    send({
      jsonrpc: "2.0",
      id: message.id,
      error: { code: -32603, message: error.message },
    });
  });
}

async function handle(message) {
  if (message.jsonrpc !== "2.0") return;

  const isNotification = message.id == null && typeof message.method === "string";
  if (isNotification) return;

  if (typeof message.method !== "string") return;

  switch (message.method) {
    case "initialize":
      send({ jsonrpc: "2.0", id: message.id, result: initializeResult(message.params) });
      return;
    case "ping":
      send({ jsonrpc: "2.0", id: message.id, result: {} });
      return;
    case "tools/list":
      send({ jsonrpc: "2.0", id: message.id, result: { tools: [NOTIFY_DEPLOY_TOOL] } });
      return;
    case "tools/call":
      send({ jsonrpc: "2.0", id: message.id, result: await callTool(message.params) });
      return;
    default:
      send({
        jsonrpc: "2.0",
        id: message.id,
        error: { code: -32601, message: `Method not found: ${message.method}` },
      });
  }
}

function initializeResult(params = {}) {
  const requested = params.protocolVersion;
  const protocolVersion = PROTOCOL_VERSIONS.has(requested) ? requested : "2024-11-05";
  return {
    protocolVersion,
    capabilities: { tools: { listChanged: false } },
    serverInfo: SERVER_INFO,
    instructions: INSTRUCTIONS,
  };
}

async function callTool(params = {}) {
  const name = params.name;
  const args = params.arguments ?? {};

  if (name !== NOTIFY_DEPLOY_TOOL.name) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    const result = await notifyDeploy(args);
    if (result.dryRun) {
      return {
        content: [
          {
            type: "text",
            text: `Dry-run: Discord message was not sent.\n${JSON.stringify(result.payload, null, 2)}`,
          },
        ],
      };
    }

    const idPart = result.messageId ? ` (message ${result.messageId})` : "";
    return {
      content: [
        {
          type: "text",
          text: `Posted ${args.layer} ${args.destination} deploy ${args.status} to Discord${idPart}.`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: error.message }],
      isError: true,
    };
  }
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

console.error(`${SERVER_INFO.name} ${SERVER_INFO.version} ready`);
