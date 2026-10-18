# School Lab — Claude Code Context

This file is the Claude Code equivalent of `.cursor/` (Cursor IDE agent context),
ported to `.claude/`. It is loaded automatically at session start. `.cursor/` is
left untouched and keeps working for Cursor users — treat the two trees as
parallel, not as one canonical source with a mirror.

## Always-apply rules (imported below)

These were `alwaysApply: true` in Cursor and load into every session here too:

@.claude/rules/core/project-overview.md
@.claude/rules/core/agent-routing.md
@.claude/rules/core/language-conventions.md
@.claude/rules/core/design-principles.md
@.claude/rules/core/lgpd-privacy.md
@.claude/rules/core/git-atomic-commits.md
@.claude/rules/core/git-branch-naming.md
@.claude/rules/core/deployment.md
@.claude/rules/core/deploy-environment-branches.md
@.claude/rules/core/email-safety.md

Note: `core/deployment.md` and `core/deploy-environment-branches.md` were
`alwaysApply: true` in Cursor even though `deployment.mdc` also carries globs —
both are imported here to preserve that behavior exactly.

## Scoped rules — read on demand by surface

Claude Code has no glob-based auto-activation, so these are **not** auto-loaded.
Read the relevant file with the Read tool before touching the matching paths —
treat "before touching `X`, read `Y`" as a hard requirement, not a suggestion.

| Rule | Read before touching | One-line description |
|------|----------------------|------------------------|
| `.claude/rules/core/use-context7.md` | `web/**`, `mobile/**` | Consult Context7 MCP for library docs before implementation |
| `.claude/rules/docs/dbdocs.md` | `docs/database/**`, `web/db/migrate/**/*.rb`, `web/db/schema.rb` | Keep dbdocs in sync after DBML or migration changes |
| `.claude/rules/docs/docs-and-prds.md` | `docs/**` | Documentation and PRD authoring conventions |
| `.claude/rules/docs/modeling.md` | `docs/modeling/**`, `docs/database/**` | Data modeling — narrative DSL + executable DBML/DER |
| `.claude/rules/mobile/mobile.md` | `mobile/**` | Mobile app (React Native) conventions |
| `.claude/rules/web-ui/design-system.md` | `frontend/app/src/**` | School Lab design system patterns and tokens |
| `.claude/rules/web/anti-patterns.md` | `web/app/**/*.rb`, `web/spec/**/*.rb` | Rails anti-patterns — god models, callbacks, unscoped queries |
| `.claude/rules/web/auditing.md` | `web/app/models/**`, audit concerns/initializers | Change-history auditing with the `audited` gem |
| `.claude/rules/web/controllers.md` | `web/app/controllers/**`, `web/spec/requests/**`, `web/config/routes.rb` | Thin API controller conventions — REST, Pundit, services |
| `.claude/rules/web/gateways.md` | `web/app/services/gateways/**`, `web/spec/gateways/**` | External API adapters — boleto, FCM |
| `.claude/rules/web/http-client.md` | `web/lib/school_lab/http.rb` | Outbound HTTP transport — `SchoolLab::Http` (Faraday) only |
| `.claude/rules/web/integrations.md` | `web/lib/school_lab/integrations/**` | Vendor HTTP integrations, adapter error mapping |
| `.claude/rules/web/jobs.md` | `web/app/jobs/**`, `web/spec/jobs/**` | ActiveJob + Solid Queue — async work, idempotency |
| `.claude/rules/web/mailers.md` | `web/app/mailers/**`, mailer views/specs | Transactional email — async delivery, i18n, LGPD |
| `.claude/rules/web/migrations.md` | `web/db/migrate/**`, `web/db/schema.rb` | ActiveRecord migration conventions — schema, tenancy, indexes, FKs |
| `.claude/rules/web/models.md` | `web/app/models/**`, `web/spec/models/**`, `web/spec/factories/**` | ActiveRecord model conventions — thin models, tenancy, Discard |
| `.claude/rules/web/multi-tenancy.md` | models/controllers/services/jobs/migrations/specs across `web/` | `school_id` isolation, `Current` attributes, guardian family scope |
| `.claude/rules/web/policies.md` | `web/app/policies/**`, `web/spec/policies/**` | Pundit authorization — roles, scopes, school/family isolation |
| `.claude/rules/web/serializers.md` | `web/app/blueprints/**` | Blueprinter API serialization — no inline JSON |
| `.claude/rules/web/services.md` | `web/app/services/**`, `web/spec/services/**` | Service object conventions — business logic, results, tenancy |
| `.claude/rules/web/state-machines.md` | AASM-backed models/services | State machine conventions |
| `.claude/rules/web/testing-rspec.md` | `web/spec/**` | RSpec testing conventions |
| `.claude/rules/web/web-rails.md` | `web/**` | General Rails/`web/` conventions |

Full text of every rule (always-apply and scoped) lives under `.claude/rules/`,
mirroring `.cursor/rules/` folder-for-folder (`core/`, `docs/`, `web/`,
`web-ui/`, `mobile/`).

## Subagents

Nine specialist subagents live in `.claude/agents/` (ported 1:1 from
`.cursor/agents/`). Routing rule: parent sessions must delegate surface work to
the right orchestrator instead of implementing it directly — see
`.claude/rules/core/agent-routing.md` for the full routing table and parallel-
delegation guidance.

| Agent | Role |
|-------|------|
| `rails-implementer` | Orchestrates `web/` feature implementation; delegates internally to the four agents below |
| `migration-agent` | ActiveRecord migrations aligned with `docs/database/schema.dbml` (subagent of rails-implementer only) |
| `policy-agent` | Pundit authorization policies (subagent of rails-implementer only) |
| `service-agent` | Business logic service objects (subagent of rails-implementer only) |
| `api-controller-agent` | Thin REST API controllers + rswag specs (subagent of rails-implementer only) |
| `backend-ci` | Runs backend CI for `web/`, fixes failures, ships a PR |
| `frontend-implementer` | Orchestrates `frontend/app`, `frontend/backoffice`, `packages/design-tokens`, `mobile/` |
| `prd-reviewer` | Read-only: reviews PRDs for completeness/consistency |
| `doc-consistency-checker` | Read-only: cross-checks `docs/` anchor documents for drift |

## Skills

Twenty-three skills live in `.claude/skills/`, mirroring `.cursor/skills/`
folder-for-folder (`core/`, `web/`, `web-ui/`, `mobile/`, `docs/`,
`codelet-loop/`, `codelet-requirements/`). Each `SKILL.md` already carries
`name` + `description` frontmatter in the format Claude Code's Skill tool
expects, so they were ported with only internal path references rewritten
(`.cursor/...` → `.claude/...`). Invoke by name via the Skill tool, e.g.
`write-rspec-spec`, `create-pull-request`, `deploy-kamal`, `review-api`,
`pr-review`.

## MCP servers

Project-scoped MCP servers are declared in `.mcp.json` at the repo root
(`context7`, `github`, `discord-deploy`) — same shape as `.cursor/mcp.json`.
The `github` and `discord-deploy` entries invoke copies of the launcher
scripts at `.claude/scripts/run-github-mcp.sh` and
`.claude/scripts/run-discord-mcp.sh`. Those copies deliberately still read
credentials from `.cursor/mcp.env` and the binary at `.cursor/bin/`, so there
is exactly one secrets file and one installed binary shared by both IDEs —
copy `.cursor/mcp.env.example` to `.cursor/mcp.env` and run
`.cursor/scripts/install-github-mcp.sh` once, as documented there.

## Hooks

`.cursor/hooks.json` gated `gh pr create` shell calls via
`.cursor/hooks/gate-pr-create.sh` (always allow — CI is deploy-only and must
never block PR creation). The adapted script lives at
`.claude/hooks/gate-pr-create.sh` (executable, same always-allow behavior,
using Claude Code's `PreToolUse` JSON contract instead of Cursor's
`beforeShellExecution`).

**Not yet wired into `.claude/settings.json`**: adding a `hooks.PreToolUse`
entry there was blocked by this environment's permission classifier when
attempted during porting (both a direct edit and the `update-config` skill
were denied). To finish wiring it, add this under the top-level `hooks` key
in `.claude/settings.json` (merge with, don't replace, the existing
`permissions` key):

```json
"hooks": {
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        { "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/gate-pr-create.sh" }
      ]
    }
  ]
}
```
