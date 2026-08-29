/**
 * School Lab Discord deploy notifications.
 * Transport: incoming webhook (needs Manage Webhooks) or a bot token + channel ID.
 */

export const PROJECT = "School Lab";
export const PRODUCT = "Scholar Premium";
export const WEBHOOK_USERNAME = "School Lab Deploy";

export const HOSTS = {
  staging: "https://staging.scholarpremium.com.br",
  production: "https://scholarpremium.com.br",
};

export const LAYERS = {
  site: { label: "Site", path: "/" },
  frontend: { label: "School SPA", path: "/app/" },
  backoffice: { label: "Backoffice SPA", path: "/backoffice/" },
  web: { label: "API", path: "/up" },
  all: { label: "Full stack", path: "/" },
};

const DESTINATIONS = new Set(["staging", "production"]);
const STATUSES = new Set(["success", "failure"]);
const NOTE_MAX = 500;
const PLACEHOLDER_WEBHOOK =
  "https://discord.com/api/webhooks/000000000000000000/your_webhook_token_here";
const PLACEHOLDER_BOT_TOKEN = "your_discord_bot_token_here";
const PLACEHOLDER_CHANNEL_ID = "000000000000000000";
const DISCORD_API = "https://discord.com/api/v10";
const USER_AGENT = "SchoolLabDeployMCP (https://github.com/DLA-Solutions/school_lab, 1.0.0)";

const COLOR = {
  success: 0x3ba55d,
  failure: 0xed4245,
  warning: 0xfee75c,
};

export const NOTIFY_DEPLOY_TOOL = {
  name: "notify_deploy",
  description:
    "Post a School Lab (Scholar Premium) deploy notification to the project Discord channel. Call after a Kamal deploy of site, frontend (school SPA), backoffice, web (API), or the full stack to staging or production finishes — success or failure. Do not use for other Discord messages.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["layer", "destination", "status"],
    properties: {
      layer: {
        type: "string",
        enum: ["site", "frontend", "backoffice", "web", "all"],
        description: "Kamal surface that was deployed.",
      },
      destination: {
        type: "string",
        enum: ["staging", "production"],
        description: "Kamal destination.",
      },
      status: {
        type: "string",
        enum: ["success", "failure"],
        description: "Whether kamal deploy exited successfully.",
      },
      smoke_ok: {
        type: "boolean",
        description:
          "Read-only smoke result. Omit if smoke did not run. False when a smoke URL failed.",
      },
      git_sha: {
        type: "string",
        description: "Git commit SHA (short or full). Optional; env fallback is used.",
      },
      git_branch: {
        type: "string",
        description: "Git branch. Optional; env fallback is used.",
      },
      note: {
        type: "string",
        description:
          "Short extra context (migrations, rollback, error summary). Never secrets or tokens.",
      },
    },
  },
};

export function webhookConfigured(raw) {
  if (typeof raw !== "string" || !raw.trim()) return false;
  return !raw.includes("your_webhook_token_here");
}

export function botConfigured(token, channelId) {
  return Boolean(parseBotToken(token, { optional: true }) && parseChannelId(channelId, { optional: true }));
}

export function parseBotToken(raw, { optional = false } = {}) {
  if (typeof raw !== "string" || !raw.trim()) {
    if (optional) return undefined;
    throw new Error("DISCORD_BOT_TOKEN is missing.");
  }
  const trimmed = raw.trim();
  if (trimmed === PLACEHOLDER_BOT_TOKEN || trimmed.includes("your_discord_bot_token_here")) {
    if (optional) return undefined;
    throw new Error("DISCORD_BOT_TOKEN is still the placeholder from mcp.env.example.");
  }
  if (trimmed.length < 20) {
    if (optional) return undefined;
    throw new Error("DISCORD_BOT_TOKEN looks too short to be a Discord bot token.");
  }
  return trimmed;
}

export function parseChannelId(raw, { optional = false } = {}) {
  if (typeof raw !== "string" || !raw.trim()) {
    if (optional) return undefined;
    throw new Error("DISCORD_DEPLOY_CHANNEL_ID is missing.");
  }
  const trimmed = raw.trim();
  if (trimmed === PLACEHOLDER_CHANNEL_ID) {
    if (optional) return undefined;
    throw new Error("DISCORD_DEPLOY_CHANNEL_ID is still the placeholder from mcp.env.example.");
  }
  if (!/^\d{17,20}$/.test(trimmed)) {
    if (optional) return undefined;
    throw new Error("DISCORD_DEPLOY_CHANNEL_ID must be the numeric channel snowflake (Developer Mode → Copy Channel ID).");
  }
  return trimmed;
}

export function resolveTransport(env = process.env) {
  if (webhookConfigured(env.DISCORD_DEPLOY_WEBHOOK_URL)) {
    return { mode: "webhook", webhookUrl: parseWebhookUrl(env.DISCORD_DEPLOY_WEBHOOK_URL) };
  }

  if (botConfigured(env.DISCORD_BOT_TOKEN, env.DISCORD_DEPLOY_CHANNEL_ID)) {
    return {
      mode: "bot",
      botToken: parseBotToken(env.DISCORD_BOT_TOKEN),
      channelId: parseChannelId(env.DISCORD_DEPLOY_CHANNEL_ID),
    };
  }

  throw new Error(
    "Discord deploy MCP needs DISCORD_BOT_TOKEN + DISCORD_DEPLOY_CHANNEL_ID " +
      "(you create the bot; copy the channel ID without editing the channel) " +
      "or DISCORD_DEPLOY_WEBHOOK_URL (only if someone with Manage Webhooks can create one).",
  );
}

export function parseWebhookUrl(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("DISCORD_DEPLOY_WEBHOOK_URL is missing.");
  }

  const trimmed = raw.trim();
  if (trimmed === PLACEHOLDER_WEBHOOK || trimmed.includes("your_webhook_token_here")) {
    throw new Error("DISCORD_DEPLOY_WEBHOOK_URL is still the placeholder from mcp.env.example.");
  }

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("DISCORD_DEPLOY_WEBHOOK_URL is not a valid URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("DISCORD_DEPLOY_WEBHOOK_URL must be https.");
  }

  if (!/^(?:(?:canary|ptb)\.)?(?:discord|discordapp)\.com$/.test(url.hostname)) {
    throw new Error("DISCORD_DEPLOY_WEBHOOK_URL must be a discord.com webhook.");
  }

  if (!/^\/api(?:\/v\d+)?\/webhooks\/\d+\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) {
    throw new Error("DISCORD_DEPLOY_WEBHOOK_URL path is not a Discord incoming webhook.");
  }

  return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
}

export function sanitizeNote(note) {
  if (note == null || note === "") return undefined;
  const stripped = String(note)
    .replace(/@everyone/gi, "(everyone)")
    .replace(/@here/gi, "(here)")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return undefined;
  return stripped.length > NOTE_MAX ? `${stripped.slice(0, NOTE_MAX - 1)}…` : stripped;
}

export function sanitizeSha(sha) {
  if (sha == null || sha === "") return undefined;
  const value = String(sha).trim();
  if (!/^[0-9a-f]{7,40}$/i.test(value)) return undefined;
  return value.slice(0, 12);
}

export function sanitizeBranch(branch) {
  if (branch == null || branch === "") return undefined;
  const value = String(branch).trim();
  if (!/^[A-Za-z0-9._/-]{1,200}$/.test(value)) return undefined;
  return value;
}

export function publicUrl(layer, destination) {
  return `${HOSTS[destination]}${LAYERS[layer].path}`;
}

export function buildPayload(input) {
  const layer = input.layer;
  const destination = input.destination;
  const status = input.status;

  if (!LAYERS[layer]) throw new Error(`Unknown layer: ${layer}`);
  if (!DESTINATIONS.has(destination)) throw new Error(`Unknown destination: ${destination}`);
  if (!STATUSES.has(status)) throw new Error(`Unknown status: ${status}`);

  const smokeOk = input.smoke_ok;
  const note = sanitizeNote(input.note);
  const gitSha = sanitizeSha(input.git_sha ?? process.env.SCHOOL_LAB_GIT_SHA);
  const gitBranch = sanitizeBranch(input.git_branch ?? process.env.SCHOOL_LAB_GIT_BRANCH);
  const url = publicUrl(layer, destination);
  const failed = status === "failure";
  const smokeFailed = smokeOk === false;
  const color = failed ? COLOR.failure : smokeFailed ? COLOR.warning : COLOR.success;

  const title = failed ? "Deploy falhou" : "Deploy concluído";
  const statusLabel = failed ? "Falhou" : "Concluído";
  const smokeLabel =
    smokeOk === true ? "OK (somente leitura)" : smokeOk === false ? "Falhou" : "Não executado";

  const fields = [
    { name: "Produto", value: PRODUCT, inline: true },
    { name: "Ambiente", value: destination === "production" ? "Produção" : "Staging", inline: true },
    { name: "Camada", value: LAYERS[layer].label, inline: true },
    { name: "Status", value: statusLabel, inline: true },
    { name: "Smoke", value: smokeLabel, inline: true },
    { name: "URL", value: url, inline: false },
  ];

  if (gitBranch) fields.push({ name: "Branch", value: `\`${gitBranch}\``, inline: true });
  if (gitSha) fields.push({ name: "Commit", value: `\`${gitSha}\``, inline: true });
  if (note) fields.push({ name: "Nota", value: note, inline: false });

  return {
    username: WEBHOOK_USERNAME,
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title,
        description: `${PROJECT} · Kamal`,
        url,
        color,
        timestamp: new Date().toISOString(),
        fields,
        footer: { text: `${PROJECT} · ${destination}` },
      },
    ],
  };
}

function transportFromOptions(options) {
  if (options.transport) return options.transport;
  if (options.webhookUrl) return { mode: "webhook", webhookUrl: parseWebhookUrl(options.webhookUrl) };
  if (options.botToken && options.channelId) {
    return { mode: "bot", botToken: parseBotToken(options.botToken), channelId: parseChannelId(options.channelId) };
  }
  return resolveTransport(options.env ?? process.env);
}

async function postDiscord(transport, payload, signal) {
  if (transport.mode === "webhook") {
    return fetch(`${transport.webhookUrl}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify(payload),
      signal,
    });
  }

  return fetch(`${DISCORD_API}/channels/${transport.channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${transport.botToken}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      embeds: payload.embeds,
      allowed_mentions: payload.allowed_mentions,
    }),
    signal,
  });
}

export async function notifyDeploy(input, options = {}) {
  const transport = transportFromOptions(options);
  const payload = buildPayload(input);
  const dryRun = options.dryRun ?? process.env.DISCORD_DEPLOY_DRY_RUN === "1";

  if (dryRun) {
    return { dryRun: true, mode: transport.mode, payload };
  }

  const signal = options.signal ?? AbortSignal.timeout(10_000);
  const response = await postDiscord(transport, payload, signal);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Discord ${transport.mode} request failed (${response.status}): ${text.slice(0, 300)}`);
  }

  let messageId;
  try {
    messageId = JSON.parse(text).id;
  } catch {
    messageId = undefined;
  }

  return { dryRun: false, mode: transport.mode, messageId, payload };
}
