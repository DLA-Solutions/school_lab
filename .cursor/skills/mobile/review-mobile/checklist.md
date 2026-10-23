# Mobile Review Checklist

Use during `review-mobile`. Check only what the diff touches.

`mobile/` is guardian-only on iOS and Android: Expo 57, React Native 0.86, React Navigation 7,
`expo-secure-store`, and `expo-notifications`. One active `membership.id` with role `guardian`.
The product label is **Responsável**. Teachers and staff stay on the school SPA. Native
`android/` and `ios/` directories are not checked in.

`mobile/package.json` scripts are `start`, `android`, `ios`, and `web`. There is no `test`
script. Do not require a Jest run. A Jest run becomes required only after `mobile/package.json`
has a `test` script.

## Architecture — thin client

- [ ] No business rules duplicated from the API (billing state, message eligibility, routine display)
- [ ] Client-side validation is UX-only; server remains authoritative
- [ ] API client patterns align with the web SPA (`frontend/app/src/services/`) where shared (errors, auth interceptor, types)
- [ ] OpenAPI-generated or shared types — no divergent hand-written DTOs

## Authentication and secure storage

- [ ] Access token in memory only — not persisted to disk in recoverable form
- [ ] Refresh token in `expo-secure-store` (Keychain / Keystore) — not plain AsyncStorage or `localStorage`
- [ ] Login and refresh send `client: "mobile"`; refresh token in JSON body per `002-api-auth.md`
- [ ] Silent refresh before access expiry; refresh on AppState `active` after background
- [ ] Single 401 retry after refresh; failure navigates to login with i18n message
- [ ] Logout revokes refresh server-side and wipes secure storage

## Guardian context and navigation

- [ ] Signed-in context is one active `membership.id` with role `guardian`
- [ ] Product label is **Responsável**; the raw `guardian` string is not a visible role label
- [ ] Teachers and staff stay on the school SPA — no teacher messaging, teacher attendance, or staff menu in this app
- [ ] Four tabs: **Início**, **Mensagens**, **Boletos**, **Filho**
- [ ] Active child is an explicit `student_id`
- [ ] API calls use `/schools/:school_id/...` for tenant resources
- [ ] Guardian flows use `.../me/...` routes — no other family IDs in paths or cache keys

## API consumption

- [ ] `Authorization: Bearer` and `Accept-Language: pt-BR` on requests
- [ ] Pagy list envelope handled (`data` + `meta`)
- [ ] Standard error envelope parsed and shown via i18n
- [ ] Network failures distinguished from 4xx/5xx API errors in UX

## Push notifications (FCM)

Fail the change when it would persist `getDevicePushTokenAsync` or a raw APNs token as the
value for `POST /api/v1/me/device_tokens`.

The value for `ios` and `android` is an FCM registration token from a development build; a raw APNs token and an Expo push token are rejected; iOS must not use `getDevicePushTokenAsync`; and `platform: web`, which this app never sends, stays valid on `DeviceToken` for a future web push.

- [ ] `POST /api/v1/me/device_tokens` stores an FCM registration token for both `ios` and `android`
- [ ] Fail if the change persists `getDevicePushTokenAsync` or a raw APNs token
- [ ] An Expo push token must not be stored
- [ ] This app does not send `platform: web`
- [ ] Token registered via `expo-notifications` when authenticated — not `@react-native-firebase/messaging`
- [ ] Token refresh/update handled on app upgrade or FCM rotation
- [ ] Notification tap deep-links to the correct guardian screen without leaking cross-tenant context
- [ ] Push payload does not carry sensitive child data beyond what UI already shows

## Media and uploads

- [ ] Image picker/camera permissions requested with rationale (i18n)
- [ ] Uploads follow API contract (presigned URL or multipart as documented)
- [ ] Large images compressed/resized before upload when appropriate
- [ ] Failed uploads surfaced to user with retry — not silent failure

## UI and UX

- [ ] Loading, error, empty, and offline-aware states where the guardian flow requires them
- [ ] Safe area and platform differences handled (iOS/Android)
- [ ] Destructive actions confirmed
- [ ] Lists use performant patterns (`FlatList` / `FlashList` — keyExtractor, memoization)

## i18n and language

- [ ] User-visible strings via i18n — no hardcoded Portuguese in TSX/TS
- [ ] Code identifiers and route names in English
- [ ] Visible role label is **Responsável**

## Security and LGPD

- [ ] No tokens, passwords, or child PII in logs/crash reports
- [ ] Screenshots/overlays do not expose sensitive health/incident data inappropriately
- [ ] Deep links validate auth and the guardian's school context before showing data
- [ ] Clipboard copy of sensitive data avoided or explicitly user-initiated

## Testing

Do not require a Jest run. `mobile/package.json` has scripts `start`, `android`, `ios`, and
`web`, and no `test` script. A Jest run becomes required only after `mobile/package.json` has
a `test` script. Until then, skip the items below.

When a `test` script exists:

- [ ] Critical guardian flows tested: login, primary tab, permission denied
- [ ] Tests interact as user (text, role) — minimal implementation coupling
- [ ] API mocked at HTTP boundary; secure storage faked at module boundary
- [ ] Navigation assertions on visible outcomes, not navigator internals

## Native and permissions

Expo managed: permissions are declared in `mobile/app.json` unless the project has been prebuilt.

- [ ] `app.json` (or `Info.plist` / `AndroidManifest` after prebuild) permissions justified by feature
- [ ] Background modes only when required (e.g. remote notifications)
- [ ] Env/secrets not committed; use `.env` pattern from `mobile/.env.example`

## Context7 cross-check

- [ ] Lookups name Expo, React Navigation, `expo-notifications`, and `expo-secure-store`
- [ ] Push review does not treat `@react-native-firebase/messaging` as the installed path
- [ ] Indexed Expo docs may lag SDK 57; `docs/guidelines/mobile/README.md` wins when they disagree
- [ ] No deprecated APIs when Context7 documents replacements — unless the project doc locks the old pattern
- [ ] Platform-specific code isolated for iOS and Android
