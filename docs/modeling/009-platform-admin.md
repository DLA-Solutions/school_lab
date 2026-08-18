# Data Model — Platform & Admin (009)

> PRDs: [`school-year.md`](../prds/platform-and-admin/school-year.md) and
> [`calendar.md`](../prds/platform-and-admin/calendar.md)  
> Executable schema: [`schema.dbml`](../database/schema.dbml)  
> DER: [`der_009.png`](../database/der_009.png)

This increment hardens Wave 1 (`school_years`, periods, and holidays) plus the minimum calendar
stub required by the validated PRDs. Backoffice, staff administration, onboarding, and full
product configuration remain later 009 increments.

## Entity groups

| Table | Role and ownership |
|-------|--------------------|
| `schools` | Tenant root; `timezone` supplies the IANA timezone inherited by school years and calendar views |
| `school_years` | School-scoped year container; one kept `active` row per school |
| `academic_periods` | Ordered, non-overlapping date boundaries; Platform owns dates, Academic owns `closure_status` |
| `school_holidays` | Institutional non-school days and attendance suppression marker |
| `calendar_events` | Unified institutional/personal event storage; nullable `user_id` distinguishes ownership |

All domain rows carry `school_id` directly, including children of `school_years`, so policy scopes
never infer tenancy through a cross-domain join.

## School year lifecycle

```mermaid
stateDiagram-v2
  [*] --> draft
  draft --> active: activate (periods present)
  active --> archived: replacement or explicit archive
  archived --> [*]
```

- Create defaults to `draft` with `period_template = trimester`.
- Activation requires at least one valid period and atomically archives the prior active year.
- A partial unique index enforces one kept active year per school.
- Archived years remain readable but reject new enrollments and charge generation.
- Deletion is soft-delete only after application checks that no enrollment or charge references
  the year; referenced years return `year_in_use`.
- Activation and archive transitions are audited per NFR-005.

## Period and holiday invariants

`academic_periods.sequence` is unique within each kept year. Application validation and migration
check/exclusion constraints must enforce `starts_on <= ends_on`, year-bound containment, and no
date overlap. DBML records this migration intent because DBML cannot express PostgreSQL exclusion
constraints. `closure_status` (`open | closing | closed`) lives on the same row but is changed only
by Academic BC6.

`school_holidays` is unique by kept `(school_year_id, date)`.
`applies_to_attendance = true` suppresses normal attendance expectations while the calendar can
still display holidays whose value is false.

## Calendar stub

The MVP uses one `calendar_events` table:

- `user_id IS NULL` means an institutional event.
- `user_id IS NOT NULL` means a personal event visible only to that owner; policy scope is
  `(school_id, user_id)` and takes precedence over `visibility`.
- `school_year_id` is nullable because date-window queries may include events outside the active
  year.
- `visibility` is `school | staff_only` and defaults to `school`. In MVP, `school` means all
  authenticated staff/teacher memberships in that school; it does not grant guardian access.
- Timestamps are stored in UTC and displayed using `schools.timezone`.

This unified representation replaces the earlier conceptual `personal_calendar_events` table for
MVP. Recurrence and communication publication are not modeled.

## Cross-domain contract

Enrollment, attendance, grades, and archive records use explicit `school_year_id`.
Clients select the active year from `GET /api/v1/school_years/active`, then send either the
`school_year_id` query parameter or `X-School-Year-Id` where the eventual API narrative permits
the header. Services must still validate that the selected year belongs to the route's
`school_id`; the header never establishes tenancy.

New billing contracts may resolve the year through nullable `contracts.enrollment_id`. Legacy
student-only contracts do not have a reliable year FK, so year deletion/charge-generation guards
must treat them as migration input and must not infer a year from dates. A direct billing
`school_year_id` is outside this increment; the unresolved legacy policy is tracked in
`open-questions.md`.

Examples:

```text
GET /api/v1/schools/:school_id/enrollments?school_year_id=:id
GET /api/v1/schools/:school_id/academic/attendance_sessions?school_year_id=:id
```

## PRD-to-schema audit

| Requirement | Result | Schema evidence / boundary |
|-------------|--------|----------------------------|
| BR-SY01 | OK | Partial unique active year intent on `school_years` |
| BR-SY02 | OK | Year fields plus inherited `schools.timezone` |
| BR-SY03 | OK | `academic_periods`; overlap/range checks recorded as migration intent |
| BR-SY04 | OK | `period_template`, default `trimester` |
| BR-SY05 | OK | `school_holidays.applies_to_attendance` |
| BR-SY06 | OK | Lifecycle and transactional activation documented; service-owned |
| BR-SY07 | OK | Archive restrictions documented; enforced by consuming services |
| BR-SY08 | OK | FK-preserving soft delete plus `year_in_use` service guard |
| BR-SY09 | OK | Direct `school_id` on every scoped table |
| AC-SY01 | OK | Template and period model support three generated periods |
| AC-SY02 | OK | State machine plus partial unique index |
| AC-SY03 | OK | Holiday attendance flag is explicit |
| AC-SY04 | OK | References remain preserved and delete guard is explicit |
| BR-CA01–06 | OK for stub | Unified events satisfy fields, ownership, tenancy, visibility, soft delete, and no recurrence |

No unresolved schema blocker remains for 009 Wave 1 itself. Period overlap is intentionally a
PostgreSQL migration concern, not a missing DBML entity; legacy billing-year resolution remains a
cross-domain migration question rather than a reason to add an undocumented charge column here.

## Fintech-first delta

No 009 table exists in `web/db/schema.rb` at this documentation baseline.
`schools.timezone`, `school_years`, `academic_periods`, `school_holidays`, and `calendar_events`
therefore require greenfield migrations. This file defines the target; it does not claim those
migrations have shipped.

## LGPD and retention

`calendar_events.title` and `description` may contain personal data. Institutional reads are
school-scoped; personal reads additionally require owner scope. Creation, edits, and discards must
be audited. The retention window for calendar text remains pending legal validation; do not assume
indefinite storage.

- [x] Help taxonomy CMS: same SPA — `/help-taxonomy` in backoffice (E3 shipped)

## E3 P2 — platform ops entities (Aug 2026)

| Table | Role |
|-------|------|
| `school_groups` | Optional network/holding container; `schools.school_group_id` nullable FK |
| `platform_plans` | Seeded SaaS catalog (`starter` / `pro` / `enterprise`) with `monthly_amount_cents` |
| `platform_subscriptions` | One kept subscription per school; status `active` \| `trial` \| `past_due` |
| `platform_impersonation_sessions` | Short-lived support sessions; operator + target staff + school scope |
| `help_taxonomy_categories` | Operator-maintained help structure; `persona_tags` jsonb + optional `module_key` |

Platform-scoped tables have no `school_id` except subscriptions and impersonation sessions (which
reference `school_id` for tenancy context). Cross-tenant analytics reads aggregate only.

## Out of scope

- `menu_visibility_overrides` and `school_product_settings`.
- A separate `personal_calendar_events` table.
- Recurring events and automatic publication to communication.
- Multi-unit roll-up years, transport routes.
- Pre-aggregated analytics materialized views (E3 uses live aggregates).
