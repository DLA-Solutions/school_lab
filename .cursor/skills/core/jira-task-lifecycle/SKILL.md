---
name: jira-task-lifecycle
description: >-
  Claims a DLA Jira issue for the current implementer (assign + In Progress)
  and, after a successful staging deploy, moves it to Ready to QA. Use when the
  user names a DLA-N ticket or Jira URL, asks to pick/claim/start a Jira task,
  says "pega a task", "vou implementar", "atribuir", or when deploy-staging
  finishes a successful staging deploy.
---

# Jira task lifecycle (DLA)

Two phases on project **DLA** (`https://dla-solutions.atlassian.net`):

| Phase | When | Assignee | Status |
|-------|------|----------|--------|
| **Start** | User picks a ticket or starts implementing it | Current Atlassian user | **In Progress** |
| **Ready to QA** | Successful **staging** deploy of that work | Unchanged | **Ready to QA** |

Do **not** set **QA in progress** or **Done** — those belong to QA.

## Constants

| Key | Value |
|-----|-------|
| Site | `https://dla-solutions.atlassian.net` |
| `cloudId` | Try hostname `dla-solutions.atlassian.net` first; UUID `334617df-4511-4554-bfda-a2bcdbcd65d5` if a tool rejects the hostname |
| Project | `DLA` (DLA Solutions, next-gen) |
| Namespace | Discover via `GetDynamicTools` pattern `atlassian\|Jira` (expected `plugin-atlassian-atlassian`) |

### Board (match by **name**, not only id)

| Status | Status id | Transition id | Agent may set? |
|--------|-----------|---------------|----------------|
| To Do | 10000 | 11 | no (leave as backlog) |
| Urgent | 10005 | 2 | no (leave as priority backlog) |
| **In Progress** | 10001 | **21** | **Start phase** |
| **Ready to QA** | 10002 | **31** | **Ready to QA phase** |
| QA in progress | 10003 | 41 | no |
| Done | 10004 | 51 | no |

Always call `getTransitionsForJiraIssue` and pick the transition whose `to.name` equals the target. Use the ids above only as fallback.

## MCP

1. `GetDynamicTools` with `pattern: "atlassian|Jira"` (or `namespace` + `toolName`).
2. `CallDynamicTool` with the returned namespace.
3. If the namespace is `needsAuth` or a call returns auth error: `CallDynamicTool` `toolName: "mcp_auth"` with `{}` , then retry.

If Atlassian MCP is missing, tell the user to enable the Atlassian plugin. Do **not** treat that as an implementation or deploy failure.

## Phase: Start (claim)

Run **before** writing feature code when the user names `DLA-N`, pastes a Jira URL, or asks to pick/claim/start a task.

```
- [ ] 1. Resolve issue key
- [ ] 2. Load issue + current user
- [ ] 3. Assign to current user
- [ ] 4. Transition to In Progress
- [ ] 5. Confirm key, summary, status, URL
```

### 1. Resolve the issue

**Key given** (`DLA-12`, or URL `…/browse/DLA-12`): use it.

**No key** — search, then ask if more than one:

```
project = DLA AND status = Urgent AND type not in (Epic) ORDER BY updated DESC
project = DLA AND status = "To Do" AND type not in (Epic, Subtask) ORDER BY updated DESC
```

List `key`, type, status, summary, URL. Prefer **Urgent** over **To Do**. Do not claim an Epic unless the user explicitly asks. If they name a parent that has subtasks, ask which key to claim.

### 2. Load issue + implementer

- `getJiraIssue` — `fields`: `summary`, `status`, `issuetype`, `assignee`, `description`
- `atlassianUserInfo` — save `account_id` (this is **who implements**; never hardcode a person)

Skip Start when status is **Ready to QA**, **QA in progress**, or **Done**, unless the user explicitly asks to reopen → then **In Progress** + assign.

Already **In Progress** and assigned to the current user: report URL and continue; do not re-transition.

### 3. Assign

If assignee is missing or a different account:

```
editJiraIssue
  cloudId, issueIdOrKey
  fields: { "assignee": { "accountId": "<account_id from atlassianUserInfo>" } }
```

If that payload is rejected, retry with `{ "id": "<account_id>" }`.

Assigned to someone else: **ask before stealing**, unless the user said to assign it to themselves.

Do not assign Epics as routine implementation work.

### 4. Transition to In Progress

If status is not already **In Progress**:

```
getTransitionsForJiraIssue → transition whose to.name == "In Progress"
transitionJiraIssue
  cloudId, issueIdOrKey
  transition: { id: "<id>" }
```

From **To Do** or **Urgent** is expected. Do not add a comment on start.

### 5. Confirm

Return: `https://dla-solutions.atlassian.net/browse/{KEY}`, summary, type, assignee, **In Progress**. Then implement (delegate per `agent-routing`). Keep the key in the conversation for the Ready to QA phase.

## Phase: Ready to QA

Run from skill **`deploy-staging`** after a **successful** staging deploy (smoke passed). Not on failure. Not on **production**.

```
- [ ] 1. Identify In Progress issue(s) for this work
- [ ] 2. Transition to Ready to QA
- [ ] 3. Comment with staging URL + git SHA
```

### 1. Identify issues

1. Key claimed in this conversation, or named by the user.
2. Else JQL:

```
project = DLA AND assignee = currentUser() AND status = "In Progress" AND type != Epic
```

| Result | Action |
|--------|--------|
| 0 | Skip; tell the user no In Progress issue was found |
| 1 | Use it |
| 2+ | List keys + summaries; ask which to move (move several only if the user says so) |

Skip a key already in **Ready to QA**, **QA in progress**, or **Done**.

### 2. Transition

```
getTransitionsForJiraIssue → to.name == "Ready to QA"
transitionJiraIssue  transition: { id: "<id>" }
```

Leave assignee as-is.

### 3. Comment

`addCommentToJiraIssue` (`contentFormat: "markdown"`):

```
Deployed to staging — ready for QA.
- Env: https://staging.scholarpremium.com.br
- git: `{sha}` on `staging`
- PR: {url or "n/a"}
```

Never put secrets, webhook URLs, or `.kamal/` values in the comment.

Then continue `deploy-staging` (Discord `notify_deploy` stays last).

## Do not

- Move to **QA in progress** or **Done**.
- Move to **Ready to QA** after production, a failed deploy, or a deploy that did not finish.
- Hardcode an assignee — always `atlassianUserInfo`.
- Claim an Epic as the implementation ticket unless the user insists.
- Block coding or treat a failed Jira update as a deploy failure — report it and continue.
- Create Jira issues here (that is a different workflow).
