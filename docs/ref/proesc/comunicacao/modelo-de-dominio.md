# Domain model — communication (Proesc)

Harvest: 2026-08-14.

## Surfaces

### Proesc Agenda (mobile app)

Primary family channel for **Aluno** and **Responsável** profiles. Modules on home:
Aulas, Financeiro, Comunicados, Agenda (recados), Boletim, Rotina Escolar.
([overview](https://suporte.proesc.com/hc/pt-br/articles/16533531345431))

### ERP web (staff)

Staff create comunicados, agenda de recados, rotina; teachers may use agenda features per
role articles.

### Support channel (Lia)

Virtual assistant on ERP web; escalates to human ticket — not family-facing product comms.
([Lia](https://suporte.proesc.com/hc/pt-br/articles/360001172174))

## Message types

| Type | Audience | Behavior |
|------|----------|----------|
| Comunicado | Institution-wide | Banner list; optional like/comment if enabled |
| Agenda de recados | Private institution ↔ guardian thread | Bidirectional; saved history |
| Rotina escolar | Per student / turma | Meals, behavior; collective or individual entry |
| Push notification | Guardian app | **Only** rotina, recados, and finance trigger push (per article) |

([Proesc Agenda overview](https://suporte.proesc.com/hc/pt-br/articles/16533531345431))

## Entities

### Announcement (`comunicado`)

Institution broadcast; engagement features optional.

### Message thread (`agenda de recados`)

Private async messaging; either party can open new thread.

### Routine entry (`rotina escolar`)

Daily infant/care log; pushes to app.

### Live class link

Embedded in Aulas module when teacher schedules Google Meet.

## Access

- Multi-student guardians switch profile via user icon — all modules refresh per selected matrícula.
- Module may require commercial enablement (“solicite um atendimento” on overview).

## Differentiation from core ERP messaging

Proesc Agenda is an **add-on module** (14 KB articles) vs 226 comms-tagged articles across
corpus — deep comms workflows still split between ERP menus and app.
