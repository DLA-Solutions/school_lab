# Domain model — communication (Sponte)

Harvest: 2026-08-14. Sponte bundles family comms in Portal do Aluno + Agenda Plus app,
integrated with ERP (not a separate comms product).

## Channels

### Guardian portal (`Portal do Aluno`)

Per-school branded URL; desktop access to grades, schedule, finance, documents,
contract signature, calendar.
([portal do aluno](https://www.sponte.com.br/portal-do-aluno))

### Family app (`Sponte Agenda Plus`)

Mobile agenda integrated with ERP — avoids duplicate data entry across platforms.
([app agenda](https://www.sponte.com.br/app-de-agenda-escolar))

## Message / notification types (inferred from feature lists)

| Surface | Capability |
|---------|------------|
| Agenda Plus | Chat, push notifications, occurrence alerts, event calendar |
| Portal | Contract e-signature, grade/schedule consultation |
| ERP → family | Payment links via SMS/email/WhatsApp (financial comms) |

([app agenda](https://www.sponte.com.br/app-de-agenda-escolar), [funcionalidades](https://www.sponte.com.br/funcionalidades))

## Entities

### Event (`evento` / calendário)

School calendar visible in app; used for trips, meetings, parent communication.
([app agenda](https://www.sponte.com.br/app-de-agenda-escolar))

### Occurrence notification

School incidents pushed to families via app.
([app agenda](https://www.sponte.com.br/app-de-agenda-escolar))

### Chat thread

Direct messaging in Agenda Plus between school and families (details sparse in marketing).

## Access control

- Credentials issued by **school secretariat**, not self-registration.
- First app login: email verification + password setup + terms acceptance.
([suporte](https://www.sponte.com.br/suporte))

## Integration positioning

Sponte is frequently the **system of record** that comms overlays (ClassApp) sync from;
native comms are “good enough” for schools not buying best-of-breed.
