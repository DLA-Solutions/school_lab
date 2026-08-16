# Data Model — Fintech-first (001)

> **Historical baseline.** File name retained for traceability. Records the billing partner
> slice schema shipped in `web/`. For **new billing modeling** align with
> [`docs/prds/billing/`](../prds/billing/) and extend this narrative where tables overlap.
>
> PRD: [`docs/prds/fintech-first.md`](../prds/fintech-first.md)  
> Executable schema: [`docs/database/schema.dbml`](../database/schema.dbml) · DER: `der_001.png` *(pending manual dbdiagram export)*

Narrative DSL for the billing partner slice (historical "fintech-first" delivery). The authoritative schema for migrations is the DBML in `docs/database/`.

## Entity groups

### Identity

| Table | Role |
|-------|------|
| `users` | Devise account — email/password, confirmation, lock/unlock, platform-wide `status` |
| `memberships` | User ↔ school (or platform) with per-school `status` and Discard |
| `refresh_tokens` | Hashed refresh tokens for API JWT — web (httpOnly cookie) and mobile (secure storage); no Discard |
| `device_tokens` | FCM registration tokens per user and platform — Discard on logout/rotation |

Roles on `memberships.role`: `backoffice`, `staff` (migrated from `school`), `teacher`, `guardian`.  
Extended authorization (presets, permission keys, `staff_profiles`): see
[`003-identity-permissions.md`](003-identity-permissions.md).

Membership status flow: `invited` → `active` (also `suspended` per school).

User platform status: `active` | `disabled` (blocks all schools; distinct from per-school `suspended`).

### School domain

| Table | Role |
|-------|------|
| `school_groups` | Optional network/holding — schema ready, product flow deferred |
| `schools` | Tenant root; optional `school_group_id` |
| `guardians` | Financially responsible parties; `user_id` when portal account exists |
| `students` | Minimal student record for billing linkage |
| `teachers` | Migrated school-scoped teacher records used by current academic flows; not owned by this historical billing baseline |
| `student_guardians` | Many-to-many with `financial_percentage`, `primary_guardian` |

### Billing

| Table | Role |
|-------|------|
| `billing_plans` | Tuition, enrollment, fee templates per school |
| `billing_purposes` | School-owned purpose taxonomy and future-charge tax-declaration eligibility |
| `school_payment_providers` | Per-school provider credentials keyed by `instrument` (`bank_slip`) |
| `school_billing_settings` | Per-school billing policy — grace days, boleto service description, notification schedule (not provider credentials) |
| `contracts` | Per-student negotiated terms and due day |
| `charges` | Generated billing periods; links to payer `guardian`; captures immutable purpose/eligibility; caches latest invoice display fields |
| `charge_issuances` | One row per provider invoice attempt — idempotency key, slip URLs, immutable issuance history |
| `applied_discounts` | Discount lines on a charge |
| `payments` | Confirmed payments (boleto, Pix, card) — **no Discard** |
| `webhook_events` | Provider notifications recorded for idempotent processing — **no Discard**; `payload` is NULL for Cora, whose notification has no body |
| `tax_declaration_settings` | School legal wording/signatory approval gate |
| `tax_declarations` | One logical payer/school/calendar-year aggregate |
| `tax_declaration_versions` | Immutable calculation/identity/text/PDF versions |
| `tax_declaration_items` | Payment/charge/student/purpose traceability per version |
| `tax_declaration_access_events` | Append-only successful exact-version PDF download audit |

### Documents

| Table | Role |
|-------|------|
| `documents` | Polymorphic enrollment/KYC uploads — **not** the full digital archive |

`documentable_type`: `School`, `Guardian`, `Student` (Teacher deferred to academic phase).

## Annual tax declarations (billing BC8)

The declaration calculation is billing-owned. It selects immutable `payments` by `paid_at` in the
closed Gregorian calendar year and school timezone, joins only charges whose payer
`guardian_id` is the requesting guardian, and requires the charge's captured
`tax_declaration_eligible` flag. It never derives totals from `school_transactions`, due dates,
descriptions, or current purpose settings. Each included line declares settled principal after
discounts only: `payments.paid_amount_cents - payments.fine_amount_cents -
payments.interest_amount_cents`. Discounts are not added back; fine and interest never contribute.
This conservative amount rule remains subject to legal/accounting release approval.

`billing_purposes` supplies school-configurable future classification. New charges copy
`billing_purpose_code` and eligibility at creation, so later setting changes do not rewrite
history. Legacy charges without verified classification are excluded with an explicit error rather
than guessed. `tuition` and `enrollment` are provisional eligible seeds subject to legal/accounting
release approval.

One `tax_declarations` row is unique by `(school_id, guardian_id, calendar_year)`. Recalculation
uses a digest of payment facts, charge classification snapshots, and approved configuration:

- unchanged digest → return current version;
- changed digest after correction/config update → append `tax_declaration_versions.version + 1`,
  append line items, point the new row's `supersedes_id` at the prior version, and update aggregate
  `active_version_id`;
- no eligible payment → create nothing.

Version rows never store or mutate an active/superseded status. A version is active exactly when
its id equals aggregate `active_version_id`; all other rows under the aggregate are derived as
superseded. Generation failures are operational/audit outcomes and do not create failed versions.

Each version snapshots the approved settings/configuration version, legal-text version, exactly one
signatory, eligible-purpose configuration/digest, and approval actor/time. Item rows copy source
paid/fine/interest components and persist only their non-negative principal-after-discounts result
as declared value. Successful PDF delivery appends `tax_declaration_access_events` and emits
`TaxDeclarationPdfDownloaded` by request UUID without sensitive values in the event payload.

Each version snapshots school legal identity/CNPJ, payer name/CPF, legal text, exactly one
`document_signatory_id`,
per-student/per-purpose totals, source payment lines, issue time, verification code, and PDF
reference. Rows are append-only; fiscal/LGPD retention and guardian access to superseded versions
remain legal open items.

## Charge, issuance, and payment

Three layers keep business billing separate from provider invoice lifecycle:

| Layer | Table | Responsibility |
|-------|-------|----------------|
| Business charge | `charges` | Contract period, amounts (cents), due date, AASM status, financially responsible guardian |
| Provider invoice | `charge_issuances` | Idempotent issuance to the bank; stores `provider_invoice_id`, slip/Pix artifacts, issuance status |
| Settlement | `payments` | Immutable payment fact after reconciliation |

**Why issuance is not columns on `charges`:** reissue creates a new provider invoice without
 losing history; idempotent retry reuses the same `idempotency_key` on one issuance row;
 late webhooks about a cancelled invoice still resolve via `charge_issuances.provider_invoice_id`.
 `charges` caches the active invoice id and display URLs for guardian APIs — canonical
 history lives on `charge_issuances`.

**Why reconciliation reads instead of parsing:** the provider notification is only a
 trigger. `webhook_events` stores the event id (for idempotency) and the resource id;
 the job resolves `charge_issuances` from that resource id and then re-reads the invoice
 over mTLS (`fetch_invoice`). `observed_status` records what that authenticated read
 returned — it is the fact that drives `payments` and `charges.status`, never a status
 taken from the notification itself. Cora's notification has no body to parse.

**Provider configuration:** `school_payment_providers` is keyed by `(school_id, instrument)`
with a partial unique index on active rows. Each school selects a provider
 per payment instrument (MVP: `bank_slip` → Cora or `fake`); card will add rows with
 `instrument: card` without changing the bank slip port.

## Multi-tenancy (`school_id`)

Every billing and school-domain table carries `school_id` **directly**, even when a parent
FK (e.g. `contracts.student_id`, `charges.contract_id`) already places it within a school's
scope. This denormalization keeps tenant-scoped queries and policy scopes a single
`where(school_id: ...)` away, without joining through the parent chain.

Intentional exceptions (no direct `school_id`):

| Table | Reason |
|-------|--------|
| `users`, `refresh_tokens` | Cross-school by design — one login, N schools via `memberships`; JWT payload has no `school_id` (see [`002-api-auth.md`](002-api-auth.md)) |

`webhook_events` carries `school_id` (resolved from `school_payment_providers` via the
 webhook URL token) for tenant-scoped reconciliation queries. It is an ingress audit log,
 not a domain entity — listed under "Tables without Discard" below, not as a tenancy
 exception.

## Data lifecycle — access control vs soft delete vs purge

Three orthogonal mechanisms:

| Mechanism | Columns | Purpose | Reversible in UI? |
|-----------|---------|---------|-------------------|
| **Operational status** | `users.status`, `memberships.status` | Block login or school access without removing the record | Yes (reactivate) |
| **Soft delete (Discard)** | `discarded_at` (+ optional `discarded_by_id`) | Hide from default queries; preserve FKs and history | Yes (`undiscard`) |
| **Hard delete (job)** | — | LGPD/audit retention cleanup | No |

Lifecycle: `active` → (optional disable/suspend) → `discard` → [retention window] → physical `DELETE`.

### Discard gem convention

- Gem: [discard](https://github.com/jhawthorn/discard) — default column `discarded_at` (nullable timestamp).
- `kept`: `discarded_at IS NULL` — visible via `Model.kept` / default scope.
- `discarded`: set via `discard` — hidden from app queries; foreign keys and audit trail intact.
- Hard delete: background job (`CleanSoftDeletedRecordsJob` or equivalent on Solid Queue) removes rows where `discarded_at` is older than the entity retention window.

### Tables with `discarded_at`

All domain tables except ephemeral/audit ingress:

`school_groups`, `schools`, `users`, `memberships`, `device_tokens`, `guardians`, `students`, `student_guardians`, `billing_plans`, `contracts`, `charges`, `applied_discounts`, `documents` — plus `teachers` when that table is migrated.

`discarded_by_id` (→ `users.id`) on entities school/backoffice staff typically remove: `schools`, `guardians`, `students`, `charges`, `documents`.

### Tables without Discard

| Table | Reason | Cleanup |
|-------|--------|---------|
| `refresh_tokens` | Ephemeral session artifact | `revoked_at` + purge after `expires_at` |
| `charge_issuances` | Immutable provider invoice record | Cancel via `status`; no UI discard |
| `webhook_events` | Immutable ingress audit log | Purge processed rows **180 days** after `processed_at` (`Billing::PurgeWebhookEventsJob`); unprocessed rows are never purged |
| `payments` | Immutable financial fact | Hard delete only after legal retention — no UI discard |

### Partial unique indexes

With Discard, global `UNIQUE` constraints break when the same email or membership can be reused after discard. Migrations use partial indexes:

- `users.email` — `UNIQUE WHERE discarded_at IS NULL`
- `memberships (user_id, school_id)` — `UNIQUE WHERE discarded_at IS NULL`
- `student_guardians (guardian_id, student_id)` — `UNIQUE WHERE discarded_at IS NULL`

Documented in DBML `indexes` notes; dbdiagram.io does not render partial indexes natively.

### Retention windows (pending legal validation)

| Entity group | Soft delete | Hard delete after |
|--------------|-------------|-------------------|
| Identity (`users`, `memberships`) | Discard | TBD — LGPD personal data |
| School domain | Discard | TBD — aligned with identity |
| Billing (`charges`, `contracts`, `billing_plans`, `charge_issuances`) | Discard on charge/plan/contract; **no Discard** on issuance rows | TBD — long (fiscal/audit) |
| `payments` | No Discard | TBD — hard delete by `created_at` |
| Tax declaration versions/items | No Discard | TBD — fiscal/LGPD legal review; never silently purge |
| `webhook_events` | No Discard | **180 days** after `processed_at` (engineering default; legal validation pending) |
| `refresh_tokens` | No Discard | Immediately after `expires_at` |

Do not assume indefinite storage. Record final windows in this file and `docs/open-questions.md` (LGPD section) when legal validates.

## Auth model

| Channel | Mechanism |
|---------|-----------|
| Web SPA | JWT access + refresh httpOnly cookie |
| Mobile (`mobile/`) | JWT access + refresh in secure storage |
| Credential validation | Devise on `users` |

Full token lifecycle, TTL, and evaluation order: [`docs/modeling/002-api-auth.md`](../modeling/002-api-auth.md).
API route map: [`docs/api/v1/fintech-first.md`](../api/v1/fintech-first.md).

Guardian portal: `guardians.user_id` links profile to `users` after signup or invite acceptance.  
Invite flow: create `membership` with `status: invited` → guardian registers → `status: active`, set `guardians.user_id`.

### Auth evaluation order

See [`002-api-auth.md`](002-api-auth.md) for full JWT flow, TTL, and client transport.
Per-request checks after JWT validation:

1. `users.discarded_at` present → account removed
2. `users.status == disabled` → platform-wide block (revoke active `refresh_tokens`)
3. Devise `locked_at` present → security lock (failed attempts)
4. `memberships.discarded_at` present → no link to that school
5. `memberships.status` → `invited` or `suspended` blocks school-scoped access
6. `memberships.status == active` → proceed for that `school_id`

## LGPD — sensitive fields

| Field | Table | Note |
|-------|-------|------|
| `cpf` | `guardians` | Personal identifier — minimize access |
| `email` | `users`, `guardians` | Login and contact |
| `phone` | `guardians` | Contact for billing régua |
| `birth_date` | `students` | Child data — guardian consent required |
| declaration identity snapshots | `tax_declaration_versions` | Payer CPF, school CNPJ, signatory and consolidated child/payment data — encrypted/private access, never plaintext logs |

### Billing provider data flow (Cora)

Issuance requests include guardian **name, CPF, email, and phone** — treat Cora as
a processor; contractual basis is an open product/legal item (`docs/open-questions.md`).

| Surface | Personal data | Retention / handling |
|---------|---------------|----------------------|
| Provider API payload | Guardian identity fields on boleto issuance | Provider contract — not stored beyond request/response handling |
| Application logs | May echo provider errors | Redacted via `Billing::PiiRedactor`; correlation via `charge_issuances.idempotency_key` |
| `webhook_events` | Provider resource ids tied to charges/guardians | Purge processed rows **180 days** after `processed_at`; unprocessed rows retained |
| `charge_issuances.last_error` | May contain provider error text | Stored redacted after issuance failures |

Retention policy for financial and child data beyond the defaults above is **pending legal validation** — do not assume indefinite storage.

## Scope boundaries

- **`documents`** — enrollment/KYC in MVP; **superseded** by [`documents-and-archive/`](../prds/documents-and-archive/) → `archive_documents` in [`008-documents-archive.md`](008-documents-archive.md).
- **Billing extensions** — full MVP in [`billing/`](../prds/billing/); régua automation deferred; NFS-e P2; see [`billing.md`](../api/v1/billing.md).
- **Annual tax declaration** — billing BC8 owns calculation/versioning; archive may store/index the
  generated PDF but must not recalculate it. See
  [`tax-declarations.md`](../prds/billing/tax-declarations.md).
- **`teachers`** — now migrated and used by academic flows; teacher-domain ownership remains
  outside this historical fintech-first PRD.
- **`school_groups`** — multi-unit network support in schema; product UX deferred until a multi-unit client exists.
- **Students lifecycle superseded by 005** — the fintech-first `students.status` and
  `students.school_class_id` columns are legacy implementation inputs. The target model in
  [`005-students-enrollments.md`](005-students-enrollments.md) keeps the person record stable and
  moves year state/placement to `enrollments` + `class_assignments`.
- **Guardian-link billing columns superseded by 005** — `financial_percentage`,
  `primary_guardian`, and `father | mother | other` are replaced by PRD relationship semantics and
  the `primary_contact`, `financial_responsible`, and `pickup_authorized` flags. Existing partner
  data requires an explicit migration; the DBML records the target rather than dual models.
- **Billing contract handoff** — `contracts.student_id` remains for billing compatibility and
  `contracts.enrollment_id` is an optional 005 link for newly resolved year enrollments.

## Deferred (outside current schema)

- Magic-link / token-only access per charge (PRD §9) — guardian login is **decided** as own Devise account; magic link remains a future alternative, not modeled here.
- Per-entity `retention_period` configuration and `CleanSoftDeletedRecordsJob` implementation — modeled here at schema level; implementation deferred to `web/`.
