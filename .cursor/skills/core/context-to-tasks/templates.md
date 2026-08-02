# Task Output Templates

Gherkin rules: [gherkin.md](gherkin.md). Every acceptance criterion must use Given / When / Then.

## Single task

```markdown
### T[N]: [Imperative title]

| Field | Value |
|-------|-------|
| Phase | discovery \| docs \| modeling \| api \| backend \| jobs \| web-spa \| app \| chore |
| Depends on | T[x], T[y] or none |
| Blocked by | [open-questions.md item] or none |
| Source | [file §section / BR-NNN / use case name] |
| Suggested branch | feature/short-slug |

**Description**
[2–4 sentences: what, why, scope boundaries, assumptions made]

**Acceptance criteria**

### Scenario: [Happy path — short name]

**Given** [actor + school context + data state]
**When** [single action]
**Then** [observable outcome]
**And** [additional outcomes]

### Scenario: [Negative or authorization case]

**Given** [...]
**When** [...]
**Then** [...]
```

---

## Full decomposition output

```markdown
# Task plan — [Source name]

**Source:** [path or conversation summary]
**Mode:** roadmap | domain-plan | slice | incremental
**Blocked decisions:** [list or "none"]
**Assumptions:** [decisions made when source was silent, or "none — source is complete"]
**Open questions for user:** [list or "none — ready for review"]

## Summary

| Phase | Count |
|-------|-------|
| discovery | N |
| modeling | N |
| ... | |

**Suggested starting point:** T[N] — [title]
**First PR scope:** T[N]–T[M]

## Dependencies

T1 → T2 → T4
T1 → T3 → T4

## Tasks

### T1: ...
[full task block with Gherkin scenarios]

### T2: ...
...
```

---

## Roadmap mode (product / multi-domain)

```markdown
### T1: Write domain PRD — communication

| Field | Value |
|-------|-------|
| Phase | docs |
| Depends on | none |
| Source | product-map.md §5 item 5 |

**Description**
Author `docs/prds/005-communication.md` covering MVP two-way messaging with images and push notifications for school, teacher, and guardian actors.

**Acceptance criteria**

### Scenario: PRD covers all template sections

**Given** `docs/prds/template.md` section list
**When** `docs/prds/005-communication.md` is reviewed
**Then** every required section is present in the correct order
**And** business rules use BR-NNN identifiers

### Scenario: Open questions are flagged not invented

**Given** unresolved items in `docs/open-questions.md` affecting communication
**When** the PRD addresses those topics
**Then** each item is listed in Out of Scope or Open items with a link to `open-questions.md`
**And** no speculative business rules close unresolved decisions
```

---

## Domain plan mode (single PRD → implementation)

Typical task chain for a new domain:

| Order | Task pattern |
|-------|----------------|
| 1 | Resolve or spike gated open questions |
| 2 | Narrative DSL `docs/modeling/NNN-<domain>.md` |
| 3 | DBML + DER in `docs/database/` |
| 4 | API narrative `docs/api/v1/<domain>.md` |
| 5 | Migrations + models |
| 6 | Services (one task per use case) + Pundit policies |
| 7 | Controllers + rswag specs |
| 8 | Request/model specs |
| 9 | Background jobs (if PRD defines events/async) |
| 10 | web SPA (`frontend/main`) / app surfaces (if in scope) |

Each implementation task (rows 5–10) requires happy path + authorization/isolation scenarios per [gherkin.md](gherkin.md).

---

## GitHub issue grouping

When creating issues from approved tasks, merge tasks that ship together. **Preserve full Gherkin scenarios** — do not collapse into bullets.

```markdown
## Context
Decomposed from `docs/prds/003-billing.md` (context-to-tasks T5–T7).

## Acceptance criteria

### Scenario: [from T5]
**Given** ...
**When** ...
**Then** ...

### Scenario: [from T5 — negative case]
**Given** ...
**When** ...
**Then** ...

### Scenario: [from T6]
...

## Traceability
| Task | Source |
|------|--------|
| T5 | PRD §6.1, BR-003 |
| T6 | PRD §6.1, UC Create charge |

## Dependencies
- Blocked by: #123
- Blocks: #125

## Notes
- open-questions.md — PSP choice still pending
```

---

## Mermaid dependency diagram (optional, 6+ tasks)

```mermaid
flowchart LR
  T1[discovery] --> T2[modeling]
  T2 --> T3[api]
  T3 --> T4[backend]
  T4 --> T5[web-spa]
```
