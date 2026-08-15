# Competitive Analysis

> Informational document (not a decision anchor). A survey of features from
> players in the school-management market, to support MVP prioritization and the
> following phases. Complements `docs/vision.md` and `docs/open-questions.md`.

For structured, source-anchored competitor behavior (domain models, flows, edge
cases, terminology, friction maps, capability inventory, and cross-competitor
divergences), use [`docs/ref/`](ref/README.md) — the competitive reference corpus
built with the `corpus-concorrente` skill. The deduplicated capability catalog
([`docs/ref/catalogo-funcionalidades.md`](ref/catalogo-funcionalidades.md), 1,325
entries across 9 competitors) is the primary inventory for PRD anchoring. **Anchor
PRD acceptance criteria to `docs/ref/` when grounded in observed behavior;** use
this document for high-level market context only.

## 1. Market overview

The Brazilian "school-management systems" market (also called educational ERP)
currently has three player profiles that compete with each other but solve
different pain points:

| Profile | Main focus | Examples |
|--------|-----------------|----------|
| **Complete school ERP** | Academic + financial + registrar, all integrated | Sponte, Proesc, TOTVS Educacional, Gennera |
| **School↔family communication app** | Digital agenda, announcements, chat, routine — usually integrates with an ERP via API | Agenda Edu, ClassApp, Olá Pais, Kix |
| **Daycare / early childhood niche** | Daily routine (baby/nursery) as the main product | Lápis 360 Baby; international reference: Brightwheel, HiMama |

**School Lab** positions itself as a complete multi-school ERP, with **native
communication** (messages with images — MVP, validated with the stakeholder) and
a **digital Livro Ata (official minutes-record book)** (phase 2, high priority)
as differentiators that most ERPs don't offer natively — today they depend on
integration with separate communication apps (Agenda Edu, ClassApp) and manual
processes for formal minutes.

## 2. Features by domain

### 2.1 Academic

Common features across Sponte, TOTVS Educacional, and Gennera:

- Electronic class diary (grades, absences, lesson content).
- Registration of courses, curriculum matrix, subjects, and classes.
- Classroom allocation / class assembly according to enrollments.
- Customizable assessment system (grades vs. concepts, by bimester/trimester).
- Online tests and activities for students to answer (Sponte).
- Lesson plans and syllabus content (TOTVS).
- School transcript and report card generated automatically.
- Student/teacher portal with grade and absence posting via the app.

> No unusual highlight here — it's the expected core of any school ERP.
> Attendance appears in 100% of the analyzed competitors; it entered the School
> Lab MVP after stakeholder validation (`docs/vision.md`).

### 2.2 Financial

This is the most mature and competitive domain — practically every competitor
offers:

- Automatic (not manual) boleto (Brazilian bank payment slip) issuance with PIX
  and recurring credit card.
- Automatic bank reconciliation ("zero manual reconciliation" — Sponte).
- Automated dunning workflow (reminders by email/SMS/WhatsApp before and after
  the due date).
- Integrated electronic invoice issuance (NF-e/NFS-e/NFC-e).
- Delinquency panel by class/grade/period.
- Accounts payable/receivable, cash flow (in the more complete ERPs).
- 100% online enrollment/re-enrollment, with digital contract and form.

Leading-edge differentiators found:

- **Sponte "Mensalidade Garantida" (Guaranteed Tuition)**: a program in which
  Sponte takes on the delinquency risk and guarantees 100% of receipts to the
  school (a financial product, not just software).
- **Brightwheel (international reference)**: tracking of government subsidies
  across multiple paying agencies (not applicable to Brazil, but it shows
  billing granularity across multiple payers per student).

> Confirms the `vision.md` decision that automated billing is an expected
> differentiator, not optional — it's the price of entry into the market.

### 2.3 Registrar / digital archive

- Online enrollment and re-enrollment, paperless.
- Digital storage of the student's documents (RG, CPF, declarations, contracts,
  transcript).
- Issuance of declarations and transcripts in a few clicks.
- Real-time seat/vacancy control by class/grade.
- Compliance with the requirements of the MEC's Secretaria Escolar Digital
  (cited explicitly by TOTVS as a regulatory requirement, not a differentiator).

> No researched competitor highlights "an archive ready for Conselho/Secretaria
> auditing" as a central value proposition — most treat it as a generic
> registrar feature. This reinforces that it may be a real positioning
> differentiator for School Lab, and not just a commodity feature.

> No researched competitor highlights "an archive ready for Conselho/Secretaria
> auditing" as a central value proposition — most treat it as a generic
> registrar feature. The **Livro Ata** (official minutes-record book) is a legal
> requirement that the Conselho de Educação (Board of Education) audits
> frequently; no researched player offers a digital Livro Ata with semantic
> search — an opportunity for a strong differentiator in School Lab's phase 2
> (validated with the stakeholder in Jul 2026).

### 2.4 Livro Ata and formal minutes

A domain barely covered by the researched ERPs — handled as a manual process
(registrar) or outside the system:

- Schools keep a mandatory physical **Livro Ata** (also common in condominiums
  and other entities).
- Recurring types: enrollment minutes, Conselho de Classe (class council), final
  results, parent meetings, events/incidents at the school.
- Stakeholder (escola NSR): a **100% digital version is allowed** — the physical
  book is not mandatory, as long as there is a valid **digital signature**.
- Operational pain: the Conselho de Classe can take ~1 week to finalize
  signatures; the current workflow involves audio recording, transcription, and
  AI (Claude) to generate a minutes draft.
- Potential differentiator: **semantic search** across the minutes archive — the
  stakeholder believes "a bunch of schools would cry to see it."

> Not found in Sponte, TOTVS, Gennera, Agenda Edu, or ClassApp as a native
> product. It may be a real positioning differentiator, not a commodity.

### 2.5 Contracts and digital signature

Not a native feature in most ERPs — the electronic-signature market is a
parallel ecosystem (Clicksign, D4Sign, DocuSign) that ERPs integrate with or
replicate:

- **Sponte** has its own built-in electronic signature for contracts and
  amendments.
- **ClassApp** offers "digital contract signature collection" within its own
  communication app.
- **Clicksign / D4Sign**: specialized players, with legal validity already
  confirmed by the STJ (REsp 2.159.442/PR, 2024) even without an ICP-Brasil
  certificate, provided there is an audit trail (IP, geolocation, email, hash).
  D4Sign also offers a qualified signature (ICP-Brasil) for cases that require it
  by law (e.g., corporate acts).

> Relevant to the open question "proprietary signature vs. third parties" in
> `docs/open-questions.md`: the market shows both approaches coexisting — larger
> ERPs tend to embed their own signature (keeping the customer inside the
> platform); smaller/newer ERPs integrate via API with Clicksign/D4Sign.

### 2.6 Communication (chat, announcements, read receipts)

A domain dominated by players specialized in communication (Agenda Edu,
ClassApp, Olá Pais), which management ERPs frequently integrate via API instead
of building from scratch:

- **Mass announcements** with mandatory read receipts ("digital
  signature"/"seen") and a dashboard of who read/didn't read — a feature cited
  by all the researched communication players.
- **Individual/segmented announcements**: by student, class, or specific guardian
  (Agenda Edu).
- **1:1 message channels** between parents and teacher/class, with history and
  moderation: admins/coordination have access to all sent messages (ClassApp) —
  relevant to the access-auditing question in `open-questions.md`.
- **Service channels** (ticket-like) separate from 1:1 message channels, to
  organize a high volume of requests to the registrar (Agenda Edu, Olá Pais).
- **Configurable service hours**: the school defines the days/hours in which
  messages are answered, so as not to create an expectation of 24/7 replies — a
  direct answer to the open question about "silencing outside working hours" in
  `docs/open-questions.md`.
- **Satisfaction indicators** per completed service (CSAT) — Agenda Edu.
- **Events with attendance confirmation**, separate from general announcements.
- **Internal team groups** to replace internal WhatsApp.
- **Polls/satisfaction surveys** with the school community (ClassApp).

> No player cited "automatic escalation to coordination if the teacher doesn't
> reply within X time" as an existing feature — it seems to be a market gap, not
> just a School Lab one (a question still open in `open-questions.md`).

### 2.7 Daily routine (early childhood education / nursery)

A domain with two groups of competitors: generalist Brazilian communication apps
that added routine (Olá Pais, ClassApp, Agenda Edu, Kix) and players 100%
focused on daycare (Lápis 360 Baby in Brazil; Brightwheel/HiMama
internationally, as a reference for product maturity).

Recurring features:

- Per-child logging of meals, sleep, hygiene/diaper, health, and mood, sent to
  parents in real time or as a summary.
- Day/week/month menu shared with parents, recording how much of each meal the
  child ate (Olá Pais).
- Private, secure photo/video gallery ("Momentos" in ClassApp) — with "like"-type
  reactions from parents (Brightwheel).
- **Fast, mobile-optimized logging**: a "swipe and tap" interface for the teacher
  to log the whole class in under a minute (Kix); batch logging for several
  students at once (Brightwheel: "record actions for one, some, or all
  children").
- Medication control and logging of occurrences/incidents throughout the day
  (Brightwheel "incident reports"; Lápis 360 "diário de bordo" — logbook).
- Consolidated daily report by email, schedulable (Brightwheel "Daily Report
  Emails" — parents opt in to receive them or not).
- Digital child check-in/check-out (arrival/departure), present in Brightwheel —
  not seen in the researched Brazilian players.

> Findings relevant to School Lab's open questions:
> - **Real-time notification vs. daily summary**: the market (Brightwheel) solves
>   it with both at once — a real-time feed + an optional daily-summary email
>   (parents choose).
> - **Logging granularity**: Brightwheel allows logging by discrete event (each
>   meal, each change) and by batch (the whole class at once); Kix bets 100% on
>   batch-logging speed as a differentiator for teacher adoption.
> - **Photos of the day — a routine feature or an archive feature?**: in
>   competitors, day-to-day photos/videos live inside the communication/routine
>   module (ephemeral, engagement-focused), not in the archive/audit module
>   (formal documents). This suggests that, in School Lab, "photos of the day"
>   and "digital archive" may be modeled as distinct things.

### 2.8 Multi-school / platform backoffice

None of the researched competitors is clearly **multi-tenant by design** with a
platform-operator backoffice administering multiple client schools (School Lab's
design). Sponte, TOTVS, and Gennera sell one instance per school/network
(multi-unit within the same educational group, but not multi-tenant in the sense
of a platform-as-product for third-party schools). This is consistent with the
"multi-school from day 1" principle in `docs/vision.md` as a structural
differentiator, and not something to copy from a specific competitor.

## 3. Comparative summary table

| Feature | Sponte | TOTVS Educacional | Gennera | Agenda Edu / ClassApp | Brightwheel (int'l ref.) | School Lab (proposal) |
|---|---|---|---|---|---|---|
| Grades / class diary | Yes | Yes | Yes | No (integrates via API) | No (daycare focus) | Yes (MVP) |
| Attendance | Yes | Yes | Yes | Partial | Yes (check-in/out) | Yes (MVP) |
| Automated boleto/PIX | Yes | Yes | Yes | Partial (via integration) | Yes (billing) | Yes (MVP) |
| Electronic invoice | Yes | Yes | Yes | No | N/A (US) | Not defined |
| Digital archive / auditing | Partial (registrar) | Partial (registrar) | Partial | No | No | Yes (MVP) — positioning differentiator |
| Digital Livro Ata + semantic search | No | No | No | No | No | Phase 2 — high priority (stakeholder) |
| Contracts + digital signature | Yes (proprietary) | Unclear | Unclear | Yes (ClassApp) | No | Phase 2 (shares infra with Livro Ata) |
| Mass announcements + read receipts | Partial (app) | Partial (app) | Not highlighted | Yes (product core) | Partial (messages) | Phase 2 |
| 1:1 parent↔teacher/school chat (with image) | No (via partner app) | No (via app) | No | Partial (image not highlighted) | Yes (messages) | Yes (MVP) |
| Structured daily routine (daycare/early childhood) | No | No | No | Yes (partial) | Yes (product core) | Phase 2 (communication covers early childhood in the MVP) |
| Multi-tenant platform for multiple client schools | No (instance per school) | No | No | Yes (the very nature of the product) | Yes (the very nature of the product) | Yes (architecture principle) |

## 4. What this changes in the open questions

Items incorporated into `docs/open-questions.md` and `docs/vision.md` after
stakeholder validation (Jul 2026). Other findings from the survey:

- **Digital archive as a differentiator**: no competitor sells this as a central
  proposition; it strengthens the `vision.md` thesis, but it also means there is
  no ready-made "market standard" to copy — the modeling of documents required
  by the Secretaria/Conselho needs to be gathered directly with schools, not
  inferred from competitors.
- **Digital Livro Ata**: market gap confirmed; the stakeholder validated that a
  digital version is allowed with a digital signature; semantic search is a
  differentiator not offered by the researched competitors.
- **Contract/minutes signature**: the market validates both routes (proprietary
  vs. Clicksign/D4Sign/DocuSign); both have legal validity recognized by the STJ
  without ICP-Brasil, provided there is an audit trail. The stakeholder requires
  equivalence to the DocuSign/Authentique standard accepted by the notary's
  office.
- **Communication — service hours and escalation**: "silencing outside working
  hours" is already a common practice (Agenda Edu, Olá Pais); "automatic
  escalation if the teacher doesn't reply" was not found in any competitor — it
  can be treated as P2 without risk of falling behind the market.
- **Daily routine — real time vs. summary**: it is not a binary dilemma for the
  market leader (Brightwheel) — both coexist, with the parent choosing the
  preference.
- **Photos of the day**: competitors treat them as part of the
  communication/routine module, not the formal archive/audit one — suggesting two
  distinct repositories/data models in School Lab.

## 5. Sources

Survey via web search on 2026-07-09. Official sites and product feature pages:

- Sponte — sponte.com.br (features, financial management)
- TOTVS Educacional — totvs.com/educacional
- Gennera — gennera.com.br/blog
- Agenda Edu — agendaedu.com.br
- ClassApp — classapp.com.br
- Olá Pais — agenda.olapais.com.br
- Kix — kix.com.br
- Lápis 360 Baby — setasistemas.com.br
- Brightwheel (international daycare/childcare reference) — mybrightwheel.com
- Clicksign — clicksign.com; D4Sign — d4sign.com.br (legal validity of
  electronic signatures in Brazil, incl. STJ case law)

> This document is a snapshot of the market at the time of the research; products
> and prices change frequently. Revalidate before high-investment decisions
> (e.g., choosing between a proprietary signature vs. third parties).
