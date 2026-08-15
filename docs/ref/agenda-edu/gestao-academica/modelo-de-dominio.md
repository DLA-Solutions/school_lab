# Domain model — academic (Agenda Edu)

Harvest: 2026-08-14.

## Entities

### School year (`ano letivo` / `período letivo`)

Manual creation and deactivation of prior year; integration-based **progressão** alternative.

### Daily diary (`diário`)

Infant/daycare sections: meals, sleep, diaper, bath — toggleable sections per school.
([diário](https://atendimento.agendaedu.com/hc/pt-br/articles/4411463010587))

### Activity (`atividade`)

SuperApp activities assigned to students/guardians.

### Authorization (`autorização`)

Guardian digital consent (e.g., field trips).

### Pending items (`pendências`)

Guardian task inbox.

## Product modes

- **Manual**: school operates academic structure inside Agenda Edu.
- **ERP**: academic system of record external; Agenda Edu syncs via import/integration.
