# The six fixed questions

Question 0 is implicit (feature name). Questions 1–5 map to the Requirements table in the feature slice.

## 0. Feature name

**What it captures:** A short, implementable unit within a domain — one codelet-loop run.

**Good:** "Boleto resend", "Invite accept", "Daily attendance"

**Bad:** "Billing" (too broad — that's a domain, not a slice)

---

## 1. Actor

**What it captures:** Who performs the action or receives the outcome, in what role, on which surface/channel.

**Sources:** [`docs/actors-and-surfaces.md`](../../../docs/actors-and-surfaces.md), parent domain PRD permissions section.

**Good:** "School admin (staff billing template), school SPA `/app`, permission `billing.resend`"

**Bad:** "The user."

---

## 2. Trigger and precondition

**What it captures:** What must be true before the action starts, and what event triggers it.

**Good:** "Boleto `pending`, due within 7 days; user clicks 'Reenviar cobrança'"

**Bad:** "When resend is needed."

---

## 3. Observable outcome

**What it captures:** What changes in a checkable way — HTTP response, DB field, push notification, UI state — **without** asking the builder.

**Good:** "HTTP 200, `resent_at` set, guardian push within 30s"

**Bad:** "It works correctly."

---

## 4. Adversarial cases that matter

**What it captures:** Not all edge cases — only those worth covering in this delivery.

**Decision criteria:**

| Signal | Include? |
|--------|----------|
| Cross-school / cross-family data leak | Always |
| Irreversible or financial operation | Usually |
| External dependency (gateway, webhook) | When integration exists |
| LGPD / sensitive data | When feature touches it |
| Cosmetic / label typo | Rarely |

**Good:** "Gateway 503; boleto already paid; cross-school access attempt"

**Bad:** "Handle all errors."

---

## 5. Non-goals

**What it captures:** What is **explicitly out of scope** for this delivery.

**Good:** "No resend history in UI; no email template changes; no batch resend"

**Bad:** (omit — implicit scope becomes infinite)

---

## Economy rule

| Situation | Behavior |
|-----------|----------|
| User request answers all questions clearly | Short confirmation summary (5–10 lines), ask "confirm?" |
| One or more points vague | Ask **only** on vague points |
| Contradictory request | Point out contradiction, resolve before proceeding |

## Gap tags

During phase 1, tag each question:

- `clear` — answered with observable detail
- `partial` — direction given but missing observability or actor
- `missing` — not addressed
- `contradictory` — conflicts with user input or domain PRD

Only `partial`, `missing`, and `contradictory` trigger elicitation in phase 3.
