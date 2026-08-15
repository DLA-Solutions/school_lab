# Domain model — academic management (Proesc)

Harvest: 2026-08-14. Sources: [suporte.proesc.com](https://suporte.proesc.com/hc/pt-br).

## Core entities

### Student (`aluno`)

Cadastro under Secretaria; linked to matrículas, débitos, portal/app access, occurrences.
([lista de matrículas articles](https://suporte.proesc.com/hc/pt-br))

### Guardian (`responsável`)

Roles: financial, pedagogical (1/2), avalista; may be **pessoa jurídica** as financial
responsible. Multi-student switching in Proesc Agenda.
([cadastrar PJ responsável](https://suporte.proesc.com/hc/pt-br/articles/360041948714),
[Proesc Agenda overview](https://suporte.proesc.com/hc/pt-br/articles/16533531345431))

### Teacher (`professor`)

Diary, activities, live classes (Google Meet), grade entry scoped to class/subject.
([Professor category](https://suporte.proesc.com/hc/pt-br))

### Academic structure

```
exercício (school year) → curso → turma → disciplina
```

Coordination monitors diary delivery by month/bimestre/exercício via Analytics.
([Proesc Analytics](https://suporte.proesc.com/hc/pt-br/articles/360056436834))

### Enrollment (`matrícula`)

Status tracked in lista de matrículas; links to financial débitos, occurrences, material
delivery, class transfers (`reclassificar`).
([matrículas menu articles](https://suporte.proesc.com/hc/pt-br))

### Online enrollment trail (`trilha`)

Guardian-facing 4 steps: cadastral data → contract acceptance → payment plan → first
installment payment. Requires payment plan and boleto generation enabled.
Rematrícula requires **next exercício** already created.
([trilha configuration](https://suporte.proesc.com/hc/pt-br/articles/17165116960279))

### Class diary (`diário`)

Teacher records lessons, attendance, grades; supports **individual lessons** within diary;
coordination tracks delivery compliance.
([criar aulas individuais](https://suporte.proesc.com/hc/pt-br))

### Activity (`atividade`)

Assignments with attachments; grade entry per activity.
([criar atividade articles](https://suporte.proesc.com/hc/pt-br))

### Report card (`boletim`)

Online boletim environment; per-subject hide flag; final grade hide option; PDF export
to Proesc Agenda.
([ocultar disciplina do boletim](https://suporte.proesc.com/hc/pt-br/articles/360056436834))

### Occurrence (`ocorrência`)

Under Matrículas menu; disciplinary/administrative events on enrollment.
([atualização release notes](https://suporte.proesc.com/hc/pt-br))

### Year-end (`finalização de ano letivo`)

Checklist-driven rollover: diary closure, rematrícula reports, exercício transition.
([checklist fim de ano](https://suporte.proesc.com/hc/pt-br))

## Key relationships

```
student ←→ guardians (typed roles)
enrollment → student, turma, débitos[], occurrences[]
débito → parcelas[], boletos[], NFS-e (optional per tipo)
diário → turma, disciplina, aulas[], notas[], presenças[]
trilha → enrollment (matrícula or rematrícula) + contrato + plano
```

## States (observed)

| Entity | States / guards |
|--------|-----------------|
| matrícula | active, rematrícula pending, não rematriculado (reported) |
| parcela | open, paid (incl. batch pay), boleto updated |
| diário | entregue / pending delivery (analytics metric) |
| trilha | awaiting plano, sent, signed, paid |
