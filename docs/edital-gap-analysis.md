# Edital Gap Analysis — Pregão Eletrônico Nº 029-2026 FME

Gap matrix cross-referencing the **162 mandatory requirements** from the POC
evaluation table (*"Tabela de Avaliação POC — Requisitos Obrigatórios (Completa 1
a 162) — V2"*, source in `docs/assets/`) against School Lab's documented scope.

> **Informational document, not a decision anchor.** This is a survey to size the
> distance between School Lab and a public-network tender based on **i-Educar**;
> it does not commit the product to any of these requirements.

## 1. Source and context

- **Reference:** Edital do Pregão Eletrônico Nº 029-2026 FME — Anexo I (Termo de
  Referência), item 10.1.
- **Nature:** binary POC checklist (`[ ] ATENDE` / `[ ] NÃO ATENDE`) — no partial
  score or weighting.
- **Target context:** a **public municipal education network** based on i-Educar
  (open-source school-management system). This differs from School Lab, a
  multi-school SaaS for **private schools** (see `docs/vision.md`).

## 2. Scope reference

There are no domain PRDs yet (only `docs/prds/template.md`), so the "School Lab
scope" baseline is the anchor docs:

- MVP scope — `docs/vision.md` §6.
- Candidate domains — `docs/product-map.md` §5.
- Capabilities by actor — `docs/actors-and-surfaces.md`.

## 3. Legend

| Symbol | Meaning |
|---|---|
| ✅ **Covered** | Within the documented MVP scope |
| 🟡 **Partial** | The domain exists in School Lab, but the requirement needs extension/depth |
| 🟨 **Planned/Adjacent** | Belongs to a candidate or phase-2 domain, not yet detailed (or a generic UX/security detail) |
| ⛔ **Gap** | No School Lab domain covers it — out of product scope |

## 4. Dashboard

| Status | Items | % |
|---|---|---|
| ✅ Covered | 10 | ~6% |
| 🟡 Partial | 15 | ~9% |
| 🟨 Planned/Adjacent | 58 | ~36% |
| ⛔ Gap | 79 | ~49% |
| **Total** | **162** | 100% |

**Read:** ~half the tender is entirely out of School Lab scope (Merenda / school
meals, public vacancy & pre-enrollment, Educacenso, staff HR, BNCC, SEB). Only
~15% overlaps the MVP directly; ~36% is adjacent academic depth the product could
grow into but has not documented.

## 5. Requirements by module

### Módulo 1 — Controle Pedagógico e Administrativo i-Educar (1–65)

| Items | Requirement (summary) | Status | School Lab domain |
|---|---|---|---|
| 1 | Unified control of students/teachers/schools/classes | ✅ | Multi-tenancy + Students + Academic |
| 2 | Access control, users/password, email recovery | ✅ | Identity & roles |
| 3, 4 | Password policy (complexity, expiration), idle-user deactivation | 🟨 | Identity (undocumented detail) |
| 5, 7, 9 | Quick access/locator; CEP address autofill; timetable | 🟨 | UX / Academic (undocumented) |
| 6 | Personal data + photo + **medical report (laudo)**, weight/height history | 🟡 | Students (sensitive data — extends + LGPD) |
| 8 | School year (calendar, transfers, incidents, history) | 🟡 | Academic/Students (only partly in MVP) |
| 10, 11 | Automated transfer **between network schools** | ⛔ | — (public-network context) |
| 12 | Multiple enrollments per student | 🟨 | Students & enrollments |
| 13 | Lock grade/absence edits when year is closed | 🟨 | Academic (aligns with "reliability") |
| 14, 15 | Numeric/conceptual/descriptive grades, formulas | 🟡 | Academic (extends evaluation) |
| 16–23 | Differentiated components/stages, parallel recovery, council, grade-only approval, eval for students with disabilities | 🟨 | Academic (depth) |
| 24 | Class control (shift, times, homeroom teacher) | 🟡 | Academic |
| 25–28 | Descriptive opinions, ordering, seat/vacancy control | 🟨 | Academic |
| 29 | Vacancy balance incl. online enrollment | ⛔ | — (public pre-enrollment) |
| 30 | **School history (histórico escolar)** processing | ⛔ | — (out of MVP) |
| 31–36 | Dependencies, re-enrollment / bulk class assignment | 🟨 | Students/Academic |
| 37–40 | **Staff/HR management** (contract, absences, allocation) | ⛔ | — (HR not in scope) |
| 41–44 | **Educacenso/INEP/MEC** (export, validator, mandatory fields, import) | ⛔ | — (gov. integration) |
| 45 | Student registration form | 🟨 | Documents |
| 46 | Certificates/report cards/history (issuance) | 🟡 | Documents/Academic (some align) |
| 47–53 | Early-childhood/elementary report cards, ID card, class diary, enrollment mirror | 🟨 | Academic/Documents |
| 54 | Vacancy report | ⛔ | — (public vacancy) |
| 55, 57, 58, 59 | Managerial reports, charts, BI dashboard + export | 🟨 | Advanced reporting/BI (phase 2) |
| 56 | Staff/teacher reports (HR) | ⛔ | — (HR) |
| 60 | Document/form repository for download | 🟡 | Documents & digital archive |
| 61–64 | Deduplication; CSV export (users/students/teachers) | 🟨 | Students/Identity |
| 65 | Export to **SEB** (digital student card) | ⛔ | — (gov. integration) |

### Módulo 2 — Autenticador de Documentos (66–67)

| Items | Requirement | Status | Domain |
|---|---|---|---|
| 66, 67 | Authentication of issued documents (integrated with i-Educar) | 🟨 | Adjacent to Documents/signature (phase 2) |

### Módulo 3 — Portal do Professor com Aplicativo Móvel (68–91)

| Items | Requirement (summary) | Status | Domain |
|---|---|---|---|
| 68, 69 | Teacher↔class link; lesson planning | ✅ | Teacher (lesson plan in MVP) |
| 70, 73, 76–78, 81–87, 91 | Academic calendar, class schedule, absence justifications, observations, taught content, pending items, percentages, closed years, notices, export | 🟨 | Teacher/Academic (depth) |
| 71, 72, 79 | Evaluation config, grade posting and reports | 🟡 | Academic (extends evaluation) |
| 74, 75 | Absence recording; bulk attendance | ✅ | Academic (attendance) |
| 80 | Attendance via **offline mobile app** with sync | 🟡 | Teacher app (offline = technical gap) |
| 88, 89 | **BNCC** objectives/skills and nomenclatures | ⛔ | — (BNCC not documented) |
| 90 | Infrequent-student follow-up + notification | 🟡 | Academic (absence notification aligns) |

### Módulo 4 — Gestão de Vagas e Pré-Matrícula Online (92–115)

| Items | Requirement | Status | Domain |
|---|---|---|---|
| 92–115 | Public inscription/pre-enrollment, classification criteria, protocol, convocation, waiting list, **geolocation** (radius/KM), approval, dashboards | ⛔ | — (public-network process; out of scope). *Items 98 & 113 loosely touch "online enrollment" in `Students`, but the public model does not apply* |

### Módulo 5 — Merenda Escolar (116–153)

| Items | Requirement | Status | Domain |
|---|---|---|---|
| 116–153 | School meals/nutrition: stock/batches, **TACO table**, dietary restrictions, anthropometry/**WHO**, menu, recipes, suppliers, consumption groups, indicators | ⛔ | — (domain does not exist in School Lab) |

### Módulo 6 — Portal Pais e Alunos (154–162)

| Items | Requirement | Status | Domain |
|---|---|---|---|
| 154, 156, 157 | Integrated module; link student once; multiple students | ✅ | Parents area |
| 155 | Access via link + password, responsive | 🟡 | Identity/Parents (mechanism differs) |
| 158 | Report card issuance | ✅ | Academic (report card for parents) |
| 159 | View school announcements | 🟡 | Communication (mass = phase 2) |
| 160 | School agenda (holidays/events) | 🟨 | Calendar (not in MVP) |
| 161, 162 | Certificate issuance (attendance/enrollment) | 🟨 | Documents (issuance not detailed) |

## 6. Conclusions

1. **Compatible core (✅+🟡):** base records, grades/report card/attendance,
   teacher portal (planning + attendance), and parent portal. This is where
   School Lab and the tender converge.
2. **Largest structural gap (⛔ 49%):** Merenda (38 items) and public
   vacancy/pre-enrollment (24 items) alone are **62 items — 38% of the tender —**
   in domains the product does not have.
3. **Government integrations** (Educacenso, SEB) and **staff HR** are
   high-cost, public-sector-specific gaps.
4. **Growth zone (🟨 36%):** academic depth (recovery, dependency, class council,
   reports/BI). School Lab has the "Academic" domain, but the PRDs would need to
   be far deeper to "ATENDER" these binary lines.
5. **Market mismatch:** School Lab's differentiators (boletos, Livro Ata with
   digital signature, image-based communication) **do not appear** in the tender.
   This is a Termo de Referência for a **public i-Educar-based network**, not for
   a private school.

## 7. LGPD note

The tender handles **children's data** and sensitive data (item 6: medical
report; items 121–124, 127: disabilities, dietary restrictions, anthropometric
measurements). If any of this becomes a product requirement, it reinforces the
privacy guardrails already required in the repo (per-family isolation, guardian
consent, retention, access auditing). See `docs/open-questions.md` (LGPD
section).
