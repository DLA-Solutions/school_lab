> Mobile app conventions
>
> **Relevant when touching:** `mobile/**`

# mobile/ — Mobile (React Native)

Stack locked in `docs/web-stack.md`. Consumes `/api/v1` — see `docs/api/README.md` and `docs/modeling/002-api-auth.md`.

**Agent routing:** Feature work in `mobile/` is owned by **frontend-implementer** (rule `agent-routing`). API changes go to **rails-implementer**.

- JWT access in memory; refresh token in Keychain/Keystore (not localStorage).
- Silent refresh before access expiry; retry once on 401.
- Never re-implements business rules — parity with the web SPA (`frontend/app`) via shared API.
- MVP: boletos (guardian), messages, attendance (teacher), push (FCM).
- Granular standards in `docs/guidelines/app/`.
