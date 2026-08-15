# Glossary — Sponte terminology

Harvest date: 2026-08-14. Competitor: **Sponte** (`docs/ref/sponte/`).

| Our term (School Lab) | Sponte | Definition | Decision |
|----------------------|--------|------------|----------|
| school year | período letivo / ano letivo | Academic period container for planning and enrollments | `school_year` |
| curriculum matrix | matriz curricular | Course structure with subjects and workload | `curriculum_matrix` |
| class group | turma | Student cohort; seating (`ensalamento`) follows enrollment count | `class_group` |
| class diary | diário de aula / diário de classe | Digital lesson diary per subject or course | `class_diary` |
| assessment model | modelo avaliativo / sistema de avaliação | Configurable numeric, conceptual, or skills-based grading | `evaluation_model` |
| report card | boletim escolar | Published grades document; customizable layout | `report_card` |
| individual record | ficha individual | Per-student academic summary | `student_record` |
| transcript | histórico escolar | Prior academic history document | `transcript` |
| occurrence | ocorrência escolar | Disciplinary or notable school event (app notifications) | `occurrence` |
| enrollment | matrícula | Student allocation to class; linked to financial plan | `enrollment` |
| lead capture | captação de alunos | Marketing funnel / CRM for prospective students | `lead` / `prospect` |
| receivable | mensalidade / parcela | Tuition installment or fee line | `receivable` |
| payment link | link de pagamento | SMS/email/WhatsApp payment URL | `payment_link` |
| dunning sequence | régua de cobrança | Automated reminder workflow for overdue charges | `dunning_sequence` |
| guaranteed tuition program | mensalidade garantida | Vendor assumes delinquency risk; school receives 100% on schedule | document as commercial product; not default |
| payment rail | Sponte Pay | Integrated boleto, recurring card, Pix | abstract `payment_gateway` |
| guardian portal | Portal do Aluno | Per-school URL; school-issued credentials | `guardian_portal` |
| family app | Sponte Agenda Plus | Mobile app: grades, schedule, finance, chat, occurrences | `mobile_app` |
| electronic signature | assinatura eletrônica de contratos | Contract signing in portal/app | `contract_signature` |
| secretary module | secretaria escolar | Administrative cadastros and document issuance | `secretariat` |
