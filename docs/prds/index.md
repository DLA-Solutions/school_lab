# PRD index

All product requirement documents under `docs/prds/`. Template: [`template.md`](template.md).
Traceability: [`docs/product/traceability.md`](../product/traceability.md). Roadmap status:
[`docs/product/domain-roadmap.md`](../product/domain-roadmap.md).

**Capability column:** canonical `capability_id` from [`capability-taxonomy.yaml`](../product/capability-taxonomy.yaml) — Phase 1 alias gate **complete** (1,325/1,325 mapped).

## Domain PRDs

| PRD | Scope | Status | Capabilities covered | Modeling | API |
|-----|-------|--------|----------------------|----------|-----|
| [`identity-and-onboarding/`](identity-and-onboarding/index.md) | Multi-tenancy, permissions, onboarding, auth, invites, profiles, consent | validated | **13** MVP `identity.*` canonicals per [`mvp-scope.md`](../product/mvp-scope.md) | [`003-identity-permissions`](../modeling/003-identity-permissions.md), [`004-school-onboarding`](../modeling/004-school-onboarding.md) | [`identity-onboarding`](../api/v1/identity-onboarding.md) |
| [`students-and-enrollments/`](students-and-enrollments/index.md) | Student records, guardian links, classes, enrollments (BC1 + BC2) | validated | **9** MVP `students.*` canonicals | [`005-students-enrollments`](../modeling/005-students-enrollments.md) | [`students-and-enrollments`](../api/v1/students-and-enrollments.md) |
| [`communication/`](communication/index.md) | Messages, channels, announcements, notifications, media (BC1–BC5) | validated | **37** MVP `communication.*` canonicals (**46** total) | [`006-communication`](../modeling/006-communication.md) | [`communication`](../api/v1/communication.md) |
| [`academic/`](academic/index.md) | Attendance, grades, report cards, diary, curriculum, periods, incidents, coordination, Preceptoria backfill (BC1–BC9) | validated | **22** MVP `academic.*` canonicals (**34** total) + product-decision Preceptoria | [`007-academic`](../modeling/007-academic.md) | [`academic`](../api/v1/academic.md) |
| [`billing/`](billing/index.md) | Charges, boletos, payments, dunning, settings, guardian portal, NFS-e scope, annual tax declarations (BC1–BC8) | validated; tax declaration release legally gated | **32** MVP `billing.*` canonicals + product-decision tax declaration; partner slice **implemented** in `web/` | [`001-fintech-first`](../modeling/001-fintech-first.md) *(baseline + PRD delta)* | [`billing`](../api/v1/billing.md) extends [`fintech-first`](../api/v1/fintech-first.md) |
| [`documents-and-archive/`](documents-and-archive/index.md) | Digital archive, audit export, signatories, retention hooks, guardian requests (BC1–BC3) | validated | **5** MVP `documents.*` canonicals (**12** total) + implemented guardian-request backfill | [`008-documents-archive`](../modeling/008-documents-archive.md) | [`documents-and-archive`](../api/v1/documents-and-archive.md) |
| [`platform-and-admin/`](platform-and-admin/index.md) | School year, backoffice ops, calendar, staff users, product access (BC1–BC5) | validated | **6** MVP `platform.*` canonicals (**13** total) | [`009-platform-admin`](../modeling/009-platform-admin.md) | [`platform-and-admin`](../api/v1/platform-and-admin.md) — **W1 frozen (4C.1)** |

### Domain folder — identity & onboarding

| File | Bounded context | Status |
|------|-----------------|--------|
| [`index.md`](identity-and-onboarding/index.md) | Integration, waves, NFR summary, competitive grounding | validated |
| [`permissions.md`](identity-and-onboarding/permissions.md) | BC1 — role templates, permission keys (`identity.manage_roles`, `identity.manage_user_accounts`) | validated |
| [`onboarding.md`](identity-and-onboarding/onboarding.md) | BC2 — lifecycle, invites, handoff | validated |
| [`auth.md`](identity-and-onboarding/auth.md) | BC3 — login, JWT, password reset | validated |
| [`invites.md`](identity-and-onboarding/invites.md) | BC4 — invite tokens, activation | validated |
| [`profiles.md`](identity-and-onboarding/profiles.md) | BC5 — user profile | validated |
| [`consent.md`](identity-and-onboarding/consent.md) | BC6 — LGPD consent records | validated |

### Domain folder — students & enrollments

| File | Bounded context | Status |
|------|-----------------|--------|
| [`index.md`](students-and-enrollments/index.md) | Integration, waves, NFR summary, competitive grounding (**20** `students.*` canonicals) | validated |
| [`enrollments.md`](students-and-enrollments/enrollments.md) | BC1 — enrollment lifecycle, import, contracts, exports | validated |
| [`records.md`](students-and-enrollments/records.md) | BC2 — student/guardian records, class structure, assign class | validated |
| [`health-records.md`](students-and-enrollments/health-records.md) | BC3 — guardian health profile, multiple records, optional PDF (DLA-11) | validated |

### Domain folder — communication

| File | Bounded context | Status |
|------|-----------------|--------|
| [`index.md`](communication/index.md) | Integration, waves, NFR summary, competitive grounding (**37** MVP `communication.*`) | validated |
| [`messages.md`](communication/messages.md) | BC1 — DM, group/class threads, inbox, edit audit, scheduled send | validated |
| [`channels.md`](communication/channels.md) | BC2 — groups, service channels, tickets, CSAT, staff inbox | validated |
| [`announcements.md`](communication/announcements.md) | BC3 — targeted comunicados, templates, moderation, calendar events | validated |
| [`notifications.md`](communication/notifications.md) | BC4 — FCM push, email/WhatsApp adapters, policy, delivery tracking | validated |
| [`media.md`](communication/media.md) | BC5 — attachments, photo albums, video, learning materials | validated |

### Domain folder — academic

| File | Bounded context | Status |
|------|-----------------|--------|
| [`index.md`](academic/index.md) | Integration, waves, NFR-001, `AbsenceRecorded` handoff, competitive grounding (**34** `academic.*` canonicals) | validated |
| [`attendance.md`](academic/attendance.md) | BC1 — record, policy, justify, export, absence event | validated |
| [`grades.md`](academic/grades.md) | BC2 — evaluation templates, scales, entry, recovery, launch | validated |
| [`report-cards.md`](academic/report-cards.md) | BC3 — configure, publish, guardian view | validated |
| [`diary.md`](academic/diary.md) | BC4 — lessons, content, teacher assignment, submission | validated |
| [`curriculum.md`](academic/curriculum.md) | BC5 — disciplines matrix | validated |
| [`periods.md`](academic/periods.md) | BC6 — period closure checklist | validated |
| [`incidents.md`](academic/incidents.md) | BC7 — occurrences, guardian visibility | validated |
| [`coordination.md`](academic/coordination.md) | BC8 — coordination dashboard | validated |
| [`preceptorship.md`](academic/preceptorship.md) | BC9 — implemented narrative publish, family read/PDF; not PEI/AEE | implemented |

### Domain folder — billing

| File | Bounded context | Status |
|------|-----------------|--------|
| [`index.md`](billing/index.md) | Integration, fintech-first supersede, MVP capability map, waves | validated |
| [`charges.md`](billing/charges.md) | BC1 — plans, contracts, generation, types, adjustments, receivables | validated |
| [`boletos.md`](billing/boletos.md) | BC2 — issuance, tracking, resend, remittance, bank integration | validated |
| [`payments.md`](billing/payments.md) | BC3 — Pix, card, gateway, manual/batch pay, links, recurring card | validated |
| [`dunning.md`](billing/dunning.md) | BC4 — delinquency dashboard, reminder policy; régua automation deferred | validated |
| [`settings.md`](billing/settings.md) | BC5 — mora, multa, pontualidade, grace per school | validated |
| [`guardian-portal.md`](billing/guardian-portal.md) | BC6 — family charges, pay online, forward-only history | validated |
| [`invoices.md`](billing/invoices.md) | BC7 — NFS-e P2 scope note only | validated |
| [`tax-declarations.md`](billing/tax-declarations.md) | BC8 — automatic annual payer declaration, purpose eligibility, immutable versions/PDF | validated; release legally gated |

### Domain folder — documents & archive

| File | Bounded context | Status |
|------|-----------------|--------|
| [`index.md`](documents-and-archive/index.md) | Integration, vision grounding, MVP vs P2, fintech-first supersede | validated |
| [`archive.md`](documents-and-archive/archive.md) | BC1 — store, search, guardian view, audit export, signatories | validated |
| [`retention.md`](documents-and-archive/retention.md) | BC2 — P2 retention policy hooks; MVP default retain | validated |
| [`guardian-requests.md`](documents-and-archive/guardian-requests.md) | BC3 — implemented Meus pedidos / Solicitações lifecycle and isolation | implemented |

### Domain folder — platform & admin

| File | Bounded context | Status |
|------|-----------------|--------|
| [`index.md`](platform-and-admin/index.md) | Integration, cross-domain contracts, competitive grounding (**13** `platform.*` canonicals) | validated |
| [`school-year.md`](platform-and-admin/school-year.md) | BC1 — ano letivo, academic periods, holidays | validated |
| [`backoffice.md`](platform-and-admin/backoffice.md) | BC2 — tenant register, module flags, provisioning dashboard | validated |
| [`backoffice-evolution.md`](platform-and-admin/backoffice-evolution.md) | BC2 evolution — E1–E3 gaps, ops tooling, P2 roadmap | draft |
| [`platform-subscription-billing.md`](platform-and-admin/platform-subscription-billing.md) | DLA→school SaaS collection (Asaas port, school checkout) | validated |
| [`calendar.md`](platform-and-admin/calendar.md) | BC3 — institutional and personal events | validated |
| [`staff-users.md`](platform-and-admin/staff-users.md) | BC4 — staff roster, menu visibility | validated |
| [`onboarding.md`](platform-and-admin/onboarding.md) | BC5 — product access, app links, getting-started (not tenant provisioning) | validated |

## Derived / historical

Historical records and cross-cutting PRDs. **Normative billing scope** is
[`billing/`](billing/index.md); the partner slice below is the implemented baseline in `web/`.

| PRD | Scope | Status | Capabilities covered | Modeling | API |
|-----|-------|--------|----------------------|----------|-----|
| [`fintech-first.md`](fintech-first.md) | Billing partner slice (identity, schools, people, billing, documents bundle) — **historical baseline** | implemented | `billing.*`, `identity.*`, `students-and-enrollments.*` (partial) | [`001-fintech-first`](../modeling/001-fintech-first.md), [`002-api-auth`](../modeling/002-api-auth.md) | [`fintech-first`](../api/v1/fintech-first.md) |

## Feature slices

| PRD | Parent domain | Status | Capabilities | Modeling | API |
|-----|---------------|--------|--------------|----------|-----|
| [`fintech-first/resend-boleto.md`](fintech-first/resend-boleto.md) | fintech-first / billing | absorbed | `billing.*` resend — merged into [`billing/boletos.md`](billing/boletos.md) | — | [`billing.md`](../api/v1/billing.md) |
| [`platform-and-admin/school-module-flags.md`](platform-and-admin/school-module-flags.md) | backoffice / evolution E1 | approved | `platform.manage_backoffice_ops` | — | [`platform-and-admin.md`](../api/v1/platform-and-admin.md) |
| [`platform-and-admin/backoffice-module-flags-ui.md`](platform-and-admin/backoffice-module-flags-ui.md) | backoffice-evolution E1 | draft | `platform.manage_backoffice_ops` | — | — |
| [`platform-and-admin/backoffice-school-year-provisioning.md`](platform-and-admin/backoffice-school-year-provisioning.md) | backoffice-evolution E1 | draft | `platform.configure_school_year` | — | W1 frozen |
| [`platform-and-admin/backoffice-tenant-detail.md`](platform-and-admin/backoffice-tenant-detail.md) | backoffice-evolution E1 | draft | `platform.manage_backoffice_ops` | — | — |
| [`platform-and-admin/backoffice-operational-dashboard.md`](platform-and-admin/backoffice-operational-dashboard.md) | backoffice-evolution E1 | draft | `platform.manage_backoffice_ops` | — | — |
| [`platform-and-admin/backoffice-audit-viewer.md`](platform-and-admin/backoffice-audit-viewer.md) | backoffice-evolution E2 | draft | `platform.manage_backoffice_ops` | — | draft |
| [`platform-and-admin/backoffice-advanced-search.md`](platform-and-admin/backoffice-advanced-search.md) | backoffice-evolution E2 | draft | `platform.manage_backoffice_ops` | — | — |
| [`platform-and-admin/backoffice-discarded-schools.md`](platform-and-admin/backoffice-discarded-schools.md) | backoffice-evolution E2 | draft | `platform.manage_backoffice_ops` | — | draft |
| [`platform-and-admin/backoffice-platform-billing-p2.md`](platform-and-admin/backoffice-platform-billing-p2.md) | backoffice-evolution E3 | implemented (manual) | `[product decision]` | [`009-platform-admin`](../modeling/009-platform-admin.md) | frozen collection section |
| [`platform-and-admin/platform-subscription-billing.md`](platform-and-admin/platform-subscription-billing.md) | backoffice-evolution collection | validated | `[product decision]` | [`009-platform-admin`](../modeling/009-platform-admin.md) | [`platform-and-admin.md`](../api/v1/platform-and-admin.md) **frozen** |
| [`platform-and-admin/backoffice-impersonation-p2.md`](platform-and-admin/backoffice-impersonation-p2.md) | backoffice-evolution E3 | draft | TBD | — | draft |
| [`platform-and-admin/backoffice-analytics-p2.md`](platform-and-admin/backoffice-analytics-p2.md) | backoffice-evolution E3 | draft | `platform.view_analytics_dashboard` | — | draft |
| [`platform-and-admin/backoffice-multi-unit-p2.md`](platform-and-admin/backoffice-multi-unit-p2.md) | backoffice-evolution E3 | draft | `platform.manage_multi_unit` | TBD | draft |
| [`platform-and-admin/backoffice-help-taxonomy-p2.md`](platform-and-admin/backoffice-help-taxonomy-p2.md) | backoffice-evolution E3 | draft | `platform.configure_help_taxonomy` | TBD | draft |

## Layer PRDs

| PRD | Layer | Status | Capabilities | Modeling | API |
|-----|-------|--------|--------------|----------|-----|
| [`layer-web-spa.md`](layer-web-spa.md) | `frontend/app` design system + MVP menus | draft | N/A (presentation) | — | — |
| [`layer-mobile-app.md`](layer-mobile-app.md) | `mobile/` guardian + teacher MVP | draft | N/A (presentation) | — | — |

## Reference

| File | Purpose |
|------|---------|
| [`template.md`](template.md) | Domain PRD section order and conventions |

## Phase 4B.1 gate (modeling increment — Aug 2026)

All **7** MVP domain folders are **`validated`** (documentation-phase sign-off). Modeling
**`005`** and **`009` Wave 1** have validated DBML/narratives and exported DERs;
their cross-domain API narratives remain **draft**. Modeling for **`006`–`008`** was draft at
this gate; see **Phase 4B.2** below. Layer PRDs remain **draft**; this gate does not
imply API freeze or engineering implementation.

**Next:** Phase 4C — see **Phase 4B.3** below for completed modeling increments.

## Phase 4B.2 gate (modeling increment — Aug 2026)

Modeling **`006`** (communication) and **`007`** (academic) have validated DBML/narratives aligned
with validated domain PRDs. Published dbdocs reflects extended `schema.dbml`. **`AbsenceRecorded`**
event contract and NFR-001 idempotence hooks documented in 007 + `domain_outbox_events` /
`notification_deliveries.domain_event_id`. API narratives [`communication.md`](../api/v1/communication.md)
and [`academic.md`](../api/v1/academic.md) remain **draft**. See **Phase 4B.3** for documents
and billing DBML delta.

**Next:** **Phase 4C** — API contract freeze (modeling complete through 4B.3).

## Phase 4B.3 gate (modeling increment — Aug 2026)

Modeling **`008`** (documents & archive) has validated DBML/narrative aligned with validated
domain PRDs — store, search, guardian view, audit export, signatories, retention P2 hooks, and
cross-domain refs (enrollment contracts, academic attachments). Billing **MVP gap tables** added
to `schema.dbml` with delta documented in [`001-fintech-first`](../modeling/001-fintech-first.md)
appendix (`billing_purposes`, ad-hoc charge columns, notification policy, tiers, remittance, resend
audit). Platform régua automation and P2 NFS-e tables remain **deferred**. Published dbdocs
reflects the prior extended schema; the current uncommitted DBML delta is local only and remote
publication was not authorized. No repository-local DER renderer is installed, so `der_007.png`
and `der_008.png` remain unavailable and no artifacts were fabricated. API narratives remain
**draft**.

**Next:** Phase 4C — API contract freeze per domain (`docs/api/v1/`); then engineering W1 waves.

## Phase 4C.1 gate (API freeze — Platform W1 — Aug 2026)

Platform BC1 school year API is **frozen** for engineering:

| Item | Status |
|------|--------|
| Narrative | [`platform-and-admin.md`](../api/v1/platform-and-admin.md) — header `frozen (Phase 4C.1)` |
| Scope | `school_years`, `academic_periods`, `school_holidays` + cross-domain `school_year_id` |
| Permissions | `manage_school_settings` mutations; active staff reads |
| Cross-domain patches | enrollments, academic, communication, billing, archive narratives |
| Deferred | W2–W5 (calendar, backoffice, staff roster, product access) → **Phase 4C.1b** |

**Next:** 4C.1b (Platform W2–W5 freeze) or parallel 4C.x freezes for other domains; then
engineering W1 waves against frozen contracts.

**Platform subscription billing (2026-08-19):** additional freeze in the same narrative —
[`platform-and-admin.md`](../api/v1/platform-and-admin.md) § Platform subscription billing;
PRD [`platform-subscription-billing.md`](platform-and-admin/platform-subscription-billing.md).
Does not unfreeze W1.
