# Glossary — Domain Terms

Repository identifiers default to **English** (see `.cursor/rules/core/language-conventions.mdc`).
This glossary lists **approved Portuguese exceptions** and maps common concepts to code names.

## Approved Portuguese identifiers

Use these only when the English equivalent would distort the Brazilian domain or has no standard translation.

| Term | Code identifier | Definition | UI (pt-BR) |
|------|-----------------|------------|------------|
| Boleto | `boleto` | Brazilian bank payment slip used for school billing | Boleto |
| Livro Ata | `livro_ata` | Official school minutes-record book; legally regulated in Brazil | Livro Ata |

When adding a new Portuguese identifier, confirm with the team and update this table.

## Standard English mappings

| Concept | Code | UI (pt-BR) |
|---------|------|------------|
| School (tenant) | `school`, `school_id` | Escola |
| Student | `student` | Aluno |
| Class / homeroom | `school_class` | Turma |
| Teacher | `teacher` | Professor |
| Guardian / parent | `guardian` | Responsável |
| Attendance (roll call) | `attendance` | Chamada |
| Message | `message` | Mensagem |
| Grade / mark | `grade` | Nota |
| Report card | `report_card` | Boletim |
| Enrollment | `enrollment` | Matrícula |
| Billing / charge | `charge` | Cobrança |
| Membership (user ↔ school role) | `membership` | Vínculo |
| Billing plan | `billing_plan` | Plano de cobrança |
| Contract (student billing) | `contract` | Contrato |
| Payment | `payment` | Pagamento |
| Webhook event (PSP) | `webhook_event` | Evento webhook |

## Roles (authorization)

| Role | Code | UI (pt-BR) |
|------|------|------------|
| Platform admin | `backoffice` | Backoffice |
| School admin | `school` | Escola |
| Teacher | `teacher` | Professor |
| Guardian | `guardian` | Responsável |
