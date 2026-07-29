---
name: create-github-issue
description: Create a GitHub issue in DLA-Solutions/school_lab and add it to the org project backlog (DLA-Solutions project #1). Use when the user asks to create a backlog item, GitHub issue, or track work in the project board.
---

# Create GitHub Issue (Backlog)

Create issues in `DLA-Solutions/school_lab` and ensure they appear in the org project backlog.

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
- [ ] 1. Clarify title, body, labels (if any)
- [ ] 2. Search for duplicates
- [ ] 3. Create issue
- [ ] 4. Add to project
- [ ] 5. Set Status = Backlog (if not default)
- [ ] 6. Verify and return links
```

### Step 1 — Gather content

- **Title**: imperative, concise, English (repo convention).
- **Body** template:

```markdown
## Context
[Why this exists]

## Acceptance criteria
- [ ] ...

## Notes
[Links, PRDs, open questions]
```

- Ask the user for labels/assignees only when relevant; do not guess.

### Step 2 — Dedupe

Call `search_issues` scoped to the repo:

```
is:issue repo:DLA-Solutions/school_lab <keywords from title>
```

If a match exists, stop and share the existing issue URL unless the user wants a new one anyway.

### Step 3 — Create issue

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

### Step 4 — Add to project

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
| `issue_number` | (from step 3) |

Save `item_id` from the response.

### Step 5 — Set Status to Backlog

If the project does not default new items to Backlog:

1. `projects_list` with `method: list_project_fields`, `owner: DLA-Solutions`, `owner_type: org`, `project_number: 1` — confirm the Status field and option names.
2. `projects_write` with `method: update_project_item`:

| Param | Value |
|-------|-------|
| `owner` | `DLA-Solutions` |
| `owner_type` | `org` |
| `project_number` | `1` |
| `item_id` | (from step 4) |
| `updated_field` | `{ "name": "Status", "value": "Backlog" }` |

If "Backlog" is not an option, list options and ask the user which status maps to the backlog view.

### Step 6 — Verify

Call `projects_get` with `method: get_project_item`, `field_names: ["Status"]`, and the `item_id`.

Return to the user:

- Issue URL: `https://github.com/DLA-Solutions/school_lab/issues/{number}`
- Project item on backlog view

## Failure handling

| Error | Action |
|-------|--------|
| `INSUFFICIENT_SCOPES` on project | Ask user to add `read:project` + `project` to PAT |
| Issue created but not on project | Run step 4; never leave half-done |
| Status option not found | List options via `projects_list`; ask user |
| Duplicate found | Share existing issue; do not create unless confirmed |

## Do not

- Commit PATs or tokens to the repo.
- Hardcode Portuguese in issue title/body (English in GitHub; pt-BR is UI-only).
- Skip project assignment — creating an issue alone does **not** add it to the org project.
