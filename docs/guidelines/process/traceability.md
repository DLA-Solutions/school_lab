# Traceability guidelines

How School Lab links product requirements to implementation artifacts.

## ID namespaces

| Prefix | Meaning | Example |
|--------|---------|---------|
| `BR-*` | Business rule | `BR-O07` invite token |
| `UC-*` | Use case | `UC-O04` invite accept |
| `AC-*` | Acceptance criterion | `AC-O001` self-serve school |
| `capability_id` | Canonical feature | `communication.send_message` |

Legacy `RN-*` must not appear in new PRDs.

## Capability traceability

1. Canonical inventory: [`capability-taxonomy.yaml`](../product/capability-taxonomy.yaml)
2. Raw catalog mapping: [`capability-aliases.jsonl`](../ref/capability-aliases.jsonl) — **100% complete**
3. School Lab decisions: [`capability-map.md`](../product/capability-map.md)
4. MVP subset: [`mvp-scope.md`](../product/mvp-scope.md)

Phase 1 taxonomy gate is **complete** — PRDs use canonical `domain.verb_noun` IDs.

## Document chain

```
vision / actors / product-map
  → domain PRD (docs/prds/)
  → modeling (docs/modeling/NNN-*.md)
  → DBML (docs/database/schema.dbml)
  → API narrative (docs/api/v1/*.md)
  → rswag spec → OpenAPI
  → web/ implementation
```

## PRD metadata

Domain `index.md` header must include:

- Status (`validated` before modeling gate)
- Modeling + API links when exist
- Competitive grounding table with `docs/ref/` evidence

## When decisions close open questions

1. Record in [`open-questions.md`](../open-questions.md) with `[x]` and rationale.
2. Update anchor doc if cross-cutting (`actors-and-surfaces.md`, `vision.md`).
3. Update affected PRD BR/UC/AC in same change set.

## Review checklist

- [ ] New BR/UC/AC IDs unique within domain file
- [ ] Grounded AC cites `docs/ref/` or `[product decision]`
- [ ] Database section links modeling + DBML — no inline full schema
- [ ] API section links narrative doc
- [ ] `domain-roadmap.md` and `prds/index.md` status aligned

## Related

- [`docs/product/traceability.md`](../product/traceability.md)
- [`docs/quality/acceptance-harness.md`](../quality/acceptance-harness.md)
