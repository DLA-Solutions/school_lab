# Edge cases — academic management (Edukante)

Harvest: 2026-08-14.

## Structure changes between school years

Academic structure can differ completely year to year; export copies prior
configuration but schools still revalidate. Deactivating structure entities is
guarded to protect enrollment data.
→ Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## Enrollment deactivation

Enrollment can be deactivated with selective cancellation of linked receivables;
audit trail on dates and reasons for enrollments created/deleted in a period.
→ Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## Cross-module subjects (higher ed)

Enrollment may attach subjects from modules other than the student's primary
module — common in faculdades.
→ Source: [sistema de gestão escolar](https://www.edukante.com/sistemas-gestao-escolar/sistema-de-gestao-escolar.aspx)

## Attendance counting modes

School chooses whether absences derive from lesson-level attendance **or**
manual total per student per period — affects boletim, diary, individual record.
→ Source: [sistema de gestão escolar](https://www.edukante.com/sistemas-gestao-escolar/sistema-de-gestao-escolar.aspx)

## Multiple lessons same day

Same subject, same date: teacher may register more than one lesson.
→ Source: [sistema de gestão escolar](https://www.edukante.com/sistemas-gestao-escolar/sistema-de-gestao-escolar.aspx)

## Grade replacement rules

Some schools allow higher grades to replace lower ones; evaluation model must
encode this before entry.
→ Source: [sistema de gestão escolar](https://www.edukante.com/sistemas-gestao-escolar/sistema-de-gestao-escolar.aspx)

## Transcript from other institutions

Historic performance from prior schools/years can be entered manually for
transcript generation.
→ Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## Document gated by payment

Portal access to specific documents (e.g. report card) may require prior payment
of a school-defined fee via online channels.
→ Source: [sistema de gestão escolar](https://www.edukante.com/sistemas-gestao-escolar/sistema-de-gestao-escolar.aspx)

## Corporate guardian

Company guardian may view academic data for multiple employee-students from one
responsible portal.
→ Source: [sistema de gestão escolar](https://www.edukante.com/sistemas-gestao-escolar/sistema-de-gestao-escolar.aspx)

## Evaluation setup not self-service

School cannot fully configure evaluation model or HTML layouts without support
(HTML markup required). Risk: onboarding bottleneck at year start.
→ Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## Interested student not converted

`aluno interessado` records abandoned online flows; can be promoted to real
student later.
→ Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)

## Turnstile integration

Catraca integration may require extra implementation cost depending on hardware
vendor.
→ Source: [recursos](https://www.edukante.com/sistemas-gestao-escolar/software-gestao-academica-financeira-para-escolas-cursos-faculdades-recursos.aspx)
