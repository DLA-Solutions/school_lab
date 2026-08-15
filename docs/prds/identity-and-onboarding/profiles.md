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

---

## Use Cases

### UC-PR01 — Update my profile

`PATCH /api/v1/me` with `name`, optional `phone` — scoped to active membership context when
multi-school.

### UC-PR02 — Upload avatar

`POST /api/v1/me/avatar` multipart — returns signed URL or attachment id.

---

## Acceptance Criteria

AC-PR001

```gherkin
Given an active guardian membership
When PATCH /me with name and phone
Then guardian record updates and GET /me reflects changes
```

---

## Out of Scope

- Public profile directory across schools.
- Student self-service profile (no student login in MVP).
