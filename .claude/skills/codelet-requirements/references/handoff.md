# Handoff to codelet-loop

After user approves the feature slice in phase 7.

## Step 1 — Write slice file

Path: `docs/prds/<domain>/<feature-slug>.md`

Use [`templates/feature-slice-template.md`](../templates/feature-slice-template.md).

Ensure:

- Domain metadata links to parent PRD
- Requirements table complete
- Bar section with Reference, Rationale, Recognizably bad
- Numbered English GWT acceptance criteria with corpus anchors
- Non-goals section

## Step 2 — Validate written file

```bash
python3 .claude/skills/codelet-loop/scripts/montar_prompt.py \
  --validate-only \
  --ac-file docs/prds/<domain>/<feature-slug>.md
```

Must exit 0. If fail, fix slice before handoff.

## Step 3 — Generate codelet-loop prompt

```bash
python3 .claude/skills/codelet-loop/scripts/montar_prompt.py \
  --sem-interacao \
  --domain "<domain>" \
  --feature "<Feature name>" \
  --ac-file docs/prds/<domain>/<feature-slug>.md
```

The script extracts Bar and non-goals from the slice file when flags are omitted.

Optional flags:

- `--output /tmp/codelet-prompt.md` — save prompt to file
- `--codelets` — pre-fill decomposition (usually left to codelet-loop phase 4)

## Step 4 — Start codelet-loop

1. Paste generated prompt into a **new** agent chat (clean orchestrator context)
2. Load or invoke `codelet-loop` skill
3. Orchestrator runs phases 4–7 (decomposition, critics, harness, consolidation)

## What not to do in handoff

- Do not start implementation in this skill
- Do not decompose codelets here (that's codelet-loop phase 4)
- Do not run critics or harness
- Do not modify the parent domain PRD unless user explicitly asked (`write-prd`)

## Optional — link from monolithic domain PRD

For `fintech-first.md` and similar monolithic PRDs, optionally add a line under a Features or Related slices section:

```markdown
- [Boleto resend](fintech-first/resend-boleto.md) — feature slice (codelet contract)
```

Not required in v1; slice metadata link to parent is sufficient.
