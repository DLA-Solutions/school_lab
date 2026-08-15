# Domain model — academic management (KAITS)

Harvest: 2026-08-14. Sources: public KAITS pages (see `docs/ref/kaits/README.md`).

## Core entities

### Student (`aluno`)

Full registration with **legal guardian** and **financial guardian** as distinct
roles. Occurrence and attendance records attach to the student.
([escola infantil](https://kaits.com.br/sistema-para-escola-infantil/))

### Guardian (`responsável`)

- **Legal guardian** — custody/authorization context.
- **Financial guardian** — billing and portal financial access (may differ from legal).

([escola infantil](https://kaits.com.br/sistema-para-escola-infantil/))

### Teacher (`professor`)

Linked to scheduled lessons; system calculates **hora/aula** (teaching hours) per
teacher automatically. Portal access for pedagogical follow-up.
([homepage](https://kaits.com.br/), [escola de idiomas](https://kaits.com.br/sistema-para-escola-de-idiomas/))

### Academic structure

Segment-specific but shared concepts:

```
institution → course type → class_group (turma) → subject/discipline
```

- **Curriculum matrix** (`matriz curricular`) — automated generation of curricular
  structure for basic education.
- **Evaluation calendar** — school chooses bimestre, trimestre, or custom periods.
  ([educação básica](https://kaits.com.br/sistema-para-escola-educacao-basica/))

### Enrollment (`matrícula`)

Links student to class/course. Online path includes class selection, payment, and
**contact acceptance** (`aceite de contato`). Variants for adult vs early-childhood
flows.
([homepage](https://kaits.com.br/), [escola de idiomas](https://kaits.com.br/sistema-para-escola-de-idiomas/))

### Evaluation model

School-configured (marketing claims self-service personalization):

- Numeric **grades** (`notas`) or textual **concepts** (`conceitos`)
- Partial and final grades; report cards (`boletins`) auto-generated
- Higher ed: individualized performance **comments** per student
  ([educação básica](https://kaits.com.br/sistema-para-escola-educacao-basica/),
  [ensino superior](https://kaits.com.br/sistema-para-ensino-superior/))

### Lesson & schedule (`aula` / `agenda`)

| Attribute | Notes |
|-----------|-------|
| Scheduling | Planning and teacher assignment |
| Visualization | Color-coded calendar; room occupancy; per-teacher view |
| Cancellation | Per institution rules |
| Makeup | Replacement lessons after cancellation |
| Class formats | Individual, turma, VIP, flexible (cursos livres) |

Sources: [homepage](https://kaits.com.br/), [cursos livres](https://kaits.com.br/sistema-para-cursos-livres/)

### Attendance & performance

Attendance controls and **aproveitamento** (performance) reports. Language schools
expose attendance/performance to **corporate partners** for their employees.
([escola de idiomas](https://kaits.com.br/sistema-para-escola-de-idiomas/))

### Occurrence (`ocorrência`)

Recorded events on students — emphasized for early childhood transparency with
parents.
([escola infantil](https://kaits.com.br/sistema-para-escola-infantil/),
 [blog infantil](https://kaits.com.br/educacao-infantil/))

### Daily agenda (`agenda virtual`)

Day-to-day notes and activities for early childhood; parent-facing.
([escola infantil](https://kaits.com.br/sistema-para-escola-infantil/))

### Class diary (`diário escolar`)

Lessons and contents visible to students, families, and teachers.
([homepage](https://kaits.com.br/))

### Placement & proficiency

- **Leveling** (`nivelamento`) — including online placement for language schools.
- **Proficiency tests** — stored results for recruitment/retention.
  ([escola de idiomas](https://kaits.com.br/sistema-para-escola-de-idiomas/))

### Online assessments

Tests and questionnaires assignable to students (cursos livres segment).
([cursos livres](https://kaits.com.br/sistema-para-cursos-livres/))

### Library (`biblioteca`)

Barcode catalog; reader registration; loans; library card (`carteirinha`).
Higher-ed variant claims **MEC-compliant** cataloging.
([homepage](https://kaits.com.br/), [ensino superior](https://kaits.com.br/sistema-para-ensino-superior/))

### Academic documents

| Document | Notes |
|----------|-------|
| Report card (`boletim`) | Auto-generated; partial and final |
| Minutes (`ata`) | Results minutes |
| Certificate (`certificado`) | Issued by secretariat |
| Contracts | With online acceptance |
| Stored documents | Secretarial archive |

Sources: [homepage](https://kaits.com.br/), [educação básica](https://kaits.com.br/sistema-para-escola-educacao-basica/)

### Portals & surfaces

| Surface | Audience | Capabilities |
|---------|----------|--------------|
| Student/teacher portal | Students, parents, teachers | Grades, messages, finance, contracts; white-label |
| App KAITS | Students and teachers (separate) | Classes, announcements, finance |
| Corporate partner portal | Conveniada companies | Custom reports on enrolled employees |

Sources: [homepage](https://kaits.com.br/), [FAQ](https://kaits.com.br/)

### Multi-unit (networks / franchises)

Exclusive area for franchisors: real-time dashboards, analytics, performance KPIs
for expansion planning.
([redes e franquias](https://kaits.com.br/sistema-para-redes-e-franquias/))

## Integration with other domains

```
enrollment → receivables (multiple billing models)
lesson taught → hour/aula calculation → teacher pay (implied)
occurrence / daily agenda → parent communication (app + portal)
online enrollment paid → student + enrollment created
corporate partner → scoped read on employee students
```

Sources: [homepage](https://kaits.com.br/), [escola de idiomas](https://kaits.com.br/sistema-para-escola-de-idiomas/)
