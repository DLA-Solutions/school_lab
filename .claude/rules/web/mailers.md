> Transactional email — async delivery, i18n, LGPD-aware content
>
> **Relevant when touching:** `web/app/mailers/**/*.rb`, `web/app/views/**/*mailer*`, `web/spec/mailers/**/*.rb`

# web/ — Mailers

Full guide: `docs/guidelines/web/mailers.md`. Provider: `docs/open-questions.md`. Related: `jobs`, `gateways`.

## Role

- Services decide **when**; mailers define **what** — no business rules in mailers.
- `deliver_later` from services — never `deliver_now` in request cycle (except tests).

## Conventions

- Strings via i18n (`config/locales/pt-BR.yml`) — no hardcoded Portuguese in templates.
- `Mailer.with(...).action.deliver_later` — pass scoped records or IDs.
- Minimize PII in subject lines; LGPD-sensitive content only when required.

## Local vs provider delivery (hard rule)

- **Development** — `delivery_method = :letter_opener_web` (inbox at `/letter_opener`). Never `:postmark`, SMTP, or any provider API — even if `POSTMARK_API_TOKEN` is in `.env`.
- **Test** — `delivery_method = :test` (`ActionMailer::Base.deliveries`). Never Letter Opener in RSpec (no browser/files), never the provider API.
- **Production / staging** — Postmark only when `POSTMARK_API_TOKEN` is set **and** the process is not a test suite. Agent/smoke checks must not trigger mail (rule `email-safety`).
- `SchoolLab::EmailDelivery.configured?` is true in development, test, and any RSpec process so mail is not skipped for lack of a token.
- `DISABLE_EMAIL_DELIVERY=true` skips provider send on staging/production (jobs no-op). Not a license to hit mail endpoints on a live host.
- Specs must not set a real provider token to “enable” mail, call Postmark, or allow-list `api.postmarkapp.com` in WebMock.

## Testing

- Mailer specs: subject, to, key body; `have_enqueued_job(ActionMailer::MailDeliveryJob)` in service specs.
- Test env: `delivery_method = :test`. Stub `SchoolLab::EmailDelivery.configured?` only when asserting the production skip path.
