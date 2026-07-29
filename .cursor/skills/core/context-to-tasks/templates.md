# Task Output Templates

## Single task

```markdown
### T[N]: [Imperative title]

| Field | Value |
|-------|-------|
| Phase | discovery \| docs \| modeling \| api \| backend \| jobs \| web-ui \| app \| chore |
| Depends on | T[x], T[y] or none |
| Blocked by | [open-questions.md item] or none |
| Source | [file §section / BR-NNN / use case name] |
| Suggested branch | feature/short-slug |

**Description**
[1–3 sentences: what and why]

**Acceptance criteria**
- [ ] [Testable outcome]
- [ ] [Testable outcome]
```

---

## Full decomposition output

Use this structure when presenting to the user:

```markdown
# Task plan — [Source name]

**Source:** [path or conversation summary]
**Mode:** roadmap | domain-plan | slice | incremental
**Blocked decisions:** [list or "none"]

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
[full task block]

### T2: ...
...
```

---

## Roadmap mode (product / multi-domain)

One epic-style task per domain, plus discovery:

```markdown
### T1: Write domain PRD — communication

| Field | Value |
|-------|-------|
| Phase | docs |
| Depends on | none |
| Source | product-map.md §5 item 5 |

**Description**
Author `docs/prds/005-communication.md` covering MVP messaging scope.

**Acceptance criteria**
- [ ] All template sections present per write-prd skill
- [ ] Open questions flagged, not invented
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
| 10 | web-ui / app surfaces (if in scope) |

---

## GitHub issue grouping

When creating issues from tasks, merge tasks that ship together:

| Grouping | Example issue title |
|----------|---------------------|
| One migration + models | `Add billing charges schema and models` |
| One service + policy + specs | `Implement Billing::CreateCharge service` |
| API doc + rswag for a wave | `Document and spec billing charges API (wave 1)` |

Issue body — link child acceptance criteria from merged tasks:

```markdown
## Context
Decomposed from `docs/prds/003-billing.md` (context-to-tasks T5–T7).

## Acceptance criteria
- [ ] (from T5)
- [ ] (from T6)
- [ ] (from T7)

## Tasks
- [ ] T5: ...
- [ ] T6: ...
- [ ] T7: ...

## Notes
- Depends on #123 (schema PR)
- Blocked: open-questions.md — PSP choice
```

---

## Mermaid dependency diagram (optional, 6+ tasks)

```mermaid
flowchart LR
  T1[discovery] --> T2[modeling]
  T2 --> T3[api]
  T3 --> T4[backend]
  T4 --> T5[web-ui]
```
