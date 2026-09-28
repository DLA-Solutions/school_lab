# Quality gate — AC validation

Before writing the feature slice, all draft ACs must pass the automated validator.

## Command

```bash
python3 .claude/skills/codelet-loop/scripts/montar_prompt.py \
  --validate-only --ac-file /tmp/draft-acs.txt
```

## Draft file format

Plain numbered list — GWT scenarios only:

```text
1. Given a pending boleto due tomorrow for school S, when the school admin with billing permission confirms resend, then the API returns 200, resent_at is set, and the guardian receives a push within 30 seconds.
2. Given a boleto with status paid, when the admin attempts resend, then the API returns 422 with code boleto_already_paid and no push is sent.
```

Do **not** include Requirements table, Bar, or anchor lines in the draft file — only scenarios for validation.

## What the validator checks

| Check | Failure action |
|-------|----------------|
| GWT grammar (`Given` / `when` / `then`) | Return to phase 3 — ask user to reformulate |
| Trigger words without measurable proxy | Return to phase 3 — name missing proxy |
| Vague outcomes ("works correctly") | Return to phase 3 — specify observable result |

Portuguese `Dado/Quando/Então` accepted for backward compatibility, but **new slices must use English GWT**.

## On failure

1. Show exact validator message to user
2. Point to the specific question (1–4) that caused the gap
3. **Never** silently rewrite the AC — user must confirm reformulation

## On success

Proceed to phase 6 (bar proposal) if not already confirmed, then phase 7 (human confirmation).

## Minimum AC set (API/auth features)

Per [gherkin.md](../../core/context-to-tasks/gherkin.md):

| Scenario | Required when |
|----------|---------------|
| Happy path | Always |
| Wrong role / unauthorized | API or UI with role guard |
| Wrong-school isolation | Tenant-scoped data |
| Validation error | Input validation exists |

Missing required scenario → flag in phase 1 gap analysis before validation.
