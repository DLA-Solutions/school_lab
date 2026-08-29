# Mailers

Email conventions for `web/app/mailers/`. Staging/production deliver through Postmark
**templates** via `Gateways::Email`; development and RSpec use the `Fake` adapter (logs
payload, no API calls).

Rule: `.cursor/rules/web/mailers.mdc`. Related: `jobs`, `gateways`.
Postmark HTML reference: `postmark-templates/README.md`.

## Role

Mailers format and deliver **transactional email** (password reset, boleto notice, school
announcements). They do not own business rules — services decide *when* to send; mailers
define *what* is sent.

Delivery is **async** via ActiveJob + Solid Queue — never `deliver_now` in request cycle
except in tests or explicit dev tools.

## Layout

| Piece | Location |
|-------|----------|
| Application mailer | `app/mailers/application_mailer.rb` |
| Domain mailers | `app/mailers/<domain>_mailer.rb` |
| Postmark HTML (upload) | `docs/guidelines/web/postmark-templates/` |
| Email gateway | `app/services/gateways/email/` |
| Specs | `spec/mailers/` |

## Postmark templates

Product copy lives in Postmark (Mustache). Rails mailers call `template_mail` with
`template_alias`, `template_model`, `tag`, and envelope fields (`to`, `subject`, `reply_to`).
Subjects with dynamic fragments still use i18n keys in Rails for logging and tests; body
copy is **not** rendered from ERB.

| Alias | Mailer |
|-------|--------|
| `sp-auth-password-reset` | `AuthMailer#password_reset` |
| `sp-people-membership-invite` | `PeopleMailer#membership_invite` |
| `sp-billing-collection-reminder` | `BillingMailer#collection_reminder` |
| `sp-marketing-demo-request` | `MarketingMailer#demo_request` |

Upload procedure and test JSON payloads: `postmark-templates/README.md`.

## Conventions

| Rule | Detail |
|------|--------|
| **Locale** | Subject lines via `config/locales/pt-BR.yml`; template body copy in Postmark |
| **Async delivery** | `Mailer.with(...).action.deliver_later` from services |
| **IDs in mailers** | Pass IDs or simple value objects — load records in mailer if needed, scoped by school |
| **LGPD** | Minimize PII in subject lines; no sensitive child health data in email body without need |

```ruby
# Service — after successful persistence
BillingMailer.with(charge: charge, guardian: guardian)
             .boleto_issued
             .deliver_later
```

## Devise mailers

Password reset and unlock use Devise mailer hooks — customize via `app/mailers/devise_mailer.rb`
and locale files. Keep templates consistent with product branding (layout in
`application_mailer`).

## Local vs provider delivery

Local work must **never** call Postmark (or any mail provider API), even when
`POSTMARK_API_TOKEN` is present in `.env`.

| Environment | Delivery | Inbox / inspect |
|-------------|---------|-----------------|
| Development | `:email_gateway` → `Gateways::Email::Fake` | Rails log (`email.fake_delivery` JSON) |
| Test (RSpec) | `:email_gateway` → `Gateways::Email::Fake` | Mailer specs read `X-Template-*` headers; `Gateways::Email::Fake.deliveries` after `deliver` |
| Production / staging | `:email_gateway` → `Gateways::Email::Postmark::Adapter` when `POSTMARK_API_TOKEN` is set | Provider dashboard |

`SchoolLab::EmailDelivery.configured?` is true in development, test, and any RSpec
process so invite and régua mail is not skipped for lack of a token. Live staging
and production still gate on the token.

`DISABLE_EMAIL_DELIVERY=true` makes `configured?` false on staging/production so
jobs skip send. Use it as a host-level kill switch — not as permission to exercise
mail endpoints on a live host.

Do not set `config.action_mailer.delivery_method = :postmark` in `development.rb` or
`test.rb`. An initializer must force `:email_gateway` when the process is RSpec and raise if
a local or RSpec process is pointed at Postmark.

### Staging and production checks

Agents and humans verifying a live host must **not** send mail “to see if it works”:

- Allowed: `GET /up`, login with **existing** credentials, read-only pages.
- Forbidden: invite, password reset, guardian access, school create/handoff,
  collection régua, `deliver_now` / `deliver_later`, `rails runner` mailers.

Preview template HTML from `postmark-templates/` in Postmark's test send UI. Assert mail in
RSpec via template headers and `Gateways::Email::Fake.deliveries`.

## Testing

- Mailer specs assert **subject**, **to**, `template_alias`, and `template_model` (see
  `spec/support/template_mail_helpers.rb`).
- Service/request specs use `have_enqueued_job(ActionMailer::MailDeliveryJob)` or
  `perform_enqueued_jobs` when delivery is the behavior under test.
- Do not send real email in test — `delivery_method = :email_gateway` with `Fake`.
- Do not set `POSTMARK_API_TOKEN` in specs to enable mail. Stub
  `SchoolLab::EmailDelivery.configured?` only when asserting the production skip path.

## Provider adapter

Postmark template delivery is implemented in `Gateways::Email::Postmark::Adapter`. See
`gateways.md` for the port contract and error taxonomy.
