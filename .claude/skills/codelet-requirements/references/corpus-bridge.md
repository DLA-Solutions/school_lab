# Corpus bridge — mining docs/ref/ for ACs and bar

When `docs/ref/` exists, use it to ground acceptance criteria in observed competitor behavior instead of inventing flows.

## Map domain → corpus functional area

| School Lab domain | Corpus folder(s) |
|-------------------|------------------|
| `fintech-first` (billing) | `*/gestao-financeira/` |
| `communication` (future) | `*/comunicacao/` |
| `academic` (future) | `*/gestao-academica/` |

Search across all competitors under `docs/ref/<competitor>/`.

## Files to read (in order)

1. **`fluxos.md`** — happy paths, step counts, actors → bar candidate + happy-path AC
2. **`casos-de-borda.md`** — edge cases → adversarial ACs (question 4)
3. **`modelo-de-dominio.md`** — entities, states, transitions → preconditions in Given clauses
4. **`divergencias.md`** — where competitors disagree → flag for user decision, not silent choice
5. **`glossario.md`** (per competitor or global) — vocabulary alignment (UI pt-BR context)

## Bar selection from corpus

1. Find the flow **closest** to the requested feature
2. Extract: step count, prerequisites, edge cases already documented
3. Propose: "Bar: `docs/ref/proesc/gestao-financeira/fluxos.md` §resend — closest documented finance flow"
4. User must confirm before writing slice

If no close match: fall back to [bar.md](../../codelet-loop/references/bar.md) fallback options (repo example, real product, metric).

## AC anchoring

Every acceptance criterion gets a trailing anchor line:

```markdown
1. Given ..., when ..., then ...
   → docs/ref/proesc/gestao-financeira/fluxos.md#resend
```

Or when no corpus support:

```markdown
2. Given ..., when ..., then ...
   → [invented]
```

`[invented]` is allowed — original product behavior is valid. High `[invented]` ratio early in a domain suggests shallow corpus extraction; mention to user but do not block.

## Strip anchors for validation

`montar_prompt.py --validate-only` strips `→` lines before GWT grammar check. Anchors are metadata, not part of the scenario text.

## Without corpus

Skip phase 2 corpus mining. Use:

- Parent domain PRD use cases
- `docs/api/v1/` narratives
- User knowledge for bar (phase 6)

Mark all ACs `[invented]` unless another project doc provides the anchor.
