# Product Vision — School Lab

## 1. Summary

A multi-school management platform (many schools in a single system), aimed at
private schools. It centralizes academic, financial, document, and family-
relationship management, with a focus on four differentiators: reliable
communication (messages with images), stability, a complete digital archive
(auditing), and billing automation.

## 2. Problem

Private schools switch systems often (reports of ~5 systems in 7 years) for
recurring reasons:

- **Instability**: loss of critical data (e.g., grades disappearing when posted)
  and incorrect notifications (e.g., an absence push while the child is present
  at school — a real case with legal impact and family↔school conflict).
- **Manual processes**: boletos (Brazilian bank payment slips) and contracts
  handled outside the system.
- **Physical archive**: audits by the Conselho/Secretaria de Educação (Board /
  Secretariat of Education) require every document; without a system that stores
  everything, the school keeps physical archives filling entire rooms —
  including the **Livro Ata** (official minutes-record book), a frequent target
  of Conselho de Educação (Board of Education) audits.
- **Manual minutes and signatures**: meetings with families, the Conselho de
  Classe (class council), and events require signed minutes; today the process
  takes days (e.g., ~1 week for the Conselho de Classe) and goes through audio
  recording, manual transcription, and printing for the physical book.

## 3. Value proposition

- **Stable and reliable**: critical data (grades, billing) is never lost.
- **Complete digital archive**: a single audit-ready repository, eliminating the
  physical archive.
- **Digital Livro Ata**: formal minutes (enrollment, Conselho de Classe, final
  results, parent meetings, events) with digital signatures and semantic
  search — the Conselho de Educação audits these books frequently; a digital
  version is allowed as long as it carries a valid digital signature.
- **Automated billing**: generation and tracking of boletos in the app.
- **Contracts and minutes with digital signature**: sending and collecting
  signatures paperlessly (a standard equivalent to DocuSign/Authentique — legal
  validation pending).
- **Everything in one place**: academic, financial, documents, and
  communication.
- **Early childhood education daily routine** (this cut, Infantil only): for
  classes `infantil_1` through `infantil_5`, the teacher keeps one card per
  child per day — narrative, sleep, meals, and signals. Blank fields stay
  hidden from the family. Sending the card posts it once into that child's
  private thread. See
  [`docs/prds/academic/daily-routine.md`](prds/academic/daily-routine.md).
- **Direct, secure communication**: one private thread per school and student,
  shared by the linked guardians and the teachers assigned to the child's
  current class. Differentiator: **images, audio, and short video** on the
  same message (up to 10 MB, five files, no transcoding). Long video stays
  out. A sent message is kept as sent.

## 4. Target audience

- **Primary**: private schools (basic education).
- **Distribution channel**: partnership with the Sindicato das Escolas
  Particulares (private schools union), reaching the network — including schools
  in the process of opening.

## 5. Product principles

- **Multi-school from day 1**: many schools in the same system; data isolation
  between schools (shared database with row-level `school_id` isolation — see
  `docs/web-stack.md` §5).
- **Stability over features**: reliability is a requirement, not a wish.
- **Digital-first**: reduce/eliminate paper (boletos, contracts, archive).
- **Multi-channel**: web and app share the same business rules.
- **Scalable**: modeling designed for many schools from the start.
- **Privacy by default (LGPD — Brazil's data-protection law)**: children's data
  demands extra care — guardian consent, per-family isolation, access
  minimization, and defined retention. This applies to the daily routine,
  communication, and the digital archive.

## 6. MVP scope (proposal)

MVP objective: deliver immediate value at the start of the school semester —
a priority validated with the partner director (escola NSR): **communication**
as the main focus, with academic stability and billing as complementary pillars.

**In the MVP**

- School registration and data isolation between schools.
- Identity and roles: backoffice, staff, teacher, parents.
- User registration and login (all roles).
- Base records: students, guardians, classes, subjects.
- **Communication** (this cut): one private thread per school and student, with
  text, images, audio, and short video. A class notice is copied into each
  child's thread. Push, mobile screens, and announcements wait for a later cut.
- Academic: reliable grade posting [elementary/high school]; report card
  reporting; attendance with automatic absence notification — **it must be
  stable and correct** (a failure creates legal conflict).
- Teacher: lesson plan, family messages, and the Infantil daily routine.
- Early childhood education: structured daily routine for `infantil_1` through
  `infantil_5` — one card per child per civil day in `America/Sao_Paulo`,
  editable that same day, then locked.
- Billing: generation and tracking of boletos; parent view.
- Digital archive: document repository per student/school.
- Web SPA in this cut. The mobile app will use the same API contract later.

**Out of the MVP (later phases)**

- **Livro Ata & formal minutes** (high priority in phase 2 — strong stakeholder
  enthusiasm): generating minutes by type, collecting digital signatures
  (drawn scribble + email + IP + hash), semantic search across the archive,
  optional printing for the physical archive. Types: enrollment, Conselho de
  Classe, final results, parent meetings, events that occurred at the school.
  AI-assisted generation from a meeting transcript (a later stage within the
  module).
- Contracts + digital signature (shares signature infrastructure with the Livro
  Ata; proposal under evaluation: a proprietary advanced signature — legal
  validation pending).
- Advanced communication (mass announcements, read receipts).
- Landing / sales page.
- Advanced reporting and BI.
- Long-form video, editing or deleting a sent message, push delivery, mobile
  screens, and announcements — outside the family-thread and Infantil-routine
  cut. Push and the mobile app remain later product work on the same contract.

> Stakeholder validation (Jul 2026): the partner director prioritized
> communication, grades, report cards, and lesson plans for the second semester;
> showed strong interest in a digital Livro Ata with signatures and semantic
> search for phase 2. Items still open are in `docs/open-questions.md`.

## 7. Out of scope for this documentation phase

- Supporting tools (e.g., Mintlify, Figma MCP) — decision to come later.

> Decided since this document was first written: the stack is finalized in
> `docs/web-stack.md` — `web/` is a **Rails 8.1 API-only** app (no Hotwire UI),
> the product web UI is a **React SPA**, and **React Native** is the mobile
> stack. Database modeling lives in `docs/database/` and `docs/modeling/`; API
> contracts in `docs/api/`.

## 8. Success metrics (draft)

- School retention (low churn vs. market average).
- Zero loss of grade/billing data.
- % of boletos issued through the platform vs. manually.
- % of audit documents available digitally.
- % of families active in communication (messages read/answered).
- (Phase 2) Average time to close minutes (e.g., Conselho de Classe) vs. the
  manual baseline (~1 week).
