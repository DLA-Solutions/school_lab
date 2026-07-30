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
| `refresh_tokens` | Hashed refresh tokens for API JWT (mobile) — no Discard |

Roles on `memberships.role`: `backoffice`, `school`, `teacher`, `guardian`.  
Membership status flow: `invited` → `active` (also `suspended` per school).

User platform status: `active` | `disabled` (blocks all schools; distinct from per-school `suspended`).

### School domain

| Table | Role |
|-------|------|
| `school_groups` | Optional network/holding — schema ready, product flow deferred |
| `schools` | Tenant root; optional `school_group_id` |
| `guardians` | Financially responsible parties; `user_id` when portal account exists |
| `students` | Minimal student record for billing linkage |
| `teachers` | Stub for future polymorphism (`documents`, roles); not MVP billing scope |
| `student_guardians` | Many-to-many with `financial_percentage`, `primary_guardian` |

### Billing

| Table | Role |
|-------|------|
| `billing_plans` | Tuition, enrollment, fee templates per school |
| `contracts` | Per-student negotiated terms and due day |
| `charges` | Generated billing periods; links to financially responsible `guardian` |
| `applied_discounts` | Discount lines on a charge |
| `payments` | Confirmed payments (boleto, Pix, card) — **no Discard** |
| `webhook_events` | Raw PSP webhooks for idempotent processing — **no Discard** |

### Documents

| Table | Role |
|-------|------|
| `documents` | Polymorphic enrollment/KYC uploads — **not** the full digital archive |

`documentable_type`: `School`, `Guardian`, `Student` (Teacher deferred to academic phase).

## Multi-tenancy (`school_id`)

Every billing and school-domain table carries `school_id` **directly**, even when a parent
FK (e.g. `contracts.student_id`, `charges.contract_id`) already places it within a school's
scope. This denormalization keeps tenant-scoped queries and policy scopes a single
`where(school_id: ...)` away, without joining through the parent chain.

Intentional exceptions (no direct `school_id`):

| Table | Reason |
|-------|--------|
| `users`, `refresh_tokens` | Cross-school by design — one login, N schools via `memberships`; JWT payload has no `school_id` (see [`002-api-auth.md`](002-api-auth.md)) |
| `webhook_events` | Raw PSP ingress log, not a domain entity |

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

`school_groups`, `schools`, `users`, `memberships`, `guardians`, `students`, `teachers`, `student_guardians`, `billing_plans`, `contracts`, `charges`, `applied_discounts`, `documents`.

`discarded_by_id` (→ `users.id`) on entities school/backoffice staff typically remove: `schools`, `guardians`, `students`, `charges`, `documents`.

### Tables without Discard

| Table | Reason | Cleanup |
|-------|--------|---------|
| `refresh_tokens` | Ephemeral session artifact | `revoked_at` + purge after `expires_at` |
| `webhook_events` | Immutable ingress audit log | Purge by `created_at` after processing + retention |
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
| Billing (`charges`, `contracts`, `billing_plans`) | Discard | TBD — long (fiscal/audit) |
| `payments` | No Discard | TBD — hard delete by `created_at` |
| `webhook_events` | No Discard | TBD — e.g. 90d–1y after `processed_at` |
| `refresh_tokens` | No Discard | Immediately after `expires_at` |

Do not assume indefinite storage. Record final windows in this file and `docs/open-questions.md` (LGPD section) when legal validates.

## Auth model

| Channel | Mechanism |
|---------|-----------|
| Web (`web-ui/`) | JWT access + refresh httpOnly cookie |
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

Retention policy for financial and child data is **pending legal validation** — do not assume indefinite storage.

## Scope boundaries

- **`documents`** — enrollment and KYC in MVP only; full digital archive is a separate domain (see `product-map.md` §5).
- **`teachers`** — schema stub for polymorphic consistency; no teacher MVP flows in this PRD.
- **`school_groups`** — multi-unit network support in schema; product UX deferred until a multi-unit client exists.
- **`students.status`** — enrollment state (e.g. `active`, `transferred`); distinct from `discarded_at` (removed from active school records).

## Deferred (outside current schema)

- Magic-link / token-only access per charge (PRD §9) — guardian login is **decided** as own Devise account; magic link remains a future alternative, not modeled here.
- Per-entity `retention_period` configuration and `CleanSoftDeletedRecordsJob` implementation — modeled here at schema level; implementation deferred to `web/`.
