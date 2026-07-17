# Open Questions

A living backlog of decisions that aren't finalized yet. Each item should become
a recorded decision (in vision/actors) or a PRD.

## Recent decisions (stakeholder validation — Jul 2026)

Recorded from a conversation with the partner director (escola NSR). Details in
`docs/vision.md` and `docs/actors-and-surfaces.md`.

- [x] **Communication enters the MVP** — priority #1 for the second semester.
      Two-way parent↔teacher and parent↔school messaging, with image sending.
      Audio out of scope.
- [x] **Push notification** — already exists in the current system; keep parity
      in the MVP. Delivery via FCM + queue (Solid Queue) + state machine on the
      API.
- [x] **Real-time is not needed** — information must arrive in a timely manner,
      not in real time. Solid Cable / Turbo Streams are left for phase 2.
- [x] **Web and app in the MVP** — both channels from the start.
- [x] **Registration and login** — all roles need registration and
      authentication.
- [x] **Early childhood education in the MVP** — communication covers the main
      need; a structured daily routine is left for a later phase.
- [x] **Attendance in the MVP** — already exists in the legacy system; automatic
      absence notification is critical and must be reliable (a failure creates
      legal conflict).
- [x] **The Livro Ata (official minutes-record book) can be 100% digital** — the
      physical book is not mandatory; the legal requirement is a valid **digital
      signature**. The Conselho de Educação (Board of Education) audits these
      records frequently.

- [x] **Teacher in the MVP: web and app together** — grades and lesson plans on
      web; messages and attendance on app (both channels available).

## MVP and scope

- [ ] Confirm the full MVP scope: communication + academic (grades, report
      cards, attendance) + billing (boleto) + digital archive. What is left out
      in this first cut?
- [ ] Backoffice in the MVP: only school registration, or also platform billing?
- [ ] Parents in the MVP: app only, or web too?

## Billing

- [ ] Who generates the boleto (school manually vs. automatically) and what
      recurrence?
- [ ] Payment/boleto-issuance integration (bank, gateway)?
- [ ] Delinquency handling (notices, blocks)?

## Digital archive / auditing

- [ ] Which documents does the Secretaria/Conselho require? (official list)
- [ ] Organization: by student, by class, by school year?
- [ ] Document retention and versioning?

## Contracts, signature, and Livro Ata (phase 2 — high priority)

The stakeholder validated strong interest. The Livro Ata shares digital-
signature infrastructure with contracts.

- [ ] Proprietary signature vs. third parties (DocuSign, Authentique,
      Clicksign)? Proposal under evaluation: a proprietary advanced signature
      with a scribble (drawn field) + email + IP + hash — it needs to match the
      standard accepted by the notary's office (DocuSign/Authentique). Legal
      validation pending (Lei 14.063/2020).
- [ ] Legal requirements for legal validity in Brazil — confirm with a
      specialized lawyer before deciding proprietary vs. third party.
- [ ] Types of minutes in the initial scope: enrollment, Conselho de Classe
      (class council), final results, parent meetings, events that occurred at
      the school (incidents, falls, etc.) — do they all come in together or in
      stages?
- [ ] Minutes generation flow: manual template, guided form, or AI from an
      audio/meeting transcript (the stakeholder's current workflow: recording →
      transcription → Claude with a prompt → review)?
- [ ] Integration with meeting transcription (Google Meet / MCP tool) — phase 2
      or later within the module?
- [ ] Semantic search across the minutes archive — technology (pgvector,
      external service) and scope (minutes only or the entire digital archive)?
- [ ] Formatted printing for a physical Livro Ata — still needed even with a
      valid digital version, or only for schools that prefer a hybrid archive?
- [ ] Migration of historical minutes: older schools have a large physical
      volume; schools up to ~5 years old would have little backlog — offer a
      digitization service or just "born digital"?
- [ ] Conselho de Classe: how many signatories per set of minutes? Parallel vs.
      sequential collection flow to reduce the current turnaround (~1 week)?

## Academic

- [ ] Assessment model (bimester, trimester, concepts vs. grades)?
- [ ] Report card format — per-school template or standard?
- [ ] Attendance reliability rules: validation before triggering an absence
      push; retry/idempotency; auditing of sent notifications.

## Early childhood education / Daily routine (phase 2)

- [ ] Record fields: meals, sleep, hygiene/diaper, health, mood, photos, notes
      (confirmed as the desired set — still need to detail the granularity of
      each field, e.g., meals per serving or overall)
- [ ] How to distinguish an "early childhood education" class vs.
      "elementary/high school" in the modeling — by class segment, by school, or
      configurable?
- [ ] Recording frequency/granularity: by period of the day (morning/afternoon)
      or by discrete event (each diaper change, each meal)?
- [ ] Notification to parents: in real time for each record, or a consolidated
      daily summary?
- [ ] Photos of the day: part of this feature or via messages with images
      (communication module)?
- [ ] Retention/history: for how long does the routine history stay available to
      parents?

## Communication

Scope decision finalized (enters the MVP). Detailing to be resolved:

- [ ] Types in the MVP: 1:1 parent↔teacher and parent↔school chat — do mass
      announcements and contextual comments come in phase 2?
- [ ] Mass announcement (phase 2): whole school, by class, or both?
- [ ] Are read receipts mandatory in announcements? Do they become an auditable
      record (`docs/vision.md` — digital archive)?
- [ ] Teacher response-time expectations — how to avoid demands for 24/7
      availability? (silence outside working hours, a "reply on the next
      business day" notice)
- [ ] Escalation: if a teacher doesn't reply within X time, does the message
      escalate to coordination/school?
- [ ] Push notifications: immediate for everything, or only for urgent items
      (e.g., health, absence) with a daily summary for the rest?
- [ ] Isolation: ensure a parent never sees another family's
      conversation/announcement — enforcement via policy, like the isolation
      between schools?
- [ ] Size/resolution limit for images in messages?

## LGPD / Privacy

- [ ] Legal basis for processing children's data — who consents (legal guardian)
      and where is that recorded in the student's record?
- [ ] LGPD (Brazil's data-protection law) roles: the school as controller, DLA
      as processor — is a Data Protection Officer (DPO) needed? Whose is the
      formal responsibility?
- [ ] Sensitive data (health — early childhood routine fields, medications,
      incidents): does it need differentiated processing/retention from other
      data?
- [ ] Retention: for how long are messages, photos, and routine records kept?
      What happens when the student leaves the school?
- [ ] Access auditing: record who viewed messages/announcements (relevant in
      case of school↔family conflict)?
- [ ] Data subject rights (access, correction, deletion) exercised by the
      guardian on the child's behalf — is the flow defined?
- [ ] Consent form / privacy policy — proprietary legal text or external support
      (legal counsel specialized in education)?

## GTM / business

- [ ] Format of the partnership with the Sindicato (commercial, pricing)?
- [ ] Platform billing model (per student, per school, per plan)?

## Web stack

Decisions finalized in `docs/web-stack.md`. Open items:

- [ ] API serialization: `jsonapi-serializer` vs. `blueprinter`?
- [ ] Web auth: Rails 8 Authentication Generator vs. Devise?
- [ ] Email provider (Postmark, SES, etc.)?
- [ ] Boleto integration (gateway/bank)?
- [ ] When to add Redis (cache only) — scaling criterion?
- [ ] Firebase Authentication — needed, or is proprietary auth (JWT) enough?
