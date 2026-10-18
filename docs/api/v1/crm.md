# API v1 — CRM contacts

> PRD: [`docs/prds/crm.md`](../../prds/crm.md). Open items:
> [`docs/open-questions.md`](../../open-questions.md) § "CRM contacts".  
> Schema: [`docs/database/schema.dbml`](../../database/schema.dbml) → `crm_contacts`  
> Conventions: [`docs/api/README.md`](../README.md)  
> Implementation: `web/app/controllers/api/v1/schools/crm_contacts_controller.rb`,
> `web/spec/requests/api/v1/schools/crm_contacts_spec.rb`, `web/swagger/v1/swagger.yaml` (tag `CRM`)

A school's prospects (leads) before enrollment: name, phone, email, notes and a lead
**temperature** (`cold` = "frio", `warm` = "morno", `hot` = "quente"). A contact is **not** a
guardian or a student and is never converted into one by this API.

Base: `/api/v1/schools/:school_id/crm_contacts` — JWT bearer, tenant path (rule `multi-tenancy`).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/crm_contacts` | List (paginated), `summary` view |
| `GET` | `/crm_contacts/:id` | Show, `detail` view |
| `POST` | `/crm_contacts` | Create |
| `PATCH` | `/crm_contacts/:id` | Update (including reclassifying `temperature`) |
| `DELETE` | `/crm_contacts/:id` | Soft-delete (Discard) — `204`, no body |

## Authorization

Pundit `CrmContactPolicy`, gated on the existing `manage_enrollment` staff permission (director and
secretary system templates; owners). There is no dedicated CRM permission yet — see open items.

- Teacher / guardian / staff without the permission: `403 forbidden`.
- No membership in the school, a contact of another school, or a discarded contact: `404 not_found`.
- Missing/invalid token: `401 unauthorized`.

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | integer | |
| `name` | string | Required. |
| `phone` | string \| null | Free-form. |
| `email` | string \| null | Optional; if present must be a valid address; stored lowercased. |
| `notes` | string \| null | Free text. |
| `temperature` | string | `cold` \| `warm` \| `hot`. Defaults to `cold` on create. |
| `school_id` | integer | `detail` view only. |
| `created_at`, `updated_at` | ISO 8601 string | `detail` view only. |

Blank strings for `phone`, `email` and `notes` are stored as `null`.

## List

`GET /api/v1/schools/:school_id/crm_contacts?temperature=hot&q=joana&page=1`

| Query | Description |
|-------|-------------|
| `temperature` | Optional filter: `cold` \| `warm` \| `hot`. Any other value is `422`. |
| `q` | Optional case-insensitive substring match on `name`, `email` or `phone`. |
| `page` | Pagy page (default 1); 25 rows per page. |

Ordered by `name`, then `id`. Response `200`:

```json
{
  "data": [
    {
      "id": 12,
      "name": "Joana Prado",
      "phone": "+55 11 98888-7777",
      "email": "joana@example.com",
      "notes": "Asked about 2027 enrollment.",
      "temperature": "hot"
    }
  ],
  "meta": { "page": 1, "per_page": 25, "total": 1 }
}
```

## Show / Create / Update

Request body for `POST` and `PATCH` (all keys optional on `PATCH`; only `name` required on `POST`):

```json
{
  "crm_contact": {
    "name": "Joana Prado",
    "phone": "+55 11 98888-7777",
    "email": "joana@example.com",
    "notes": "Asked about 2027 enrollment.",
    "temperature": "warm"
  }
}
```

Response (`200` for show/update, `201` for create):

```json
{
  "data": {
    "id": 12,
    "name": "Joana Prado",
    "phone": "+55 11 98888-7777",
    "email": "joana@example.com",
    "notes": "Asked about 2027 enrollment.",
    "temperature": "warm",
    "school_id": 3,
    "created_at": "2026-10-14T16:40:00.000Z",
    "updated_at": "2026-10-14T16:40:00.000Z"
  }
}
```

## Errors

Standard envelope `{ "error": { "code", "message", "details" } }`; `message` is localized from
`Accept-Language` (`pt-BR` default).

| Status | `error.code` | When |
|--------|--------------|------|
| `401` | `unauthorized` | Missing/invalid access token |
| `403` | `forbidden` | Role/permission denied |
| `404` | `not_found` | Unknown, discarded, cross-school contact, or school the user does not belong to |
| `422` | `validation_error` | `details` maps field → messages, e.g. `{ "name": ["can't be blank"] }`, `{ "temperature": ["is not included in the list"] }`, `{ "email": ["is invalid"] }`. Also an unknown `temperature` query filter on `GET` (`details.temperature`). |

## LGPD

Phone, email and notes about a prospect are personal data (and notes may mention a child). Changes
are recorded by `SchoolAuditable`; delete is a soft delete. Consent basis and retention are
**open** — see `docs/open-questions.md` § LGPD / Privacy, "CRM contacts".
