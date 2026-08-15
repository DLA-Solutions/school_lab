# Project sources for elicitation

Read these **before** asking the user questions already answered in docs.

| Source | Use for |
|--------|---------|
| `docs/prds/<domain>/` or `docs/prds/<domain>.md` | Parent scope, BRs, out-of-scope already decided |
| `docs/prds/<domain>/<other-slice>.md` | Consistency with sibling features |
| [`docs/actors-and-surfaces.md`](../../../docs/actors-and-surfaces.md) | Actor + surface + channel |
| [`docs/glossary.md`](../../../docs/glossary.md) | Approved Portuguese domain terms (UI only) |
| [`docs/open-questions.md`](../../../docs/open-questions.md) | Blockers — stop if feature depends on unresolved decision |
| `docs/api/v1/*.md` | Observable HTTP outcomes for API features |
| [`docs/product-map.md`](../../../docs/product-map.md) | Domain boundaries, work sequence |
| `docs/modeling/*.md` | Entity names, tenancy rules (read-only context) |

## What not to re-litigate

If the parent domain PRD already states:

- A business rule (BR-xxx)
- An out-of-scope item
- A permission model decision

→ Reference it in the slice Requirements table. Do not ask the user again unless the slice **explicitly extends** the domain PRD.

## open-questions.md gate

Before phase 1, search `open-questions.md` for keywords related to the feature.

If an **unresolved** question blocks the feature (e.g. retention policy for messages, billing gateway behavior):

1. Stop elicitation
2. Quote the open question to the user
3. Offer: resolve in `open-questions.md` first, or scope the slice to avoid the blocked area

## API contract alignment

When the feature maps to an existing API narrative:

- Use exact route names, status codes, and error codes from `docs/api/v1/`
- Cite the narrative file in AC anchors when behavior is documented
- If API doc is missing, flag as `[invented]` and note in slice metadata
