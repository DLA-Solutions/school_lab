# API v1 — Fintech-first (billing MVP)

> PRD: [`docs/prds/fintech-first.md`](../prds/fintech-first.md)  
> Auth: [`docs/modeling/002-api-auth.md`](../modeling/002-api-auth.md)  
> Conventions: [`docs/api/README.md`](../README.md)

Routes to implement and document with **rswag** in the first API delivery wave.
Phase 2 routes (`communication`, `academic`) are listed as **planned** for OpenAPI skeleton —
return `501` until their PRDs ship.

## Delivery order

| Wave | Scope |
|------|--------|
| **1** | `auth/*`, `GET /me` |
| **2** | Guardian `me/charges`, `me/payments` (mobile value) |
| **3** | School `billing/*`, `billing/summary` |
| **4** | `people/*`, `memberships` |
| **5** | `documents/*` |
| **6** | Backoffice `schools`, user disable |

---

## Auth (no `school_id`)

See [`002-api-auth.md`](../modeling/002-api-auth.md) for full login/refresh contract.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/auth/login` | Email + password → tokens |
| `POST` | `/api/v1/auth/refresh` | Rotate refresh, new access |
| `POST` | `/api/v1/auth/logout` | Revoke refresh |
| `POST` | `/api/v1/auth/password` | Request password reset |
| `PUT` | `/api/v1/auth/password` | Change password |
| `GET` | `/api/v1/me` | User + memberships |
| `POST` | `/api/v1/me/device_tokens` | Register FCM token |

### `GET /api/v1/me`

```json
{
  "data": {
    "id": 1,
    "email": "maria@example.com",
    "status": "active",
    "memberships": [
      {
        "id": 10,
        "school_id": 42,
        "school_name": "Example School — Downtown",
        "role": "guardian",
        "status": "active"
      }
    ],
    "guardian_profiles": [
      { "id": 5, "school_id": 42, "name": "Maria Silva" }
    ]
  }
}
```

---

## Backoffice (`role: backoffice`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/schools` | List schools |
| `POST` | `/api/v1/schools` | Create school |
| `GET` | `/api/v1/schools/:school_id` | School detail |
| `PATCH` | `/api/v1/schools/:school_id` | Update school |
| `DELETE` | `/api/v1/schools/:school_id` | Soft delete school |
| `POST` | `/api/v1/users/:user_id/disable` | Platform-wide disable |
| `POST` | `/api/v1/users/:user_id/enable` | Re-enable user |

---

## People (`role: school`)

Base: `/api/v1/schools/:school_id/people`

### Guardians

| Method | Path |
|--------|------|
| `GET` | `/guardians` |
| `POST` | `/guardians` |
| `GET` | `/guardians/:id` |
| `PATCH` | `/guardians/:id` |
| `DELETE` | `/guardians/:id` |

### Students

| Method | Path |
|--------|------|
| `GET` | `/students` |
| `POST` | `/students` |
| `GET` | `/students/:id` |
| `PATCH` | `/students/:id` |
| `DELETE` | `/students/:id` |

### Student ↔ guardian links

| Method | Path |
|--------|------|
| `GET` | `/students/:student_id/guardians` |
| `POST` | `/students/:student_id/guardians` |
| `DELETE` | `/student_guardians/:id` |

### Memberships (school users)

| Method | Path |
|--------|------|
| `GET` | `/memberships` |
| `POST` | `/memberships` | Create + invite |
| `PATCH` | `/memberships/:id` | Suspend / reactivate |
| `DELETE` | `/memberships/:id` | Soft delete link |
| `POST` | `/memberships/:id/invite` | Resend invite |

---

## Billing — school admin (`role: school`)

Base: `/api/v1/schools/:school_id/billing`

### Plans (`billing_plans`)

| Method | Path |
|--------|------|
| `GET` | `/plans` |
| `POST` | `/plans` |
| `GET` | `/plans/:id` |
| `PATCH` | `/plans/:id` |
| `DELETE` | `/plans/:id` |

### Contracts

| Method | Path |
|--------|------|
| `GET` | `/contracts` |
| `POST` | `/contracts` |
| `GET` | `/contracts/:id` |
| `PATCH` | `/contracts/:id` |
| `DELETE` | `/contracts/:id` |

### Charges

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/charges` | Filters: `status`, `guardian_id`, `due_date` range |
| `GET` | `/charges/:id` | |
| `POST` | `/charges/:id/cancel` | Business cancel (`status: cancelled`) |
| `POST` | `/charges/:id/reissue` | Reissue boleto/Pix via PSP |
| `DELETE` | `/charges/:id` | Soft delete erroneous charge |

### Payments (read-only)

| Method | Path |
|--------|------|
| `GET` | `/payments` |
| `GET` | `/payments/:id` |

### Summary / delinquency dashboard

| Method | Path |
|--------|------|
| `GET` | `/summary` |

### `GET /billing/summary` response (example)

```json
{
  "data": {
    "open_count": 45,
    "overdue_count": 12,
    "paid_this_month_count": 88,
    "open_amount": "38250.00",
    "overdue_amount": "10200.00",
    "expected_collection_this_month": "45000.00"
  }
}
```

### `GET /billing/charges` response (example)

```json
{
  "data": [
    {
      "id": 101,
      "billing_period": "2026-08",
      "student": { "id": 1, "name": "Pedro Silva" },
      "guardian": { "id": 5, "name": "Maria Silva" },
      "original_amount": "900.00",
      "discount_amount": "50.00",
      "total_amount": "850.00",
      "due_date": "2026-08-10",
      "status": "pending"
    }
  ],
  "meta": { "page": 1, "per_page": 25, "total": 45 }
}
```

---

## Billing — guardian app (`role: guardian`)

Base: `/api/v1/schools/:school_id/me`

Family-scoped — Pundit ensures only the logged-in guardian's charges.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/charges` | Open charges (`pending`, `overdue`) |
| `GET` | `/charges/history` | Paid + migrated historical |
| `GET` | `/charges/:id` | Detail + payment methods |
| `POST` | `/charges/:id/reissue` | Second copy boleto/Pix |
| `GET` | `/payments` | Payment history |
| `GET` | `/students` | Linked children |
| `GET` | `/documents` | Children's enrollment/KYC docs |

### `GET /me/charges` response (example)

```json
{
  "data": [
    {
      "id": 101,
      "billing_period": "2026-08",
      "total_amount": "850.00",
      "due_date": "2026-08-10",
      "status": "pending",
      "student": { "id": 1, "name": "Pedro Silva" },
      "payment_methods": {
        "boleto_url": "https://psp.example/boleto/abc",
        "pix_copy_paste": "00020126580014br.gov.bcb.pix..."
      }
    }
  ],
  "meta": { "page": 1, "per_page": 25, "total": 2 }
}
```

### `GET /me/charges/history` response (example)

Includes migrated records from legacy system when present:

```json
{
  "data": [
    {
      "id": 88,
      "billing_period": "2025-12",
      "total_amount": "800.00",
      "status": "paid",
      "paid_at": "2025-12-08T14:30:00Z",
      "source": "platform",
      "student": { "id": 1, "name": "Pedro Silva" }
    },
    {
      "id": null,
      "billing_period": "2024-06",
      "total_amount": "750.00",
      "status": "paid",
      "paid_at": "2024-06-12T00:00:00Z",
      "source": "migrated",
      "external_reference": "legacy-boleto-9912",
      "student": { "id": 1, "name": "Pedro Silva" }
    }
  ],
  "meta": { "page": 1, "per_page": 25, "total": 24 }
}
```

`source` and `external_reference` require a migration strategy — column or join table
to be added when import scope is defined.

---

## Documents (`role: school`; guardian read via `/me/documents`)

Base: `/api/v1/schools/:school_id/documents`

| Method | Path |
|--------|------|
| `GET` | `/documents` |
| `POST` | `/documents` | Upload (multipart) |
| `GET` | `/documents/:id` |
| `PATCH` | `/documents/:id` |
| `DELETE` | `/documents/:id` |
| `POST` | `/documents/:id/approve` |
| `POST` | `/documents/:id/reject` |

---

## Planned — phase 2 (OpenAPI skeleton, `501` until PRD)

Document in rswag with `x-phase: 2` extension. Do not implement until PRD exists.

### Communication

Base: `/api/v1/schools/:school_id/communication`

| Method | Path |
|--------|------|
| `GET` | `/conversations` |
| `POST` | `/conversations` |
| `GET` | `/conversations/:id/messages` |
| `POST` | `/conversations/:id/messages` |

### Academic

Base: `/api/v1/schools/:school_id/academic`

| Method | Path |
|--------|------|
| `GET` | `/classes` |
| `GET` | `/attendances` |
| `POST` | `/attendances` |
| `GET` | `/grades` |
| `POST` | `/grades` |

---

## Webhooks (not under `/api/v1`)

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/webhooks/psp` | PSP HMAC signature |

Processes `webhook_events` → updates `payments` and `charges.status`.

---

## rswag spec layout (reference)

```
web/spec/requests/api/v1/
  auth_spec.rb
  me_spec.rb
  schools_spec.rb
  schools/billing/
    plans_spec.rb
    contracts_spec.rb
    charges_spec.rb
    payments_spec.rb
    summary_spec.rb
  schools/people/
    guardians_spec.rb
    students_spec.rb
    memberships_spec.rb
  schools/me/
    charges_spec.rb
    payments_spec.rb
  schools/documents_spec.rb
```

Run: `bundle exec rake rswag:specs:swaggerize`

---

## Entities ↔ routes

| DB table | API resource |
|----------|--------------|
| `billing_plans` | `billing/plans` |
| `contracts` | `billing/contracts` |
| `charges` | `billing/charges`, `me/charges` |
| `payments` | `billing/payments`, `me/payments` |
| `guardians` | `people/guardians` |
| `students` | `people/students` |
| `memberships` | `people/memberships` |
| `documents` | `documents`, `me/documents` |
| `schools` | `schools` |
