# Cursor workspace (local dev)

Use with skill `setup-local-dev`. Open the **repository root** so `.cursor/rules`, `.cursor/agents`, `.cursor/skills`, and `.cursor/mcp.json` apply.

No recommended VS Code/Cursor extension list is committed (frontend `.gitignore` mentions `.vscode/extensions.json` but none is in the repo).

## What loads automatically

| Path | Role |
|------|------|
| `.cursor/rules/core/` | Always-on: language, LGPD, email-safety, agent-routing, branches |
| `.cursor/rules/web/` | When editing `web/` |
| `.cursor/rules/web-ui/`, `mobile/`, `docs/` | When those globs match |
| `.cursor/agents/` | Specialists — parent **delegates**, does not reimplement |
| `.cursor/skills/` | Workflows (this skill, `setup-deploy`, `deploy-kamal`, …) |
| `.cursor/mcp.json` | MCP server definitions |

## Agent routing (do not skip)

Rule `agent-routing`:

| Work | Orchestrator |
|------|----------------|
| `web/**` (API, migrations, services, policies) | **rails-implementer** (layer agents only through it) |
| `web/` CI / ship | **backend-ci** |
| `frontend/app`, `frontend/backoffice`, `mobile`, design tokens | **frontend-implementer** |
| `docs/**` PRDs | **prd-reviewer** / **doc-consistency-checker** |

Parent chat implements `web/` or SPA feature code **only** if no specialist exists. API + UI: Rails first unless `docs/api/v1/` is frozen.

## Language and git

- Repository language: **English** (code, docs, commits, JSON keys). UI copy: **pt-BR** via i18n.
- Branch from **`staging`**: `feature/` `fix/` `refactor/` `chore/` `docs/` — skill `branch-naming`.
- PRs target **`staging`**. Never deploy a feature branch.

Jira `DLA-N`: skill `jira-task-lifecycle` (claim → In Progress) **before** implementation when the user names a ticket.

## MCP servers

Defined in `.cursor/mcp.json`:

| Server | How | Needed for local coding? |
|--------|-----|--------------------------|
| **context7** | URL `https://mcp.context7.com/mcp/oauth` | Yes — library docs (rule `use-context7`) |
| **github** | stdio via `.cursor/scripts/run-github-mcp.sh` | Issues/PRs/project board |
| **discord-deploy** | stdio via `.cursor/scripts/run-discord-mcp.sh` | Only when deploying (skill `deploy-kamal`) |

**Atlassian / Jira** is **not** in `mcp.json`. Enable the Cursor **Atlassian plugin**; skill `jira-task-lifecycle` discovers it (`plugin-atlassian-atlassian`). Missing Atlassian is not a local-setup failure.

### Context7

Complete the OAuth prompt in Cursor. Skill `consult-context7`. Project docs (`docs/web-stack.md`) win over generic library advice.

### GitHub MCP

From `create-github-issue` / `.cursor/mcp.env.example`:

```bash
cp .cursor/mcp.env.example .cursor/mcp.env
# Set GITHUB_PERSONAL_ACCESS_TOKEN (scopes: repo, read:project, project)
.cursor/scripts/install-github-mcp.sh    # Darwin only — see ubuntu.md on Linux
```

`.cursor/mcp.env` and `.cursor/bin/` are gitignored. Restart Cursor after token or binary changes.

`run-github-mcp.sh` refuses to start until the token is set (not the placeholder `your_github_pat_here`).

This PAT is **not** `KAMAL_REGISTRY_PASSWORD` (that one needs `read:packages` + `write:packages` for GHCR — skill `setup-deploy`).

### Discord deploy MCP (skip if this machine will not deploy)

```bash
cp .cursor/mcp.env.example .cursor/mcp.env   # if not already present
# DISCORD_BOT_TOKEN + DISCORD_DEPLOY_CHANNEL_ID — comments in mcp.env.example
```

Restart Cursor. Verify with `GetDynamicTools` → `discord-deploy` / `notify_deploy`. Full first-time deploy machine: skill `setup-deploy` step 10.

## Working in Cursor after setup

1. Keep the workspace root as `school_lab/`.
2. Ask the agent to start the stack (`make dev`) rather than inventing Procfiles.
3. Name a `DLA-N` ticket when implementing — agent should claim it.
4. Do not ask the parent agent to “just edit the Rails controller”; it should spawn **rails-implementer**.
