---
name: review-mobile
description: Reviews React Native changes in mobile/ against School Lab conventions, API contract, and official library documentation via Context7. Use when reviewing guardian mobile screens, navigation, API client, secure token storage, FCM push, or image upload. Jest applies only after mobile/package.json has a test script.
---

# Review Mobile

School Lab–specific code review for the guardian app in `mobile/`. Complements `review-api`,
`review-web-ui`, `review-bugbot`, and `review-security` — use this skill when the change
touches mobile UI, secure auth, push, or API consumption.

## Audience

`mobile/` is guardian-only on iOS and Android. The signed-in context is one active
`membership.id` with role `guardian`. The product label is **Responsável**. Teachers and
staff stay on the school SPA (`frontend/app`).

Navigation is four tabs: **Início**, **Mensagens**, **Boletos**, **Filho**. The active child
is an explicit `student_id`. There is no teacher messaging, teacher attendance, or staff menu
in this app.

## Scope

| Area | Paths |
|------|-------|
| Entry point | `mobile/App.tsx`, `mobile/index.ts` |
| Screens | `mobile/src/screens/**` |
| Navigation | `mobile/src/navigation/**` |
| API client, auth transport, token storage | `mobile/src/services/**` (`api.ts`, `authApi.ts`, `tokenStore.ts`) |
| Auth state | `mobile/src/providers/**` (`AuthProvider.tsx`, `AuthContext.ts`) |
| Push | `mobile/src/services/pushNotifications.ts`, `mobile/src/providers/PushNotificationProvider.tsx` |
| Types | `mobile/src/types/**` |
| Theme | `mobile/src/theme/**` |
| Native config | `mobile/app.json`, `mobile/.env.example` when affecting auth/push/permissions |

Stack: Expo 57, React Native 0.86, React Navigation 7, `expo-secure-store`. `expo-notifications`
is installed. There are no checked-in `android/` or `ios/` directories — native config lives
in `app.json` until someone runs `expo prebuild`.

`mobile/package.json` scripts are `start`, `android`, `ios`, and `web`. There is no `test`
script.

Some conventions below describe surfaces that **do not exist in `mobile/` yet**. Treat them as
targets for new code, not as paths to review today:

| Not present yet | Applies when |
|-----------------|--------------|
| Jest (`mobile/**/*.test.ts(x)`) | `mobile/package.json` gains a `test` script. Do not require a Jest run before that |
| Expo Router (`mobile/app/**`) | The project migrates off React Navigation |

Skip unrelated native boilerplate unless it affects tokens, network, or permissions.

## Workflow

### 1. Establish the diff

Default: **branch changes** against the repo default base branch (committed + staged + unstaged).

| User intent | Diff scope |
|-------------|------------|
| PR / branch review | branch changes |
| Local WIP only | uncommitted changes |
| Specific files | read those files directly |

If the user points at a PR or branch, check it out first (stash only after user confirms).

### 2. Load project context

Read **before** judging the code:

1. `docs/web-stack.md` §4 — mobile stack, FCM, API client parity with the web SPA.
2. `docs/api/README.md` — error envelope, pagination, device tokens endpoint.
3. `docs/modeling/002-api-auth.md` — mobile refresh in Keychain/Keystore; `client: mobile`.
4. Domain narrative: `docs/api/v1/<domain>.md` when screens map to API namespaces.
5. `docs/guidelines/mobile/README.md` — guardian audience, platforms, push, navigation, and stack. `docs/guidelines/app/README.md` is only a pointer to that file.
6. Rule: `rules/mobile/mobile`.
7. Rules: `rules/core/lgpd-privacy`, `rules/core/language-conventions`.
8. `docs/open-questions.md` — navigation/state/offline choices still open are not violations.

Do not load `docs/guidelines/web/testing.md` (Jest section) as mandatory context. A Jest run
becomes required only after `mobile/package.json` has a `test` script.

### 3. Consult Context7 (required)

Query Context7 **before** flagging framework misuse. Skill: `consult-context7`. Rule:
`rules/core/use-context7`.

| Change involves | Context7 topics |
|-----------------|-----------------|
| Core UI | Expo, React Native components, lists, performance |
| Navigation | React Navigation |
| Secure storage | `expo-secure-store` |
| Push | `expo-notifications` (FCM registration token). Do not treat `@react-native-firebase/messaging` as the installed path |
| App lifecycle | AppState, background/foreground refresh |
| Images | Image picker, upload to presigned URL / API |
| Data fetching | TanStack Query patterns, offline/cache (if used) |
| Tests | Jest and React Native Testing Library only after `mobile/package.json` has a `test` script |
| Permissions | Camera, notifications, photo library |

Indexed Expo docs may lag SDK 57. When they disagree with `docs/guidelines/mobile/README.md`,
that file wins. Note other conflicts only when relevant.

### 4. Review against checklist

Work through [checklist.md](checklist.md). Report only failing or risky items.

### 5. Report findings

Do **not** fix code unless the user asks.

**No issues:**

> Mobile review found no issues.

**With issues** — markdown table, sorted by severity (highest first):

| Severity | Location | Finding |
|----------|----------|---------|
| Critical | `path:line` | Concrete problem + expected convention |
| Warning | `path:line` | … |
| Suggestion | `path:line` | … |

| Level | Examples |
|-------|----------|
| **Critical** | Refresh token in plain AsyncStorage; business rules duplicated; wrong-school data displayed; guardian cross-family leak; tokens logged; push token sent without auth; `getDevicePushTokenAsync`, a raw APNs token, or an Expo push token stored for `POST /api/v1/me/device_tokens`; this app sending `platform: web` |
| **Warning** | No refresh on AppState resume; missing `POST /me/device_tokens` on login; 401 not retried once; image upload bypasses API flow; missing permission/error states; teacher or staff menu in this app |
| **Suggestion** | Large screen component; duplicate API client vs the web SPA; minor Context7 gap |

After the table, add **Context7 notes** — libraries queried and any project-vs-official-doc conflicts.

## What good mobile code looks like here

- **Thin client** — same API contract as the web SPA (`frontend/app`); no duplicated business rules.
- **Auth** — access in memory; refresh in `expo-secure-store` (Keychain on iOS, Keystore on Android); `client: mobile` on login/refresh body. One active `membership.id` with role `guardian`.
- **Lifecycle** — refresh on resume and before expiry; one 401 retry then login screen.
- **Push** — `POST /api/v1/me/device_tokens` stores an FCM registration token for both `ios` and `android`. The value for `ios` and `android` is an FCM registration token from a development build; a raw APNs token and an Expo push token are rejected; iOS must not use `getDevicePushTokenAsync`; and `platform: web`, which this app never sends, stays valid on `DeviceToken` for a future web push. Fail a change that persists `getDevicePushTokenAsync`, a raw APNs token, or an Expo push token.
- **Screens** — guardian-only. Four tabs: Início, Mensagens, Boletos, Filho. Active child is an explicit `student_id`. Teachers and staff stay on the school SPA.
- **English in code** — pt-BR UI via i18n only. The visible role label is **Responsável**.

## Related skills

- `review-api` — server contract
- `review-web-ui` — shared client patterns (auth, API errors, thin client)
- `consult-context7` — Expo, React Navigation, `expo-notifications`, `expo-secure-store`
- `review-bugbot` — logic bugs
- `review-security` — token storage, deep links, sensitive data
