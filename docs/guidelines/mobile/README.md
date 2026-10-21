# Mobile guidelines

Standards for `mobile/`. Product audience and surfaces live in
[`docs/actors-and-surfaces.md`](../../actors-and-surfaces.md) and
[`docs/prds/layer-mobile-app.md`](../../prds/layer-mobile-app.md). This file is how the app is built.

Agent-facing rule: `.cursor/rules/mobile/mobile.mdc`.

## Audience

Guardian only. The signed-in context is one active `membership.id` whose role is `guardian`.
Staff and teacher memberships never build a menu in this app. Product UI calls that role
**Responsável**. The repository identifier stays `guardian`.

## Platforms

iOS and Android only. There is no Expo web target.

## Navigation

Four tabs: **Início**, **Mensagens**, **Boletos**, **Filho**. This is not a drawer cloned from
the school SPA.

## Active child

The active child is an explicit `student_id`. Today's sent routine is on Início. History is on
Filho.

## Routine

Show only a sent infant routine: `snack_eaten`, `poop_count`, `pee_count`, and `notes`
(BR-DR02, BR-DR03, BR-DR06). Cite [`docs/prds/academic/routine.md`](../../prds/academic/routine.md).
Drafts stay hidden. Recording stays on the school SPA. Sleep, mood, health, photos, and
per-event diary fields stay open in [`docs/open-questions.md`](../../open-questions.md).

## Locale

pt-BR strings go through i18n. The visible role label is **Responsável**, never the raw
`guardian` string.

## Stack

Locked for this app:

| Piece | Choice |
|-------|--------|
| Expo | 57 |
| React Native | 0.86 |
| Navigation | React Navigation 7 |
| Refresh token | `expo-secure-store` (Keychain on iOS, Keystore on Android) |
| Access token | Memory only |

Do not put the refresh token in AsyncStorage or `localStorage`.

## What not to port from the school SPA

Staff menus, teacher attendance, income-tax declaration, requests, atas, health records,
pickups, and tablet layouts.

## Context7

Indexed Expo docs may lag SDK 57. When they disagree with this file, `docs/web-stack.md`, or
`docs/prds/layer-mobile-app.md`, the project docs win.
