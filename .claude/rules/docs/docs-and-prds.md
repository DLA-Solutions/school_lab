> Documentation and PRD authoring conventions
>
> **Relevant when touching:** `docs/**`

# docs/ — Anchor Docs & PRDs

- Entry point: `docs/README.md` (layers A–I). Anchor docs (`vision.md`, `actors-and-surfaces.md`, `product-map.md`, `web-stack.md`) are the source of truth. Keep them consistent with each other and with `docs/product/` (traceability, domain roadmap).
- Structural decisions: `docs/adr/` (see `docs/adr/README.md`).
- New domain requirements become PRDs in `docs/prds/`, following `docs/prds/template.md` (competitive grounding, traceability IDs, Objective, Context, Business Rules, Use Cases, API, Errors, Database, Events, Permissions, Acceptance Criteria, Out of Scope). Inventory: `docs/prds/index.md`.
- Write PRDs in **English**. Use Portuguese only for approved domain exceptions; gloss them on first use (see `docs/glossary.md`).
- Suggested PRD order is in `product-map.md` §5. Communication is the MVP priority.
- Unresolved decisions go to `docs/open-questions.md`; when a decision is made, record it in the relevant anchor doc and check the box.
- Detailed process guidance (how to write a PRD, how modeling flows) lives in `docs/guidelines/process/`.
