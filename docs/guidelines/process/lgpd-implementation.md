# LGPD implementation guidelines

Engineering guardrails for children's data and Brazilian LGPD compliance. Product legal review
remains open for retention windows and DPO assignment — defaults here prevent unsafe assumptions.

## Roles

| Party | Role |
|-------|------|
| School | **Controller** — decides processing purposes |
| DLA / School Lab | **Processor** — processes on school instructions |
| Sub-processors | Cora (boleto payer data), Postmark (email), FCM (push tokens) — document in privacy policy |

## Isolation (mandatory)

- **School:** every tenant query scoped by `school_id` (Pundit + services).
- **Family:** guardian routes scoped through `student_guardians` — never another family's messages,
  documents, or charges ([`lgpd-privacy` rule](../../.cursor/rules/core/lgpd-privacy.mdc)).

## Consent

- Record in `consent_records` ([`consent.md`](../prds/identity-and-onboarding/consent.md)).
- Types: `data_processing`, `communication`, `photo_use`.
- Guardian self-service + staff-recorded with `recorded_by_id` audit.

## Sensitive fields

Mark in DBML notes and restrict serialization:

- Child: `students.birth_date`, health in `incidents.description`, routine (P2).
- Adult: `guardians.cpf`, `email`, `phone`.
- Messages and attachments: LGPD content — retention TBD legal sign-off.

## Storage

- Production files: S3 via Active Storage ([`008-documents-archive.md`](../modeling/008-documents-archive.md)).
- Encrypt credentials: Active Record Encryption on Cora PEM fields.
- Webhook payload retention: 180 days processed ([`open-questions.md`](../open-questions.md)).

## Data subject rights (MVP)

- **Access/correction:** guardian via staff support channel; API export P2.
- **Deletion:** soft-delete (Discard) with legal retention exceptions for financial records.
- **Portability:** audit package export ([`documents-and-archive/archive.md`](../prds/documents-and-archive/archive.md)).

## Logging

- Redact CPF, email, phone in billing logs (`Billing::PiiRedactor`).
- Do not log message bodies in production info level.

## Related

- [`docs/open-questions.md`](../open-questions.md) § LGPD
- [`docs/guidelines/web/auditing.md`](../guidelines/web/auditing.md)
