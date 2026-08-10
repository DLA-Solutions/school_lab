# Actors and Surfaces

## 1. Actors

- **Backoffice (platform / DLA)**: operates the platform; registers and
  administers schools; subscription/commercial management.
- **School (administration)**: administers its own school — users, classes,
  students, billing, documents. Staff functions (Secretaria, Coordenação, Direção) map to
  **role templates** on the `staff` role, not separate membership roles — see
  [`docs/prds/identity-and-onboarding/permissions.md`](prds/identity-and-onboarding/permissions.md).
- **Teacher**: posts grades and academic activities for their class/subject.
- **Parents / guardians**: follow the academic, financial, and document life of
  their child(ren).

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
| Parents      | Yes (phase 2)| Yes        | Boleto and documents prioritized on app |

> Proposal: in the MVP, parents enter first through the app; parents' web comes
> in phase 2. Confirm in `docs/open-questions.md`.

## 4. High-level capabilities by role

### Backoffice

- Create/administer schools.
- Manage the school's subscription/plan.
- Support and platform overview.

### School (admin / staff role templates)

- Manage the school's users (teachers, parents, staff) — Secretaria and Coordenação use
  **role templates**, not separate roles.
- Manage classes, subjects, enrollments.
- Track billing (boletos, delinquency).
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

### Parents

- View their child's grades, report card, and academic status.
  [elementary/high school]
- Send and receive messages with the teacher and the school (text + image).
  [all segments — priority in early childhood]
- Receive push notifications (messages, attendance absence, notices).
- View and pay boletos.
- Access the student's documents.
- (Phase 2) Sign minutes digitally (family meetings, events).
- (Phase 2) Receive mass announcements with read receipts; follow the child's
  structured daily routine. [early childhood education]

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
