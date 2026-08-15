# Glossary — competitor terminology

Harvest date: 2026-08-14. Competitor: **KAITS** (`docs/ref/kaits/`).

| Our term (School Lab) | KAITS | Definition | Decision |
|----------------------|-------|------------|----------|
| enrollment | matrícula | Student allocation to a class/course with linked billing | adopt `enrollment` in code |
| online enrollment | matrícula online | Public funnel: class choice → payment → contact acceptance | `online_enrollment` |
| financial guardian | responsável financeiro | Payer/contact for billing (distinct from legal guardian) | `financial_guardian` |
| legal guardian | responsável legal | Parent/guardian with legal custody link to student | `guardian` + role flag |
| class diary | diário escolar | Daily academic record visible to families and teachers | `class_diary` |
| virtual agenda | agenda virtual | Day-to-day notes/activities shared with parents (early childhood) | `daily_agenda` or routine module |
| occurrence | ocorrência | Notable or disciplinary event on a student | adopt `occurrence` |
| report card | boletim | Published academic performance document | UI: "Boletim"; code: `report_card` |
| curriculum matrix | matriz curricular | Subject/course structure tied to grade/class | `curriculum_matrix` |
| lesson | aula | Scheduled teaching session; may be individual, group, VIP, or flexible | `lesson` |
| lesson cancellation | cancelamento de aula | Cancelled session per institution rules | `lesson_cancellation` |
| lesson makeup | reposição de aula | Replacement class after cancellation | `lesson_makeup` |
| teacher hour rate | hora/aula | Pay/billing unit per teacher per taught hour | `teaching_hour` |
| proficiency test | teste de proficiência | Stored language-level assessment result | `proficiency_assessment` |
| leveling | nivelamento | Placement assessment for new students | `placement_assessment` |
| corporate partner | empresa conveniada | Company with employees enrolled; gets custom reports | `corporate_partner` |
| payment product | Receba Fácil KAITS | Branded payment rail (boleto, Pix, recurrence, links) | map to our `payment_gateway` abstraction |
| receivable / charge | cobrança / boleto | Financial obligation (tuition, package, per-lesson) | `receivable` |
| delinquency | inadimplência | Overdue receivables; prevention via auto alerts | `delinquency` |
| cash flow | fluxo de caixa | Inflows/outflows with planning views | `cash_flow` |
| cost center | centro de caixa | Cash/account grouping for financial reporting | `cash_center` |
| cost plan | plano de custo | Expense category hierarchy | `expense_category` |
| re-enrollment | rematrícula | Returning student enrollment for next period | `re_enrollment` |
| interested lead | interessado / lead | Prospect from website form or CRM | `lead` |
| document acceptance | aceite online | Digital signature/acceptance on contracts and documents | `document_acceptance` |
| student portal | portal do aluno | White-label web portal (embeddable on school site) | `student_portal` |
| mobile app | App KAITS | Native app with student and teacher variants | `mobile_app` |
| franchise network | rede / franquia | Multi-unit operator with centralized analytics | `school_network` (platform level) |
