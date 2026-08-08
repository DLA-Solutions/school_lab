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
| Enrollment contract | `enrollment_contract` | Contrato de matrícula |
| Contract signature status | `signature_status` | Status da assinatura |
| Payment | `payment` | Pagamento |
| Webhook event (payment provider) | `webhook_event` | Evento webhook |
| Onboarding status | `onboarding_status` | Status de onboarding |
| Onboarding mode | `onboarding_mode` | Modo de onboarding |
| Role template | `role_template_id` | Perfil de acesso |

`signature_status` values (phase 2, enrollment contracts): `pending`, `sent`, `signed`,
`declined`, `expired` — tracked separately from `onboarding_status`.

## Roles (authorization)

| Role | Code | UI (pt-BR) |
|------|------|------------|
| Platform admin | `backoffice` | Backoffice |
| School staff | `staff` | Equipe |
| Teacher | `teacher` | Professor |
| Guardian | `guardian` | Responsável |

Legacy: `school` role maps to `staff` (see identity PRD D1).

## Role templates

Schools define **role templates** (`school_role_templates`) by combining permission keys from
the platform catalog. API field: `role_template_id` on membership invite.

**System templates** (`is_system: true`) are provisioned per school with `system_key`:

| `system_key` | UI (pt-BR) | Typical stakeholder |
|--------------|------------|---------------------|
| `director` | Direção | Diretor / vice-diretor |
| `secretary` | Secretaria | Secretária |
| `coordination` | Coordenação | Coordenadora |
| `teacher` | Professor | Professor |

Schools may create **custom templates** (e.g. receptionist) with `is_system: false`.
Templates expand to permission keys — not separate membership roles.

**Deprecated:** `preset_key` — replaced by `role_template_id` (see permissions PRD D2).
