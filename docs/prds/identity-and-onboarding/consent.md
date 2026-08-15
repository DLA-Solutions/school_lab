# PRD — Identity: LGPD Consent (BC6)

> Status: validated  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `identity.manage_consent`  
> Modeling: [`003-identity-permissions.md`](../../modeling/003-identity-permissions.md), [`005-students-enrollments.md`](../../modeling/005-students-enrollments.md)  
> API: [`docs/api/v1/identity-onboarding.md`](../../api/v1/identity-onboarding.md) § Consent

---

## Objective

Record **legal guardian consent** for processing children's personal data at onboarding and
enrollment — auditable, per-school, linked to student and guardian.

---

## Product decision (Aug 2026 — no workshop)

**Consent storage:** dedicated `consent_records` table (not a JSON flag on `students`). Each row
captures guardian, student, consent type, version of privacy policy, timestamp, and channel
(`web`, `app`, `paper_scan`). Paper scans stored as archive attachments
([`documents-and-archive/archive.md`](../documents-and-archive/archive.md)).

**Legal basis:** guardian consent for child data processing (LGPD Art. 7, I and Art. 14).
School is **controller**; DLA is **processor** — DPO assignment deferred to legal counsel
([`open-questions.md`](../../open-questions.md)).

---

## Business Rules

BR-C01 — `capability_id`: `identity.manage_consent`

Required consent types at MVP: `data_processing` (general), `communication` (messages/push),
`photo_use` (optional checkbox for image sharing in comms).

BR-C02

Staff may record consent on behalf of guardian during enrollment (Secretaria) with
`recorded_by_id` audit; guardian self-service records via app/web during first login wizard.
When `channel = paper_scan`, `archive_document_id` is required and identifies the same-school,
same-student evidentiary attachment in `archive_documents`.

BR-C03

Consent is **versioned** — `policy_version` string (e.g. `2026-08-01`); re-consent required when
school publishes material policy change (P2 automation — MVP manual flag). Re-consent atomically
revokes the prior active row before inserting the new policy version.

BR-C04

Missing `data_processing` consent blocks **guardian app activation** for linked students but does
not block staff-side enrollment data entry.

BR-C05

Withdrawal of consent (`revoked_at`) triggers workflow to disable guardian messaging for affected
student — does not delete historical messages (retention per NFR-002).

---

## Database

| Table | Purpose |
|-------|---------|
| `consent_records` | `school_id`, `student_id`, `guardian_id`, `consent_type`, `policy_version`, `granted_at`, `revoked_at`, required `channel`, optional `archive_document_id` → `archive_documents.id`, `recorded_by_id` |

See [`docs/modeling/005-students-enrollments.md`](../../modeling/005-students-enrollments.md).

---

## Acceptance Criteria

AC-C001

```gherkin
Given a guardian completing first login
When they accept data_processing and communication consents
Then consent_records rows exist with policy_version and granted_at
And guardian may access school-scoped /me routes for linked students
```

---

## Out of Scope

- Automated DPO workflows and legal text authoring.
- Consent for third-party processors beyond documented sub-processors list (Cora, Postmark, FCM).
