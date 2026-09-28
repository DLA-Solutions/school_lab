---
name: codelet-requirements
description: >
  Runs structured requirements elicitation for Codelet Loop within a domain
  context: resolves docs/prds/<domain>/, drafts English Given/When/Then
  acceptance criteria anchored to docs/ref/, proposes a concrete bar, and
  writes docs/prds/<domain>/<feature-slug>.md. Use when preparing a codelet
  loop run, gathering acceptance criteria for a feature slice, or before
  "build with quality" without defined ACs.
disable-model-invocation: true
---

# Codelet Requirements

Structured requirements elicitation for Codelet Loop. **No code implementation** — elicitation and documentation only.

Output: `docs/prds/<domain>/<feature-slug>.md` (feature slice within a domain PRD).

Handoff: `montar_prompt.py --sem-interacao` → `codelet-loop`.

## The eight phases

### Phase 0 — Preflight (read-only)

Detect and report:

- **Domain** — list `docs/prds/` folders and top-level domain PRDs; map feature to domain ([`references/domain-resolution.md`](references/domain-resolution.md))
- **Parent domain PRD** — `index.md`, `<domain>.md`, or folder entry point
- **Existing slices** — avoid slug collisions in `docs/prds/<domain>/`
- `docs/ref/` — competitors/functional areas for corpus mining
- [`docs/actors-and-surfaces.md`](../../../docs/actors-and-surfaces.md), [`docs/glossary.md`](../../../docs/glossary.md), [`docs/open-questions.md`](../../../docs/open-questions.md)

**Gate:** if `open-questions.md` blocks the feature, stop and surface the blocker.

**Gate:** confirm domain with user when inference is not obvious (`AskQuestion`).

### Phase 1 — Gap analysis

Map user input against six questions (0–5). Tag each: `clear` | `partial` | `missing` | `contradictory`.

Questions: see [`references/questions.md`](references/questions.md).

Cross-check against parent domain PRD: non-goals and BRs already decided there should not be re-litigated unless the slice explicitly extends them.

Apply **economy rule**: if all clear, short confirmation summary instead of re-asking.

### Phase 2 — Corpus mining (when `docs/ref/` exists)

Per [`references/corpus-bridge.md`](references/corpus-bridge.md):

- Map domain to corpus functional area (e.g. billing → `gestao-financeira`)
- Search `fluxos.md`, `casos-de-borda.md`, `modelo-de-dominio.md`, `divergencias.md`
- Propose bar candidate; surface edge cases for question 4

Each AC gets `→ docs/ref/...` anchor or `[invented]` tag.

### Phase 3 — Targeted elicitation

Ask **only** gaps. Use `AskQuestion` for domain choice or bar candidates.

**Forbidden:** code, migrations, codelet decomposition.

### Phase 4 — AC synthesis

Derive from answers:

- 1 happy-path AC (questions 1–3)
- 1 AC per prioritized adversarial case (question 4)
- Minimum set per [gherkin.md](../core/context-to-tasks/gherkin.md) when API/auth: happy path + wrong role + wrong-school isolation + validation error (when applicable)

### Phase 5 — Quality gate

```bash
python3 .claude/skills/codelet-loop/scripts/montar_prompt.py \
  --validate-only --ac-file /tmp/draft-acs.txt
```

Write draft ACs to a temp file (numbered list, GWT only — no anchors needed for validation). On failure: return to specific question; never silently rewrite.

### Phase 6 — Bar proposal

Per [bar.md](../codelet-loop/references/bar.md). User confirmation required.

### Phase 7 — Human confirmation

Present: domain, feature name, slug, full path, requirements table, ACs, bar, non-goals.

Write file **only after** explicit approval.

### Phase 8 — Handoff

1. Write `docs/prds/<domain>/<feature-slug>.md` from [`templates/feature-slice-template.md`](templates/feature-slice-template.md)
2. Run:

```bash
python3 .claude/skills/codelet-loop/scripts/montar_prompt.py \
  --sem-interacao \
  --domain "<domain>" \
  --feature "<Feature name>" \
  --ac-file docs/prds/<domain>/<feature-slug>.md
```

(`--bar` optional if extracted from file.)

3. Paste prompt into new agent chat → `codelet-loop`.

## Scope boundaries

| In scope | Out of scope |
|----------|--------------|
| Domain resolution, elicitation, AC drafting, bar, feature slice file | Builder, codelets, critics, harness |
| Reading domain PRD/anchor docs as **input** | Writing or replacing full domain PRDs (`write-prd`) |
| Mining `docs/ref/` for flows/edge cases | Harvesting corpus (`corpus-concorrente`) |
| Updating validator + slice file writer | Backend/frontend implementation |

## Relationship to domain PRD

- **Domain PRD** = what the domain is, business rules, boundaries, high-level acceptance criteria
- **Feature slice** = execution contract for **one** codelet-loop run: Requirements table, Bar, GWT acceptance criteria, non-goals

The slice **links up** to the parent domain PRD. It does not replace it.

## Canonical path

```
docs/prds/<domain>/<feature-slug>.md
```

Slug rules: lowercase, hyphens, no accents. Collision check within `docs/prds/<domain>/` only.
