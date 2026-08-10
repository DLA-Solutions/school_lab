---
name: write-prd
description: Author Product, Layer, or Domain PRDs for School Lab following project conventions. Use when the user asks to write, draft, or update a PRD, product requirements, layer requirements (API, web SPA, mobile app), or domain requirements (communication, billing, identity, etc.).
---

# Write a PRD (Product · Layer · Domain)

School Lab has three PRD scopes. Detect which one the user needs before writing.

## 1. Pick the scope

| Scope | When | Primary output |
|-------|------|----------------|
| **Product** | MVP boundaries, vision, roadmap, cross-domain priorities | Anchor docs (`vision.md`, `product-map.md`, `actors-and-surfaces.md`) or `docs/prds/product.md` when a standalone artifact is needed |
| **Layer** | Requirements for one monorepo layer (`web/`, `frontend/app`, `mobile/`) | `docs/prds/layer-<layer>.md` |
| **Domain** | One business capability (communication, billing, identity, …) | `docs/prds/NNN-<domain>.md` |

**Decision cues**

- Mentions MVP, vision, roadmap, "the product", priorities across domains → **Product**
- Mentions API, Rails, React SPA, mobile app, jobs, stack, a specific folder (`web/`, `frontend/app`, `mobile/`) → **Layer**
- Mentions a business area (messages, boletos, enrollments, attendance, …) → **Domain**

When unclear, ask once: product, layer, or domain — and which layer/domain.

Derived fronts (e.g. `fintech-first`) are **Domain** PRDs with a positioning note (see `docs/prds/fintech-first.md` §10).

---

## 2. Shared prerequisites (all scopes)

1. Read anchor docs: `vision.md`, `actors-and-surfaces.md`, `product-map.md`, `web-stack.md`.
2. Read `docs/open-questions.md` — never invent answers; list unresolved items or flag them.
3. Write in **English**. Portuguese only for approved glossary exceptions (`docs/glossary.md`); gloss on first use.
4. API contracts: REST `/api/v1`, JWT, English identifiers (`school_id`, roles: backoffice/school/teacher/guardian).
5. LGPD: per-school isolation (`school_id`); per-family isolation for communication; mark sensitive data.

Process reference: `docs/guidelines/process/README.md`. Rule: `rules/docs/docs-and-prds`.

---

## 3. Product PRD workflow

Use when defining or revising **what the product is** and **what the MVP includes**.

### Output choice

| Situation | Action |
|-----------|--------|
| Updating validated product direction | Edit anchor docs in place; keep them consistent with each other |
| New standalone artifact (partner pitch, derived front, draft for review) | Create `docs/prds/product.md` or a named file (e.g. `fintech-first.md` pattern) |

### Steps

1. Confirm MVP in/out against `vision.md` §4 and `product-map.md` §5.
2. Map actors × channels using `actors-and-surfaces.md`.
3. List domain roadmap order (foundational → operational); Communication is the validated MVP priority.
4. Capture non-functional requirements (stability, LGPD, per-school isolation).
5. Record open decisions in `docs/open-questions.md`; link from the PRD.
6. Do **not** specify table-level schema here — defer to Domain PRDs + modeling.

### Section template

See [templates.md](templates.md) § Product PRD.

---

## 4. Layer PRD workflow

Use for **one monorepo layer** without duplicating business rules that belong in Domain PRDs.

| Layer | Folder | Owns |
|-------|--------|------|
| `web` | `web/` | `/api/v1`, service objects, models, jobs, OpenAPI (rswag) |
| `web-spa` | `frontend/app` | React SPA — backoffice, school, teacher, guardian web surfaces |
| `mobile` | `mobile/` | React Native — school, teacher, guardian mobile |

`frontend/base` is the upstream template the SPA started from — never the subject of a layer PRD.

### Steps

1. State the layer objective and which actors/surfaces it serves.
2. List responsibilities **in this layer only** — business rules stay in the API (`web/`); clients consume `/api/v1`.
3. Pull technical constraints from `web-stack.md` (auth, tokens, stack versions).
4. Define layer-specific acceptance criteria (e.g. refresh token storage, offline behavior, job reliability).
5. Reference Domain PRDs for feature scope; do not redefine BR-NNN rules.
6. Save as `docs/prds/layer-<layer>.md` (`layer-web.md`, `layer-web-spa.md`, `layer-app.md`). No layer PRD exists yet — these are output paths, not files to read.

### Section template

See [templates.md](templates.md) § Layer PRD.

---

## 5. Domain PRD workflow

Use for **one business domain** — the main path to implementation.

### Steps

1. Read `docs/prds/template.md` and mirror its section order exactly.
2. Pick the next number from `product-map.md` §5 (or reuse the domain's existing number).
3. Name file `docs/prds/NNN-<domain>.md` (e.g. `003-communication.md`).
4. Write all sections: Objective, Context, Business Rules (BR-NNN), Use Cases, API, Errors, Database, Events, Permissions, Acceptance Criteria, Out of Scope.
5. In **Database**, link to modeling artifacts when they exist — do not duplicate full table definitions:
   - Narrative DSL: `docs/modeling/NNN-<domain>.md`
   - Executable schema: `docs/database/database_dml.md`
   - DER: `docs/database/der_NNN.png`
6. After approval, modeling follows the `data-modeling` skill.

### Section template

See [templates.md](templates.md) § Domain PRD (matches `docs/prds/template.md`).

---

## 6. Cross-scope rules

- **One API, multiple channels** — domain business logic lives in `web/` services; layer PRDs must not fork rules.
- **No implementation without a Domain PRD** — Product and Layer PRDs set direction; code traces to Domain PRDs.
- **Suggested domain order** — `product-map.md` §5 (multi-tenancy → identity → students → **communication** → academic → billing → …).
- **Updates** — when a decision closes an open question, update the relevant anchor doc and check the box in `open-questions.md`.

---

## 7. Deliverable checklist

Copy and track:

```
PRD scope: [ ] Product  [ ] Layer  [ ] Domain
- [ ] Scope confirmed with user (layer/domain name if applicable)
- [ ] Anchor docs read; no contradictions introduced
- [ ] open-questions.md checked; unresolved items flagged
- [ ] English + glossary conventions followed
- [ ] LGPD / school_id isolation considered
- [ ] Correct output path chosen
- [ ] Domain PRD: all template sections present
- [ ] Layer PRD: no duplicate business rules from domain PRDs
- [ ] Product PRD: MVP in/out explicit; domain order aligned with product-map §5
```

---

## Additional resources

- Section templates per scope: [templates.md](templates.md)
- Example domain PRD (extended): `docs/prds/fintech-first.md`
- Modeling after domain PRD: `data-modeling` skill
