# Acceptance criteria harness

Maps PRD **`AC-NNN`** items to verifiable checks — automated where code exists, documented
manual steps otherwise. Update when PRDs reach `validated` or implementation ships.

## ID conventions

See [`docs/product/traceability.md`](../product/traceability.md):

- `AC-P*` — identity permissions
- `AC-O*` — onboarding
- `AC-E*`, `AC-R*` — enrollments / records
- `AC-*` per domain slice file

## Harness matrix (MVP domains)

| Domain | Primary AC source | Automated gate | Manual gate |
|--------|-------------------|------------------|-------------|
| Identity | `identity-and-onboarding/*.md` | rswag auth + invite specs | Partner role matrix walkthrough |
| Students | `students-and-enrollments/*.md` | enrollment request specs (planned) | Secretaria CSV import dry-run |
| Communication | `communication/*.md` | policy specs + family isolation | Two-family inbox penetration check |
| Academic | `academic/attendance.md` AC-AT* | absence job idempotency spec | 15-min confirm + push receipt |
| Billing | `fintech-first.md`, `billing/*.md` | charge AASM + webhook specs | Cora sandbox issuance (staging) |
| Documents | `documents-and-archive/archive.md` | archive policy specs (planned) | Guardian cannot see other student docs |
| Platform | `platform-and-admin/school-year.md` | one-active-year model validation | Year rollover checklist |

## NFR harness

| NFR | Verification |
|-----|--------------|
| NFR-001 Attendance reliability | Job spec: single `AbsenceRecorded` → one delivery row |
| NFR-002 LGPD | Policy specs: guardian scope; PII redaction in billing logs |
| NFR-003 Multi-tenancy | Request specs: cross-school `404` |
| NFR-004 Family isolation | Communication policy: cross-family deny |

## Running the harness locally

```bash
# Backend CI (web/)
web/bin/backend-ci

# SPA unit tests
cd frontend/app && npm run test:run
```

## Drift prevention

When an AC changes in a PRD:

1. Update the spec or manual checklist row in this file.
2. Run doc-consistency-checker patterns (PRD ↔ AC ↔ test file name).
3. Link PRD Database section to modeling + DBML.

## Corpus-grounded ACs

ACs citing `docs/ref/` must keep the source path in the PRD. If harvest updates contradict the
AC, update the PRD and record in [`docs/ref/divergencias.md`](../ref/divergencias.md).

## Related

- [`docs/prds/index.md`](../prds/index.md) — domain PRD index (all **7** MVP domains **validated**)
- [`docs/product/non-functional-requirements.md`](../product/non-functional-requirements.md)
