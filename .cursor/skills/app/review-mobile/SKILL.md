---
name: review-mobile
description: Reviews React Native changes in app/ against School Lab conventions, API contract, and official library documentation via Context7. Use when reviewing mobile screens, navigation, API client, secure token storage, FCM push, image upload, or Jest tests.
---

# Review Mobile

School Lab–specific code review for React Native (`app/`). Complements `review-api`,
`review-web-ui`, `review-bugbot`, and `review-security` — use this skill when the change
touches mobile UI, secure auth, push, or API consumption.

## Scope

| Area | Paths |
|------|-------|
| Screens | `app/src/screens/**`, `app/app/**` (Expo router if used) |
| Components | `app/src/components/**` |
| Navigation | `app/src/navigation/**`, root navigator |
| API client | `app/src/api/**`, `app/src/lib/api/**` |
| Auth | `app/src/auth/**`, secure storage wrappers |
| Push | `app/src/push/**`, FCM registration |
| Hooks | `app/src/hooks/**` |
| Types | `app/src/types/**` |
| Tests | `app/**/*.test.ts`, `app/**/*.test.tsx` |
| Native config | `app/app.json`, `app/android/**`, `app/ios/**` when affecting auth/push/permissions |

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

1. `docs/web-stack.md` §4 — mobile stack, FCM, API client parity with web-ui.
2. `docs/api/README.md` — error envelope, pagination, device tokens endpoint.
3. `docs/modeling/002-api-auth.md` — mobile refresh in Keychain/Keystore; `client: mobile`.
4. Domain narrative: `docs/api/v1/<domain>.md` when screens map to API namespaces.
5. `docs/guidelines/app/README.md` — mobile principles and MVP surfaces.
6. Rule: `rules/app/app-mobile`.
7. Rules: `rules/core/lgpd-privacy`, `rules/core/language-conventions`.
8. `docs/guidelines/web/testing.md` § cross-surface — Jest + RN Testing Library behavior focus.
9. `docs/open-questions.md` — navigation/state/offline choices still open are not violations.

### 3. Consult Context7 (required)

Query Context7 **before** flagging framework misuse. Skill: `consult-context7`. Rule:
`rules/core/use-context7`.

| Change involves | Context7 topics (examples) |
|-----------------|----------------------------|
| Core UI | React Native components, lists, performance |
| Navigation | React Navigation (or chosen navigator) |
| Secure storage | react-native-keychain / expo-secure-store |
| App lifecycle | AppState, background/foreground refresh |
| Push | FCM / `@react-native-firebase/messaging` registration |
| Images | Image picker, upload to presigned URL / API |
| Data fetching | TanStack Query patterns, offline/cache (if used) |
| Tests | Jest, React Native Testing Library |
| Permissions | Camera, notifications, photo library |

**Project docs win** over generic docs. Note conflicts only when relevant.

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
| **Critical** | Refresh token in plain AsyncStorage; business rules duplicated; wrong-school data displayed; guardian cross-family leak; tokens logged; push token sent without auth |
| **Warning** | No refresh on AppState resume; missing `POST /me/device_tokens` on login; 401 not retried once; image upload bypasses API flow; missing permission/error states |
| **Suggestion** | Large screen component; duplicate API client vs web-ui; minor Context7 gap |

After the table, add **Context7 notes** — libraries queried and any project-vs-official-doc conflicts.

## What good mobile code looks like here

- **Thin client** — same API contract as `web-ui/`; no duplicated business rules.
- **Auth** — access in memory; refresh in Keychain/Keystore; `client: mobile` on login/refresh body.
- **Lifecycle** — refresh on resume and before expiry; one 401 retry then login screen.
- **Push** — register FCM token via `POST /api/v1/me/device_tokens` after auth.
- **MVP surfaces** — guardian boletos/messages; teacher messaging/attendance; school admin light flows.
- **English in code** — pt-BR UI via i18n only.

## Related skills

- `review-api` — server contract
- `review-web-ui` — shared client patterns (auth, API errors, thin client)
- `consult-context7` — official React Native / navigation / secure storage docs
- `review-bugbot` — logic bugs
- `review-security` — token storage, deep links, sensitive data
