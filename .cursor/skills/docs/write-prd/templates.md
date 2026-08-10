# PRD Templates by Scope

Read only the section matching the chosen scope.

---

## Product PRD

Use for whole-product or MVP-scope documents. Prefer updating anchor docs when changing validated direction; use a standalone file for drafts or partner-specific fronts.

```markdown
# PRD — [Product name / initiative]

> Status: [draft | validated]
> Relation to School Lab: [core MVP | derived front | experiment]

## 1. Context and motivation
[Problem, audience, why now. Link to vision.md pain points.]

## 2. Objective (north star)
[One measurable outcome.]

## 3. Target audience
[Primary customer, user roles, segments.]

## 4. MVP scope

### In scope
- [Capability or domain group]

### Out of scope
- [Explicit exclusions with phase hint]

## 5. Actors and surfaces
[Summary table or bullets — detail lives in actors-and-surfaces.md.]

## 6. Domain roadmap
[Ordered list of domains to mature; align with product-map.md §5.]

## 7. Non-functional requirements
[Stability, LGPD, isolation, observability.]

## 8. Open items / pending decisions
[Link to docs/open-questions.md; use checkboxes.]

## 9. Positioning note (if derived front)
[How this relates to the validated MVP order — see fintech-first.md §10.]
```

**Anchor doc mapping** (when editing in place instead of a new file):

| Section | Anchor doc |
|---------|------------|
| Vision, problem, value prop | `docs/vision.md` |
| Monorepo layout, domain order | `docs/product-map.md` |
| Actors × channels | `docs/actors-and-surfaces.md` |

---

## Layer PRD

Use for `web/`, `frontend/app`, or `mobile/` — technical and surface requirements without redefining domain business rules.

```markdown
# Layer PRD — [web | web-spa | app]

> Status: [draft | validated]
> Stack reference: `docs/web-stack.md`

## Objective
[What this layer must achieve for the product.]

## Context
[Which actors/surfaces; which Domain PRDs this layer implements.]

## Responsibilities
[What this layer owns — be explicit about boundaries.]

### In scope (this layer)
- [...]

### Out of scope (delegated elsewhere)
- Business rules → Domain PRDs + `web/` services
- [...]

## Dependencies
| Depends on | For |
|------------|-----|
| Domain PRD `NNN-<domain>` | [feature scope] |
| `web/` API | [endpoints consumed] |
| `docs/api/v1/` | [route narratives] |

## Technical constraints
[From web-stack.md: auth, tokens, frameworks, deployment.]

## Interfaces

### API consumption (web-spa / app only)
[Auth flow, error handling, pagination, i18n locale pt-BR.]

### API provision (web only)
[OpenAPI/rswag, versioning, service object pattern.]

## Non-functional requirements
[Performance, reliability, security, observability for this layer.]

## Acceptance criteria
- [ ] [Testable outcome]

## Out of scope
[Future phases, other layers.]
```

**Layer-specific reminders**

| Layer | Key acceptance themes |
|-------|----------------------|
| `web` | Service-per-use-case, Pundit policies, `school_id` scoping, job idempotency, rswag coverage |
| `web-spa` | Role-based routes, refresh token in httpOnly cookie, pt-BR UI via i18n keys |
| `app` | Secure token storage, push notifications, offline-tolerant reads where applicable |

---

## Domain PRD

Follow `docs/prds/template.md` section order exactly.

```markdown
# PRD-NNN — [Domain name]

## Objective
[Single clear goal.]

## Context
[Prerequisites, related domains, existing system state.]

## Business Rules

BR-001
[Rule statement.]

BR-002
[...]

## Use Cases

### [Use case name]

Input
- [field]

Flow
1. [Step]

## API

### [METHOD] /api/v1/[path]

Request
{ ... }

Response [status]
{ ... }

## Errors

[status code]
[Description.]

## Database

[Entity groups only — link to modeling artifacts.]

| Artifact | Location |
|----------|----------|
| Narrative DSL | `docs/modeling/NNN-<domain>.md` |
| DBML | `docs/database/database_dml.md` |
| DER | `docs/database/der_NNN.png` |

## Events

[Domain events emitted/consumed.]

## Permissions

[Role × action matrix; Pundit policy notes.]

## Acceptance Criteria

- [ ] [Testable criterion]

## Out of Scope

- [Explicit exclusion]
```

**Naming**: `docs/prds/NNN-<domain>.md` where `NNN` matches `product-map.md` §5 order and mirrors `docs/modeling/NNN-<domain>.md`.
