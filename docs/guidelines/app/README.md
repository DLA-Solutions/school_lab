# App Guidelines (Mobile)

Granular standards for `app/`.

> Status: placeholder. **React Native** is the decided mobile stack (`docs/web-stack.md`).
> Expand as `app/` is scaffolded.

## Source of truth

- Stack: `docs/web-stack.md`, `docs/api/README.md`, `docs/modeling/002-api-auth.md`.
- Agent-facing rule: `.cursor/rules/app/app-mobile.mdc`.

## Principles (already decided)

- Consumes the versioned REST API (`/api/v1`) with JWT; **never** re-implements business rules.
- Business behavior stays in parity with `web/` via the shared API.
- MVP surface: communication (messages with images), push notifications, boletos, academic
  lookups for parents; messaging + attendance for teachers.

## To document once the stack is confirmed

- Navigation, state management, API client + auth/token refresh, push (FCM) handling,
  image upload flow, offline expectations, testing.
