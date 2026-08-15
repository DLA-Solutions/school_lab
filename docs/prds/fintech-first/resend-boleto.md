# Feature slice — Boleto resend

> Domain: [fintech-first](../fintech-first.md)
> Status: absorbed — requirements in [`billing/boletos.md`](../billing/boletos.md); API in [`billing.md`](../../api/v1/billing.md)
> Corpus area: gestao-financeira

## Requirements

| Field | Answer |
|-------|--------|
| Actor | School admin (staff billing template), school SPA `/app`, permission `billing.resend` |
| Trigger and precondition | Boleto `pending`, due within 7 days; user clicks "Reenviar cobrança" |
| Observable outcome | HTTP 200, `resent_at` set, guardian push within 30s |
| Adversarial cases | Gateway 503; boleto already paid; cross-school access |
| Non-goals | (see section below) |

## Bar

**Reference:** docs/ref/proesc/gestao-financeira/fluxos.md#resend
**Rationale:** Closest documented finance flow in corpus.
**Recognizably bad:** no

## Acceptance criteria

1. Given a pending boleto due tomorrow for school S, when the school admin with billing permission confirms resend, then the API returns 200, `resent_at` is set, and the guardian receives a push within 30 seconds.
   → docs/ref/proesc/gestao-financeira/fluxos.md#resend

2. Given a boleto with status `paid`, when the admin attempts resend, then the API returns 422 with code `boleto_already_paid` and no push is sent.
   → [invented]

3. Given school A with a pending boleto and school B with a different pending boleto, when a school A admin attempts to resend school B's boleto, then the API returns 403 and no push is sent.
   → [invented]

4. Given a pending boleto and the payment gateway returning 503, when the admin confirms resend, then the API returns 503, the boleto remains `pending`, and no push is sent.
   → [invented]

## Non-goals

- Resend history in UI this delivery
- Email template changes
- Batch resend
