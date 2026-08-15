# Domain model — academic management (Sponte)

Harvest: 2026-08-14. Sources: public Sponte marketing pages (see `docs/ref/sponte/README.md`).

## Core entities

### Student (`aluno`)

Registered in secretariat module; linked to enrollments, portal credentials, and
financial guardian. Custom fields and document storage implied by “gestão administrativa”.
([funcionalidades](https://www.sponte.com.br/funcionalidades))

### Guardian (`responsável`)

Accesses Portal do Aluno and Sponte Agenda Plus with school-issued login; first app
access requires email verification code and terms acceptance.
([suporte FAQ](https://www.sponte.com.br/suporte))

### Teacher (`professor`)

Launches grades and attendance in ERP; FAQ directs teachers to school secretariat for
credentials — vendor support is secondary.
([suporte FAQ](https://www.sponte.com.br/suporte))

### Academic structure

Hierarchy observed:

```
school_year (período letivo) → course → curriculum_matrix → class_group → subject
```

Also: timetable (`quadro de horários`), seating (`ensalamento`) driven by enrollment count.
([gestão pedagógica](https://www.sponte.com.br/gestao-pedagogica))

### Evaluation model (`modelo avaliativo`)

Configurable per institution:

- Numeric, conceptual, or **skills/competency** (BNCC-aligned) formats
- Recovery rules and period structure (bimestre/trimestre implied)
- Segment restriction: some online assessment features **unavailable for language schools**
([gestão pedagógica](https://www.sponte.com.br/gestao-pedagogica))

### Class diary (`diário de aula`)

Digital diary per discipline or course; teachers record lessons, grades, attendance remotely.
([gestão pedagógica](https://www.sponte.com.br/gestao-pedagogica))

### Grade / assessment

Online tests and assignments with automatic grade calculation; results sync to portal/app in
real time. Online delivery **not available for language-school segment** (inferred).
([gestão pedagógica](https://www.sponte.com.br/gestao-pedagogica))

### Academic documents

| Document | Notes |
|----------|-------|
| Report card (`boletim`) | Customizable layout via document editor |
| Individual record (`ficha individual`) | Per-student |
| Transcript (`histórico escolar`) | Prior years |
| Lesson plans (`planos de aula`) | Generated from diary setup |

Document editor customization **unavailable for language schools** (inferred).
([gestão pedagógica](https://www.sponte.com.br/gestao-pedagogica))

### Occurrence (`ocorrência`)

School events notified through Agenda Plus app (alongside chat and calendar).
([app agenda](https://www.sponte.com.br/app-de-agenda-escolar))

### Online class

Live and recorded online classes within ERP (segment-dependent).
([gestão pedagógica](https://www.sponte.com.br/gestao-pedagogica))

## Key relationships

```
student ←→ guardian (credentials per school subdomain)
enrollment → student, class_group, receivables[]
evaluation_model → school_year, assessment_periods[]
grade → enrollment, subject, assessment
class_diary → class_group, subject, lessons[], attendance[]
```

## States (inferred)

| Entity | States |
|--------|--------|
| enrollment | active, inactive (withdrawn) |
| assessment period | open, closed (grades visible in portal when published) |
| guardian app access | first_access (email verify), active |

## Integration note

ClassApp and other comms products document **Sponte as ERP sync source** for roster —
Sponte is a full SIS anchor in partner ecosystems, not an overlay.
(See `docs/ref/classapp/comunicacao/modelo-de-dominio.md`.)
