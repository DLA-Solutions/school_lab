# Product Map (Monorepo)

## 1. Structure

```
school_lab/
  web/     # web surfaces + API
  app/     # mobile apps
  docs/    # vision, anchors, PRDs, and guidelines
```

A monorepo by product/organization decision: a single context makes working with
AI agents easier and keeps web, app, and docs cohesive. The web-layer stack is
finalized in `docs/web-stack.md`; the mobile app stack is still an intention.

## 2. Responsibilities

### web/

- Web surfaces: backoffice, school area, teacher area, parent area.
- API serving both web and app (single source of business rules).
- (Future) landing / sales page — a dedicated folder or inside web.

### app/

- Mobile apps: school, teacher, parents.
- Consumes the same API; does not duplicate business rules.
- MVP: communication (messages with images), push notifications, boletos
  (Brazilian bank payment slips), and academic queries for parents; messages and
  attendance for teachers.

### docs/

- `vision.md` — vision and MVP.
- `actors-and-surfaces.md` — actors × channels.
- `product-map.md` — this document.
- `web-stack.md` — web-layer stack (Rails + Hotwire + API).
- `open-questions.md` — open questions.
- `competitive-analysis.md` — informational survey of competitor features (not a
  decision anchor).
- `prds/` — domain PRDs (later phase) + `template.md`.

## 3. Organization principles

- **One API, multiple channels**: business rules live in the API layer.
- **Per-school isolation**: one school's data never mixes with another's; it
  spans web and app (details in the modeling).
- **Docs guide implementation**: finalized anchors → PRDs → (later) modeling
  (DSL → ERD) → implementation.

## 4. Work sequence

1. Anchor documents updated with stakeholder validation (Jul 2026) — next step:
   domain PRDs.
2. Write domain PRDs (one per domain, using the template) — suggested order
   below.
3. Data modeling from the PRDs (DSL → ERD).
4. Implementation (`web/` with the stack defined in `web-stack.md`).

## 5. Requirement domains (PRD candidates)

Suggested order to mature — from foundational to operational. Priorities
adjusted after stakeholder validation (Jul 2026 — communication as the MVP
focus):

1. Product vision & scope — what is / isn't the MVP.
2. Multi-tenancy & schools — `escola_id`, isolation, school onboarding.
3. Identity & roles — school, teacher, parents, backoffice; registration and
   login.
4. Students & enrollments — registration, family–student–class link.
5. **Communication** — two-way messaging with images, push notifications.
6. Academic — classes, subjects, grades, report cards, attendance (reliability).
7. Billing — boletos, charges, payment status in the app.
8. Documents & digital archive — repository for auditing.
9. **Livro Ata (official minutes-record book), formal minutes & digital
   signature** — generation, signature collection, semantic search (phase 2,
   high priority).
10. Landing / sales — commercial page (later).
