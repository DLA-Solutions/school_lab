---
name: context-to-tasks
description: Decompose a PRD, modeling doc, API narrative, or any work context into detailed, ordered tasks with Gherkin (Given/When/Then) acceptance criteria for School Lab. Use when the user asks to break down a PRD into tasks, plan work from requirements, create a task list, or turn context into backlog items.
---

# Context → Tasks

Turn a PRD or any work context into **ordered, atomic tasks** with **precise Gherkin acceptance criteria** (Given / When / Then), ready for execution or GitHub backlog.

**Quality bar:** every task must be verifiable from its scenarios alone. Vague checklists are not acceptable.

## 1. Detect input

| Input type | Typical source | Decomposition focus |
|------------|----------------|---------------------|
| **Product / Layer PRD** | `docs/prds/product.md`, `layer-*.md`, anchor docs | Domain sequencing, discovery tasks, cross-cutting setup |
| **Domain PRD** | `docs/prds/NNN-<domain>.md` | BR/use cases → modeling → API → implementation |
| **Modeling** | `docs/modeling/`, `docs/database/` | Migrations, models, align narrative ↔ DBML |
| **API narrative** | `docs/api/v1/*.md` | Routes, rswag, request specs |
| **Conversation / ad-hoc** | User message, bug report, spike | Infer phase; flag missing PRD if implementing a domain |
| **Implementation slice** | "Implement X from PRD Y" | Backend → tests → client (if in scope) |

Read the source fully before decomposing. Link every task back to its source section.

---

## 2. Task phases (follow repo flow)

Order tasks by dependency. Default sequence, refining the work flow in `docs/product-map.md` §4
(anchors → PRDs → modeling → implementation) into task-level phases:

```
discovery → docs → modeling → api → backend → jobs → web-spa → app → chore
```

| Phase | Task types | Examples |
|-------|------------|----------|
| `discovery` | Open questions, spikes, partner validation | "Decide PSP for billing webhook" |
| `docs` | PRD gaps, anchor updates, API narrative | "Draft acceptance criteria for BR-012" |
| `modeling` | Narrative DSL, DBML, DER export | "Add `messages` tables to database_dml.md" |
| `api` | Route map, rswag, error codes | "Document POST /schools/:id/messages" |
| `backend` | Migration, model, service, policy, controller | "Implement Messages::Create service" |
| `jobs` | ActiveJob, idempotency, scheduling | "Process PSP webhook events job" |
| `web-spa` | React surfaces in `frontend/main`, auth, i18n | "Guardian message thread view" |
| `app` | React Native screens, push | "Teacher message list screen" |
| `chore` | CI, tooling, non-feature | "Add rswag CI step" |

**Rules**

- Do not bundle modeling + implementation in one task.
- One service use case ≈ one backend task (matches design principles).
- Separate policy, service, controller, and specs when the slice is non-trivial.
- Client tasks (`web-spa`, `app`) depend on API contract existing.
- Tasks blocked by `docs/open-questions.md` must say so — do not invent decisions.

---

## 3. Workflow

Copy and track:

```
- [ ] 1. Read source context (PRD, modeling, API, or user input)
- [ ] 2. List open questions / blockers from source + open-questions.md
- [ ] 3. Pick decomposition mode (see §4)
- [ ] 4. Clarify gaps — ask user before drafting (see §3.1)
- [ ] 5. Draft tasks with Gherkin acceptance criteria (see gherkin.md)
- [ ] 6. Run quality gate on every task (see §3.2)
- [ ] 7. Order tasks (topological sort)
- [ ] 8. Present summary + full task list for user review
- [ ] 9. (Optional) Create GitHub issues — only after user approves; use create-github-issue skill
```

### 3.1 — Clarify before drafting (mandatory when gaps exist)

**Stop and ask the user** (use `AskQuestion` when available) when any of these are unknown:

| Gap | Example question |
|-----|------------------|
| Actor / role unclear | Which role performs this action — school admin, teacher, or guardian? |
| Scope boundary | Is this MVP or phase 2? In scope per PRD Out of Scope? |
| Error behavior undefined | What HTTP status and error code for duplicate email — 409 or 422? |
| Tenant isolation edge case | Should a teacher see charges, or only school admin? |
| Open question gates behavior | PSP not chosen — spike first or assume a fake gateway? |
| Client surface | web SPA, app, or API-only for this slice? |
| Data preconditions missing | What constitutes an "active contract" — status enum value? |

If the source PRD already answers the question, do not ask — cite the section instead.

When context is sufficient, state assumptions explicitly in the task **Description** and proceed.

### 3.2 — Acceptance criteria quality gate

Before presenting or creating issues, every task must pass:

- [ ] At least one Gherkin scenario per task (more for `backend` / `api` — see [gherkin.md](gherkin.md))
- [ ] **Given** names actor, school/tenant context, and data state
- [ ] **When** describes a single action
- [ ] **Then** asserts observable outcomes (HTTP status, persisted state, side effects)
- [ ] Negative / authorization scenario included when roles or `school_id` apply
- [ ] Scenarios trace to source (`BR-NNN`, PRD §, use case name)
- [ ] No speculative scenarios for unresolved `open-questions.md` items

Full rules and examples: [gherkin.md](gherkin.md).

### Step 1 — Read source

Minimum reads by input:

- Domain PRD → PRD + `open-questions.md` + existing modeling/API for that domain
- Product/Layer PRD → PRD + `product-map.md` §5 for domain order
- Ad-hoc → relevant anchor docs; flag if domain lacks PRD

### Step 2 — Blockers

Extract unresolved items. Mark tasks as **blocked** when they need a decision first. Create explicit `discovery` tasks for open questions that gate implementation.

### Step 3 — Decomposition mode

| Mode | When | Granularity |
|------|------|-------------|
| **Roadmap** | Product PRD, multi-domain | Epics per domain + discovery tasks |
| **Domain plan** | Single domain PRD, pre-implementation | Full pipeline: modeling → api → backend → clients |
| **Slice** | User names one feature/use case | Minimal path for that slice only |
| **Incremental** | Modeling or API already exists | Only missing phases |

Default to **Domain plan** for domain PRDs; **Roadmap** for product scope.

### Step 4 — Draft tasks

Use the task template in [templates.md](templates.md). Assign stable IDs (`T1`, `T2`, …). Write **Acceptance criteria** as Gherkin scenarios, not bullet fragments.

### Step 5 — Quality gate

Apply §3.2 to each task. Rewrite any criterion that fails before presenting.

### Step 6 — Order

Topological sort so dependencies come first.

### Step 7 — Present for review

Return:

1. **Assumptions** — decisions made when source was silent (or list questions asked)
2. **Summary** — task count by phase, blockers, suggested first PR scope
3. **Dependency overview** — short list or mermaid if >5 tasks
4. **Full task list** — each task with Gherkin scenarios
5. **Suggested branch prefix** — per `branch-naming` skill (`feature/`, `docs/`, etc.)

Ask the user to confirm or adjust before creating GitHub issues.

### Step 8 — GitHub (optional)

Only when the user **explicitly approves** the task list and asks to create issues:

1. Group related atomic tasks into issues (one issue ≈ one PR-sized unit).
2. Copy Gherkin scenarios into each issue body — do not summarize away detail.
3. Follow `create-github-issue` skill for each issue.
4. Link source PRD section and dependent issue numbers in the body.

Never auto-create issues without user approval of the drafted tasks.

---

## 4. Mapping PRD sections → tasks

| PRD section | Typical tasks |
|-------------|---------------|
| Open items / §9 | `discovery` tasks (one per decision if it gates work) |
| Business Rules (BR-NNN) | Traceability in backend task descriptions; group related BRs per service |
| Use Cases | One or more tasks per use case (service + policy + API + spec) |
| API | `api` task (narrative/rswag) then `backend` tasks per endpoint group |
| Database | `modeling` tasks before any migration |
| Events | `backend` + `jobs` tasks (publisher/consumer) |
| Permissions | `backend` Pundit policy tasks alongside services |
| Acceptance Criteria | Translate each into one or more Gherkin scenarios; add missing negative/isolation cases |
| Out of Scope | Do **not** create tasks; mention exclusion if user asks for full domain |

---

## 5. Sizing guidelines

| Size | Guidance |
|------|----------|
| **Too large** | "Implement billing module" → split by entity group or use case |
| **Right** | "Add charges table migration + Charge model" or "Implement Billing::CreateChargeService" |
| **Too small** | "Add column to schema comment" → merge into parent migration task |

Each task should be completable in one focused PR where possible.

---

## 6. Conventions

- Task titles: imperative, English, concise (same as GitHub issues).
- Descriptions: 2–4 sentences — what, why, boundaries, assumptions.
- Acceptance criteria: **Gherkin only** — see [gherkin.md](gherkin.md).
- Reference sources: `docs/prds/fintech-first.md` §6.2, `BR-004`, `UC: Create user`.
- LGPD: add a scenario or **And** clause for family/school isolation when data is sensitive.
- Do not resolve `open-questions.md` inside tasks — link, block, or ask first.

---

## Additional resources

- Gherkin rules and examples: [gherkin.md](gherkin.md)
- Task output template: [templates.md](templates.md)
- Create backlog issues: `create-github-issue` skill
- Write missing PRD first: `write-prd` skill
- Branch names: `branch-naming` skill
