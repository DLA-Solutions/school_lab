# Mailers

Email conventions for `web/app/mailers/`. Staging/production use Postmark;
local development uses Letter Opener and RSpec uses `:test` — never the
provider API.

Rule: `.cursor/rules/web/mailers.mdc`. Related: `jobs`, `gateways`.

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
| Views | `app/views/<mailer>/<action>.html.erb` (and `.text.erb`) |
| Specs | `spec/mailers/` |

## Conventions

| Rule | Detail |
|------|--------|
| **Locale** | Product strings in `config/locales/pt-BR.yml` — `t("billing.mailer.boleto_issued.subject")` |
| **No hardcoded Portuguese** | In mailer classes or templates — use i18n keys (see `language-conventions` rule) |
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
| Development | `:letter_opener_web` | Browse `http://localhost:3000/letter_opener` |
| Test (RSpec) | `:test` (forced even if `RAILS_ENV=production`) | `ActionMailer::Base.deliveries` |
| Production / staging | `:postmark` when `POSTMARK_API_TOKEN` is set | Provider dashboard |

`SchoolLab::EmailDelivery.configured?` is true in development, test, and any RSpec
process so invite and régua mail is not skipped for lack of a token. Live staging
and production still gate on the token.

`DISABLE_EMAIL_DELIVERY=true` makes `configured?` false on staging/production so
jobs skip send. Use it as a host-level kill switch — not as permission to exercise
mail endpoints on a live host.

Do not set `config.action_mailer.delivery_method = :postmark` in `development.rb` or
`test.rb`. An initializer must force `:test` when the process is RSpec and raise if
a local or RSpec process is pointed at Postmark.

### Staging and production checks

Agents and humans verifying a live host must **not** send mail “to see if it works”:

- Allowed: `GET /up`, login with **existing** credentials, read-only pages.
- Forbidden: invite, password reset, guardian access, school create/handoff,
  collection régua, `deliver_now` / `deliver_later`, `rails runner` mailers.

Preview templates locally with Letter Opener. Assert mail in RSpec with `:test`.

## Testing

- Mailer specs assert **subject**, **to**, and key body content (i18n rendered).
- Service/request specs use `have_enqueued_job(ActionMailer::MailDeliveryJob)` or
  `perform_enqueued_jobs` when delivery is the behavior under test.
- Do not send real email in test — `config.action_mailer.delivery_method = :test`.
- Do not set `POSTMARK_API_TOKEN` in specs to enable mail. Stub
  `SchoolLab::EmailDelivery.configured?` only when asserting the production skip path.
- Letter Opener is a **development** preview tool — do not use it as the RSpec
  delivery method (no browser, no `tmp/letter_opener` assertions in CI).

## Provider adapter

Postmark is configured only in `config/environments/production.rb` (and staging via
the same file + Kamal secrets). Extract API calls to a **gateway adapter** if the
integration grows beyond Rails mailer config. See `gateways.md`.
