# Data Model — School Onboarding (004)

> PRD: [`docs/prds/identity-and-onboarding/onboarding.md`](../prds/identity-and-onboarding/onboarding.md)  
> Parent: [`docs/prds/identity-and-onboarding/index.md`](../prds/identity-and-onboarding/index.md)  
> Depends on: [`003-identity-permissions.md`](003-identity-permissions.md)  
> Executable schema: [`docs/database/schema.dbml`](../database/schema.dbml) · DER: `der_003.png` (shared export TBD)

Narrative DSL for school lifecycle, invites, and premium provisioning.

## Entity groups

### schools (extended)

| Column | Type | Notes |
|--------|------|-------|
| `onboarding_status` | varchar | `provisioning` \| `pending_handoff` \| `active` — default `pending_handoff` for self_serve create |
| `onboarding_mode` | varchar | `self_serve` \| `white_glove` |
| `billing_waived_at` | timestamp | Handoff when billing skipped |
| `segments_skipped_at` | timestamp | Handoff when segments deferred |

### membership_invite_tokens

| Column | Type | Notes |
|--------|------|-------|
| `membership_id` | FK | Invited membership |
| `school_id` | FK | Denormalized tenant key |
| `token_digest` | varchar | SHA-256 of opaque token — never store raw token |
| `expires_at` | timestamp | Default created_at + 7 days |
| `used_at` | timestamp | Set on successful accept |
| `created_by_id` | FK users | Inviter |

Partial unique: at most one **unused** token per membership (implementation: invalidate on resend).

### provisioning_imports (optional MVP)

| Column | Type | Notes |
|--------|------|-------|
| `school_id` | FK | |
| `uploaded_by_id` | FK users | Backoffice actor |
| `status` | varchar | `previewed` \| `committed` \| `failed` |
| `row_count` | integer | |
| `error_report` | jsonb | Validation errors from dry_run |
| `committed_at` | timestamp | |

## State machine — onboarding_status

```
provisioning (white_glove start)
    → pending_handoff (provisioning handoff checklist — owner may still be invited)
    → active (activation checklist — owner active required)

self_serve:
    create → pending_handoff (owner invited, not yet active — BR-O16)
    → active (owner accepts, wizard, activation checklist on handoff)
```

`onboarding_mode` is set at create and treated immutable after `active`.

## Invite flow (D5)

1. Service generates 32+ byte random token; email contains URL with raw token once.
2. Persist `token_digest` only.
3. `POST /auth/invite/accept` verifies digest, sets user password, marks `used_at`.
4. Client calls `POST /me/memberships/:id/accept` for membership activation.

Replaces `CreateMembershipService` random password pattern.

## Provisioning audit

Backoffice actions during `provisioning` should set:

- `Audited.store[:audited_user]` — backoffice user
- `audits.comment` or custom metadata: `{ "actor_type": "backoffice", "on_behalf_of": school_id }`

## Platform permission provision_school

Not stored in `membership_permissions`. Implemented as:

- Pundit context flag when `Current.backoffice?` && `school.onboarding_status == provisioning`
- Or dedicated `PlatformPermission` check in `ApplicationPolicy`

## Handoff checklists (persistence)

Checklists are derived from data, not separate tables. See onboarding PRD BR-O05.

### Provisioning handoff (`provisioning` → `pending_handoff`, white-glove only)

| Check | Source |
|-------|--------|
| Billing ready | `school_payment_providers` active row OR `billing_waived_at` |
| Segments | `segments` count > 0 OR `segments_skipped_at` |
| Terms | `school_onboarding_acknowledgements` (future) or app flag — **open** |
| Team invites sent | at least owner `membership_invite_tokens` row (unused or used) |

Owner `active` is **not** required at this step.

### Activation (`pending_handoff` → `active`)

| Check | Source |
|-------|--------|
| Owner active | `staff_profiles.is_owner` membership `status: active` |
| Billing ready | `school_payment_providers` active row OR `billing_waived_at` |
| Segments | `segments` count > 0 OR `segments_skipped_at` |
| Terms (owner) | `school_onboarding_acknowledgements` (future) or app flag — **open** |

## Multi-tenancy

All tables carry `school_id` except `membership_invite_tokens` reachable only via membership.

## LGPD

- Invite emails contain personal data — provider DPA required (open question).
- CSV imports may contain student/guardian PII — purge `provisioning_imports.error_report`
  after commit per retention policy (TBD).
- CPF in CSV optional until boleto — aligns with BR-O10.

## Events (domain)

| Event | Data |
|-------|------|
| `SchoolProvisioned` | `school_id`, `onboarding_mode` |
| `SchoolHandedOff` | `school_id`, `previous_status` |
| `MembershipInviteAccepted` | `membership_id`, `user_id` |
| `OwnerActivated` | `school_id`, `user_id` |

## Out of scope tables

- Commercial contract / subscription billing to DLA (platform SaaS) — not tenant `schools` billing.
- `enrollment_contracts` + Authentic integration — phase 2; see onboarding PRD § Future integration.

## Future — enrollment contract signature (Authentic, proposed)

Phase 2 entity (not in MVP schema):

| Column | Notes |
|--------|-------|
| `enrollment_contracts.signature_status` | `pending` \| `sent` \| `signed` \| `declined` \| `expired` |
| `authentic_document_id` | External reference — vendor TBD |
| `signed_pdf_document_id` | Link to `documents` / Active Storage |

Orthogonal to `schools.onboarding_status`. Login never blocked by signature state (BR-O11, BR-O22).
May gate charge generation or enrollment activation when configured (BR-O23).

Vendor: **Authentic** (proposed) — confirm in `docs/open-questions.md`.
