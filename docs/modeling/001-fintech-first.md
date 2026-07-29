# Data Model — Fintech-first (001)

> PRD: [`docs/prds/fintech-first.md`](../prds/fintech-first.md)  
> Executable schema: [`docs/database/database_dml.md`](../database/database_dml.md) · [`docs/database/der_001.png`](../database/der_001.png)

Narrative DSL for the fintech-first billing MVP. The authoritative schema for migrations is the DBML in `docs/database/`.

## Entity groups

### Identity

| Table | Role |
|-------|------|
| `users` | Devise account — email/password, confirmation, lock/unlock |
| `memberships` | User ↔ school (or platform) with role and status |
| `refresh_tokens` | Hashed refresh tokens for API JWT (mobile) |

Roles on `memberships.role`: `backoffice`, `school`, `teacher`, `guardian`.  
Status flow: `invited` → `active` (also `suspended`).

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
| `payments` | Confirmed payments (boleto, Pix, card) |
| `webhook_events` | Raw PSP webhooks for idempotent processing |

### Documents

| Table | Role |
|-------|------|
| `documents` | Polymorphic enrollment/KYC uploads — **not** the full digital archive |

`documentable_type`: `School`, `Guardian`, `Student` (Teacher deferred to academic phase).

## Auth model

| Channel | Mechanism |
|---------|-----------|
| Web (school admin, guardian portal) | Devise session on `users` |
| API (mobile) | JWT + `refresh_tokens` (store digest only) |

Guardian portal: `guardians.user_id` links profile to `users` after signup or invite acceptance.  
Invite flow: create `membership` with `status: invited` → guardian registers → `status: active`, set `guardians.user_id`.

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

## Deferred (outside current schema)

- Magic-link / token-only access per charge (PRD §9) — guardian login is **decided** as own Devise account; magic link remains a future alternative, not modeled here.
