# Data Model — Fintech-first (001)

> PRD: [`docs/prds/fintech-first.md`](../prds/fintech-first.md)  
> Executable schema: [`docs/database/schema.dbml`](../database/schema.dbml) · [`docs/database/der_001.png`](../database/der_001.png)

Narrative DSL for the fintech-first billing MVP. The authoritative schema for migrations is the DBML in `docs/database/`.

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
| `teachers` | Modeled stub for future polymorphism (`documents`, roles) — **not migrated**; no table exists yet in `web/` |
| `student_guardians` | Many-to-many with `financial_percentage`, `primary_guardian` |

### Billing

| Table | Role |
|-------|------|
| `billing_plans` | Tuition, enrollment, fee templates per school |
| `school_payment_providers` | Per-school provider credentials keyed by `instrument` (`bank_slip`) |
| `school_billing_settings` | Per-school billing policy — grace days, boleto service description, notification schedule (not provider credentials) |
| `contracts` | Per-student negotiated terms and due day |
| `charges` | Generated billing periods; links to financially responsible `guardian`; caches latest invoice display fields |
| `charge_issuances` | One row per provider invoice attempt — idempotency key, slip URLs, immutable issuance history |
| `applied_discounts` | Discount lines on a charge |
| `payments` | Confirmed payments (boleto, Pix, card) — **no Discard** |
| `webhook_events` | Provider notifications recorded for idempotent processing — **no Discard**; `payload` is NULL for Cora, whose notification has no body |

### Documents

| Table | Role |
|-------|------|
| `documents` | Polymorphic enrollment/KYC uploads — **not** the full digital archive |

`documentable_type`: `School`, `Guardian`, `Student` (Teacher deferred to academic phase).

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
| `webhook_events` | No Discard | **180 days** after `processed_at` (engineering default; legal validation pending) |
| `refresh_tokens` | No Discard | Immediately after `expires_at` |

Do not assume indefinite storage. Record final windows in this file and `docs/open-questions.md` (LGPD section) when legal validates.

## Auth model

| Channel | Mechanism |
|---------|-----------|
| Web SPA | JWT access + refresh httpOnly cookie |
| Mobile (`app/`) | JWT access + refresh in secure storage |
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

- **`documents`** — enrollment and KYC in MVP only; full digital archive is a separate domain (see `product-map.md` §5).
- **`teachers`** — modeled in DBML for polymorphic consistency but **not migrated**; the teacher role lives on `memberships.role` today. No teacher MVP flows in this PRD.
- **`school_groups`** — multi-unit network support in schema; product UX deferred until a multi-unit client exists.
- **`students.status`** — enrollment state (e.g. `active`, `transferred`); distinct from `discarded_at` (removed from active school records).

## Deferred (outside current schema)

- Magic-link / token-only access per charge (PRD §9) — guardian login is **decided** as own Devise account; magic link remains a future alternative, not modeled here.
- Per-entity `retention_period` configuration and `CleanSoftDeletedRecordsJob` implementation — modeled here at schema level; implementation deferred to `web/`.
