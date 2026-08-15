# Non-functional requirements (School Lab)

Cross-cutting NFR catalog referenced by domain PRDs via [`prds/template.md`](../prds/template.md).
Domain PRDs add **domain-specific** bullets under their NFR section; this document is the
shared baseline.

**Sources:** [`vision.md`](../vision.md) (principles, MVP boundaries),
[`open-questions.md`](../open-questions.md) (Jul/Aug 2026 decisions),
[`divergencias.md`](../ref/divergencias.md) (competitor-informed decisions),
[`capability-map.md`](capability-map.md) (differentiator capabilities).

---

## NFR-001 — Reliability (critical domains)

**Applies to:** attendance, grades, charges, payments, webhook processing.

Attendance and grade errors create **legal conflict** with guardians and regulators
([`vision.md`](../vision.md) §6; Jul 2026 stakeholder validation in
[`open-questions.md`](../open-questions.md)). Billing mistakes erode trust in the
fintech-first partner slice.

| Requirement | Implementation expectation |
|-------------|---------------------------|
| **Idempotence** | Duplicate provider webhooks, push retries, and batch jobs must not create duplicate side effects (e.g. `webhook_events` dedup — [`fintech-first.md`](../prds/fintech-first.md) BR-006). |
| **No silent loss** | Failed attendance sync, grade publish, or charge issuance must surface actionable errors — never drop records without audit trail. |
| **State machines** | Domain status transitions (charges, enrollments, notifications) use explicit AASM machines; invalid transitions return structured errors. |
| **Audit on change** | Mutable domain records use `audited` + `SchoolAuditable` ([`guidelines/web/auditing.md`](../guidelines/web/auditing.md)). |
| **Immutable facts** | `payments` and `webhook_events` are append-only financial/ingress records — no Discard, no in-place mutation. |
| **Attendance validation** | Rules for triggering absence notification pending PRD — see [`open-questions.md`](../open-questions.md) § Academic. |

**Related differentiator capabilities** ([`capability-map.md`](capability-map.md)):

- `academic.record_attendance`, `academic.manage_attendance` — reliable attendance with legal impact
- `academic.enter_grades`, `academic.publish_report_card` — grade posting stability
- `billing.issue_charge`, `billing.issue_boleto` — automated receivables without secretarial rework

**Competitor context:** [`DIV-academic-002`](../ref/divergencias.md) (attendance counting policies vary);
School Lab decision — school-level policy with per-period override.

---

## NFR-002 — LGPD and privacy

**Applies to:** all domains touching children, guardians, messages, photos, health/routine data.

School Lab handles **children's data** — privacy is a hard requirement
([`.cursor/rules/core/lgpd-privacy.mdc`](../../.cursor/rules/core/lgpd-privacy.mdc)).

| Requirement | Implementation expectation |
|-------------|---------------------------|
| **Per-school isolation** | Every school-scoped resource belongs to exactly one `school_id`; queries and policies never leak across schools (NFR-003). |
| **Per-family isolation** | Guardian routes under `/schools/:school_id/me/*` return only records linked via `student_guardians` for that guardian profile. Cross-family access returns `404`, not `403`. |
| **Minimize collection** | Collect only data necessary for the stated purpose; guardian consent is the legal basis for a child's data. |
| **Sensitive fields** | Health, routine, medications, and incident fields require extra care in storage, access, and retention — flag in PRDs and [`open-questions.md`](../open-questions.md) LGPD section. |
| **Message & photo retention** | Retention windows for communication media and digital archive pending legal validation — open item; PRDs must cite policy once decided. |
| **Consent records** | Staff/guardian onboarding consent location TBD — [`open-questions.md`](../open-questions.md) § Identity. |

**Related differentiator capabilities:**

- `identity.manage_consent` — LGPD consent capture (blocked pending open question)
- `communication.attach_files_to_message` — images in messages with retention policy
- `documents.store_student_document` — digital archive per student/school

**Competitor context:** [`DIV-communication-004`](../ref/divergencias.md) (progressive profiling);
[`DIV-communication-005`](../ref/divergencias.md) (photos with retention — no vanity feed).

---

## NFR-003 — Multi-tenancy

**Applies to:** API, services, policies, jobs, audit queries.

| Requirement | Implementation expectation |
|-------------|---------------------------|
| **Tenant in path** | Scoped resources at `/api/v1/schools/:school_id/...` (Jul 2026 API decision). |
| **Request context** | `Current.school`, `Current.membership` set after JWT validation. |
| **Query scoping** | `policy_scope` or explicit `school_id` on all tenant relations; denormalized `school_id` on child tables. |
| **Service boundaries** | Services receive `school:` and `actor:` keywords — never load tenant data from raw IDs without scoping. |
| **Backoffice** | Platform operators manage schools globally; school data access still respects tenancy rules. |

Full guide: [`guidelines/web/multi-tenancy.md`](../guidelines/web/multi-tenancy.md).

**Related capabilities:** all MVP rows in Identity and Platform domains;
[`DIV-academic-008`](../ref/divergencias.md) (multi-school networks — per-school isolation with group roll-ups in P2).

---

## NFR-004 — Push notifications

**Applies to:** communication, billing, academic absence alerts.

Jul 2026 decision: push parity with legacy system; **not real-time** — timely delivery
via queue, not live sync ([`open-questions.md`](../open-questions.md)).

| Requirement | Implementation expectation |
|-------------|---------------------------|
| **Transport** | FCM for mobile; web push when channel ships. |
| **Delivery pipeline** | Solid Queue jobs + notification state machine on API — no fire-and-forget HTTP from controllers. |
| **Per-channel policy** | Explicit rules for which events trigger push vs email vs in-app only — [`DIV-communication-007`](../ref/divergencias.md). |
| **Billing channels** | Finance notifications separate from comms; régua automation deferred in fintech-first MVP (stub notifier). |
| **Opt-out respect** | Channel preferences per user/school where legally required; billing critical alerts may override with documented policy. |

**Related differentiator capabilities:**

- `communication.configure_push_policy`, `communication.track_delivery_status` — MVP push delivery and per-channel policy
- `billing.configure_billing_notifications` — explicit finance push policy ([`billing/dunning.md`](../prds/billing/dunning.md))

**Competitor context:** Proesc pushes rotina/recados/finance only; School Lab adopts explicit
per-channel policy rather than competitor-default breadth.

---

## NFR-005 — Observability and audit

**Applies to:** provisioning, billing, communication, access-sensitive operations.

| Requirement | Implementation expectation |
|-------------|---------------------------|
| **Change audit** | `audited` gem on mutable domain models; queryable per school ([`guidelines/web/auditing.md`](../guidelines/web/auditing.md)). |
| **Provisioning audit** | School onboarding, invite acceptance, role changes, and handoff steps logged with actor and timestamp. |
| **Billing audit** | Charge adjustments, cancellations, manual payments, and discount applications require reason codes and audit trail. |
| **Financial ingress** | `webhook_events` log provider payloads for reconciliation and dispute resolution. |
| **Access audit** | Who *viewed* sensitive records (messages, photos, archive) — **open item** in LGPD section; distinguish from change audit. |
| **Operational visibility** | Job failures (push, webhooks, charge generation) must be monitorable; silent retry with dead-letter or alert. |

**Related capabilities:**

- `documents.export_audit_package` — audit-ready export for provisioning and archive
- `billing.adjust_charge`, `billing.cancel_charge` — financial mutations with audit
- `identity.provision_school`, `identity.onboard_team` — onboarding trail

---

## NFR-006 — Availability and performance (baseline)

**Applies to:** all MVP surfaces (web SPA + mobile).

| Requirement | Implementation expectation |
|-------------|---------------------------|
| **Timely delivery** | Messages and notifications arrive within minutes under normal load — not sub-second real-time. |
| **Mobile offline** | Read-only cache acceptable for MVP; write operations require connectivity with clear UX. |
| **API versioning** | Breaking changes only via `/api/v1` successor; clients never embed business rules. |
| **Accessibility** | WCAG 2.1 AA target for web surfaces — [`open-questions.md`](../open-questions.md) Aug 2026 design decision. |

Detailed SLOs and load targets deferred to `docs/quality/` (Phase 2+).

---

## How PRDs reference this catalog

In each domain PRD (`docs/prds/template.md` § Non-functional requirements):

1. Link to this file for cross-cutting baseline.
2. Add domain-specific bullets (e.g. "Given a duplicate webhook, When processed twice, Then one payment row").
3. Map acceptance criteria to NFR IDs where helpful (`AC-NNN` cites NFR-001, etc.).

When a new cross-cutting concern emerges (e.g. encryption at rest policy), add an NFR section
here first, then link from affected PRDs.

---

## Cross-references

| Document | Role |
|----------|------|
| [`mvp-scope.md`](mvp-scope.md) | Which capabilities are MVP vs deferred |
| [`capability-map.md`](capability-map.md) | Differentiator flags and blockers per capability |
| [`domain-roadmap.md`](domain-roadmap.md) | PRD/modeling/API maturity |
| [`traceability.md`](traceability.md) | ID conventions (BR/UC/AC, DIV-*) |
| [`guidelines/web/`](../guidelines/web/README.md) | Implementation patterns (services, jobs, policies) |
