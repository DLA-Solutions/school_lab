---
name: create-github-issue
description: Create a GitHub issue in DLA-Solutions/school_lab with detailed Gherkin (Given/When/Then) acceptance criteria and add it to the org project backlog (DLA-Solutions project #1). Use when the user asks to create a backlog item, GitHub issue, or track work in the project board.
---

# Create GitHub Issue (Backlog)

Create issues in `DLA-Solutions/school_lab` with **precise Gherkin acceptance criteria** and ensure they appear in the org project backlog.

**Quality bar:** every issue must be implementable and testable from its scenarios alone. Ask clarifying questions before creating when behavior is ambiguous.

## Constants

| Key | Value |
|-----|-------|
| Owner | `DLA-Solutions` |
| Repo | `school_lab` |
| Project owner | `DLA-Solutions` |
| Project owner type | `org` |
| Project number | `1` |
| Project URL | https://github.com/orgs/DLA-Solutions/projects/1/views/1 |
| Default Status | `Backlog` (confirm via `projects_list` if unsure) |

## Prerequisites

- GitHub MCP server connected (local stdio + `.cursor/mcp.env`; see below).
- PAT scopes: `repo`, `read:project`, `project`.

### Local MCP env setup

The GitHub MCP runs as a local stdio server. It reads `.cursor/mcp.env` directly — no Docker or `launchctl` required.

```bash
cp .cursor/mcp.env.example .cursor/mcp.env
# Edit .cursor/mcp.env and set GITHUB_PERSONAL_ACCESS_TOKEN

.cursor/scripts/install-github-mcp.sh
```

`.cursor/mcp.env` and `.cursor/bin/` are gitignored. Restart Cursor after setup or token changes.

## Workflow

Copy and track:

```
- [ ] 1. Gather context; clarify gaps with user (see § Clarify first)
- [ ] 2. Draft title + body with Gherkin acceptance criteria
- [ ] 3. Run acceptance criteria quality gate
- [ ] 4. Present draft to user for approval (when created from scratch)
- [ ] 5. Search for duplicates
- [ ] 6. Create issue
- [ ] 7. Add to project
- [ ] 8. Set Status = Backlog (if not default)
- [ ] 9. Verify and return links
```

### Clarify first (mandatory when gaps exist)

**Stop and ask the user** before creating the issue when any of these are unknown:

| Gap | Example question |
|-----|------------------|
| Actor / role | Who performs this — school admin, teacher, guardian, backoffice? |
| Scope | MVP or phase 2? Covered by an approved PRD? |
| Error behavior | Expected HTTP status and error payload for failure cases? |
| Tenant isolation | Cross-school or cross-family access rules? |
| Unresolved decision | Item in `open-questions.md` gates the behavior? |
| Dependencies | Blocked by or blocking another issue/PR? |

If decomposing from `context-to-tasks`, use scenarios already drafted and approved — do not re-summarize into vague bullets.

When context is sufficient, state assumptions in **Context** and proceed.

### Step 1 — Gather content

- **Title**: imperative, concise, English (repo convention).
- **Body** template:

```markdown
## Context
[Why this exists — 2–4 sentences. Link PRD §, BR-NNN, or parent issue. State assumptions.]

## Acceptance criteria

### Scenario: [Happy path]

**Given** [actor + school context + data preconditions]
**When** [single action]
**Then** [observable outcome]
**And** [additional outcomes]

### Scenario: [Authorization or error case]

**Given** [...]
**When** [...]
**Then** [...]

## Traceability
| Source | Reference |
|--------|-----------|
| PRD | `docs/prds/...` §N |
| Business rule | BR-NNN |

## Dependencies
- Blocked by: #N or none
- Blocks: #N or none

## Notes
[Links, open questions, LGPD notes]
```

- Gherkin rules and examples: `.cursor/skills/core/context-to-tasks/gherkin.md`
- Minimum scenarios: happy path + negative/authorization when roles or `school_id` apply
- Ask for labels/assignees only when relevant; do not guess.

### Acceptance criteria quality gate

Before creating (or after drafting for user review):

- [ ] Every scenario uses **Given / When / Then** (And allowed)
- [ ] **Given** names actor, tenant context, and concrete data state
- [ ] **When** is a single action
- [ ] **Then** asserts observable outcomes — not "works correctly"
- [ ] Authorization + `school_id` isolation covered when applicable
- [ ] No speculative scenarios for unresolved `open-questions.md` items
- [ ] Scenarios are detailed enough to write RSpec/request specs from

If the gate fails, rewrite scenarios or ask the user — **do not create a thin issue**.

### Step 5 — Dedupe

Call `search_issues` scoped to the repo:

```
is:issue repo:DLA-Solutions/school_lab <keywords from title>
```

If a match exists, stop and share the existing issue URL unless the user wants a new one anyway.

### Step 6 — Create issue

Call `issue_write`:

| Param | Value |
|-------|-------|
| `method` | `create` |
| `owner` | `DLA-Solutions` |
| `repo` | `school_lab` |
| `title` | (from user) |
| `body` | (from template) |
| `labels` | (optional) |

Save `issue_number` from the response.

### Step 7 — Add to project

Call `projects_write`:

| Param | Value |
|-------|-------|
| `method` | `add_project_item` |
| `owner` | `DLA-Solutions` |
| `owner_type` | `org` |
| `project_number` | `1` |
| `item_type` | `issue` |
| `item_owner` | `DLA-Solutions` |
| `item_repo` | `school_lab` |
| `issue_number` | (from step 6) |

Save `item_id` from the response.

### Step 8 — Set Status to Backlog

If the project does not default new items to Backlog:

1. `projects_list` with `method: list_project_fields`, `owner: DLA-Solutions`, `owner_type: org`, `project_number: 1` — confirm the Status field and option names.
2. `projects_write` with `method: update_project_item`:

| Param | Value |
|-------|-------|
| `owner` | `DLA-Solutions` |
| `owner_type` | `org` |
| `project_number` | `1` |
| `item_id` | (from step 7) |
| `updated_field` | `{ "name": "Status", "value": "Backlog" }` |

If "Backlog" is not an option, list options and ask the user which status maps to the backlog view.

### Step 9 — Verify

Call `projects_get` with `method: get_project_item`, `field_names: ["Status"]`, and the `item_id`.

Return to the user:

- Issue URL: `https://github.com/DLA-Solutions/school_lab/issues/{number}`
- Project item on backlog view

## Failure handling

| Error | Action |
|-------|--------|
| `INSUFFICIENT_SCOPES` on project | Ask user to add `read:project` + `project` to PAT |
| Issue created but not on project | Run step 7; never leave half-done |
| Status option not found | List options via `projects_list`; ask user |
| Duplicate found | Share existing issue; do not create unless confirmed |

## Do not

- Commit PATs or tokens to the repo.
- Hardcode Portuguese in issue title/body (English in GitHub; pt-BR is UI-only).
- Skip project assignment — creating an issue alone does **not** add it to the org project.
- Create issues with bullet-only acceptance criteria — use Gherkin scenarios.
- Skip user review when behavior is ambiguous — ask first.
