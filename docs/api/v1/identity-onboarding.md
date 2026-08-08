# API v1 — Identity & Onboarding

> PRDs: [`docs/prds/identity-and-onboarding/`](../../prds/identity-and-onboarding/)  
> Permissions modeling: [`docs/modeling/003-identity-permissions.md`](../../modeling/003-identity-permissions.md)  
> Onboarding modeling: [`docs/modeling/004-school-onboarding.md`](../../modeling/004-school-onboarding.md)  
> Auth: [`docs/modeling/002-api-auth.md`](../../modeling/002-api-auth.md)  
> Conventions: [`docs/api/README.md`](../README.md)

Routes for the Identity & Onboarding domain. Billing routes remain in
[`fintech-first.md`](fintech-first.md). Phase 2 enrollment contract signature (Authentic) is
**not** implemented here — see onboarding PRD § Future integration.

## Delivery waves

| Wave | Scope |
|------|--------|
| **W1** | `staff` role migration, `school_role_templates`, `staff_profiles`, role template CRUD, extended `GET /me` |
| **W2** | `PATCH /people/memberships/:id/permissions` (overrides), `staff_with?` policies; `POST /auth/invite/accept`, `membership_invite_tokens` |
| **W3** | Self-serve: owner wizard + `POST /schools/:id/handoff` (activation) |
| **W4** | White-glove: backoffice provisioning + handoff + CSV import |
| **Phase 2** | Enrollment contract signature via Authentic (proposed vendor) — separate PRD |

---

## Auth (no `school_id`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/auth/invite/accept` | Set password from invite token; does not activate membership alone |

### `POST /api/v1/auth/invite/accept`

Request:

```json
{
  "token": "opaque-token-from-email",
  "password": "secure-password",
  "name": "Maria Silva"
}
```

Response `200`: user id and membership id to accept next.

Errors: `401 invalid_invite_token` (expired, used, unknown).

---

## Profile

### `GET /api/v1/me` (extended — W1)

Membership objects include permission payload:

```json
{
  "data": {
    "id": 1,
    "email": "diretor@escola.example",
    "memberships": [
      {
        "id": 10,
        "school_id": 42,
        "school_name": "Example School",
        "role": "staff",
        "status": "active",
        "role_template": {
          "id": 1,
          "name": "Direção",
          "system_key": "director",
          "is_system": true
        },
        "is_owner": true,
        "segment_id": null,
        "display_title": "Diretor",
        "permissions": ["manage_billing", "manage_people"]
      }
    ]
  }
}
```

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/me/memberships/:id/accept` | Activate invited membership after password set |

---

## Role templates (W1)

Base: `/api/v1/schools/:school_id`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/permission_definitions` | Platform permission catalog (from code registry) |
| `GET` | `/role_templates` | List school templates — requires `manage_people` |
| `POST` | `/role_templates` | Create custom template — owner only |
| `PATCH` | `/role_templates/:id` | Update template — owner; response includes `affected_memberships_count` |
| `DELETE` | `/role_templates/:id` | Delete custom template — owner |
| `POST` | `/role_templates/:id/clone` | Clone template — owner |

---

## Backoffice

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/schools` | Create school — extended: `owner_email`, `onboarding_mode`; provisions system role templates |
| `POST` | `/api/v1/schools/:school_id/handoff` | Provisioning → pending_handoff → active (W3 self-serve; W4 white-glove) |
| `POST` | `/api/v1/schools/:school_id/provisioning/import` | CSV preview (`dry_run=true`) or commit |

### `POST /api/v1/schools` (extended)

```json
{
  "name": "Escola Exemplo",
  "cnpj": "00.000.000/0001-00",
  "onboarding_mode": "white_glove",
  "owner_email": "diretor@escola.example"
}
```

Response includes `onboarding_status`, `onboarding_mode`.

Backoffice provisioning actions while `onboarding_status == provisioning` require platform
permission `provision_school` (not a staff membership on the tenant).

---

## People (`role: staff` with `manage_people`)

Base: `/api/v1/schools/:school_id/people`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/memberships` | Invite — extended: `role_template_id`, `segment_id`, `display_title` |
| `PATCH` | `/memberships/:id/permissions` | Owner-only overrides: `grants[]`, `denies[]` (W2) |
| `POST` | `/memberships/:id/invite` | Resend invite token |

### `POST /api/v1/schools/:school_id/people/memberships`

```json
{
  "email": "secretaria@escola.example",
  "role": "staff",
  "role_template_id": 42,
  "segment_id": null,
  "display_title": "Secretária"
}
```

---

## Errors (domain-specific)

| HTTP | `error.code` | When |
|------|--------------|------|
| `401` | `invalid_invite_token` | Invite token invalid |
| `422` | `validation_error` | Handoff checklist incomplete |
| `422` | `import_validation_failed` | CSV import errors |
| `422` | `template_in_use` | Delete template with active memberships |
| `422` | `cannot_delete_system_template` | Delete system template |
| `422` | `last_admin_template` | Would remove last admin-capable template |

Standard envelope: [`docs/api/README.md`](../README.md).

---

## Phase 2 (planned — not in OpenAPI MVP)

Enrollment contract digital signature via **Authentic** (proposed vendor):

- Outbound: create/send signature request from platform
- Inbound: webhook/callback updates `enrollment_contract.signature_status`
- May gate billing or enrollment completion — **does not** gate login

See [`onboarding.md`](../../prds/identity-and-onboarding/onboarding.md) § Future integration.
