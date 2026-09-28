# Domain resolution

Map a feature request to `docs/prds/<domain>/` before writing a feature slice.

## Resolution order

1. **User names domain explicitly** → use it
2. **Infer** from feature keywords + [`docs/product-map.md`](../../../docs/product-map.md) §5 + existing `docs/prds/`
3. **Ambiguous** → `AskQuestion` (e.g. `fintech-first` vs future `billing`)
4. **No domain PRD** → warn per `project-overview`; allow slice draft but flag before `codelet-loop`

## Known domains (Aug 2026)

| Domain path | Scope | Parent PRD entry point |
|-------------|-------|------------------------|
| `fintech-first` | Billing-first partner slice (charges, boletos, contracts) | `docs/prds/fintech-first.md` |
| `identity-and-onboarding` | Schools, invites, permissions, onboarding | `docs/prds/identity-and-onboarding/index.md` |

Future domains (no PRD yet — warn if selected): `communication`, `academic`, `billing` (umbrella), `documents`.

## Keyword hints

| Keywords in request | Likely domain |
|---------------------|---------------|
| boleto, charge, contract, payment, billing, fintech | `fintech-first` |
| invite, onboarding, school create, permission, role template | `identity-and-onboarding` |
| message, notification, communication | `communication` (no PRD — warn) |
| attendance, grade, class, enrollment | `academic` (no PRD — warn) |

## Folder vs single-file domain PRD

| Pattern | Example | Slice path |
|---------|---------|------------|
| Folder with `index.md` | `identity-and-onboarding/` | `docs/prds/identity-and-onboarding/<slug>.md` |
| Monolithic `.md` | `fintech-first.md` | `docs/prds/fintech-first/<slug>.md` (create subfolder for slices) |

**Monolithic PRDs:** the parent file stays at `docs/prds/fintech-first.md`. Feature slices go in `docs/prds/fintech-first/<slug>.md`.

## Parent PRD link in slice metadata

Use relative path from slice to parent:

- Folder domain: `> Domain: [identity-and-onboarding](../index.md)`
- Monolithic domain: `> Domain: [fintech-first](../fintech-first.md)`

## Slug rules

- Lowercase, hyphens, no accents (`resend-boleto`)
- Derive from feature name, not domain
- Check collision: `ls docs/prds/<domain>/` — only within domain folder
- Prefer verb-noun order for actions: `resend-boleto`, `invite-accept`, `daily-attendance`

## When domain PRD is missing

1. Warn: "No domain PRD at `docs/prds/<domain>/` — slice is draft-only."
2. Flag in slice status: `> Status: draft — domain PRD missing`
3. Do not block elicitation, but do block `codelet-loop` implementation until user acknowledges
