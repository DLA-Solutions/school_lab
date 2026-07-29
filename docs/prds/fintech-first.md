# PRD — Billing Module ("Fintech-first" Strategy for Schools)

> Status: draft for partner validation (early childhood school director)  
> Relation to School Lab: derived front, does not replace the MVP order validated in  
> `vision.md` (communication → academic → billing). See §10 for the explicit strategy discussion.

## 1. Context and motivation

The partner (director of an early childhood school, long-time friend) reports frequent
switches between school management systems, with the recurring pain point being
**billing** — specifically **boleto management**: manual or unreliable issuance,
manual reconciliation, no visibility into delinquency, and collection that depends on
human effort (phone calls, messages) instead of an automated process.

Unlike an "full ERP from day one" approach, this proposal is to launch as a
**fintech-like** product focused exclusively on recurring school billing, and only
later expand into academic management and communication — in that order.

## 2. Objective (north star)

Eliminate manual work and uncertainty in the school tuition billing flow: from charge
generation through payment confirmation, without secretarial intervention, with full
delinquency visibility for the director.

## 3. MVP target audience

- **Initial customer**: the validating partner's school (early childhood).
- **Expansion profile**: small/medium private schools, early childhood and elementary,
  with billing today that is manual or poorly served by the current system.
- **Direct users**: school administration (issuance and tracking) and financial
  guardians/parents (receipt and payment).

## 4. Problem to solve (detailed)

| Reported pain | Impact |
|---|---|
| Manual or unreliable boleto issuance | Billing delays, wrong amounts |
| No automatic reconciliation | Secretarial manual write-off, error-prone |
| No collection régua (dunning sequence) | Delinquency discovered late, informal inconsistent collection |
| No consolidated delinquency view | Director lacks expected monthly cash flow |
| Discounts and negotiations handled outside the system | No traceability, secretarial rework |

## 5. MVP scope

### In scope

- School, guardian, and student registration (minimal foundation — no academic module).
- **Identity**: user registration, guardian invites, guardian portal login (`users` +
  `memberships` + `guardians.user_id`; see §9).
- `student_guardians` link with support for multiple financial guardians per student
  (e.g. separated parents, split percentage).
- Billing plan registration (`billing_plans`): tuition, enrollment, one-off fees
  (material, events).
- Per-student contracts (`contracts`): negotiated amount, due day, term, applied
  discounts (e.g. sibling discount).
- Automatic recurring charge generation (`charges`) from active contracts.
- Boleto and Pix issuance via PSP integration (gateway choice open — see §9).
- Automatic reconciliation via PSP webhook (`webhook_events` → `payments`).
- Automated collection régua: reminder before due date, notice on due date, follow-up
  after delinquency — via email and/or WhatsApp.
- Configurable late fee/interest per school.
- Delinquency dashboard for the director: open, overdue, paid charges, monthly
  collection forecast.
- Simple guardian portal: view charges, boleto reissue, copy Pix code, payment history.
- **Documents (enrollment/KYC only)**: upload and review of enrollment and KYC
  documents via polymorphic `documents` — **not** the full digital archive (that domain
  is out of scope for this PRD).

### Out of scope (later phases)

- Academic management (grades, classes, attendance, lesson plans).
- Structured parent↔teacher↔school communication (messages, images).
- Full digital archive / student document repository.
- Livro Ata and digital signature.
- Receivables anticipation for the school (advanced fintech product — school receives
  early, platform assumes delinquency risk). Medium-term vision, not a requirement of
  this PRD.
- Dedicated mobile app — MVP can run 100% web/responsive.
- Multi-unit school network (`school_groups`) — schema already supports it, but
  product flow for multiple active units waits until a multi-unit client exists.

## 6. Main flows

### 6.1 Recurring charge generation

```
Active contract (due day defined)
  → Scheduled job generates monthly charge (billing period)
  → Applies current discount (if any)
  → Computes total_amount (original - discount)
  → Issues boleto/Pix with PSP
  → Sends notification to guardian (email/WhatsApp)
```

### 6.2 Payment reconciliation

```
Payment confirmed at PSP
  → PSP sends webhook
  → webhook_event recorded (raw, idempotent)
  → Job processes event asynchronously
  → Locates charge via psp_transaction_id
  → Creates/updates payment
  → Updates charge status (paid)
  → Notifies guardian (confirmation) and school (automatic write-off)
```

### 6.3 Collection régua (delinquency)

```
Charge due without confirmed payment
  → Daily job checks overdue charges
  → Applies configured late fee/interest
  → Sends reminders (D+1, D+3, D+7 — configurable)
  → Updates status (overdue)
  → Reflects on delinquency dashboard
```

## 7. Database (reference)

Foundational modeling for this PRD is **in progress** in this monorepo:

| Artifact | Location |
|----------|----------|
| Executable schema (DBML) | [`docs/database/database_dml.md`](../database/database_dml.md) |
| DER export (PNG) | [`docs/database/der_001.png`](../database/der_001.png) |
| Narrative DSL + LGPD notes | [`docs/modeling/001-fintech-first.md`](../modeling/001-fintech-first.md) |
| API auth lifecycle | [`docs/modeling/002-api-auth.md`](../modeling/002-api-auth.md) |
| API routes (v1) | [`docs/api/v1/fintech-first.md`](../api/v1/fintech-first.md) |

**Entities in scope:**

| Group | Tables |
|-------|--------|
| Identity | `users`, `memberships`, `refresh_tokens` |
| School | `school_groups`, `schools`, `guardians`, `students`, `teachers`, `student_guardians` |
| Billing | `billing_plans`, `contracts`, `charges`, `applied_discounts`, `payments`, `webhook_events` |
| Documents (enrollment/KYC) | `documents` |

Any modeling decision made in this PRD must be reflected back in the DBML before implementation.

## 8. Non-functional requirements

- **Billing reliability**: failure in charge generation or issuance must not go
  unnoticed — requires alerting/monitoring (same weight as `vision.md` stability
  principle: billing errors have legal/reputational impact).
- **Webhook idempotency**: duplicate or out-of-order PSP events must not create
  duplicate charges or incorrect write-offs.
- **Audit trail**: every change to `charges` and `payments` must be traceable
  (who/when), especially manual discounts applied by the secretarial staff.
- **LGPD**: guardian CPF, email, and phone are personal data; student `birth_date`
  is child data requiring guardian consent. Treatment and retention follow
  privacy-by-default from `vision.md`. Legal basis and retention policy for
  financial data are not yet validated with legal counsel — treat as open, not closed.

## 9. Open items / pending decisions

Items requiring a decision before or during implementation — not resolved by this PRD:

- [ ] PSP choice (Asaas, Iugu, Pagar.me, or other) — criteria: boleto + recurring Pix,
      split payment (useful for future networks), webhook quality, per-transaction cost.
- [ ] Collection régua channel: email, WhatsApp (official API or not), SMS — or
      combination, configurable per school.
- [ ] Late fee/interest rule: fixed percentage per school or configurable per billing plan?
- [ ] Manually negotiated discount flow (e.g. scholarship, one-off agreement): who
      approves, where recorded, affects contract or single charge only?
- [ ] Invoice issuance (NFS-e) — in MVP or later phase? (Not mentioned as initial pain
      by partner, but table stakes per `competitive-analysis.md`.)
- [x] **Guardian access — decided:** own account via Devise (`users` + `memberships` +
      `guardians.user_id`). Magic link / token per charge remains a possible future
      alternative, not the MVP approach.
- [ ] Platform billing model for the school (SaaS fee) — per active student, per school,
      percentage on processed volume?

## 10. Positioning note — relation to School Lab

This PRD proposes an **inverted** build order relative to what is validated in
`vision.md` / `open-questions.md` for School Lab (communication as priority #1,
validated with escola NSR in Jul 2026). That is intentional and specific to this
partner, whose primary explicit pain is billing.

Foundational modeling for this front has **already started** in this monorepo:
`docs/database/` (DBML + DER) and `docs/modeling/001-fintech-first.md`.

Two readings still to decide (see also `open-questions.md` — MVP and scope):

1. Treat as **separate products** with different customer profiles (School Lab for
   "communication as pain #1"; this billing module for "billing as pain #1").
2. Treat as **same codebase with two entry points** — in that case, this schema must
   eventually converge with School Lab foundational entities (`School`, `User`,
   `Membership`, `Student`, `StudentGuardian`) rather than duplicating parallel
   `schools` / `students` / `guardians` tables.

Explicitly decide this before implementation begins — it determines whether this PRD
spawns a new repository or a module within the School Lab monorepo.
