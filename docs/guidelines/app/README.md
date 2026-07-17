# App Guidelines (Mobile)

Granular standards for `app/`.

> Status: placeholder. React Native is an **intention, not a locked decision**
> (`docs/actors-and-surfaces.md` §5, `docs/vision.md` §7). Confirm the stack before scaffolding,
> then expand this document.

## Source of truth

- Agent-facing rule: `.cursor/rules/app/app-mobile.mdc`.

## Principles (already decided)

- Consumes the versioned REST API (`/api/v1`) with JWT; **never** re-implements business rules.
- Business behavior stays in parity with `web/` via the shared API.
- MVP surface: communication (messages with images), push notifications, boletos, academic
  lookups for parents; messaging + attendance for teachers.

## To document once the stack is confirmed

- Navigation, state management, API client + auth/token refresh, push (FCM) handling,
  image upload flow, offline expectations, testing.
