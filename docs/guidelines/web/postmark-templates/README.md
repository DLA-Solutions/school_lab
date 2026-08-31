# Postmark email templates (Scholar Premium)

Reference HTML for manual upload to the Postmark dashboard. Rails sends these via
`Gateways::Email` using `TemplateAlias` + `TemplateModel` — no ERB rendering in production.

Brand: navy `#082366`, gold CTA `#E5A417`, ivory background `#F7FAFC`, Inter font.
Logo (color on white header): host at a stable HTTPS URL or use the site asset path below.

## Upload checklist

1. Postmark → **Templates** → **Add template** → **Code your own** → **Layout template**
   - Alias: `sp-layout-transactional`
   - Paste `sp-layout-transactional.html`
2. For each child template: **Add template** → **Standard template** → assign layout
   `sp-layout-transactional`, set alias and subject, paste HTML, save and **activate**.
3. Send a test with the JSON payloads below (Postmark → template → **Send test**).
4. Confirm tags appear in Postmark activity (used for filtering in Rails).

Logo URL used in artifacts: `https://scholarpremium.com.br/assets/brand/logo_lockup.png`
(source asset: `docs/design-system/assets/logo_lockup-C5ZotGGA.png` — publish to site CDN).

## Contract

| Alias | Mailer | Tag | Subject (pt-BR, Mustache) |
|-------|--------|-----|---------------------------|
| `sp-layout-transactional` | Layout wrapper | — | — |
| `sp-auth-password-reset` | `AuthMailer#password_reset` | `auth-password-reset` | `Redefinição de senha — Scholar Premium` |
| `sp-people-membership-invite` | `PeopleMailer#membership_invite` | `people-membership-invite` | `Convite para {{school_name}} — Scholar Premium` |
| `sp-billing-collection-reminder` | `BillingMailer#collection_reminder` | `billing-collection-reminder` | `Cobrança em aberto — {{amount}}` |
| `sp-marketing-demo-request` | `MarketingMailer#demo_request` | `marketing-demo-request` | `Demonstração solicitada — {{name}}` |
| `sp-marketing-demo-confirmation` | `MarketingMailer#demo_request_confirmation` | `marketing-demo-confirmation` | `Recebemos sua solicitação — Scholar Premium` |

Subjects avoid guardian PII where possible (billing uses amount only). Copy lives in the
template HTML; Rails passes **dynamic variables only**.

### `sp-auth-password-reset`

| Variable | Type | Description |
|----------|------|-------------|
| `cta_url` | string | Password reset deep link |
| `expiry_hours` | number | Link validity in hours (Rails sends `6`) |

```json
{
  "cta_url": "https://scholarpremium.com.br/app/redefinir-senha?token=sample",
  "expiry_hours": 6
}
```

### `sp-people-membership-invite`

| Variable | Type | Description |
|----------|------|-------------|
| `school_name` | string | Inviting school display name |
| `cta_url` | string | Invite accept URL with token |
| `expiry_days` | number | Link validity in days (Rails sends `7`) |

```json
{
  "school_name": "Escola Exemplo",
  "cta_url": "https://scholarpremium.com.br/app/invite/accept?token=abc&email=director%40example.com",
  "expiry_days": 7
}
```

### `sp-billing-collection-reminder`

| Variable | Type | Description |
|----------|------|-------------|
| `guardian_name` | string | Financially responsible guardian name |
| `amount` | string | Formatted BRL amount (e.g. `R$ 150,50`) |
| `due_date` | string | Due date `DD/MM/YYYY` |
| `boleto_url` | string | Boleto payment URL (may be empty) |
| `pix_code` | string | Pix copia e cola (may be empty) |
| `has_boleto` | boolean | Render boleto CTA block |
| `has_pix` | boolean | Render Pix block |

```json
{
  "guardian_name": "Maria Silva",
  "amount": "R$ 150,50",
  "due_date": "15/08/2026",
  "boleto_url": "https://boleto.example/123",
  "pix_code": "00020126580014BR",
  "has_boleto": true,
  "has_pix": true
}
```

Minimal payload (Pix only):

```json
{
  "guardian_name": "Maria Silva",
  "amount": "R$ 150,50",
  "due_date": "15/08/2026",
  "boleto_url": "",
  "pix_code": "",
  "has_boleto": false,
  "has_pix": false
}
```

### `sp-marketing-demo-confirmation`

| Variable | Type | Description |
|----------|------|-------------|
| `name` | string | Requester name |

```json
{
  "name": "Maria Silva"
}
```

### `sp-marketing-demo-request`

| Variable | Type | Description |
|----------|------|-------------|
| `name` | string | Requester name |
| `email` | string | Requester email |
| `phone` | string | WhatsApp phone |
| `submitted_at` | string | Localized timestamp |

```json
{
  "name": "Maria Silva",
  "email": "maria@example.com",
  "phone": "+55 11 99999-0000",
  "submitted_at": "21 de agosto de 2026, 10:30"
}
```

## Layout variables

The layout (`sp-layout-transactional`) expects:

| Variable | Description |
|----------|-------------|
| `subject` | Email subject (Postmark injects automatically) |
| `preheader` | Inbox preview line (optional; child may set via Postmark preheader field) |
| `@content` | Child template body (layout placeholder `{{{ @content }}}`) |

Child templates should set a **preheader** in the Postmark editor when uploading (see each HTML file comment).
