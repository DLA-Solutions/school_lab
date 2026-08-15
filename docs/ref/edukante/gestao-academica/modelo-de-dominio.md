# Domain model — academic management (Edukante)

Harvest: 2026-08-14. Sources: public Edukante pages (see `docs/ref/edukante/README.md`).

## Core entities

### Student (`aluno`)

Personal data with configurable custom fields; photo; digitized documents;
active/inactive state; link to enrollments and portal credentials.
([recursos acadêmico+financeiro](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx))

### Guardian (`responsável`)

Many-to-many with students; exactly one **financial guardian** per student
(student may be their own financial guardian).
([controle acadêmico](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-escolar-web-controle-academico.aspx))

### Teacher (`professor`)

Personal data; authorization scoped to specific courses, grades, modules,
subjects, and class groups for grade entry and attendance.
([recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx))

### Academic structure

Hierarchy observed (varies by institution type):

```
school_year → teaching_level → course/grade → module (optional) → class_group → subject
```

Also: `teaching_period` (shift). Structure is per school year; can be **exported**
to a new year. Entities support activate/deactivate guards.
([recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx))

### Enrollment (`matrícula`)

Links **student + class_group** (+ optional cross-module subjects for higher ed).
Carries a **financial plan**: receivables for enrollment fee, tuition, material,
document fees. Supports enrollment-level discounts by payment day.
([sistema de gestão escolar](https://www.edukante.com/sistemas-gestao-escolar/sistema-de-gestao-escolar.aspx))

States implied: active, inactive/deactivated (with history, dates, reasons).

### Evaluation model (`estrutura avaliativa`)

Configured per institution (often by Edukante support, not self-service):

- Assessment periods (`unidades letivas` / `marcos`)
- Assessments per period (count varies)
- Grade type: decimal (0–10 or 0–100) or textual **concepts**
- Averages, rounding, recovery exams, council rules, approval thresholds
- Layout templates for report cards and class diaries (HTML customization)

([recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx))

### Grade / concept (`nota` / `conceito`)

Entered by admin or authorized teacher; bulk entry per class/subject; individual
entry across all subjects for one student.
([recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx))

### Lesson & attendance (`aula` / `presença`)

Per subject, date, and class: title, description, lesson content (distinct from
syllabus). Attendance per lesson **or** manual total absences per period.
Multiple lessons same day allowed.
([sistema de gestão escolar](https://www.edukante.com/sistemas-gestao-escolar/sistema-de-gestao-escolar.aspx))

### Academic documents

| Document | Scope | Notes |
|----------|-------|-------|
| Report card (`boletim`) | Student or whole class | Custom layout; recovery rules |
| Class diary (`diário de classe`) | Class + subject | Synthetic, analytic, attendance, full views |
| Individual record (`ficha individual`) | Student across enrollments | |
| Enrollment form (`ficha de matrícula`) | Per enrollment | Custom layout |
| Transcript (`histórico`) | Prior years / other schools | |
| Auto-generated docs | From templates | Contracts, declarations, IR statements, etc. |

Templates: school uploads `.doc/.docx` with merge tags; some marked for
**digital contract signature** (timestamp stored).
([sistema de gestão escolar](https://www.edukante.com/sistemas-gestao-escolar/sistema-de-gestao-escolar.aspx))

### Occurrence (`ocorrência`)

Typed events on students, teachers, or guardians; groupable by occurrence type.
([recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx))

### ID card & physical access

Student ID cards with custom layout, photo, barcode/QR tied to enrollment;
optional entry/exit logging via barcode reader or turnstile (extra setup cost).
([recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx))

### User & permission

Per-user screen-level permissions; audit log of user actions.
([financeiro recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-financeira-para-escolas-cursos-faculdades-recursos.aspx))

## Key relationships

```
student ←→ guardian (M:N, one financial guardian)
enrollment → student, class_group, receivables[]
enrollment → academic_documents
teacher → authorized (class_group, subject) pairs
grade/concept → enrollment, subject, assessment_period
lesson → subject, class_group, attendance[]
```

## Document access gate (inferred)

Some documents may require payment of a configured fee before portal access
(boleto, Pix, or card).
([sistema de gestão escolar](https://www.edukante.com/sistemas-gestao-escolar/sistema-de-gestao-escolar.aspx))
