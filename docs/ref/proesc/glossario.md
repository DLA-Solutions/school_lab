# Glossary — Proesc terminology

Harvest date: 2026-08-14. Competitor: **Proesc** (`docs/ref/proesc/`).

| Our term (School Lab) | Proesc | Definition | Decision |
|----------------------|--------|------------|----------|
| school year | exercício | Academic/financial year container | `school_year` |
| enrollment | matrícula | Student-class allocation with status and financial link | `enrollment` |
| online enrollment trail | trilha de matrícula / rematrícula | 4-step guardian flow: data → contract → plan → first payment | `enrollment_trail` |
| receivable / charge | débito | Billable item (tuition, material, activity) with installments | `receivable` |
| installment | parcela | Single due line on a débito | `installment` |
| financial guardian | responsável financeiro | Payer; may be PJ (company) | `financial_guardian` |
| cash desk session | meu caixa | Open/close cashier; batch pay installments | `cash_session` |
| class diary | diário | Teacher grade/attendance/lesson record per class-subject | `class_diary` |
| activity | atividade | Assignment/homework with attachments and grade entry | `activity` |
| report card | boletim | Guardian-visible grades; PDF export; hide subject option | `report_card` |
| assessment period | bimestre / período | Evaluation window in diary and analytics | `assessment_period` |
| occurrence | ocorrência | Student event under Matrículas menu | `occurrence` |
| guardian app | Proesc Agenda | Mobile: comunicados, recados, rotina, financeiro, boletim | `mobile_app` |
| announcement | comunicado | Institution-wide banner message; optional likes/comments | `announcement` |
| private message thread | agenda de recados | Institution ↔ guardian message thread | `message_thread` |
| daily routine | rotina escolar | Infant care: meals, behavior; push notification | `routine_entry` |
| e-signature module | Proesc Sign | Contract/signature product (separate articles) | `contract_signature` |
| analytics module | Proesc Analytics | Dashboards for finance, enrollment, grades, diary delivery | defer; not MVP |
| remittance file | arquivo de remessa | Bank batch boleto file | `bank_remittance` |
