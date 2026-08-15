# PRD-NNN — [Domain name]

> Status: [draft | validated | implemented]  
> **`validated`** = documentation-phase sign-off (anchor alignment + corpus grounding). A live
> partner workshop is a separate milestone and does not block this status.  
> Relation to School Lab: [core MVP domain #N per product-map §5 | derived front | layer]  
> Capability IDs: [canonical `domain.verb_noun` and/or raw catalog refs — see Competitive grounding]  
> Modeling: [`docs/modeling/NNN-<domain>.md`](../modeling/NNN-<domain>.md) *(when exists)*  
> API: [`docs/api/v1/<domain>.md`](../api/v1/<domain>.md) *(when exists)*

---

## Objective

[Single clear goal.]

---

## Context

[Prerequisites, related domains, existing system state. Link anchor docs and upstream PRDs.]

---

## Competitive grounding

When requirements are informed by observed competitor behavior, cite evidence here.
See [`docs/product/traceability.md`](../product/traceability.md) and [`docs/ref/`](../ref/README.md).

| Capability | ID | Evidence |
|------------|-----|----------|
| [Short label] | `domain.verb_noun` *(canonical, Phase 1)* or `raw:<competitor>:<raw_id>` | [`docs/ref/...`](../ref/) |

Requirements with no market anchor: mark acceptance criteria `[product decision]` or `[invented]`.

---

## Actors and surfaces

| Actor | Surfaces | Notes |
|-------|----------|-------|
| [staff / teacher / guardian / student / backoffice] | [web SPA / mobile / API] | [Primary actions in this domain] |

Detail: [`docs/actors-and-surfaces.md`](../actors-and-surfaces.md). For multi-doc domains,
use a stakeholder → role template table (see [`identity-and-onboarding/index.md`](identity-and-onboarding/index.md) §6).

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | [yes / no / partial] | Early childhood |
| `fundamental_medio` | [yes / no / partial] | Elementary and high school |
| `pj_financeiro` | [yes / no / partial] | CNPJ as payer |
| `multi_unidade` | [yes / no / partial] | Multi-campus groups |

Omit rows that do not apply. Flag open segment decisions in [`open-questions.md`](../open-questions.md).

---

## Business Rules

Use **`BR-NNN`** (not `RN-NNN`). Reference `capability_id` when grounded in market.

BR-001

[Rule statement.]

BR-002

[...]

---

## Use Cases

Use **`UC-NNN`**. Optional `capability_id` reference per use case.

### UC-001 — [Use case name]

Input

- [field]

Flow

1. [Step]

---

## API

### [METHOD] /api/v1/[path]

Request

```json
{ }
```

Response [status]

```json
{ }
```

---

## Errors

| Status | Code / condition | Description |
|--------|------------------|-------------|
| 400 | | Invalid data |
| 409 | | Conflict |

---

## Database

Entity groups only — **do not** duplicate full table definitions inline.

| Artifact | Location |
|----------|----------|
| Narrative DSL | `docs/modeling/NNN-<domain>.md` |
| DBML | `docs/database/database_dml.md` |
| DER | `docs/database/der_NNN.png` |

When modeling does not exist yet, list expected entity groups in prose and link when available.

---

## Events

[Domain events emitted or consumed.]

---

## Permissions

[Role × action matrix; Pundit policy notes; permission keys when using identity templates.]

---

## Non-functional requirements

Cross-cutting NFR catalog: [`docs/product/non-functional-requirements.md`](../product/non-functional-requirements.md).

Domain-specific NFRs (stability, LGPD, isolation, auditing):

- [Bullet — e.g. per-school `school_id` scoping on all queries]
- [Bullet — e.g. per-family isolation for guardian routes]

---

## Acceptance Criteria

Use **`AC-NNN`**. Optional Gherkin. Cite `docs/ref/` path when corpus-grounded.

AC-001

- [ ] Given … When … Then …
- Source: [`docs/ref/...`](../ref/) or `[invented]`

---

## Open items / pending decisions

- [ ] [Link to `docs/open-questions.md`](../open-questions.md) § …]

---

## Out of Scope

- [Explicit exclusion with phase hint]

---

## Bounded-context variant

For large domains, replace single-file sections with a folder (`docs/prds/<domain>/`):

- `index.md` — objective, scope, waves, integration contract (see identity-and-onboarding).
- `permissions.md`, `onboarding.md`, … — BC-specific BR/UC/AC with prefixes if needed (`BR-P001`).

Layer PRDs use [`write-prd` templates](../../.cursor/skills/docs/write-prd/templates.md) § Layer PRD.
Product-wide scope updates prefer anchor docs or `index.md` in a domain folder.
