# PRD — Identity: Authentication (BC3)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `identity.authenticate_user`, `identity.reset_password`  
> Modeling: [`002-api-auth.md`](../../modeling/002-api-auth.md)  
> API: [`docs/api/v1/identity-onboarding.md`](../../api/v1/identity-onboarding.md) § Auth

---

## Objective

Define **credential login**, **JWT access/refresh lifecycle**, and **password reset** for all
MVP roles — shared by web SPA and mobile, with no duplicate auth logic in clients.

---

## Context

Baseline shipped in fintech-first (`POST /auth/login`, refresh rotation, Devise-backed users).
This slice consolidates auth requirements previously scattered across `002-api-auth.md` and
`fintech-first.md` without redefining billing routes.

---

## Business Rules

BR-A01 — `capability_id`: `identity.authenticate_user`

Access token TTL **20 minutes**; refresh **90 days** sliding (180 with remember-me). Rotation on
every refresh revokes the previous refresh token digest.

BR-A02

Web clients store refresh in **httpOnly Secure cookie**; mobile stores refresh in **Keychain /
Keystore** and sends it in the refresh request body.

BR-A03 — `capability_id`: `identity.reset_password`

Password reset uses Devise `reset_password_token` (email link) — distinct from invite tokens
([`invites.md`](invites.md)).

BR-A04

`users.status = disabled` blocks login and revokes all refresh tokens platform-wide.

BR-A05

Invited memberships (`status: invited`) may authenticate but receive `403` on school-scoped
routes until `POST /me/memberships/:id/accept` ([`onboarding.md`](onboarding.md) BR-O08).

BR-A06

Firebase Authentication is **not** used for login — FCM only ([`web-stack.md`](../../web-stack.md)).

---

## OAuth (Google — MVP)

BR-GO01 — `capability_id`: `identity.authenticate_user`

No auto-registration — Google login only for pre-provisioned users (school staff, guardians,
backoffice operators already on file).

BR-GO02

Require `email_verified: true` in the Google ID token.

BR-GO03

Match user by normalized email; create or update a `user_identities` row on first successful
Google login (`provider: google`, `provider_uid: sub`).

BR-GO04

Global blocks match password login: `users.status = disabled`, discarded users, Devise lockout
(`locked_at`).

BR-GO05

**Staff / teacher / director / backoffice:** at least one kept membership with role in
`staff`, `teacher`, `school`, or `backoffice` and status `active` or `invited`.

BR-GO06

**Guardian:** at least one kept `guardian` profile with at least one kept `student_guardian`
link to an enrolled student (same semantics as
[`SyncGuardianActivationService`](../../../web/app/services/people/sync_guardian_activation_service.rb))
and a guardian membership at the same school with status `active` or `invited`.

BR-GO07

Dual-role accounts may log in when **any** eligible path (staff or guardian) is satisfied.

BR-GO08

Password and Google sign-in coexist on the same account when emails match.

BR-GO09

API returns generic `403 access_denied` for all eligibility failures (unknown email, no eligible
membership, guardian without enrolled child, identity bound to another user). Specific reasons
are logged server-side only.

BR-GO10

Other OAuth providers (Apple, Microsoft) are out of scope unless a new product need is recorded.

Competitive note: Agenda Edu staff app offers Google login
([`docs/ref/agenda-edu/comunicacao/funcionalidades-por-ator.md`](../../ref/agenda-edu/comunicacao/funcionalidades-por-ator.md)).

---

## Use Cases

### UC-A01 — Login with email and password

Flow: validate credentials → issue access JWT + refresh → return memberships summary.

### UC-A02 — Refresh access token

Flow: validate refresh digest → rotate → new access JWT.

### UC-A03 — Request password reset

Flow: enqueue email with reset link; always return `200` (no email enumeration).

### UC-A04 — Complete password reset

Flow: validate token → set password → invalidate reset token.

### UC-GO01 — Google login (web)

Flow: SPA obtains Google ID token (GIS) → `POST /auth/oauth/google` → verify token → link
`UserIdentity` → eligibility check → issue access JWT + refresh (same transport as password
login).

---

## Permissions

Auth routes are unauthenticated except logout/revoke (requires valid access or refresh).

---

## Acceptance Criteria

AC-A001

```gherkin
Given valid credentials
When POST /auth/login
Then response includes access token and sets refresh cookie (web) or body (mobile)

Given disabled user
When POST /auth/login
Then response is 403 user_disabled
```

AC-GO001

```gherkin
Given a pre-provisioned staff user whose Google email matches users.email
  And the user has an active staff membership
When POST /auth/oauth/google with a valid Google id_token and client web
Then response is 200 with access_token
  And a refresh cookie is set
  And a user_identities row exists for provider google

Given a Google id_token with email_verified false
When POST /auth/oauth/google
Then response is 401 invalid_oauth_token

Given a Google email not registered in the platform
When POST /auth/oauth/google with a valid token
Then response is 403 access_denied

Given a guardian whose children are all discarded or not enrolled
When POST /auth/oauth/google with a valid token
Then response is 403 access_denied

Given users.status disabled
When POST /auth/oauth/google with a valid token
Then response is 403 user_disabled
```

---

## Out of Scope

- MFA / WebAuthn (`identity.configure_multi_factor` — P2).
- Magic-link login without password.
- Student login (record-only through MVP — [`actors-and-surfaces.md`](../../actors-and-surfaces.md)).
- Apple / Microsoft OAuth (BR-GO10).
- Unlink identity UI (P2).
