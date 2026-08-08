# Open Questions

A living backlog of decisions that aren't finalized yet. Each item should become
a recorded decision (in vision/actors) or a PRD.

## Recent decisions (API & clients — Jul 2026)

Recorded from API planning session. Details in `docs/web-stack.md`, `docs/api/`,
and `docs/modeling/002-api-auth.md`.

- [x] **Web UI: React SPA** (`frontend/main`) — not Hotwire as primary UI.
- [x] **Mobile: React Native** (`app/`) — same API contract as web.
- [x] **One API** — `/api/v1` serves both the web SPA and `app`.
- [x] **API docs: rswag** — OpenAPI from request specs; Swagger UI in dev.
- [x] **Auth: Devise + JWT** — access 20 min; refresh 90 days sliding (180 remember me);
      rotation on refresh; web refresh in httpOnly cookie; mobile in secure storage.
- [x] **Serialization: blueprinter** (provisional — revisit if JSON:API need emerges).
- [x] **Tenant in path** — `/api/v1/schools/:school_id/...` for scoped resources.
- [x] **Fintech-first API routes** documented in `docs/api/v1/fintech-first.md`.

## Recent decisions (stakeholder validation — Jul 2026)

Recorded from a conversation with the partner director (escola NSR). Details in
`docs/vision.md` and `docs/actors-and-surfaces.md`.

- [x] **Communication enters the MVP** — priority #1 for the second semester.
      Two-way parent↔teacher and parent↔school messaging, with image sending.
      Audio out of scope.
- [x] **Push notification** — already exists in the current system; keep parity
      in the MVP. Delivery via FCM + queue (Solid Queue) + state machine on the
      API.
- [x] **Real-time is not needed** — information must arrive in a timely manner,
      not in real time. Solid Cable / Turbo Streams are left for phase 2.
- [x] **Web and app in the MVP** — both channels from the start.
- [x] **Registration and login** — all roles need registration and
      authentication.
- [x] **Early childhood education in the MVP** — communication covers the main
      need; a structured daily routine is left for a later phase.
- [x] **Attendance in the MVP** — already exists in the legacy system; automatic
      absence notification is critical and must be reliable (a failure creates
      legal conflict).
- [x] **The Livro Ata (official minutes-record book) can be 100% digital** — the
      physical book is not mandatory; the legal requirement is a valid **digital
      signature**. The Conselho de Educação (Board of Education) audits these
      records frequently.

- [x] **Teacher in the MVP: web and app together** — grades and lesson plans on
      web; messages and attendance on app (both channels available).
- [x] **Repository language is English** — code, API, docs, and branch names use
      English identifiers. Product UI stays `pt-BR` via i18n. Portuguese
      identifiers only for approved domain exceptions (`docs/glossary.md`); ask
      before adding new ones.

## Recent decisions (fintech-first discovery #21 — Aug 2026)

Recorded from discovery issue #21. Details in `docs/prds/fintech-first.md` (BR-011,
UC-03, Open items, Positioning note).

- [x] **Single School Lab product** — billing is the first live module in this monorepo;
      communication and academic domains join the same codebase and schema later (not
      separate products or parallel entity tables).
- [x] **Mora interest (late payment)** — MVP charges mora interest only (no fine, no
      early-payment discount until ~2027). Rate is **per school** in `school_billing_settings`
      with **no platform default** — school must configure before issuance; platform sends
      `interest.rate` to Cora on boleto emission; bank reports settled interest on
      `payments.interest_amount_cents`. `Billing::LateFeeCalculator` stays zero in MVP.
- [x] **Collection régua (MVP)** — **out of scope** for platform implementation; no
      `notification` payload on Cora issuance and no platform mailer yet. Overdue detection
      and dashboard remain. **Future channel:** platform email via `CollectionReguaNotifier`.
- [x] **Guardian payment history (MVP)** — forward-only paid charges on the platform
      (`source: platform`); no CSV import, no Cora backfill in MVP.

## MVP and scope

- [x] **Fintech-first vs School Lab monorepo** — **decided:** single School Lab product;
      billing-first partner slice, then communication/academic on shared entities. See
      `docs/prds/fintech-first.md` (Positioning note) and `docs/product-map.md` §4.

## Identity & Onboarding

PRD: [`docs/prds/identity-and-onboarding/`](prds/identity-and-onboarding/) (draft).

- [x] **Staff role rename** — `school` → `staff` in code; presets for Secretaria/Coordenação/Direção
      (not new roles). See permissions PRD D1–D3.
- [x] **Onboarding modes** — `self_serve` and `white_glove`; lifecycle `provisioning` →
      `pending_handoff` → `active`.
- [x] **Invite flow** — single-use token + set password (not random server password).
- [x] **Enrollment contract does not block login** — signature gate deferred to phase 2 (BR-O11).
- [ ] Transactional email provider for invites (Postmark, SES, …).
- [ ] LGPD consent record location for staff/guardian onboarding.
- [ ] `segments` MVP depth (full entity vs nullable stub).
- [ ] Partner workshop to validate preset × permission matrix before PRDs marked `validated`.

### Enrollment contract signature (Authentic — proposed, phase 2)

Product direction: integrate digital signature for **enrollment contracts** (contrato de
matrícula) — likely via **Authentic** (Brazilian e-signature). **Not confirmed** as vendor;
evaluate against Authentique, Clicksign, and legal requirements in § Contracts below.

- [ ] Confirm **Authentic** (or alternative) as enrollment signature vendor.
- [ ] Authentic webhook authentication and idempotency model.
- [ ] LGPD: retention period and processor role for signed PDFs stored in platform archive.
- [ ] Who triggers contract send to Authentic: backoffice during white-glove vs owner/secretary
      in self-serve.
- [ ] Which business actions signature may gate (charge generation, enrollment activation) —
      login explicitly **not** gated.

**Boundary:** Authentic integration is for **guardian ↔ school enrollment contracts**, not the
commercial SaaS agreement between DLA and the school.

See [`onboarding.md`](prds/identity-and-onboarding/onboarding.md) § Future integration — Authentic.

## MVP and scope (continued)

- [ ] Confirm the full MVP scope: communication + academic (grades, report
      cards, attendance) + billing (boleto) + digital archive. What is left out
      in this first cut?
- [ ] Backoffice in the MVP: only school registration, or also platform billing?
- [ ] Parents in the MVP: app only, or web too? **Docs currently disagree** —
      `docs/prds/fintech-first.md` (Surfaces) says responsive web portal in the MVP with
      the Wave 2 API contract-ready for React Native, while `docs/web-stack.md` and
      `docs/actors-and-surfaces.md` say app first with web in phase 2. Resolve and align
      all four documents; the API itself is channel-agnostic either way.

## Billing

School Lab MVP billing questions remain here. Fintech-first–specific items are tracked
in `docs/prds/fintech-first.md` (Open items).

- [x] **Charge generation recurrence** — automatic monthly fan-out on the 1st at
      6:00 `America/Sao_Paulo` (`Billing::MonthlyChargeGenerationJob`) plus manual
      trigger via `POST /api/v1/schools/:school_id/billing/charge_generations`.
- [x] **Nullable plan base and discount amounts** — `billing_plans.base_amount_cents`
      and `applied_discounts.amount_cents` remain nullable (see `schema.dbml` notes).
      Plans without a default price require `contracts.negotiated_amount_cents`;
      discount rows without `amount_cents` are placeholders until percentage discounts
      or charge-generation discount application ships.
- [x] **Gateway adapter HTTP tests** — WebMock stubs in `spec/gateways/bank_slip/`;
      no VCR cassettes committed. VCR stays configured for optional manual sandbox
      recordings only; CI does not depend on cassettes.
- [ ] **Cora sandbox validation** — end-to-end issuance against Cora sandbox requires a
      live school account and credentials. Manual smoke test only — **outside CI**; automated
      tests use `Gateways::BankSlip::Fake` and WebMock with placeholder URLs.
- [x] **Payment/boleto-issuance integration — decided:** **Cora** in *Integração Direta*
      (Direct Integration) on **the school's own Cora account** — the platform is not a
      payment aggregator and does not hold school funds. Transport is mTLS with a
      per-school certificate/private key on `school_payment_providers`; the product is a
      registered boleto with embedded Pix. Asaas, Iugu, and Pagar.me were considered and
      rejected for the MVP because the partner school already has a direct bank
      relationship. Implemented in `Gateways::BankSlip::Cora::Adapter`; details in
      `docs/prds/fintech-first.md` (Open items) and `docs/guidelines/web/gateways.md`.
- [x] **Delinquency handling (notices, blocks) — partial:** overdue detection shipped
      (`Billing::MarkOverdueChargesService` + `GET /billing/summary`). Automated guardian
      notices are **out of MVP scope** (bank-native behaviour only; platform email régua
      is phase 2). Access blocks for delinquency remain open.
- [x] **Fintech-first — provider charge reference — decided:** the canonical reference is
      `charge_issuances.provider_invoice_id` (one row per bank invoice, partial-unique when
      present), **not** a `psp_charge_id` column on `charges`. `charges` only caches the
      active issuance's `provider_invoice_id`, `boleto_url`, and `pix_copy_paste` so
      guardian reads never call the provider. Reconciliation resolves the issuance from the
      notification's resource id and then re-reads the invoice via `fetch_invoice`.
- [x] **Fintech-first — `device_tokens` table** — shipped: table is in `schema.dbml` and
      `web/db/schema.rb` (`user_id`, `token`, `platform`, partial-unique `token` on kept
      rows), serving `POST /api/v1/me/device_tokens`.
- [x] **Fintech-first — guardian payment history (MVP)** — forward-only; history returns
      `source: platform` for charges paid in this system. Storage/import for
      `source: migrated` / `external_reference` deferred until import scope is defined.
- [x] **Fintech-first — reissue default due date** — `today + 7 business days`
      in the school timezone, skipping weekends and Brazilian national holidays
      (`Billing::BusinessDayCalendar`).
- [x] **Fintech-first — municipal/state banking holidays** — out of scope for
      overdue evaluation; national calendar only (`Billing::BusinessDayCalendar`).
- [x] **Webhook authentication — decided:** secret token in the URL
      (`POST /webhooks/:provider/:token`), **no HMAC signature**. Cora's notification
      carries no body and no signature — only event headers — so there is nothing to sign
      over. Authenticity comes from the per-school `webhook_endpoint_token` plus the rule
      that the notification is never a source of truth: it only triggers an authenticated
      `fetch_invoice` read that decides the outcome. Do not add HMAC verification
      expecting it to be the missing control.
- [x] **Late fee / interest rule — decided:** mora **interest only**, configured **per
      school** (no default rate); sent to Cora as `payment_terms.interest.rate` on
      issuance; no fine in MVP. `Billing::LateFeeCalculator` remains a zero-returning
      placeholder — portal shows original amount + mora notice; interest estimate is
      phase 2. Issuance blocked when the school has not configured a rate.
- [x] **Collection régua channel — decided (MVP):** platform régua **not implemented**;
      reminders are the bank's native behaviour until phase 2. **Future channel:** email via
      `Billing::CollectionReguaNotifier` and `notification_schedule`. WhatsApp/SMS out of
      MVP.

## Digital archive / auditing

- [ ] Which documents does the Secretaria/Conselho require? (official list)
- [ ] Organization: by student, by class, by school year?
- [ ] Document retention and versioning?

## Contracts, signature, and Livro Ata (phase 2 — high priority)

The stakeholder validated strong interest. The Livro Ata shares digital-
signature infrastructure with contracts.

- [ ] Proprietary signature vs. third parties (DocuSign, Authentique,
      Clicksign)? **Product direction (Aug 2026):** enrollment contracts likely via
      **Authentic** — proposed, not confirmed. See Identity & Onboarding PRD and
      `docs/open-questions.md` § Enrollment contract signature. SaaS commercial agreement
      remains outside product scope.
- [ ] Legal requirements for legal validity in Brazil — confirm with a
      specialized lawyer before deciding proprietary vs. third party.
- [ ] Types of minutes in the initial scope: enrollment, Conselho de Classe
      (class council), final results, parent meetings, events that occurred at
      the school (incidents, falls, etc.) — do they all come in together or in
      stages?
- [ ] Minutes generation flow: manual template, guided form, or AI from an
      audio/meeting transcript (the stakeholder's current workflow: recording →
      transcription → Claude with a prompt → review)?
- [ ] Integration with meeting transcription (Google Meet / MCP tool) — phase 2
      or later within the module?
- [ ] Semantic search across the minutes archive — technology (pgvector,
      external service) and scope (minutes only or the entire digital archive)?
- [ ] Formatted printing for a physical Livro Ata — still needed even with a
      valid digital version, or only for schools that prefer a hybrid archive?
- [ ] Migration of historical minutes: older schools have a large physical
      volume; schools up to ~5 years old would have little backlog — offer a
      digitization service or just "born digital"?
- [ ] Conselho de Classe: how many signatories per set of minutes? Parallel vs.
      sequential collection flow to reduce the current turnaround (~1 week)?

## Academic

- [ ] Assessment model (bimester, trimester, concepts vs. grades)?
- [ ] Report card format — per-school template or standard?
- [ ] Attendance reliability rules: validation before triggering an absence
      push; retry/idempotency; auditing of sent notifications.

## Early childhood education / Daily routine (phase 2)

- [ ] Record fields: meals, sleep, hygiene/diaper, health, mood, photos, notes
      (confirmed as the desired set — still need to detail the granularity of
      each field, e.g., meals per serving or overall)
- [ ] How to distinguish an "early childhood education" class vs.
      "elementary/high school" in the modeling — by class segment, by school, or
      configurable?
- [ ] Recording frequency/granularity: by period of the day (morning/afternoon)
      or by discrete event (each diaper change, each meal)?
- [ ] Notification to parents: in real time for each record, or a consolidated
      daily summary?
- [ ] Photos of the day: part of this feature or via messages with images
      (communication module)?
- [ ] Retention/history: for how long does the routine history stay available to
      parents?

## Communication

Scope decision finalized (enters the MVP). Detailing to be resolved:

- [ ] Types in the MVP: 1:1 parent↔teacher and parent↔school chat — do mass
      announcements and contextual comments come in phase 2?
- [ ] Mass announcement (phase 2): whole school, by class, or both?
- [ ] Are read receipts mandatory in announcements? Do they become an auditable
      record (`docs/vision.md` — digital archive)?
- [ ] Teacher response-time expectations — how to avoid demands for 24/7
      availability? (silence outside working hours, a "reply on the next
      business day" notice)
- [ ] Escalation: if a teacher doesn't reply within X time, does the message
      escalate to coordination/school?
- [ ] Push notifications: immediate for everything, or only for urgent items
      (e.g., health, absence) with a daily summary for the rest?
- [ ] Isolation: ensure a parent never sees another family's
      conversation/announcement — enforcement via policy, like the isolation
      between schools?
- [ ] Size/resolution limit for images in messages?

## LGPD / Privacy

- [ ] Legal basis for processing children's data — who consents (legal guardian)
      and where is that recorded in the student's record?
- [ ] LGPD (Brazil's data-protection law) roles: the school as controller, DLA
      as processor — is a Data Protection Officer (DPO) needed? Whose is the
      formal responsibility?
- [ ] Sensitive data (health — early childhood routine fields, medications,
      incidents): does it need differentiated processing/retention from other
      data?
- [ ] Retention: for how long are messages, photos, and routine records kept?
      What happens when the student leaves the school?
- [ ] Access auditing: record who viewed messages/announcements (relevant in
      case of school↔family conflict)?
- [ ] Data subject rights (access, correction, deletion) exercised by the
      guardian on the child's behalf — is the flow defined?
- [ ] Consent form / privacy policy — proprietary legal text or external support
      (legal counsel specialized in education)?

### Billing integration (Cora) — recorded Aug 2026

Pending legal validation; implementation defaults documented here so engineering
does not assume indefinite storage.

- **Provider payload (personal data sent to Cora):** guardian name, CPF, email,
  and phone on bank-slip issuance requests. Cora acts as a personal-data
  processor for this flow — contractual and privacy-policy implications remain
  open.
- **Application logs:** structured billing logs redact CPF, email, phone, PEM
  material, bearer tokens, and client credentials via `Billing::PiiRedactor`.
  Request parameter filtering covers certificate and credential uploads.
- **`webhook_events` retention:** processed rows are purged **180 days** after
  `processed_at` (`Billing::PurgeWebhookEventsJob`; override via
  `WEBHOOK_EVENTS_RETENTION_DAYS`). Unprocessed rows are never deleted — they
  represent unreconciled money movement.
- [ ] **Legal sign-off** on 180-day webhook retention and whether issuance error
      text stored on `charge_issuances.last_error` may retain redacted-only form.

## GTM / business

- [ ] Format of the partnership with the Sindicato (commercial, pricing)?
- [ ] Platform billing model (per student, per school, per plan)?

## Web stack

Decisions finalized in `docs/web-stack.md`. Open items:

- [x] **Web UI** — React SPA in `frontend/main` (not Hotwire).
- [x] **Mobile** — React Native in `app/`.
- [x] **API** — single `/api/v1` for web and mobile; conventions in `docs/api/README.md`.
- [x] **Web auth** — Devise credentials + JWT access + `refresh_tokens`. Schema:
      `docs/database/schema.dbml`. Lifecycle: `docs/modeling/002-api-auth.md`.
- [x] **API documentation** — rswag → OpenAPI.
- [x] **API serialization** — blueprinter (provisional).
- [x] **Firebase Authentication** — not used for login; FCM only for push.
- [x] **SPA UI kit — MUI v7 + Emotion** in `frontend/main`, not Tailwind. Inherited from the
      `dashdark-x` template (`frontend/base`) and kept; no migration planned.
- [x] **Design system catalog — decided:** the **static site** (`frontend/design-system-docs/` →
      `docs/design-system/`, built with `make design-system-docs`) is the **canonical** catalog —
      committed, reviewable, opens without a dev server. **Ladle** stays a development sandbox for
      isolated component work and is **not** a documentation surface: no page or component may
      exist only in Ladle, and the catalog does not link to it. See
      `docs/prds/layer-web-spa.md` (Interfaces → Catalog).
- [x] **SPA test runner — decided:** **Vitest + React Testing Library** on jsdom, installed in
      `frontend/main`. The `test` block lives in `frontend/main/vite.config.ts`, so specs resolve
      the app's path aliases; `npm run test` watches and `npm run test:run` is the single-run CI
      command. Specs sit beside the component (`Component.test.tsx`) and render through
      `src/test/renderWithTheme.tsx`. Conventions: `docs/guidelines/web-ui/testing.md`. Required by
      `docs/prds/layer-web-spa.md` (Non-functional requirements → Testability).
- [x] **SPA API mocking — decided: MSW** (`msw/node`), closing the "not installed yet" note this
      item used to carry. The server starts from `src/test/setup.ts` with
      `onUnhandledRequest: 'error'`, so an unmocked endpoint fails the test instead of reaching the
      network; default handlers live in `src/test/msw/` and a spec overrides one endpoint at a time
      with `server.use()`. Specs mock at the network boundary — `src/services/` and `fetch` are
      never stubbed — which is what lets `src/services/api.test.ts` cover the 401 → refresh → retry
      path for real. Also recorded in `docs/web-stack.md` §3 and §14.
- [x] **Design token versioning — decided:** `@school-lab/design-tokens` carries a semantic version
      and a `CHANGELOG.md` entry for every released change; a change that alters a rendered value is
      a **minor** bump at minimum and never a patch. Policy and format:
      `docs/guidelines/web-ui/versioning.md`. Currently at `1.2.0` (`1.1.0` gave the light scheme
      its own semantic status colours, `1.2.0` moved `light.secondary.darker`). A token change
      without a bump and an entry is an incomplete change, not a small one.
- [ ] **API locale negotiation — documented but unimplemented in `web/`.** `docs/api/README.md`
      lists `Accept-Language: pt-BR` as a request convention and the SPA now sends it on every
      call (`frontend/main/src/services/api.ts`), but **no code in `web/` reads the header**:
      `config/initializers/locale.rb` only sets `default_locale = :"pt-BR"` with `:en` as a
      fallback, and neither `ApplicationController` nor `Api::V1::BaseController` has an
      `around_action` setting `I18n.locale`. Every response is therefore rendered in the default
      locale regardless of what the client asks for — harmless while pt-BR is the only product
      locale, but `Accept-Language: en` is silently ignored today. Decide whether the API should
      honour the header (an `around_action` in `Api::V1::BaseController` restricted to
      `available_locales`) or whether the convention should be documented as pt-BR-only until a
      second locale is a real requirement. Related: the SPA i18n item below.
- [ ] SPA i18n library — still open. The related requirement in `docs/prds/layer-web-spa.md` —
      pattern components carry **no hardcoded user-facing strings** — is closed independently of
      it: every string a pattern renders is now a prop with an English default (`SearchField`,
      `ConfirmDialog`, `ErrorBanner`, `ThemeToggle`, `DataTable`, `EmptyState`; inventory in
      `docs/guidelines/web-ui/components.md` → Strings). Defaults stayed English because that is
      what the codebase shipped and there is no i18n layer to hold pt-BR keys, so the wording of a
      default prejudges no library. What is open is which library supplies the translations, and
      how its keys reach these props. Related: the API `Accept-Language` item above.
- [x] **Design system — MUI `Card` and `Table` — decided:** **forbidden by default**, documented
      as such, and **no override is created**. `SectionCard` (themed `Paper`) is the card surface
      and `DataTable` (`@mui/x-data-grid`) is the tabular one; reach for those. The ban formalises
      what the codebase already does — neither primitive is imported anywhere in `frontend/main` —
      and keeps a single sanctioned route to each result, where an override would create a second
      one. **Revisit if** a product screen needs genuinely static, non-paginated tabular content
      that `DataTable` is the wrong tool for (a printable report, a fixed reference matrix): that
      reopens the decision here first and does not authorise a local import. Recorded in
      `docs/prds/layer-web-spa.md`, `docs/guidelines/web-ui/theming.md` and the catalog
      (Foundations → Theming, Content → Tables).
- [x] **Design system — WCAG 2.1 AA is the accessibility target — decided 2026-08-04** by the
      product owner. Any token that cannot reach AA without breaking the DashdarkX visual identity
      gets a **written waiver** naming the token, the measured ratio and the reason. The audit is
      `docs/guidelines/web-ui/accessibility.md`: 48 pairings measured per scheme, twelve fixes
      applied, and **no blocking AA failure left in either scheme**. Four waivers stand — W1
      disabled text (exempt under SC 1.4.3), W2 decorative surface adjacency, W3 the contained
      primary Button label, W4 chart series colours and their legend swatches.
      **The gradient waiver (W3) is the one that was a product call:** the contained primary Button
      paints `linear-gradient(128.49deg, #CB3CFF 19.86%, #7F25FB 68.34%)`, and no flat label colour
      exists whose worst stop beats **3.73:1** — a sweep of the whole RGB cube confirms white is the
      ceiling, against a 4.5:1 requirement. Reaching AA means darkening the first stop to about
      `#B733E5`, which repaints the brand purple named in `docs/web-stack.md` §14 everywhere to buy
      0.82 of a ratio point on one control. **The product owner declined that change**, so the
      shortfall is accepted, confined to the label, and pinned by a spec that fails if the label
      stops being white. Revisit only if the brand palette is reopened.
      **Left for a human:** W4 accepts dark `secondary.lighter` (`#0E43FB`) at 2.69:1, light
      `secondary.lighter` at 2.21:1 and light `secondary.light` at 2.04:1 against the card they sit
      on. No AA threshold governs a series colour, but a deep blue on dark navy is a legibility
      question the standard does not answer; moving any of them is a minor token bump and a repaint
      of the DashdarkX charts.
- [ ] SPA data fetching — keep hand-rolled `fetch`, or adopt TanStack Query / SWR?
- [ ] SPA global state — stay on React Context, or add a store?
- [ ] SPA API types — hand-written in `src/types/`, or generated from the OpenAPI spec?
- [ ] Email provider (Postmark, SES, etc.)?
- [x] **Boleto integration** — Cora Direct Integration on the school's own account
      (mTLS); see the Billing section above.
- [ ] When to add Redis (cache only) — scaling criterion?

## Infrastructure & deployment

Deploy setup is documented in `docs/guidelines/process/deployment.md`.

- [x] **Deploy tooling — Kamal 2**, manual, two destinations (`production`, `staging`)
      sharing one app server. PostgreSQL 17 and Redis run natively on a separate VPS and
      are **not** Kamal accessories.
- [x] **Three-service topology** — `site/` at `/`, `frontend/` SPA at `/app`, `web/` API at
      `/api`, `/up`, `/api-docs`, `/webhooks`. Deploy order: site → SPA → API. API uses
      `path_prefixes` with `strip_path_prefix: false`.
- [x] **SPA base path `/app`** — `VITE_BASE_PATH=/app/` for production builds; React Router
      `basename` from `import.meta.env.BASE_URL`; same-origin API via empty `VITE_API_BASE_URL`.
- [x] **Static marketing site** — `site/` serves placeholder HTML at domain root; no build step.
- [x] **Solid Queue / Solid Cache stay in the primary database** — enqueue participates
      in the same transaction as the domain writes. Only Solid Cable uses a separate
      database (`*_cable`).
- [ ] **Active Storage backend in production** — currently `:local` on a Kamal volume on
      the app server, which is not covered by the deploy process's backups. Move to S3
      (or compatible object storage) before onboarding schools that upload documents?
      `docs/web-stack.md` already assumes S3 for the MVP — resolve the divergence.
- [ ] **`schema_format = :sql` for pgvector** — the extension is available in the
      databases but no `vector` column exists, so `schema.rb` loses nothing today. The
      first embedding migration (arriving with `ruby_llm`) requires switching to
      `:sql` **and** ensuring the extension is created by migration, not by hand.
- [ ] **Continuous deployment** — CI builds the production image but never pushes it
      (`.github/workflows/ci.yml`). Automate deploys via GitHub Actions, or keep them
      manual?
