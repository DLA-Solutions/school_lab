# Mailers

Email conventions for `web/app/mailers/`. Provider choice is open in
`docs/open-questions.md` — conventions apply regardless of adapter.

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

## Testing

- Mailer specs assert **subject**, **to**, and key body content (i18n rendered).
- Service/request specs use `have_enqueued_job(ActionMailer::MailDeliveryJob)` or
  `perform_enqueued_jobs` when delivery is the behavior under test.
- Do not send real email in test — `config.action_mailer.delivery_method = :test`.

## Provider adapter

When a provider is chosen (Postmark, SES, etc.), configure in `config/environments/*.rb` and
extract API calls to a **gateway adapter** if the integration grows beyond Rails mailer config.
See `gateways.md`.
