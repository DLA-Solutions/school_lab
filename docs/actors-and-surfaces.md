# Actors and Surfaces

## 1. Actors

- **Backoffice (platform / DLA)**: operates the platform; registers and
  administers schools; subscription/commercial management.
- **School (administration)**: administers its own school — users, classes,
  students, billing, documents. Staff functions (Secretaria, Coordenação, Direção) map to
  **role templates** on the `staff` role, not separate membership roles — see
  [`docs/prds/identity-and-onboarding/permissions.md`](prds/identity-and-onboarding/permissions.md).
- **Teacher**: posts grades and academic activities for their class/subject.
- **Guardians** (product UI: **Responsáveis**): follow the academic, financial, and document life
  of their child(ren). `guardian` is the technical membership role. **Responsável financeiro** is
  only a payer relationship to a student/charge, not another login role.
- **Student**: the enrolled learner — a **person record** managed by staff and linked to
  guardians and classes. Competitors often give students their own app login (e.g. Proesc
  Aluno, Agenda Edu student diary); in School Lab MVP the student is primarily a **data
  subject** accessed via guardian and staff surfaces, not a separate login role. Student-facing
  portals are **phase 2** pending validation (`docs/open-questions.md`). The competitive
  corpus documents **~60** student-scoped capabilities across communication, academic, and
  billing domains — see `docs/ref/*/funcionalidades-por-ator.md` § Student and
  [`docs/product/traceability.md`](product/traceability.md).

## 2. Surfaces and channels

Product **surfaces** (deployable clients) map to monorepo folders and URL paths — see
[ADR 001](adr/001-monorepo-surfaces.md).

| Surface | Folder (target) | URL path | Channel |
|---------|-----------------|----------|---------|
| School web SPA | `frontend/app/` | `/app/*` | web |
| Platform backoffice SPA | `frontend/backoffice/` | `/backoffice/*` | web |
| Mobile app | `mobile/` | — | app |
| API | `web/` | `/api/*` | web (server) |
| Marketing site | `site/` | `/` | web (static) |

**Channels** (for the role matrix below):

- **web** — browser SPAs above plus the API.
- **app** — React Native mobile.

## 3. Role × channel matrix (MVP)

| Role         | web         | app         | Note                                 |
|--------------|-------------|-------------|--------------------------------------|
| Backoffice   | Yes         | No (phase 2)| Operation is primarily desktop       |
| Staff        | Yes         | Yes         | System role templates: director, secretary, etc. |
| Teacher      | Yes         | Yes         | Grades and lesson plans on web; messages on app |
| Guardian     | Yes         | Yes         | Web-first guardian portal; mobile parity after each stable API/web contract |
| Student      | No (phase 2)| No (phase 2)| MVP: no student login; record managed by staff/guardian surfaces |

> **Decided Aug 2026:** Guardians use **both** web SPA and mobile in MVP
> ([`docs/product/mvp-scope.md`](product/mvp-scope.md) § Executive summary). The guardian portal is
> delivered web first; mobile follows stable domain contracts and remains primary for push-driven
> flows. Product UI always says **Responsável** while repository identifiers remain `guardian`.

### Active profile and school context

One account may hold multiple memberships across roles and schools. The active product context is
one explicit `membership.id` from `GET /api/v1/me`; it determines both audience and `school_id`.
A dual-role user switches between staff/teacher and Responsável profiles instead of receiving a
merged menu. A multi-school user likewise chooses the school explicitly. Clients persist only the
membership id, clear school-scoped state on switch, and reject stale, suspended, or removed
memberships. Authorization remains server-side through Pundit and family/school scopes.

## 4. High-level capabilities by role

### Backoffice

- Create/administer schools.
- Manage the school's subscription/plan.
- Support and platform overview.

### School (admin / staff role templates)

- Manage the school's users (teachers, parents, staff) — Secretaria and Coordenação use
  **role templates**, not separate roles.
- Manage classes, subjects, enrollments.
- Track billing (boletos, delinquency) — **school→guardian tuition**, not DLA invoices.
- Director/owner with `manage_school_settings`: manage **School Lab assinatura**
  (`/assinatura`) — DLA→school subscription; never mixed into `/boletos` or `/planos`.
- Manage the digital document archive.
- Send and receive messages with families (text + image).
- Send push notifications to the school's users (parity with the current
  system).
- (Phase 2) Send mass announcements (whole school or by class) with read
  receipts; moderate/audit conversations in case of conflict.
- (Phase 2) Manage the digital **Livro Ata** (official minutes-record book) —
  generate formal minutes, collect digital signatures, search the archive
  (semantic search), export/print for the physical archive when needed.

### Teacher

- Post and view grades (with reliable persistence). [elementary/high school]
- Record attendance with automatic absence notification — it must be reliable
  (a failure creates legal conflict). [all segments]
- Create and view lesson plans.
- Send and receive messages with parents (text + image). [all segments]
- View classes, students, and the calendar.
- (Phase 2) Take part in minutes (e.g., Conselho de Classe — class council) with
  a digital signature.
- (Phase 2) Record a structured daily routine — meals, sleep, hygiene, health,
  mood. [early childhood education]

### Guardians (UI: Responsáveis)

- View their child's grades, report card, and academic status.
  [elementary/high school]
- Send and receive messages with the teacher and the school (text + image).
  [all segments — priority in early childhood]
- View the school calendar read-only — holidays, instructional days, and institutional events
  (internal games, exams, pedagogical days); no staff-only events, no edit access
  (`[product decision 2026-10-07]`, [`prds/platform-and-admin/calendar.md`](prds/platform-and-admin/calendar.md) BR-CA07).
- Receive push notifications (messages, attendance absence, notices).
- View and pay boletos.
- Access the student's documents.
- View published Preceptoria reports and report cards.
- Create and follow their own school requests.
- Generate/download one annual income-tax declaration per payer and school, consolidated across
  every child represented by eligible charges that payer settled; payer ownership, not a live
  guardian-child link at generation time, controls inclusion.
- (Phase 2) Sign minutes digitally (family meetings, events).
- (Phase 2) Receive mass announcements with read receipts; follow the child's
  structured daily routine. [early childhood education]

### Student

School Lab MVP treats the student as a **record** (enrollment, class, guardian links), not a
login actor. Capabilities below note competitor parity from `docs/ref/` (~60 student-scoped
entries) and School Lab intent.

**MVP (via staff / guardian — no student login)**

- Exist as a registrable person linked to guardians, classes, and enrollments (staff).
- Be the subject of messages, grades, attendance, boletos, and documents that guardians and
  staff act on (indirect access).
- Early childhood: daily routine and diary content consumed by **guardians**, not a student app
  [infantil — aligns with vision §6].

**Out of MVP (competitor parity — phase 2 unless validated earlier)**

- Dedicated student app or portal login (e.g. Proesc Aluno messaging, Agenda Edu student diary).
- Submit homework or activity attachments as the student.
- View own grades/report card directly (vs. only through guardian).
- Student-initiated password change or profile completion on device.
- Structured daily routine self-logging [infantil — phase 2 structured routine module].

> Canonical capability mapping for student-facing features is complete in Phase 1
> ([`capability-taxonomy.yaml`](../product/capability-taxonomy.yaml) — **20** students canonicals,
> **69/69** raw aliases; **1,325/1,325** catalog-wide). Cross-domain enrollment and trilha
> articles under `communication.*` and `academic.*` alias to `students.*` where noted in
> [`capability-aliases.jsonl`](../ref/capability-aliases.jsonl).

> Note: in the MVP, early childhood education prioritizes **communication**
> (messages with images) over a structured daily routine. Capabilities vary by
> the class segment — see `docs/open-questions.md`.

## 5. Stack by channel

### Web SPAs + mobile (finalized decision)

**School web SPA** (`frontend/app/`), **platform backoffice SPA** (`frontend/backoffice/`), and
**React Native** (`mobile/`) all consume
the same versioned JSON REST API (`/api/v1`) from Rails (`web/`). Layout decision:
[ADR 001](adr/001-monorepo-surfaces.md). Stack details: `docs/web-stack.md` and
`docs/api/README.md`.

- **School web (`/app`):** JWT access + refresh httpOnly cookie (`path: '/'`). Sign-in UI;
  post-login redirect sends backoffice users to `/backoffice/`.
- **Platform web (`/backoffice`):** same auth transport; English URL segments; DLA-only features
  (school register, provisioning wizard).
- **Mobile:** JWT access + refresh in secure storage.
- **API:** Devise credentials, JWT, OpenAPI via rswag.
- Business rules shared via Rails service objects — clients stay thin.

### Principle

The API is the single point of business rules for both channels.
