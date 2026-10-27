# API v1 — Billing

> PRDs: [`docs/prds/billing/`](../../prds/billing/)  
> Baseline (implemented): [`fintech-first.md`](fintech-first.md)  
> Modeling: [`docs/modeling/001-fintech-first.md`](../../modeling/001-fintech-first.md)  
> Platform contract: [`platform-and-admin.md`](platform-and-admin.md) — **frozen W1 (4C.1)**  
> Conventions: [`docs/api/README.md`](../README.md)

Full MVP billing domain narrative. **All routes below extend** the fintech-first partner slice;
paths not yet in `web/` return `501` until their wave ships.

---

## School year context

Charge generation and contract scoping align with the active school year per the frozen Platform
contract ([`platform-and-admin.md`](platform-and-admin.md) § Cross-domain contract):

- New charge generation for a cycle resolves the **active** school year via
  `Platform::ActiveSchoolYearService` (or explicit `school_year_id` on future batch routes).
- **Archived** years block new charge generation (`422 archived_school_year`) per BR-SY07.
- Contracts with `enrollment_id` inherit the enrollment's `school_year_id`; legacy student-only
  contracts without enrollment linkage remain a migration concern
  ([`open-questions.md`](../../open-questions.md) § Legacy billing year resolution).
- Optional `?school_year_id=` on delinquency dashboard and summary filters when multi-year views
  ship in billing W2+.

---

## Relationship to fintech-first

| Area | fintech-first status | billing PRD extension |
|------|---------------------|------------------------|
| Charges, boletos, Cora | **implemented** | Adjustments, plan bands, batch pay |
| Guardian portal | **implemented** | Forward-only history (unchanged) |
| Dunning dashboard | **partial** | Summary + filters — régua deferred |
| NFS-e | — | **implemented (BC7 v1)** — [`invoices.md`](../../prds/billing/invoices.md) |
| Card/Pix checkout | stub | W4+ per [`payments.md`](../../prds/billing/payments.md) |

---

## Implemented routes (reference)

See [`fintech-first.md`](fintech-first.md) for request/response examples:

- `GET/POST /schools/:id/billing/charges` — staff list/show/create/cancel/reissue also return `payment_methods`, see [Staff charges: payment methods and boleto PDF](#staff-charges-payment-methods-and-boleto-pdf-implemented)
- `GET /schools/:id/billing/charges/:id/boleto_pdf` (staff) — same PDF the guardian previews
- `POST /billing/charges/:id/issue`, `/reissue`, `/cancel`
- `GET/POST /schools/:id/billing/charge_batches` — bulk issuance, see [Bulk issuance](#bulk-issuance-charge_batches-implemented)
- `GET /billing/summary`
- `GET /schools/:id/me/charges` (guardian) — unified list, see [Guardian charges list](#guardian-charges-list-implemented)
- `school_payment_providers`, `school_billing_settings`
- Webhooks: `POST /webhooks/:provider/:token`

---

## Guardian charges list (implemented)

`GET /api/v1/schools/:school_id/me/charges` — the single "Meus boletos" list for the logged-in
guardian (`role: guardian` membership). It returns every boleto issued to that guardian: open,
overdue **and** paid, each carrying a `status` tag. Cancelled and soft-deleted charges never
appear. Family isolation is enforced by Pundit (`policy_scope(Charge)`): another guardian's
charges are simply absent, and a linked-child filter for someone else's child is `404`.

### Status semantics

| `status` | Meaning | `paid_at` | Payment actions |
|----------|---------|-----------|-----------------|
| `pending` | Issued, not paid, not yet past due plus the school's grace window | `null` | `payment_methods` usable |
| `overdue` | Not paid and past due plus grace; flagged by the daily sweep (06:30 America/Sao_Paulo), `total_amount_cents` already includes the late fee | `null` | `payment_methods` usable (reissue allowed) |
| `paid` | Settled by the bank's webhook ("baixa") | ISO 8601 UTC, the bank's payment time | Not meaningful — clients must hide pay actions |

The API sends machine codes only; labels such as "Pago", "Em aberto" and "Atrasado" belong to
client i18n.

Status changes only server-side: the provider webhook settles a boleto (`pending`/`overdue` ->
`paid`), the daily sweep turns `pending` into `overdue`. `paid` is terminal — a repeated, late or
stale webhook never moves a paid boleto back.

### Query parameters

All optional. Invalid values return `422` with the standard error envelope
(`error.code: "validation_error"`, `error.details.<param>: [message]`; every problem is reported
at once).

| Param | Values | Notes |
|-------|--------|-------|
| `status` | `all`, or a comma list / repeated param of `paid`, `pending`, `overdue` | **Opt-in to the unified list.** See "Backward compatibility". `cancelled` is rejected |
| `student_id` | linked child id | Unlinked child -> `404 not_found` |
| `month` | `1`-`12` | Filters by **`due_date`** in that calendar month. Requires `year` |
| `year` | 4 digits, e.g. `2026` | Alone: the whole calendar year. With `month`: that month |
| `from` | ISO date `YYYY-MM-DD` | Inclusive lower bound on `due_date` |
| `to` | ISO date `YYYY-MM-DD` | Inclusive upper bound on `due_date`; must be `>= from` |
| `order` | `asc` \| `desc` | By `due_date` (ties by `id`); undated charges last. Default `desc` with `status`, `asc` without |
| `page`, `limit` | integers | Pagy; default `limit` 25, max 100 |

**Filter precedence:** `month`/`year` and `from`/`to` are two ways to express the same thing and
are **mutually exclusive** — sending both is `422` (keys `from`/`to`). `status`, `student_id` and
the period filters combine with AND. Every period filter works on `due_date`, not on the payment
date. A "month" picker in the client sends `month`+`year`; a range picker sends `from`/`to`.

### Backward compatibility (`status` omitted)

Without `status` the endpoint behaves exactly as before the unified list shipped: only `pending`
and `overdue` charges, oldest due date first. This keeps already-installed mobile builds
(`fetchOpenCharges`) from suddenly listing paid boletos as "open". New clients **must send
`status=all`** (or an explicit list) to get the unified list. The period filters apply in both
modes.

`GET /me/charges/history` is unchanged (paid only, `updated_at` desc, view without `due_date` and
`payment_methods`, `source: "platform"`). It stays for the mobile history screen; web clients
should use `status=paid` on this endpoint instead and treat `/history` as legacy.

### Response

```http
GET /api/v1/schools/7/me/charges?status=all&month=8&year=2026
```

```json
{
  "data": [
    {
      "id": 214,
      "billing_period": "2026-08-01",
      "total_amount_cents": 85000,
      "late_fee_amount_cents": 0,
      "due_date": "2026-08-10",
      "status": "paid",
      "paid_at": "2026-08-07T14:30:12.000Z",
      "kind": "tuition",
      "description": null,
      "boleto_url": "https://provider.example/boleto/abc",
      "billing_purpose_id": null,
      "billing_purpose_code": null,
      "tax_declaration_eligible": false,
      "contract_id": 31,
      "student": { "id": 12, "name": "Pedro Silva" },
      "interest_rate_percent": 1.0,
      "payment_methods": {
        "boleto_url": "https://provider.example/boleto/abc",
        "pix_copy_paste": "00020126580014br.gov.bcb.pix...",
        "digitable_line": "23793.38128 60000.000003 00000.000400 1 93480000085000",
        "boleto_pdf_available": false
      }
    },
    {
      "id": 198,
      "billing_period": "2026-08-01",
      "total_amount_cents": 87500,
      "late_fee_amount_cents": 2500,
      "due_date": "2026-08-01",
      "status": "overdue",
      "paid_at": null,
      "kind": "one_off",
      "description": "Excursion",
      "boleto_url": "https://provider.example/boleto/def",
      "billing_purpose_id": 4,
      "billing_purpose_code": "field_trip",
      "tax_declaration_eligible": false,
      "contract_id": null,
      "student": null,
      "interest_rate_percent": 1.0,
      "payment_methods": {
        "boleto_url": "https://provider.example/boleto/def",
        "pix_copy_paste": null,
        "digitable_line": null,
        "boleto_pdf_available": false
      }
    }
  ],
  "meta": { "page": 1, "per_page": 25, "total": 2 }
}
```

Field notes:

- Money is integer cents (`total_amount_cents`); dates are ISO; `paid_at` is a UTC timestamp.
- `student` is `null` on a one-off charge raised outside any contract; `description` is free text
  set by the school (mostly one-offs).
- `interest_rate_percent` is the school's monthly mora rate, or `null` when unset.
- For `paid` rows `payment_methods`/`boleto_url` may still hold the old slip data; do not offer
  payment.
- `payment_methods` (also on `GET /me/charges/:id` and the reissue response; absent from
  `/history`) is always an object with exactly these four keys:

  | Key | Type | Meaning |
  |-----|------|---------|
  | `boleto_url` | string \| null | Provider-hosted boleto link (Cora). Always `null` for Banco Inter, which has no hosted link: use `boleto_pdf_available` + the PDF endpoint below. |
  | `pix_copy_paste` | string \| null | Pix "copia e cola" (EMV). `null` until the provider has produced it. |
  | `digitable_line` | string \| null | Boleto "linha digitável" (formatted, with dots/spaces). `null` until the provider has produced it. |
  | `boleto_pdf_available` | boolean | `true` only when the charge is `pending`/`overdue`, not discarded, and its current issuance has a registered boleto at a provider that serves PDFs through the API (Banco Inter). Show the preview only when `true`. Never `null`. |

  **Banco Inter issues asynchronously.** Right after a charge is issued the three data fields can
  still be `null` / `false`. The API re-reads Inter by itself about 10 s after issuing and
  retries up to six times over roughly 43 minutes (a webhook also fills them); clients should
  show a "boleto being generated" state and refetch the charge (for example every 15–30 s while
  `digitable_line` and `pix_copy_paste` are `null`). Cora/Fake charges always have all three
  immediately.

### Boleto PDF preview (Banco Inter)

`GET /api/v1/schools/:school_id/me/charges/:id/boleto_pdf` — streams the boleto PDF of the
logged-in guardian's own charge. Inter's PDF requires mTLS + OAuth, so the SPA cannot fetch it
from the bank: the API fetches it per request and relays the bytes. Nothing is stored.

- Auth: `Authorization: Bearer <access token>`, `role: guardian` membership of `:school_id`.
- Success: `200`, `Content-Type: application/pdf`, `Content-Disposition: inline;
  filename="boleto-<charge id>.pdf"`, `Cache-Control: private, no-store`. Fetch it with the auth
  header (a bare `<iframe src>` cannot send it): request as a blob and use
  `URL.createObjectURL`.
- Only call it when `payment_methods.boleto_pdf_available` is `true`.

| Status | `error.code` | When |
|--------|--------------|------|
| `401` | `unauthorized` | Missing/invalid token |
| `403` | `forbidden` | Membership role is not `guardian` |
| `404` | `not_found` | Another family's charge, another school, discarded, or unknown id (existence is never leaked) |
| `409` | `boleto_pdf_unavailable` | Charge is paid/cancelled, the bank has not registered the boleto yet, the provider serves no PDF (Cora: use `boleto_url`), or the school's active bank is no longer the issuing one |
| `502` | `boleto_pdf_provider_error` | The bank rejected the request (credentials/scope) or returned something that is not a PDF. Not retryable by the client |
| `503` | `boleto_pdf_provider_unavailable` | Bank timeout/outage (transient). Offer a retry |

Error bodies use the standard envelope (`{ "error": { "code", "message", "details" } }`), with
`message` in pt-BR.
- `meta.total` counts the filtered result, not the family's lifetime charges.

### Staff charges: payment methods and boleto PDF (implemented)

The school's charges (`GET /schools/:school_id/billing/charges`, `GET .../charges/:id`, and the
`create`, `cancel` and `reissue` responses) carry the same `payment_methods` object, with exactly the
same four keys and semantics as the guardian view documented above (`boleto_url`, `pix_copy_paste`,
`digitable_line`, `boleto_pdf_available`; including the asynchronous Banco Inter behavior). The
top-level `boleto_url` field stays as before.

`GET /api/v1/schools/:school_id/billing/charges/:id/boleto_pdf` — streams the boleto PDF of any
charge of the school so staff can preview what the payer receives. Same behavior as the guardian
endpoint (fetched per request, never stored; `200`, `Content-Type: application/pdf`,
`Content-Disposition: inline; filename="boleto-<charge id>.pdf"`, `Cache-Control: private, no-store`;
fetch as a blob with the auth header). Only call it when `payment_methods.boleto_pdf_available` is
`true`.

- Auth: `Authorization: Bearer <access token>`; school staff allowed to manage billing in `:school_id`
  and the `billing` module enabled.

| Status | `error.code` | When |
|--------|--------------|------|
| `401` | `unauthorized` | Missing/invalid token |
| `403` | `forbidden` / `module_disabled` | Role without billing permission (for example a guardian) / billing module off |
| `404` | `not_found` | Another school's charge, staff of another school, discarded or unknown id |
| `409` | `boleto_pdf_unavailable` | Same cases as the guardian endpoint |
| `502` | `boleto_pdf_provider_error` | Same as the guardian endpoint |
| `503` | `boleto_pdf_provider_unavailable` | Same as the guardian endpoint |

### Examples

| Goal | Request |
|------|---------|
| Everything, newest first | `?status=all` |
| Only what is still owed | `?status=pending,overdue` |
| Paid in a given month (by due date) | `?status=paid&month=3&year=2026` |
| 2026 school calendar year | `?status=all&year=2026` |
| Custom range | `?status=all&from=2026-02-01&to=2026-06-30` |
| One child | `?status=all&student_id=12` |

Errors: `401` unauthenticated; `403` non-guardian role; `404` unlinked `student_id` (or a school
the user has no guardian membership in); `422` invalid filter.

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid data.",
    "details": { "month": ["Use a month from 1 to 12."] }
  }
}
```

---

## Expected payments by class report (implemented)

A printable PDF for the school dashboard's "Novo relatório" button: per class, each child, their
guardians and the monthly amount their contract expects, with a subtotal per class and a grand
total. Not paginated; there is no JSON body on success.

| | |
|---|---|
| Request | `GET /api/v1/schools/:school_id/billing/reports/expected_payments` |
| Auth | Bearer JWT, staff membership of `:school_id` |
| Permission | `manage_billing` (`ExpectedPaymentsReportPolicy#show?`). `view_billing_summary` alone is **not** enough: that permission unlocks dashboard aggregates, this report exposes each family's figure |
| Module gate | `billing` module must be enabled (`403 module_disabled` otherwise) |

Query params (all optional):

| Param | Values | Default |
|-------|--------|---------|
| `school_class_id` | A class of this school. Another school's class, or a discarded class, is `404` | every class |
| `status` | Student status: `active`, `transferred` or `all`. Discarded students are never listed | `active` |
| `columns` | Comma-separated keys, drawn in the report's own order; unknown keys are dropped | `student,guardians,expected_amount` |

Column keys: `student` (Estudante), `guardians` (Responsáveis, the payer marked "(pagador)"),
`plan` (Plano), `signature_status` (Assinatura), `expected_amount` (Valor previsto (mensal)).
Subtotal and grand total are drawn only when `expected_amount` is selected. Guardian CPF is never
printed, whatever `columns` asks for.

Success: `200`, `Content-Type: application/pdf`, `Content-Disposition: attachment`, filename
`valores-previstos-<school-name-parameterized>-<YYYY-MM-DD>.pdf`. A caller should save the
response as a blob (the SPA's students/guardians reports do the same).

Errors (standard `{ error: { code, message, details } }` envelope):

- `401` — no/invalid token.
- `403 forbidden` — guardian, or staff without `manage_billing`; `403 module_disabled`.
- `404 not_found` — school the caller does not belong to, or a `school_class_id` outside it.
- `422 validation_error` — unknown `status`, or a name the PDF font cannot draw.

### Expected amount rule

One definition, shared with the dashboard's `average_ticket.total_monthly_cents` and with charge
generation and the contract template (`Billing::ContractTuitionAmounts`): what the contract
**agrees the family pays** per month, not the plan's list price.

```
Contract.expected_tuition (kept, status = active, signature_status != cancelled)
one contract per child (see below), then
amount = plan_discount present and plan has a price -> plan price less the discount band
                                                       (100% "Bolsa integral" = 0)
         otherwise                                  -> COALESCE(negotiated_amount_cents,
                                                                billing_plan.base_amount_cents, 0)
```

- **One contract per child, never a sum.** Each report row is one child and shows only that
  child's own agreed figure; nothing is added across children or across a child's contracts. The
  rule lives in `Billing::ExpectedTuitionContracts` and is shared with the dashboard, so the
  report's grand total equals `average_ticket.total_monthly_cents`:
  1. contracts with `signature_status = cancelled` (called off before signing, usually reissued)
     are not agreements and never count;
  2. if a child still has several eligible contracts, the one whose `starts_on`..`ends_on` window
     covers today counts (an absent bound is open); otherwise any of them; among those left, the
     most recent (highest id);
  3. a child left with more than one eligible contract is **flagged**, not hidden: the amount is
     printed with `*` and a footnote at the end says how many students have more than one active
     contract. The school should end or discard the duplicate (charge generation still bills
     every `Contract.active`).
- Punctuality (early-payment) discounts are **not** in this amount; the dashboard shows them
  separately (see below).
- A child with no active contract is listed as "Sem contrato" and adds nothing to the total.
- Students without a class (or whose class was discarded) are printed last under "Sem turma".
- Contracts awaiting signature (`pending_signature`) count like signed ones, as the dashboard
  counts them; contracts whose signature was cancelled do not. Use the `signature_status` column
  to see them.
- Money is formatted in BRL (`R$ 1.234,56`) inside the PDF only. Any future JSON form of this
  report must carry `amount_cents` as integer cents.

---

## School dashboard: average ticket (implemented)

`GET /api/v1/schools/:school_id/dashboard` (`?month=YYYY-MM`). The billing block
(`average_ticket`, `monthly_revenue`, ...) is returned only to staff with the dashboard billing
permission. `average_ticket` is the **agreed** ticket: what the active contracts say families pay,
after scholarships (bolsa), discount bands and negotiated amounts, in integer cents.

```json
"average_ticket": {
  "value": 80000,
  "previous": 80000,
  "change_percent": 0.0,
  "is_up": true,
  "total_monthly_cents": 80000,
  "students": 1,
  "punctuality_value": 72000,
  "punctuality_total_monthly_cents": 72000,
  "punctuality_percent": 10.0
}
```

| Field | Meaning |
|-------|---------|
| `total_monthly_cents` | Sum, over **active, non-discarded students**, of each student's one counted contract's agreed monthly tuition (rules above: signature-cancelled contracts excluded, one contract per student, never summed). Contracts that are not `active` or are discarded, contracts of students who are discarded or no longer `active`, and other schools' contracts are excluded |
| `students` | Active, non-discarded students |
| `value` | `total_monthly_cents / students`, rounded to the cent; `0` with no students. Always contract-based, whether or not the month's charges exist yet |
| `punctuality_total_monthly_cents` | The same sum if **every** family earns the punctuality discount. The discount is computed **per contract** and rounded to the cent (the same rounding as the contract template's `contrato.pontualidade.desconto`), then summed - it is not applied to the grand total. It stacks on the already-agreed amount (a 20% band then 10% punctuality is 72% of the table price) |
| `punctuality_value` | `punctuality_total_monthly_cents / students`; `0` with no students |
| `punctuality_percent` | The percentage actually applied: the school's `school_billing_settings.early_payment_discount_percent`, **or 10.0 when the school has not configured one** (platform default, `SchoolBillingSettings::DEFAULT_EARLY_PAYMENT_DISCOUNT_PERCENT`) |
| `previous`, `change_percent`, `is_up` | Contracts have no history, so `previous` is the average tuition **charged** per contract in the month before the reference month when that month has tuition charges, and equal to `value` (0%, `is_up: true`) otherwise. `change_percent` is `0.0` when `previous` is `0` |

---

## Bulk issuance (`charge_batches`, implemented)

The "emissão em massa" screen: the school picks which children to bill for a month and issues
the boletos in one pass. Roles: whoever may `generate` charges (school staff); wrong role `403`,
no token `401`. Tenancy is per school — another school's contracts and students never appear.

**One boleto per child.** Both endpoints share `Billing::BulkBillableContracts`: only students
that are enrolled (`discarded_at IS NULL` and `status = "active"`) are offered, each with the single
contract chosen by `Billing::ExpectedTuitionContracts` (active, signature not `cancelled`; the one
whose `starts_on..ends_on` covers today, else the highest id). Reissues, renewals and duplicates
never produce a second row or a second boleto.

### `GET /api/v1/schools/:school_id/billing/charge_batches?billing_period=YYYY-MM`

`billing_period` defaults to the current month; invalid values return `422`. Rows are ordered by
student name (case-insensitive).

```json
{
  "data": [
    {
      "contract_id": 41,
      "student_id": 12,
      "student_name": "Ana Souza",
      "payer": { "id": 7, "name": "Maria Silva", "cpf": "12345678909" },
      "monthly_amount_cents": 85000,
      "due_day": 10,
      "already_charged": false,
      "without_contract": false
    },
    {
      "contract_id": null,
      "student_id": 19,
      "student_name": "Bruno Lima",
      "payer": null,
      "monthly_amount_cents": null,
      "due_day": null,
      "already_charged": false,
      "without_contract": true
    }
  ],
  "meta": { "billing_period": "2026-09-01" }
}
```

- `monthly_amount_cents` is the contract's own amount (`negotiated_amount_cents`, else the plan's
  `base_amount_cents`, else `0`).
- `already_charged` is `true` when the chosen contract already has a tuition charge for the period
  (the row is shown but must not be selected).
- `without_contract: true` marks an **enrolled student with no eligible contract** (none active, or
  only cancelled-signature ones). The row exists so the school notices the gap; it has no
  `contract_id` and can never be billed.
- Students who are transferred, not `active` or discarded are never listed.

### `POST /api/v1/schools/:school_id/billing/charge_batches`

Body: `{ "contract_ids": [41], "billing_period": "2026-09", "due_date": "2026-09-20" }`
(`due_date` optional; without it each contract's `due_day` applies). Empty `contract_ids` or an
invalid period returns `422`. Response `201`:

```json
{
  "data": {
    "created_charges": [ { "id": 301, "...": "ChargeBlueprint" } ],
    "created_count": 1,
    "skipped_contract_ids": [],
    "ineligible_contract_ids": [],
    "contract_ids_without_payer": []
  }
}
```

| Field | Meaning |
|-------|---------|
| `skipped_contract_ids` | Billable contracts whose period already has a charge (idempotent re-run / concurrent operator) |
| `ineligible_contract_ids` | The school's contracts that may not be billed: student not enrolled, or not the contract standing for the child. At most one contract per child is ever billed, even if several ids are sent |
| `contract_ids_without_payer` | Billable contracts with no guardian to name on the boleto |

Ids that do not belong to the school are ignored and not echoed in any list. `ineligible_contract_ids`
was added after the first release; before it, ids now reported here were silently dropped.

---

## Planned extensions (W2–W6)

### Charges & contracts

| Method | Path | Wave |
|--------|------|------|
| `POST` | `/billing/charges/:id/adjust` | W2 |
| `GET` | `/billing/contracts` | W2 |
| `POST` | `/billing/charge_generations` | W2 — manual fan-out |

### Payments

| Method | Path | Wave |
|--------|------|------|
| `POST` | `/billing/charges/:id/pay_manual` | W3 |
| `POST` | `/billing/payment_links` | W4 — Pix/card gateway |

### Dunning (MVP scope)

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/billing/delinquency` | Dashboard — **MVP** |
| `PATCH` | `/billing/notification_policy` | Policy config only — no auto-send |
| — | régua builder | **Deferred** post-MVP |

### Settings

| Method | Path | Notes |
|--------|------|-------|
| `PATCH` | `/billing/settings` | Mora, multa, pontualidade — partial in fintech-first |

### Annual tax declarations (BC8 — draft narrative; executable OpenAPI pending)

Billing owns the calculation. One logical declaration exists per payer `guardian_id`, school, and
closed Gregorian calendar year; immutable versions consolidate all children whose eligible charges
that payer actually settled. Purpose eligibility is captured on each charge when created, so later
school configuration changes do not rewrite historical classification.

Guardian routes:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/me/tax_declarations` | Own annual aggregates and active version metadata |
| `POST` | `/me/tax_declarations` | Idempotently ensure `calendar_year` is generated |
| `GET` | `/me/tax_declarations/:tax_declaration_id` | Aggregate detail with active version metadata |
| `GET` | `/me/tax_declarations/:tax_declaration_id/versions` | Immutable version list |
| `GET` | `/me/tax_declarations/:tax_declaration_id/versions/:version_id` | Exact version detail |
| `GET` | `/me/tax_declarations/:tax_declaration_id/versions/:version_id/pdf` | Family-scoped PDF for that exact version |

Staff configuration:

| Method | Path | Description |
|--------|------|-------------|
| `GET/POST` | `/billing/purposes` | List/create school billing purposes |
| `PATCH` | `/billing/purposes/:id` | Configure eligibility for future charges |
| `GET/PATCH` | `/billing/tax_declaration_settings` | Approved legal text/signatory/release gate |

`POST /me/tax_declarations` body:

```json
{ "tax_declaration": { "calendar_year": 2025 } }
```

It returns `200` when the stored calculation/configuration digest is unchanged and `201` when the
first or a corrected version is created. `:tax_declaration_id` is the logical aggregate id;
`:version_id` is the child `tax_declaration_versions.id`, never its sequential number. Responses
carry both `tax_declaration_id` and `active_version_id`. Version lifecycle is computed as `active`
when those ids match and `superseded` otherwise; version rows are append-only and have no lifecycle
status column.

Selection uses immutable confirmed `payments.paid_at`, matching `charges.guardian_id` and captured
`charges.tax_declaration_eligible`. Each source line declares
`paid_amount_cents - fine_amount_cents - interest_amount_cents`: settled principal after discounts
only. Discounts are not added back; fine and interest are always excluded by conservative product
decision pending legal/accounting approval. It does not use due dates, billing periods, current
settings, descriptions, or `school_transactions`.

Each immutable item stores `source_paid_amount_cents`, `source_fine_amount_cents`,
`source_interest_amount_cents`, and their non-negative `declared_principal_amount_cents`; the PDF
total sums only the final field. Each version also snapshots the approved settings version, legal
text version, one signatory, eligible-purpose configuration/digest, and approval actor/time.

After an authorized exact-version PDF response succeeds, the API appends a
`tax_declaration_access_events` row and emits `TaxDeclarationPdfDownloaded`, both idempotently keyed
by request UUID. Audit payloads contain resource/actor ids and timestamps only—no CPF, student
names, amounts, or payment lines.

Errors:

- `404 not_found` — cross-school/family aggregate/version/PDF, unknown version, or version not
  nested under the requested aggregate.
- `409 generation_in_progress` — the same payer/year is already calculating.
- `422 calendar_year_not_closed` — current/future year.
- `422 no_eligible_payments` — create no empty document.
- `422 tax_declaration_configuration_incomplete` — legal/accounting approval, school CNPJ,
  payer CPF, legal text, or signatory missing.
- `422 unclassified_legacy_charge` — candidate payment has no verified purpose snapshot.

Release remains blocked until legal/accounting approval of eligible purposes, provisional
tuition/enrollment defaults, principal-after-discounts/excluded-fee rule, wording, the single
configured `document_signatory_id`, and retention.

### NFS-e / Service invoices (BC7)

Modeling: [`010-service-invoices.md`](../../modeling/010-service-invoices.md).

Staff routes (under `schools/:school_id/billing`):

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/fiscal/supported_cities` | Proxy Spedy city search (`query`, `state`, `code`) |
| `GET` | `/fiscal_settings` | School NFS-e configuration |
| `PATCH` | `/fiscal_settings` | Update settings; validates city against Spedy when changed |
| `GET` | `/fiscal_credentials` | Active Spedy provider row (masked api_key) |
| `POST` | `/fiscal_credentials` | Register an existing Spedy `api_key`, or provision a new company when omitted (supersedes previous active row) |
| `POST` | `/fiscal_credentials/certificate` | Upload A1 certificate (.pfx) to Spedy |
| `GET` | `/service_invoices` | Paginated staff list |
| `GET` | `/service_invoices/:id` | Detail |
| `GET` | `/service_invoices/:id/pdf` | Authorized PDF download |

Guardian routes (`schools/:school_id/me`):

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/service_invoices` | Family-scoped list |
| `GET` | `/service_invoices/:id/pdf` | Family-scoped PDF |

`PATCH /fiscal_settings` body (partial):

```json
{
  "fiscal_settings": {
    "enabled": true,
    "issuance_city_name": "Goiânia",
    "issuance_state": "GO",
    "spedy_city_code": 5208707,
    "federal_service_code": "8.01",
    "cnae_code": "8513900",
    "iss_rate_percent": "5.0",
    "service_description": "Mensalidade escolar"
  }
}
```

Errors:

- `422 validation_error` — incomplete guardian data would block issuance (BR-I08 preview), invalid
  Spedy city (BR-I06), or incomplete fiscal codes when enabling.
- `422 fiscal_configuration_incomplete` — `enabled: true` without credentials or certificate at Spedy.
- `404 not_found` — cross-school or cross-family access.
- `409 generation_in_progress` — not used for NFS-e (reserved).

`POST /fiscal_credentials` (backoffice or staff with `manage_billing`):

- With `api_key` — registers a Spedy company key the school already owns:

  ```json
  {
    "api_key": "<spedy company api key>",
    "company_id": "<optional spedy company id>",
    "base_url": "<optional https Spedy API base URL, e.g. https://api.spedy.com.br/v1>"
  }
  ```

  `api_key` is the school's production Spedy company key; it is sent to Spedy as the `X-Api-Key`
  header. `base_url` is optional: blank or absent means the default `https://api.spedy.com.br/v1`
  (the platform default can be overridden with `SPEDY_API_BASE_URL`). A supplied value must be an
  `https` URL (no credentials, query, `localhost` or IP literal) and includes the API version
  segment (`/v1`); a trailing slash is ignored. It is stored per school in
  `school_payment_providers.settings["base_url"]` and used for every later Spedy call for that
  school (certificate upload, company settings, NFS-e issuance and polling). Provisioning with the
  platform key (no `api_key`) always uses the default / env URL.

  The key is validated against Spedy at `{base_url}/companies` (or `{base_url}/companies/{id}` when
  `company_id` is supplied). Without `company_id`, the company id is discovered from the list and
  must be unambiguous (exactly one company). The new row supersedes the previous active
  `service_invoice` row in one transaction.
- Without the `api_key` key — unchanged: the platform provisions a new Spedy company and stores
  the returned key.
- `201` returns `{ "data": SchoolPaymentProvider }`; the `api_key` is never returned or logged.
  For `provider: "spedy"` rows the object also carries `base_url` — the effective Spedy API base
  URL (the stored override, otherwise the default). It is not a secret and is included in
  `GET /fiscal_credentials` and `POST /fiscal_credentials/certificate` responses too.

Errors:

- `422 validation_error` — `details.api_key` (`blank` / `invalid`); `details.base_url` (`invalid` when not an `https` URL);
  `details.company_id`
  (`invalid` when Spedy does not know the id for that key, `taken` when another school already
  uses that company).
- `422 provider_error` — `details.message`; Spedy rejected the key (401/403), is unreachable, or
  answered unexpectedly.
- `422 fiscal_configuration_incomplete` — no `company_id` supplied and the key's company list is
  empty or ambiguous; retry with `company_id`.
- `403 forbidden` / `404 not_found` — wrong role / cross-school.

Webhook: `POST /webhooks/spedy/:token` — account-level; token matches `SPEDY_WEBHOOK_TOKEN`.
School resolved from `spedy_company_id` or issuer CNPJ in payload.

---

### NFS-e (legacy placeholder — removed)

The former `POST /billing/invoices/nfs_e` stub is superseded by automatic issuance on payment
confirmation and the routes above.

---

## Resend boleto

Absorbed from [`fintech-first/resend-boleto.md`](../../prds/fintech-first/resend-boleto.md) into
[`boletos.md`](../../prds/billing/boletos.md) — `POST /billing/charges/:id/resend_notification`.

---

## Taxonomy note

`billing.build_dunning_workflow` and `billing.send_payment_reminder` remain MVP in
[`capability-map.md`](../../product/capability-map.md) with **product override**: platform régua
deferred Aug 2026; overdue detection + dashboard ship in MVP.

---

## OpenAPI tags

`Billing`, `Tax Declarations`, `Guardian Me`, `Webhooks`
