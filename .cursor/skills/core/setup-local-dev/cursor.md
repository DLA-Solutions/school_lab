# Cursor workspace (local dev)

Do this **after the app is running** ([`SKILL.md`](SKILL.md) smoke). Open the **repository root** so `.cursor/rules`, `.cursor/agents`, `.cursor/skills`, and `.cursor/mcp.json` apply.

No recommended VS Code/Cursor extension list is committed.

## Minimum (every laptop)

**Context7** is already in `.cursor/mcp.json` (`https://mcp.context7.com/mcp/oauth`). Complete the OAuth prompt in Cursor. Skill `consult-context7`. Project docs (`docs/web-stack.md`) win over generic library advice.

**Atlassian / Jira** is **not** in `mcp.json`. Enable the Cursor **Atlassian plugin** if you use `DLA-N` tickets (skill `jira-task-lifecycle`). Missing Atlassian is not a local-setup failure.

## GitHub MCP (optional — issues/PRs)

Not required to run the app. This PAT is **not** `KAMAL_REGISTRY_PASSWORD` (packages scopes — skill `setup-deploy`).

```bash
cp .cursor/mcp.env.example .cursor/mcp.env
# Set GITHUB_PERSONAL_ACCESS_TOKEN (scopes: repo, read:project, project)
.cursor/scripts/install-github-mcp.sh    # Darwin only
```

On Ubuntu, do **not** run the Darwin script — download the Linux asset in [`ubuntu.md`](ubuntu.md) into `.cursor/bin/github-mcp-server`.

`.cursor/mcp.env` and `.cursor/bin/` are gitignored. Restart Cursor after token or binary changes. `run-github-mcp.sh` refuses to start until the token is set (not the placeholder `your_github_pat_here`).

## Discord deploy MCP (skip unless this machine deploys)

Only if Cursor **agents** will run `kamal deploy` here. A human running Kamal in a terminal does not need it on day one. Full machine: skill `setup-deploy`.

```bash
cp .cursor/mcp.env.example .cursor/mcp.env   # if not already present
# DISCORD_BOT_TOKEN + DISCORD_DEPLOY_CHANNEL_ID — comments in mcp.env.example
```

Restart Cursor. Verify `GetDynamicTools` → `discord-deploy` / `notify_deploy`.
