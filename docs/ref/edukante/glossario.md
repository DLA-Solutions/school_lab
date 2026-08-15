# Glossary — competitor terminology

Harvest date: 2026-08-14. Competitor: **Edukante** (`docs/ref/edukante/`).

| Our term (School Lab) | Edukante | Definition | Decision |
|----------------------|----------|------------|----------|
| enrollment | matrícula | Allocation of a student to a class/module with a linked financial plan | adopt `enrollment` in code |
| financial guardian | responsável financeiro | The single payer/contact used for boleto, contract, and NFS-e | map to `financial_guardian` |
| school year | ano letivo | Container for academic structure and enrollments | `school_year` |
| teaching level / stage | tipo de ensino | Groups courses/grades (e.g. Fundamental I, Superior) | `teaching_level` |
| grade / year level | série | Grade level within a teaching level | `grade` (see `docs/glossary.md`) |
| class group | turma | Student cohort for a course/grade | `class_group` |
| subject | disciplina | Course subject linked to a class | `subject` |
| module | módulo | Semester-like block (common in higher ed / language schools) | `module` when needed |
| teaching period | período de ensino | Shift: morning, afternoon, Saturday, etc. | `teaching_period` |
| assessment period | unidade letiva / marco avaliativo | Bimester, trimester, or custom evaluation window | `assessment_period` |
| report card | boletim / desempenho acadêmico / caderno de notas | Published academic performance document | UI: "Boletim"; code: `report_card` |
| class diary | diário de classe | Class-wide academic record (grades, attendance, lessons) | `class_diary` |
| individual record | ficha individual | Per-student academic summary across enrollments | `student_record` |
| occurrence | ocorrência | Disciplinary or notable event on student/teacher/guardian | adopt `occurrence` |
| receivable / charge | recebimento | Financial line item (tuition, fee, product sale) | `receivable` |
| delinquency | inadimplência | Overdue receivables | `delinquency` |
| cash flow | fluxo de caixa | Inflows/outflows with forecast vs realized | `cash_flow` |
| online enrollment | matrícula online | Public enrollment + payment funnel | `online_enrollment` |
| re-enrollment | rematrícula | Online re-enrollment into next module/grade | `re_enrollment` |
| interested student | aluno interessado | Lead who started but did not finish enrollment | `prospect` or `lead` |
| electronic transaction | transação eletrônica | Payment attempt (boleto gen, card charge) tied to a receivable | `payment_transaction` |
