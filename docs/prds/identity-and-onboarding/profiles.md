# PRD — Identity: User Profiles (BC5)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `identity.manage_user_profile`  
> Modeling: [`003-identity-permissions.md`](../../modeling/003-identity-permissions.md)  
> API: [`docs/api/v1/identity-onboarding.md`](../../api/v1/identity-onboarding.md) § Profile

---

## Objective

Define **self-service profile updates** (name, contact, avatar) and **display metadata** on
memberships without duplicating guardian/staff domain records.

---

## Context

[`DIV-communication-004`](../../ref/divergencias.md) — competitors expose profile photos in
messaging; School Lab stores cosmetic fields on domain records where authoritative.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Manage user profile | `identity.manage_user_profile` | [`DIV-communication-004`](../../ref/divergencias.md), competitor profile-photo patterns |

Explicit membership-context switching is a School Lab `[product decision]` required by same-account
multi-role/multi-school access.

---

## Actors and surfaces

| Actor | Surfaces | Actions |
|-------|----------|---------|
| staff / teacher | Web SPA + mobile | View/update own display profile; select active role/school |
| guardian (UI: **Responsável**) | Web first; mobile parity | View/update guardian profile; select active role/school |
| backoffice | Backoffice SPA | Own profile; no school-family context merge |

---

## Segment applicability

Applies to all school segments. `multi_unidade` and same-school dual-role accounts require explicit
membership selection; segment does not change profile identity rules.

---

## Business Rules

BR-PR01 — `capability_id`: `identity.manage_user_profile`

`users` holds email (login) and Devise fields; **display name** may live on `guardians.name`,
staff `display_title`, or a future `user_profiles` table — MVP uses domain record name with
`PATCH /me` updating the authenticated user's linked guardian/staff row when present.

BR-PR02

Avatar upload (optional MVP): Active Storage blob on `users` or guardian — max 2 MB, JPEG/PNG;
not required for communication MVP.

BR-PR03

Guardians may update phone/email on their guardian record; changes do not auto-change login email
without verification flow (P2).

BR-PR04

Staff profile `display_title` is cosmetic only — authorization uses `role_template_id`
([`permissions.md`](permissions.md)).

BR-PR05

One account may have multiple role/school memberships. The client active context is an explicit
`membership.id` from `GET /me`; role and school always derive from that membership. With multiple
eligible memberships, the user chooses profile and school rather than receiving merged menus or a
silent staff-first default. Persist only the membership id and clear it when stale, suspended,
discarded, or removed.

BR-PR06

Product UI localizes `guardian` as **Responsável**. **Responsável financeiro** is represented by
the guardian/student/charge payer relationship and never becomes a membership role.

---

## Use Cases

### UC-PR01 — Update my profile

`PATCH /api/v1/me` with `name`, optional `phone` — scoped to active membership context when
multi-school.

### UC-PR02 — Upload avatar

`POST /api/v1/me/avatar` multipart — returns signed URL or attachment id.

### UC-PR03 — Select active profile and school

1. Read eligible memberships from `GET /me`.
2. Auto-select only when exactly one is eligible; otherwise preserve a still-valid prior id or ask
   the user to choose.
3. On switch, clear school-scoped state and navigate to the selected audience dashboard.

---

## API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/me` | Return all eligible memberships and role/display metadata |
| `PATCH` | `/api/v1/me` | Update profile fields in the selected membership context |
| `POST` | `/api/v1/me/avatar` | Upload optional profile image |

Tenant requests send `X-Membership-Id` per [`docs/api/README.md`](../../api/README.md).

---

## Errors

| Status | Code | Meaning |
|--------|------|---------|
| `403` | `invalid_membership_context` | Selected membership is stale, suspended, foreign, or wrong-school |
| `409` | `membership_context_required` | More than one eligible context exists and none was selected |
| `422` | `validation_error` | Invalid profile field or avatar |

---

## Database

Profiles reuse `users`, guardian records, `memberships`, and `staff_profiles`; no separate active
context row is stored server-side. Membership uniqueness is `(user_id, school_id, role)` among kept
rows. Clients persist only `membership.id`.

---

## Events

No event is required for client context switching. Profile updates remain audited where the
underlying tenant record is audited.

---

## Permissions

Users may update only their own profile. The selected membership determines school and audience;
permissions/family scope are never unioned across memberships.

---

## Non-functional requirements

- NFR-002: persist only membership id on clients; clear school/family data on switch.
- NFR-003: selected membership must match the tenant path.
- NFR-005: tenant profile changes are auditable; context failures are observable without PII.

---

## Acceptance Criteria

AC-PR001

```gherkin
Given an active guardian membership
When PATCH /me with name and phone
Then guardian record updates and GET /me reflects changes
```

Source: `identity.manage_user_profile` / [`DIV-communication-004`](../../ref/divergencias.md)

AC-PR002

```gherkin
Given one account has staff and guardian memberships in different schools
When the user selects the guardian membership for School B
Then the active audience is rendered as Responsável for School B
And no staff menu or School A cached data remains visible
```

Source: `[product decision]` / NFR-002

AC-PR003

```gherkin
Given one account has staff and guardian memberships in the same school
When a school request omits X-Membership-Id
Then the API returns membership_context_required
When the guardian membership id is supplied
Then only guardian family scope is active
```

Source: `[product decision]` / NFR-002

---

## Open items / pending decisions

- [ ] Avatar storage target remains optional and may be deferred.

---

## Out of Scope

- Public profile directory across schools.
- Student self-service profile (no student login in MVP).
