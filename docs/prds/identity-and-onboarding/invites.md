# PRD — Identity: Invites (BC4)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `identity.invite_user`, `identity.complete_registration`, `identity.set_password`  
> Modeling: [`004-school-onboarding.md`](../../modeling/004-school-onboarding.md)  
> API: [`docs/api/v1/identity-onboarding.md`](../../api/v1/identity-onboarding.md)

---

## Objective

Define **single-use invite tokens**, **set-password acceptance**, and **membership activation**
for staff, teachers, and guardians — replacing server-generated random passwords.

---

## Context

Detailed BR/UC in [`onboarding.md`](onboarding.md). This slice is the cross-reference for
invite-specific permission keys and API errors.

---

## Business Rules

BR-I01 — `capability_id`: `identity.invite_user`

Invite creates `membership_invite_tokens` with SHA-256 `token_digest`; raw token sent once via
email (Postmark when configured).

BR-I02 — `capability_id`: `identity.set_password`

Default expiry **7 days**; resend invalidates unused tokens ([`onboarding.md`](onboarding.md) BR-O17).

BR-I03 — `capability_id`: `identity.complete_registration`

`POST /auth/invite/accept` sets password and marks `used_at`; does not alone activate membership.

BR-I04

`POST /me/memberships/:id/accept` transitions membership `invited` → `active`.

BR-I05

Guardian invite links `guardians.user_id` on activation; CPF not required at invite
([`onboarding.md`](onboarding.md) BR-O10).

---

## Permissions

| Action | Permission key |
|--------|----------------|
| Create/resend invite | `manage_people` or backoffice `provision_school` during provisioning |
| Accept invite | invitee (no prior permission) |

---

## Acceptance Criteria

AC-I001 — Single-use token ([`onboarding.md`](onboarding.md) AC-O003)

AC-I002 — No random server password stored for invitees

---

## Out of Scope

- Enrollment contract signature gates (phase 2 — login never blocked).
- Magic-link login via boleto barcode.
