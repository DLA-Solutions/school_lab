---
name: context-to-tasks
description: Decompose a PRD, modeling doc, API narrative, or any work context into ordered, actionable tasks for School Lab. Use when the user asks to break down a PRD into tasks, plan work from requirements, create a task list, or turn context into backlog items.
---

# Context → Tasks

Turn a PRD or any work context into **ordered, atomic tasks** ready for execution or GitHub backlog.

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

Order tasks by dependency. Default sequence from `docs/product-map.md` §4:

```
discovery → docs → modeling → api → backend → jobs → web-ui → app → chore
```

| Phase | Task types | Examples |
|-------|------------|----------|
| `discovery` | Open questions, spikes, partner validation | "Decide PSP for billing webhook" |
| `docs` | PRD gaps, anchor updates, API narrative | "Draft acceptance criteria for BR-012" |
| `modeling` | Narrative DSL, DBML, DER export | "Add `messages` tables to database_dml.md" |
| `api` | Route map, rswag, error codes | "Document POST /schools/:id/messages" |
| `backend` | Migration, model, service, policy, controller | "Implement Messages::Create service" |
| `jobs` | ActiveJob, idempotency, scheduling | "Process PSP webhook events job" |
| `web-ui` | React surfaces, auth, i18n | "Guardian message thread view" |
| `app` | React Native screens, push | "Teacher message list screen" |
| `chore` | CI, tooling, non-feature | "Add rswag CI step" |

**Rules**

- Do not bundle modeling + implementation in one task.
- One service use case ≈ one backend task (matches design principles).
- Separate policy, service, controller, and specs when the slice is non-trivial.
- Client tasks (`web-ui`, `app`) depend on API contract existing.
- Tasks blocked by `docs/open-questions.md` must say so — do not invent decisions.

---

## 3. Workflow

Copy and track:

```
- [ ] 1. Read source context (PRD, modeling, API, or user input)
- [ ] 2. List open questions / blockers from source + open-questions.md
- [ ] 3. Pick decomposition mode (see §4)
- [ ] 4. Draft tasks with dependencies and acceptance criteria
- [ ] 5. Order tasks (topological sort)
- [ ] 6. Present summary table + full task list
- [ ] 7. (Optional) Create GitHub issues — use create-github-issue skill
```

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

### Step 4–5 — Draft and order

Use the task template in [templates.md](templates.md). Assign stable IDs (`T1`, `T2`, …). Sort so dependencies come first.

### Step 6 — Present

Return:

1. **Summary** — task count by phase, blockers, suggested first PR scope
2. **Dependency overview** — short list or mermaid if >5 tasks
3. **Full task list** — each task with acceptance criteria
4. **Suggested branch prefix** — per `branch-naming` skill (`feature/`, `docs/`, etc.)

### Step 7 — GitHub (optional)

Only when the user asks to create issues/backlog items:

1. Group related atomic tasks into issues (one issue ≈ one PR-sized unit).
2. Follow `create-github-issue` skill for each issue.
3. Link source PRD section and dependent issue numbers in the body.

Do not auto-create issues without explicit user request.

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
| Acceptance Criteria | Copy into task acceptance criteria verbatim where possible |
| Out of Scope | Do **not** create tasks; mention exclusion if user asks for full domain |

---

## 5. Sizing guidelines

| Size | Guidance |
|------|----------|
| **Too large** | "Implement billing module" → split by entity group or use case |
| **Right** | "Add charges table migration + Charge model" or "Implement Billing::CreateCharge service" |
| **Too small** | "Add column to schema comment" → merge into parent migration task |

Each task should be completable in one focused PR where possible.

---

## 6. Conventions

- Task titles: imperative, English, concise (same as GitHub issues).
- Reference sources: `docs/prds/fintech-first.md` §6.2, `BR-004`, `UC: Create user`.
- LGPD: add review note on tasks touching messages, health, children, or family data.
- Do not resolve `open-questions.md` inside tasks — link and block.

---

## Additional resources

- Task output template: [templates.md](templates.md)
- Create backlog issues: `create-github-issue` skill
- Write missing PRD first: `write-prd` skill
- Branch names: `branch-naming` skill
