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

## Use Cases

### UC-A01 — Login with email and password

Flow: validate credentials → issue access JWT + refresh → return memberships summary.

### UC-A02 — Refresh access token

Flow: validate refresh digest → rotate → new access JWT.

### UC-A03 — Request password reset

Flow: enqueue email with reset link; always return `200` (no email enumeration).

### UC-A04 — Complete password reset

Flow: validate token → set password → invalidate reset token.

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

---

## Out of Scope

- MFA / WebAuthn (`identity.configure_multi_factor` — P2).
- Magic-link login without password.
- Student login (record-only through MVP — [`actors-and-surfaces.md`](../../actors-and-surfaces.md)).
