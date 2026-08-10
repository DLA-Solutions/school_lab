# Mobile Review Checklist

Use during `review-mobile`. Check only what the diff touches.

`mobile/` today is Expo managed with React Navigation, `expo-secure-store`, and a small
`src/services/` API client. **Push (FCM), a test runner, and native `android/`/`ios/`
directories are not in the project yet** — the sections covering them apply to new code
that introduces those capabilities, not to the current tree.

## Architecture — thin client

- [ ] No business rules duplicated from the API (billing state, attendance rules, eligibility)
- [ ] Client-side validation is UX-only; server remains authoritative
- [ ] API client patterns align with the web SPA (`frontend/app/src/services/`) where shared (errors, auth interceptor, types)
- [ ] OpenAPI-generated or shared types — no divergent hand-written DTOs

## Authentication and secure storage

- [ ] Access token in memory only — not persisted to disk in recoverable form
- [ ] Refresh token in Keychain / Keystore (secure storage) — not plain AsyncStorage
- [ ] Login and refresh send `client: "mobile"`; refresh token in JSON body per `002-api-auth.md`
- [ ] Silent refresh before access expiry; refresh on AppState `active` after background
- [ ] Single 401 retry after refresh; failure navigates to login with i18n message
- [ ] Logout revokes refresh server-side and wipes secure storage

## School and role context

- [ ] School chosen from `GET /me` memberships
- [ ] API calls use `/schools/:school_id/...` for tenant resources
- [ ] Navigation/menus respect role (teacher vs guardian vs school staff)
- [ ] Guardian flows use `.../me/...` routes — no other family IDs in paths or cache keys

## API consumption

- [ ] `Authorization: Bearer` and `Accept-Language: pt-BR` on requests
- [ ] Pagy list envelope handled (`data` + `meta`)
- [ ] Standard error envelope parsed and shown via i18n
- [ ] Network failures distinguished from 4xx/5xx API errors in UX

## Push notifications (FCM)

- [ ] FCM token obtained after permission grant
- [ ] Token registered via `POST /api/v1/me/device_tokens` when authenticated
- [ ] Token refresh/update handled on app upgrade or FCM rotation
- [ ] Notification tap deep-links to correct screen without leaking cross-tenant context
- [ ] Push payload does not carry sensitive child data beyond what UI already shows

## Media and uploads

- [ ] Image picker/camera permissions requested with rationale (i18n)
- [ ] Uploads follow API contract (presigned URL or multipart as documented)
- [ ] Large images compressed/resized before upload when appropriate
- [ ] Failed uploads surfaced to user with retry — not silent failure

## UI and UX

- [ ] Loading, error, empty, and offline-aware states where MVP requires
- [ ] Safe area and platform differences handled (iOS/Android)
- [ ] Destructive actions confirmed
- [ ] Lists use performant patterns (`FlatList` / `FlashList` — keyExtractor, memoization)

## i18n and language

- [ ] User-visible strings via i18n — no hardcoded Portuguese in TSX/TS
- [ ] Code identifiers and route names in English

## Security and LGPD

- [ ] No tokens, passwords, or child PII in logs/crash reports
- [ ] Screenshots/overlays do not expose sensitive health/incident data inappropriately
- [ ] Deep links validate auth and school context before showing data
- [ ] Clipboard copy of sensitive data avoided or explicitly user-initiated

## Testing (Jest + RN Testing Library)

- [ ] Critical flows tested: login, school select, primary MVP screen, permission denied
- [ ] Tests interact as user (text, role) — minimal implementation coupling
- [ ] API mocked at HTTP boundary; secure storage faked at module boundary
- [ ] Navigation assertions on visible outcomes, not navigator internals

## Native and permissions

Expo managed: permissions are declared in `mobile/app.json` unless the project has been prebuilt.

- [ ] `app.json` (or `Info.plist` / `AndroidManifest` after prebuild) permissions justified by feature
- [ ] Background modes only when required (e.g. remote notifications)
- [ ] Env/secrets not committed; use `.env` pattern from `mobile/.env.example`

## Context7 cross-check

- [ ] React Native, navigation, secure storage, and FCM APIs used per current docs
- [ ] No deprecated APIs when Context7 documents replacements — unless project doc locks the old pattern
- [ ] Platform-specific code isolated and tested on both targets when feasible
