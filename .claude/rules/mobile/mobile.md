> Mobile app conventions
>
> **Relevant when touching:** `mobile/**`

# mobile/ — Mobile (React Native)

Guardian-only iOS and Android. Standards: `docs/guidelines/mobile/README.md`.
Consumes `/api/v1` — see `docs/api/README.md` and `docs/modeling/002-api-auth.md`.

**Agent routing:** Feature work in `mobile/` is owned by **frontend-implementer** (rule `agent-routing`). API changes go to **rails-implementer**.

- One active `membership.id` with role `guardian`. Staff and teacher memberships never build a menu.
- Access token in memory; refresh token in `expo-secure-store` (Keychain/Keystore, not `localStorage`).
- Silent refresh before access expiry; retry once on 401.
- Never re-implements business rules — the API is the source of truth.
- Four tabs: Início, Mensagens, Boletos, Filho. No teacher attendance.
- pt-BR via i18n. The visible role label is Responsável.
