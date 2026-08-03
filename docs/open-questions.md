# Open Questions

A living backlog of decisions that aren't finalized yet. Each item should become
a recorded decision (in vision/actors) or a PRD.

## Recent decisions (API & clients — Jul 2026)

Recorded from API planning session. Details in `docs/web-stack.md`, `docs/api/`,
and `docs/modeling/002-api-auth.md`.

- [x] **Web UI: React SPA** (`web-ui/`) — not Hotwire as primary UI.
- [x] **Mobile: React Native** (`app/`) — same API contract as web.
- [x] **One API** — `/api/v1` serves both `web-ui` and `app`.
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

## MVP and scope

- [ ] **Fintech-first vs School Lab monorepo** — separate product or same codebase
      with two entry points? Foundational modeling started in `docs/database/` and
      `docs/modeling/001-fintech-first.md`; decision affects convergence with main
      MVP entities. See `docs/prds/fintech-first.md` (Positioning note).
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
- [ ] Delinquency handling (notices, blocks)? — overdue detection shipped
      (`Billing::MarkOverdueChargesService` + `GET /billing/summary`); the notice channel
      and any access block remain open (see the collection régua item below).
- [x] **Fintech-first — provider charge reference — decided:** the canonical reference is
      `charge_issuances.provider_invoice_id` (one row per bank invoice, partial-unique when
      present), **not** a `psp_charge_id` column on `charges`. `charges` only caches the
      active issuance's `provider_invoice_id`, `boleto_url`, and `pix_copy_paste` so
      guardian reads never call the provider. Reconciliation resolves the issuance from the
      notification's resource id and then re-reads the invoice via `fetch_invoice`.
- [x] **Fintech-first — `device_tokens` table** — shipped: table is in `schema.dbml` and
      `web/db/schema.rb` (`user_id`, `token`, `platform`, partial-unique `token` on kept
      rows), serving `POST /api/v1/me/device_tokens`.
- [ ] **Fintech-first — migrated payment history** — storage for `source: migrated`
      and `external_reference` on guardian charge history.
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
- [ ] **Late fee / interest rule** — per school or per billing plan, and the actual
      fee/interest formula. `Billing::LateFeeCalculator` is a zero-returning placeholder,
      so overdue charges currently keep `late_fee_amount_cents: 0`.
- [ ] **Collection régua channel** — email, WhatsApp, SMS, or a per-school combination.
      `Billing::CollectionReguaNotifier` only writes a log line today; no reminder is
      delivered to guardians.

## Digital archive / auditing

- [ ] Which documents does the Secretaria/Conselho require? (official list)
- [ ] Organization: by student, by class, by school year?
- [ ] Document retention and versioning?

## Contracts, signature, and Livro Ata (phase 2 — high priority)

The stakeholder validated strong interest. The Livro Ata shares digital-
signature infrastructure with contracts.

- [ ] Proprietary signature vs. third parties (DocuSign, Authentique,
      Clicksign)? Proposal under evaluation: a proprietary advanced signature
      with a scribble (drawn field) + email + IP + hash — it needs to match the
      standard accepted by the notary's office (DocuSign/Authentique). Legal
      validation pending (Lei 14.063/2020).
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

- [x] **Web UI** — React SPA in `web-ui/` (not Hotwire).
- [x] **Mobile** — React Native in `app/`.
- [x] **API** — single `/api/v1` for web and mobile; conventions in `docs/api/README.md`.
- [x] **Web auth** — Devise credentials + JWT access + `refresh_tokens`. Schema:
      `docs/database/schema.dbml`. Lifecycle: `docs/modeling/002-api-auth.md`.
- [x] **API documentation** — rswag → OpenAPI.
- [x] **API serialization** — blueprinter (provisional).
- [x] **Firebase Authentication** — not used for login; FCM only for push.
- [ ] Email provider (Postmark, SES, etc.)?
- [x] **Boleto integration** — Cora Direct Integration on the school's own account
      (mTLS); see the Billing section above.
- [ ] When to add Redis (cache only) — scaling criterion?
