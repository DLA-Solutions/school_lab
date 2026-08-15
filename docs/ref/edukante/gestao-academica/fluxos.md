# Flows — academic management (Edukante)

Harvest: 2026-08-14.

## 1. Configure academic structure (year start)

**Actor:** school admin (+ Edukante support)  
**Preconditions:** New or copied `school_year`

1. Define teaching levels, courses/grades, modules, periods, class groups, subjects.
2. Activate entities; deactivate obsolete ones.
3. Optionally export structure from prior year.

Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## 2. Configure evaluation model

**Actor:** school academic staff → Edukante support  
**Preconditions:** Evaluation rules documented by school

1. School sends evaluation rules (periods, weights, recovery, rounding, council).
2. Support parametrizes system (claimed SLA: up to 1 business day).
3. Support customizes report card / diary HTML layouts.

Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx), [termos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-para-escolas-cursos-faculdades-termos-contrato.aspx)

## 3. Enroll student (secretariat)

**Actor:** secretariat  
**Preconditions:** Student registered; structure configured

1. Create enrollment: student + class group (+ optional cross-module subjects).
2. System generates linked receivables (enrollment, tuition, material, fees).
3. Optional: apply day-based discount rules on tuition.
4. Generate enrollment form, contract, ID card, individual record as needed.

Source: [sistema de gestão escolar](https://www.edukante.com/sistemas-gestao-escolar/sistema-de-gestao-escolar.aspx)

## 4. Online enrollment (new student)

**Actor:** prospective student/guardian  
**Preconditions:** Courses/turmas published on online enrollment

1. Browse catalog; add to cart.
2. Fill configurable student/guardian fields.
3. Pay via card, boleto, debit, or bank transfer.
4. System creates student, enrollment, receivables, and cash-flow entries.

Source: [controle acadêmico](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-escolar-web-controle-academico.aspx)

## 5. Online re-enrollment (`rematrícula`)

**Actor:** returning student  
**Preconditions:** Feature enabled; student identified in one click

1. Confirm next module/grade/course.
2. Pay via same online payment options.
3. New enrollment and receivables created automatically.

Source: [controle acadêmico](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-escolar-web-controle-academico.aspx)

## 6. Teacher — record lesson and attendance

**Actor:** teacher  
**Preconditions:** Authorized for class group + subject

1. Open teacher panel → lesson/attendance.
2. Register lesson (title, description); mark present/absent per student.
3. Optionally schedule future lessons or backdate.

Source: [sistema de gestão escolar](https://www.edukante.com/sistemas-gestao-escolar/sistema-de-gestao-escolar.aspx)

## 7. Teacher — enter grades

**Actor:** teacher or admin  
**Preconditions:** Evaluation model configured; authorization set

1. Select class group and subject.
2. Enter grades/concepts per assessment period (bulk grid or individual).
3. View running averages in class diary.

Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## 8. Publish report cards

**Actor:** secretariat  
**Preconditions:** Grades entered for target period

1. Generate report card for one enrollment **or** entire class group.
2. Print/save PDF (up to two documents per page).
3. Students/guardians access via portal.

Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## 9. Auto-generate contract with digital signature

**Actor:** secretariat → guardian  
**Preconditions:** Document template tagged as digital contract

1. Generate document from enrollment merge tags.
2. Guardian views and accepts in portal.
3. System stores signature timestamp.

Source: [sistema de gestão escolar](https://www.edukante.com/sistemas-gestao-escolar/sistema-de-gestao-escolar.aspx)

## 10. Student entry/exit logging

**Actor:** front desk  
**Preconditions:** ID cards with barcode/QR; optional turnstile

1. Choose flow: entry only, exit only, or both.
2. Scan student ID; system records timestamp.

Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)
