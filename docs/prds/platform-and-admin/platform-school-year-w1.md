# Feature slice — Platform school year W1

> Domain: [school-year](school-year.md)
> Status: approved — codelet execution contract (Phase 4C.1 / E1)
> Corpus area: gestao-academica

## Requirements

| Field | Answer |
|-------|--------|
| Actor | Director/owner with `manage_school_settings` on school SPA `/app`; backoffice operator with `provision_school` during `school.provisioning?`; staff/teacher read-only where documented; guardian **403** on all W1 routes |
| Trigger and precondition | School exists; year created in `draft` with valid date range; activate requires ≥1 academic period; at most one `active` year per school (BR-SY01); financial year equals academic year container in MVP |
| Observable outcome | CRUD on `school_years`, `academic_periods`, `school_holidays`; `POST …/activate` archives prior active year; `GET …/active` returns embedded periods/holidays or `422 no_active_school_year`; domain events `SchoolYearActivated` / `SchoolYearArchived` emitted |
| Adversarial cases | Guardian 403 on reads; cross-school 404; `409 year_in_use` on discard when enrollments/charges reference year; period overlap `422`; PATCH on active/archived year rejected; archived year blocks downstream enrollment mutations |
| Non-goals | (see section below) |

## Bar

**Reference:** `docs/ref/proesc/gestao-academica/fluxos.md` § finalização de ano letivo; edge cases in `docs/ref/proesc/gestao-academica/casos-de-borda.md` (rematrícula without next exercício)
**Rationale:** Closest documented year rollover and ordering constraints in the competitive corpus.
**Recognizably bad:** yes — flat non-tenant `/api/v1/school_years` routes or skipping archive-on-activate semantics.

## Acceptance criteria

1. Given a director with `manage_school_settings` and no active school year, when `POST /api/v1/schools/:school_id/school_years` with valid dates and `period_template: trimester`, then response is `201` with `status: draft` and three `academic_periods` embedded.
   → docs/ref/proesc/gestao-academica/modelo-de-dominio.md

2. Given a guardian membership for the same school, when `GET /api/v1/schools/:school_id/school_years`, then response is `403 forbidden`.
   → [product decision] — frozen API narrative `docs/api/v1/platform-and-admin.md`

3. Given staff of school A, when requesting `GET /api/v1/schools/:school_b_id/school_years/active`, then response is `404 not_found`.
   → NFR-003

4. Given a draft year whose periods overlap, when `POST …/school_years/:id/activate`, then response is `422 period_overlap`.
   → BR-SY03

5. Given active year 2025, when director activates draft year 2026, then `2025` becomes `archived`, `2026` is sole `active`, and response includes `archived_year_id`.
   → BR-SY06 / UC-SY02

6. Given enrollments referencing year Y, when `DELETE …/school_years/:id`, then response is `409 year_in_use`.
   → BR-SY08

## Non-goals

- Period closure mutations (Academic BC6)
- `calendar_events` CRUD (Platform W2 / 4C.1b)
- Multi-unit school year scoping
- Separate financial year container from academic year (P2)

## Roadmap decisions (confirmed Phase 7)

| Decision | Value |
|----------|-------|
| Financial year = academic year (MVP) | yes |
| Guardian link before active enrollment | enforced in Students 4C.2 / E2 (downstream) |
| FCM in Communication W1 | yes — align PRD wave table to roadmap |
| Canonical DM resource name | `conversations` |
| Image attachment limit | 5 MB |

---

**Distinction from domain PRD ACs:** `school-year.md` acceptance criteria are product-level outcomes. These ACs are full GWT scenarios verifiable by codelet critics for one shippable engineering unit (E1).

**API contract:** frozen in `docs/api/v1/platform-and-admin.md` (Phase 4C.1).

## Codelet loop verification (2026-08-15)

| AC | Status | Notes |
|----|--------|-------|
| #1 | Approved (4/5) | Spec asserts period count; optional hardening: assert period names/dates |
| #2 | Approved (5/5) | |
| #3 | Approved (5/5) | Cross-school `/active` spec added in loop |
| #4 | Approved (4/5) | Overlap guard + rswag spec added in loop |
| #5 | Approved (5/5) | |
| #6 | Deferred | `year_in_use` request spec stubs guard until Students enrollments (4C.2 / E2) |

Harness: 38 W1 request examples green; full suite 1099 examples green on branch.
