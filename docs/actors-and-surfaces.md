# Actors and Surfaces

## 1. Actors

- **Backoffice (platform / DLA)**: operates the platform; registers and
  administers schools; subscription/commercial management.
- **School (administration)**: administers its own school — users, classes,
  students, billing, documents.
- **Teacher**: posts grades and academic activities for their class/subject.
- **Parents / guardians**: follow the academic, financial, and document life of
  their child(ren).

## 2. Channels

- **web**: web surfaces + API (serves both web and app).
- **app**: mobile apps.

## 3. Role × channel matrix (MVP)

| Role         | web         | app         | Note                                 |
|--------------|-------------|-------------|--------------------------------------|
| Backoffice   | Yes         | No (phase 2)| Operation is primarily desktop       |
| School       | Yes         | Yes         | Admin on web; queries on app         |
| Teacher      | Yes         | Yes         | Grades and lesson plans on web; messages on app |
| Parents      | Yes (phase 2)| Yes        | Boleto and documents prioritized on app |

> Proposal: in the MVP, parents enter first through the app; parents' web comes
> in phase 2. Confirm in `docs/open-questions.md`.

## 4. High-level capabilities by role

### Backoffice

- Create/administer schools.
- Manage the school's subscription/plan.
- Support and platform overview.

### School (admin)

- Manage the school's users (teachers, parents, staff).
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

### web-ui + app (finalized decision)

**React web** (`web-ui/`) and **React Native** (`app/`) both consume the same
versioned JSON REST API (`/api/v1`) from Rails (`web/`). Details in `docs/web-stack.md`
and `docs/api/README.md`.

- **Web (browser):** React SPA + JWT access + refresh httpOnly cookie.
- **Mobile app:** React Native + JWT access + refresh in secure storage.
- **API:** Devise credentials, JWT, OpenAPI via rswag.
- Business rules shared via Rails service objects — clients stay thin.

### Principle

The API is the single point of business rules for both channels.
