# PRD — Platform: Product Access & Self-Serve (BC5)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `platform.self_serve_onboarding`  
> Related: [`identity-and-onboarding/onboarding.md`](../identity-and-onboarding/onboarding.md) (tenant lifecycle boundary)  
> Divergence: [`DIV-integration-001`](../../ref/divergencias.md), [`DIV-integration-003`](../../ref/divergencias.md) (help taxonomy P2)  
> Modeling: *(pending — content/config tables optional)*  
> API narrative: *(pending)*

---

## Objective

Deliver **product access guidance** — mobile app store links, first-run checklists, and contextual
help entry points — for staff, guardians, and backoffice referrers, distinct from **tenant
provisioning** owned by identity.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Self-serve onboarding and product access | `platform.self_serve_onboarding` | [`DIV-integration-001`](../../ref/divergencias.md) — self-serve with optional white-glove tier; Proesc in-app help articles (3 aliases), Agenda Edu setup (1) |
| Help taxonomy | `platform.configure_help_taxonomy` | [`DIV-integration-003`](../../ref/divergencias.md) — **P2**; ClassApp persona quick-starts as reference |

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| All segments | yes | App links and getting-started are role-based, not segment-based |

---

## Context

### Boundary: identity vs platform

| Concern | Owner | Capability |
|---------|-------|------------|
| Create school tenant, onboarding_status, owner wizard | Identity | `identity.provision_school`, `identity.onboard_team` |
| Invite token, set password, handoff checklists | Identity | `identity.invite_user`, `identity.set_password` |
| App download links, "how to log in", FAQ surfacing | **Platform (this BC)** | `platform.self_serve_onboarding` |
| Permission keys and role templates | Identity | `identity.manage_roles` |

Competitor help articles about "first access", "download app", and "cache clear" map here — not to
identity provisioning services.

**Self-serve mode** (identity): backoffice still creates tenant; owner completes wizard. **Product
access** (platform): guides users after invite regardless of mode.

---

## Business Rules

BR-PO01 — `capability_id`: `platform.self_serve_onboarding`

**Product access config** per deployment environment: iOS App Store URL, Google Play URL, optional
deep link scheme — stored in platform config (env or `product_access_settings` table).

BR-PO02

**Role-based getting-started checklist** (static config MVP): arrays of steps keyed by
`role_template.system_key` — e.g. director: "Configure school year", "Invite secretaria";
guardian: "Download app", "Accept invite".

BR-PO03

Checklist completion is **informational** in MVP — does not gate `onboarding_status` transitions
(identity owns gates).

BR-PO04

In-app **Help** entry opens external docs URL or embedded FAQ list — searchable help center is P2
(`configure_help_taxonomy`, `academic.search_help_center`).

BR-PO05

Guardian invite email/SMS includes app store links from BR-PO01 (template in identity invite
flow — platform supplies URLs).

BR-PO06

Optional **white-glove tier** content: backoffice sees extended setup runbook link — sales ops,
not product billing.

---

## Use Cases

### UC-PO01 — Resolve app download links

Input: client platform (ios | android | web).

Flow

1. Return store URLs and minimum app version `[product decision]`.

### UC-PO02 — Show getting-started checklist

Input: authenticated user + role template.

Flow

1. Load static checklist for role.
2. Optionally mark steps complete in user preferences (local or server) — non-blocking.

### UC-PO03 — Surface help entry

Input: current route/module.

Flow

1. Return link to module doc anchor.
2. P2: persona taxonomy per DIV-integration-003.

---

## API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/product_access/links` | Store URLs (public or authenticated) |
| `GET` | `/product_access/checklist` | Role-based steps |
| `GET` | `/product_access/help` | Contextual help link |

---

## Errors

| Status | Code | Description |
|--------|------|-------------|
| 404 | `checklist_not_found` | Unknown role template — return generic steps |

---

## Database

MVP: YAML or seed config in `web/` — optional `product_access_checklists` table later.

P2: `help_articles` with persona taxonomy.

---

## Permissions

Read access: all authenticated users for checklist/help. Link config: public.

---

## Non-functional requirements

- Store URLs must be configurable per environment (staging vs production).
- No PII in static checklist content.

---

## Acceptance Criteria

AC-PO01

- [ ] Given guardian invite email, when rendered, then includes iOS and Android store links from product config.
- Source: [`DIV-integration-001`](../../ref/divergencias.md)

AC-PO02

- [ ] Given director after first login, when opening getting started, then checklist includes school year and team invite steps.
- Source: `[product decision]`

AC-PO03

- [ ] Given provisioning school, when owner completes identity wizard, then platform checklist does not block activation.
- Source: identity boundary — BR-PO03

---

## Open items

- [ ] Hosted help center vs external Notion/GitBook — infrastructure.
- [ ] Persona taxonomy (DIV-integration-003) — P2 slice `help-center.md`.

---

## Out of Scope

- Tenant creation and lifecycle — identity [`onboarding.md`](../identity-and-onboarding/onboarding.md).
- LGPD consent capture — identity `manage_consent`.
- Commercial SaaS contract between DLA and school.
- Full searchable help center — P2.
