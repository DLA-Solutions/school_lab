# MVP scope (School Lab)

_Generated view — regen from taxonomy + aliases + catalog; do not edit by hand._

Single source for **MVP vs P2 vs out of scope**. Derived from
[`capability-taxonomy.yaml`](capability-taxonomy.yaml) (`phase: MVP`),
[`vision.md`](../vision.md) §6 MVP boundaries,
[`open-questions.md`](../open-questions.md) Jul/Aug 2026 decisions, and
[`fintech-first.md`](../prds/fintech-first.md) billing implementation status.

Per-capability detail (actors, surfaces, differentiators, blockers):
[`capability-map.md`](capability-map.md). Competitor presence:
[`parity-matrix.md`](parity-matrix.md).

Regenerate:

```bash
python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py \
  --generate-mvp-scope \
  --taxonomy docs/product/capability-taxonomy.yaml \
  --aliases docs/ref/capability-aliases.jsonl \
  --catalog-path docs/ref/catalogo-funcionalidades.md \
  --out docs/product/mvp-scope.md
```

## Executive summary

| Metric | Count |
|--------|------:|
| Canonical capabilities (total) | 191 |
| **MVP (in scope)** | **124** |
| P2 (deferred) | 59 |
| N/A (out of product core) | 8 |
| MVP parity gaps (competitor documented, PRD missing) | 0 |
| MVP differentiators | 26 |

**Vision-aligned pillars** (Jul 2026 stakeholder validation — [`vision.md`](../vision.md) §6):

1. **Communication** — two-way parent↔teacher and parent↔school messaging with images;
   push notifications (FCM); not real-time.
2. **Academic** — reliable grades, report cards, and attendance with automatic absence
   notification (legal impact if wrong).
3. **Billing** — boleto generation and tracking; guardian payment view; partner slice
   partially **implemented** in `web/` per [`fintech-first.md`](../prds/fintech-first.md).
4. **Digital archive** — document repository per student/school.
5. **Identity & students** — multi-school tenancy, roles, base records (students, guardians,
   classes, subjects).
6. **Surfaces** — web SPA and mobile app for all MVP roles.

**Build order:** validated MVP priority is communication → academic → billing;
the billing-first partner slice (historical) inverted that order for the validating school only.
Normative billing scope: [`prds/billing/`](../prds/billing/). See
[`fintech-first.md`](../prds/fintech-first.md) positioning note.

**Known scope tensions** (recorded in open questions, not taxonomy edits):

- **Collection régua** — taxonomy marks `billing.build_dunning_workflow` and
  `billing.send_payment_reminder` as MVP; Aug 2026 fintech-first decision defers
  platform régua (stub notifier only). Overdue detection and dashboard ship first.
- **Early childhood routine** — `academic.log_daily_routine` is P2; communication covers
  infantil needs in MVP per Jul 2026 decision.
- **NFS-e** — `billing.issue_service_invoice` is MVP in taxonomy; open item in
  fintech-first may defer issuance.

## MVP capabilities by domain

Columns: **Parity gap** = competitor documented help-center evidence exists but target
domain PRD is missing or not written (see capability-map for detail).

### Billing (32 MVP)

| Capability | Label | PRD target | Parity gap | Notes |
|:---|:---|:---|:---:|:---|
| `billing.accept_card_payment` | Accept card payment | `prds/billing/payments.md` | no | Checkout for guardians; gateway abstracted. |
| `billing.accept_pix_payment` | Accept Pix payment | `prds/billing/payments.md` | no | Pix QR and copy-paste via payment gateway. |
| `billing.adjust_charge` | Adjust charge amount or apply scholarship | `prds/billing/charges.md` | no | Bolsa, isenção, adjustments with audit. |
| `billing.build_dunning_workflow` | Build visual dunning workflow | `prds/billing/dunning.md` | no | Configurable régua with audit trail. |
| `billing.cancel_charge` | Cancel or reverse charge | `prds/billing/charges.md` | no | Estorno and cancellation with reason code. |
| `billing.configure_billing_notifications` | Configure billing notification channels | `prds/billing/dunning.md` | no | Explicit per-channel policy for finance pushes. |
| `billing.configure_early_payment_discount` | Configure tiered early-payment discounts | `prds/billing/settings.md` | no | Partially implemented in `web/` via [`fintech-first.md`](../prds/fintech-first.md) (partner slice). Discount by payment day before due date. |
| `billing.configure_payment_gateway` | Configure payment gateway settings | `prds/billing/payments.md` | no | Partially implemented in `web/` via [`fintech-first.md`](../prds/fintech-first.md) (partner slice). Fees, settlement accounts, enabled methods. |
| `billing.export_financial_report` | Export financial reports | `prds/billing/charges.md` | no | Receivables, cash flow, delinquency exports. |
| `billing.integrate_boleto_bank` | Configure boleto bank remittance integration | `prds/billing/boletos.md` | no | Partially implemented in `web/` via [`fintech-first.md`](../prds/fintech-first.md) (partner slice). Abstract bank integration; guided onboarding. Differentiator. |
| `billing.issue_boleto` | Generate boleto for charge | `prds/billing/boletos.md` | no | Partially implemented in `web/` via [`fintech-first.md`](../prds/fintech-first.md) (partner slice). Automated boleto generation and tracking in app. Differentiator. |
| `billing.issue_charge` | Issue charge to guardian | `prds/billing/charges.md` | no | Partially implemented in `web/` via [`fintech-first.md`](../prds/fintech-first.md) (partner slice). Core enrollment receivables (débito + parcelas); extensions per segment PRD. Differentiator. |
| `billing.issue_service_invoice` | Issue NFS-e for tuition services | `prds/billing/invoices.md` | no | Service NF in billing PRD; product NF later. |
| `billing.manage_cash_register` | Treasury and cash register operations | `prds/billing/payments.md` | no | Meu caixa pattern: receipts, expenses, cost centers. |
| `billing.manage_charge_types` | Configure charge types and categories | `prds/billing/charges.md` | no | Typed debits with chart-of-accounts mapping. |
| `billing.manage_financial_operations` | General financial module operations | `prds/billing/charges.md` | no | Catch-all for ERP finance tasks pending finer split. |
| `billing.manage_payment_links` | Manage payment links | `prds/billing/payments.md` | no | Shareable links for overdue or ad-hoc pay. |
| `billing.manage_payment_plan` | Configure payment plans and installment schedules | `prds/billing/charges.md` | no | Partially implemented in `web/` via [`fintech-first.md`](../prds/fintech-first.md) (partner slice). Plans drive parcel generation; tie to enrollment contracts. |
| `billing.manage_recurring_card` | Manage recurring card billing | `prds/billing/payments.md` | no | Opt-in recurring card with clear consent. |
| `billing.negotiate_receivable` | Mark receivable under negotiation | `prds/billing/charges.md` | no | Manual negotiation status with audit. |
| `billing.onboard_payment_gateway` | Onboard payment gateway (KYC) | `prds/billing/payments.md` | no | Guided gateway onboarding; abstract provider. Blocked — see capability-map. |
| `billing.pay_online` | Guardian pay charges online | `prds/billing/payments.md` | no | Partially implemented in `web/` via [`fintech-first.md`](../prds/fintech-first.md) (partner slice). Checkout for boleto, Pix, card. |
| `billing.process_batch_payment` | Process batch payments | `prds/billing/payments.md` | no | Batch settlement and bulk status updates. |
| `billing.record_manual_payment` | Record manual payment receipt | `prds/billing/payments.md` | no | Cash, negotiation, or external transfer with audit. |
| `billing.resend_boleto` | Resend boleto to guardian | `prds/billing/boletos.md` | no | Partially implemented in `web/` via [`fintech-first.md`](../prds/fintech-first.md) (partner slice). Staff-triggered resend; WhatsApp as adapter. Differentiator. |
| `billing.send_boleto_remittance` | Send boleto remittance file to bank | `prds/billing/boletos.md` | no | CNAB/remessa batch export. |
| `billing.send_payment_reminder` | Send payment reminders | `prds/billing/dunning.md` | no | Stub only in partner slice — platform régua deferred per fintech-first UC-03; overdue detection and dashboard ship. Email/push/WhatsApp adapters; rules in API. |
| `billing.track_boleto_status` | Track boleto registration and settlement | `prds/billing/boletos.md` | no | Partially implemented in `web/` via [`fintech-first.md`](../prds/fintech-first.md) (partner slice). Never lose billing state; webhook + manual reconciliation. Differentiator. |
| `billing.view_delinquency_dashboard` | View delinquency dashboard | `prds/billing/dunning.md` | no | Partially implemented in `web/` via [`fintech-first.md`](../prds/fintech-first.md) (partner slice). Visual overdue portfolio; no surprise automation. |
| `billing.view_guardian_charges` | Guardian view open charges | `prds/billing/guardian-portal.md` | no | Partially implemented in `web/` via [`fintech-first.md`](../prds/fintech-first.md) (partner slice). Parent billing view in app and web. |
| `billing.view_payment_history` | View payment history | `prds/billing/guardian-portal.md` | no | Settled and pending history per family. Differentiator. |
| `billing.view_student_receivables` | View and search student receivables | `prds/billing/charges.md` | no | Parcel search by student or guardian. |

### Communication (37 MVP)

| Capability | Label | PRD target | Parity gap | Notes |
|:---|:---|:---|:---:|:---|
| `communication.approve_pending_communication` | Approve pending communications and events | `prds/communication/announcements.md` | no | Moderation queue for teacher-submitted content. |
| `communication.assign_recipients_to_channel` | Assign users or classes to message channel | `prds/communication/channels.md` | no | Channel membership by class, staff role, or individual. |
| `communication.attach_files_to_message` | Attach files to messages | `prds/communication/media.md` | no | Multi-attachment messages with size/type policy. Differentiator. |
| `communication.collect_channel_csat` | Collect CSAT on service channels | `prds/communication/channels.md` | no | Post-resolution CSAT; aggregate per channel. |
| `communication.collect_guardian_cpf` | Collect guardian CPF (progressive profiling) | `prds/identity-and-onboarding/profiles.md` | no | Campaign-style CPF collection with LGPD basis shown. Differentiator. |
| `communication.configure_communication_module` | Configure communication module settings | `prds/communication/channels.md` | no | Branding, defaults, module enablement per school. |
| `communication.configure_push_policy` | Configure push notification policy | `prds/communication/notifications.md` | no | Explicit per-channel notification policy. |
| `communication.distribute_learning_materials` | Distribute learning materials and attachments | `prds/communication/media.md` | no | Class materials via comms; not LMS replacement. |
| `communication.edit_message_content` | Edit sent message with audit trail | `prds/communication/messages.md` | no | Edit history visible to recipients; no silent edits. |
| `communication.escalate_to_human_support` | Escalate to human support | `prds/communication/channels.md` | no | Defer AI; human escalation first. |
| `communication.manage_announcement_categories` | Manage announcement categories | `prds/communication/announcements.md` | no | Typed comunicados for filtering and retention. |
| `communication.manage_announcement_templates` | Manage announcement templates and duplication | `prds/communication/announcements.md` | no | Model comunicados; duplicate with audit. |
| `communication.manage_channel_permissions` | Manage channel access permissions | `prds/communication/channels.md` | no | Revoke staff channel access with audit. |
| `communication.manage_communication_groups` | Manage communication groups (group vs channel vs DM) | `prds/communication/channels.md` | no | Explicit group/channel/DM model; family isolation. Differentiator. |
| `communication.manage_communication_operations` | General communication module operations | `prds/communication/messages.md` | no | Catch-all for miscatalogued or edge comms tasks pending finer split. |
| `communication.manage_emergency_contacts` | Manage emergency contact alert list | `prds/communication/notifications.md` | no | Emergency contacts for school alert button. Blocked — see capability-map. |
| `communication.manage_message_inbox` | Manage message inbox (read, archive, delete) | `prds/communication/messages.md` | no | Audited inbox; bulk archive; read-state per user. |
| `communication.manage_message_templates` | Manage message and WhatsApp templates | `prds/communication/notifications.md` | no | Reusable templates; WhatsApp adapter uses approved templates. |
| `communication.manage_notification_inbox` | Manage notification inbox (clear, dismiss) | `prds/communication/notifications.md` | no | User-controlled notification list; not push policy. |
| `communication.manage_photo_album` | Manage photo albums and mural | `prds/communication/media.md` | no | Album-based photos; download with retention policy. |
| `communication.manage_service_channel` | Manage service channel with SLA | `prds/communication/channels.md` | no | Ticket channels with CSAT; family isolation. Differentiator. |
| `communication.manage_user_profiles` | Manage user profiles and multi-profile switching | `prds/identity-and-onboarding/profiles.md` | no | Multi-profile app UX; staff assigns profiles to groups. |
| `communication.onboard_communication_users` | Onboard users to communication module | `prds/communication/index.md` | no | Staff verification checklist; guardian invite flow. |
| `communication.open_support_ticket` | Open support ticket with attachments | `prds/communication/channels.md` | no | Ticket channel distinct from direct chat; family-scoped. |
| `communication.publish_calendar_event` | Publish calendar event or activity | `prds/communication/announcements.md` | no | Events as comms objects; academic calendar sync later. |
| `communication.schedule_message_delivery` | Schedule message delivery | `prds/communication/messages.md` | no | Deferred send with timezone-aware delivery window. |
| `communication.send_direct_message` | Send direct message | `prds/communication/messages.md` | no | Official audited channels; MVP priority. Differentiator. |
| `communication.send_email_notification` | Send email notification | `prds/communication/notifications.md` | no | Email adapter alongside push; opt-in policy. |
| `communication.send_group_message` | Send group or class message | `prds/communication/messages.md` | no | Group threads with school-scoped recipients; family isolation enforced. Differentiator. |
| `communication.send_individual_announcement` | Send individual targeted announcement | `prds/communication/announcements.md` | no | Per-family or per-student comunicados; not mass blast. Differentiator. |
| `communication.send_whatsapp_notification` | Send WhatsApp notification via adapter | `prds/communication/notifications.md` | no | WhatsApp as adapter; rules in API. |
| `communication.share_photo_update` | Share photo update to families | `prds/communication/media.md` | no | Photos with retention policy; no vanity feed. |
| `communication.share_video_content` | Share video in messages or activities | `prds/communication/media.md` | no | Video attachments with bandwidth and retention limits. |
| `communication.switch_active_child` | Switch active child context (multi-child guardian) | `prds/identity-and-onboarding/profiles.md` | no | Guardian switches child without cross-family leak. |
| `communication.track_delivery_status` | Track message and activity delivery status | `prds/communication/index.md` | no | Delivery receipts for activities and announcements. |
| `communication.track_service_inbox` | Track conversations and tickets in real time | `prds/communication/channels.md` | no | Staff inbox for channels and tickets; SLA indicators. |
| `communication.update_guardian_profile` | Guardian progressive profile update | `prds/identity-and-onboarding/profiles.md` | no | Progressive profiling; LGPD basis shown. Differentiator. |

### Academic (22 MVP)

| Capability | Label | PRD target | Parity gap | Notes |
|:---|:---|:---|:---:|:---|
| `academic.assign_teacher_to_subject` | Assign teachers to subjects and diaries | `prds/academic/diary.md` | no | Bulk and individual teacher–discipline links. |
| `academic.configure_evaluation_template` | Configure evaluation templates | `prds/academic/grades.md` | no | Self-service templates; ERP mode when integrated. |
| `academic.configure_multi_school` | Configure multi-school tenancy views | `prds/platform-and-admin/backoffice.md` | no | Multi-school tenancy; per-school isolation. |
| `academic.configure_report_card` | Configure report card display rules | `prds/academic/report-cards.md` | no | Hide disciplines or final grades per policy. |
| `academic.enter_grades` | Enter grades in diary and activities | `prds/academic/grades.md` | no | Teacher diary grade entry; secretary override with audit. Differentiator. |
| `academic.export_attendance` | Export and print attendance records | `prds/academic/attendance.md` | no | Blank frequency sheets and period exports. |
| `academic.justify_absence` | Justify student absences | `prds/academic/attendance.md` | no | Documented justification with audit trail. |
| `academic.log_lesson_content` | Log lesson content in diary | `prds/academic/diary.md` | no | Per-lesson content with copy-from-prior term. |
| `academic.manage_academic_operations` | General academic module operations | `prds/academic/diary.md` | no | Catch-all for miscatalogued academic tasks pending finer split. |
| `academic.manage_attendance_policy` | Manage attendance counting policy | `prds/academic/attendance.md` | no | School-level policy with per-period override. Differentiator. |
| `academic.manage_class_diary` | Manage class diary lessons and activities | `prds/academic/diary.md` | no | Individual and batch lessons tied to evaluation. |
| `academic.manage_curriculum_matrix` | Manage curriculum matrix and disciplines | `prds/academic/curriculum.md` | no | Disciplines, subdisciplines, skills matrix self-service. |
| `academic.manage_grade_scale` | Configure grading criteria and formulas | `prds/academic/grades.md` | no | Self-service numeric/concept/rubric scales; report-card format is decided. |
| `academic.manage_period_closure` | Close academic period and year | `prds/academic/periods.md` | no | Checklist-driven period close; blocks incomplete diaries. |
| `academic.manage_recovery_grades` | Manage recovery and reassessment grades | `prds/academic/grades.md` | no | Parallel recovery and dependency flows explicit. |
| `academic.manage_teacher_diary` | Manage teacher diary workflow | `prds/academic/diary.md` | no | Submit, return, and monitor diary delivery. |
| `academic.publish_report_card` | Publish report cards (boletim) | `prds/academic/report-cards.md` | no | Scheduled atomic release emits `ReportCardPublished`; notification consumption is unresolved. Differentiator. |
| `academic.record_attendance` | Record attendance | `prds/academic/attendance.md` | no | Reliable attendance; legal impact if wrong. Differentiator. |
| `academic.record_incidents` | Record disciplinary and pastoral incidents | `prds/academic/incidents.md` | no | Typed occurrences with family visibility policy. |
| `academic.search_help_center` | Search product help center | — | no | Ship searchable help for own product. |
| `academic.view_academic_dashboard` | View academic coordination dashboard | `prds/academic/coordination.md` | no | Diary status, grades, and activity monitoring. |
| `academic.view_report_card` | View report card and grades | `prds/academic/report-cards.md` | no | Family-scoped grade view; student portal when enabled. |

### Students & enrollments (9 MVP)

| Capability | Label | PRD target | Parity gap | Notes |
|:---|:---|:---|:---:|:---|
| `students.assign_class` | Assign student to class | `prds/students-and-enrollments/records.md` | no | Enrollment-to-class assignment; respects capacity. |
| `students.enroll_student` | Enroll student | `prds/students-and-enrollments/enrollments.md` | no | Core enrollment; links student, class, and guardians. |
| `students.export_enrollment_reports` | Export enrollment reports | `prds/students-and-enrollments/enrollments.md` | no | Carteirinha, CRM opportunity reports, enrollment lists. |
| `students.import_students_bulk` | Import students in bulk | `prds/students-and-enrollments/enrollments.md` | no | Spreadsheet import with validation; no duplicate CPF per school. |
| `students.manage_class_structure` | Manage class structure | `prds/students-and-enrollments/records.md` | no | Classes, shifts, capacity, multigrade parent/child turmas. |
| `students.manage_enrollment_contract` | Manage enrollment contract | `prds/students-and-enrollments/enrollments.md` | no | Contract templates and enrollment binding; signature in phase 2. |
| `students.manage_enrollment_operations` | General enrollment module operations | `prds/students-and-enrollments/enrollments.md` | no | Catch-all for miscatalogued enrollment tasks pending finer split. |
| `students.manage_guardian_link` | Manage guardian–student link | `prds/students-and-enrollments/records.md` | no | Family isolation boundary; multiple guardians per student. Differentiator. |
| `students.update_student_record` | Update student record | `prds/students-and-enrollments/records.md` | no | Cadastral data, RA, and identifiers; LGPD minimization. Differentiator. |

### Identity & onboarding (13 MVP)

| Capability | Label | PRD target | Parity gap | Notes |
|:---|:---|:---|:---:|:---|
| `identity.authenticate_user` | Authenticate user | `prds/identity-and-onboarding/auth.md` | no | JWT login; OTP/code login where competitors use it; MFA phase 2. |
| `identity.complete_registration` | Complete registration from invite | `prds/identity-and-onboarding/invites.md` | no | Guardian/staff self-register via invite link or SMS code. |
| `identity.configure_school_profile` | Configure school profile | `prds/identity-and-onboarding/onboarding.md` | no | School name, branding, and tenant profile during onboarding. |
| `identity.invite_user` | Invite user to school | `prds/identity-and-onboarding/invites.md` | no | Staff/guardian invites with role_template_id; digest-stored tokens. |
| `identity.manage_consent` | Manage guardian consent (LGPD) | `prds/identity-and-onboarding/consent.md` | no | LGPD consent record for staff/guardian onboarding; basis shown in UI. Blocked — see capability-map. Differentiator. |
| `identity.manage_identity_operations` | General identity module operations | `prds/identity-and-onboarding/auth.md` | no | Catch-all for miscatalogued identity tasks pending finer split. |
| `identity.manage_roles` | Manage roles and permissions | `prds/identity-and-onboarding/permissions.md` | no | System + custom role templates; permission keys + overrides. |
| `identity.manage_user_accounts` | Manage user accounts (activate, deactivate, delete) | `prds/identity-and-onboarding/permissions.md` | no | Account tab pattern; deactivate preferred over hard delete. |
| `identity.manage_user_profile` | Manage user profile and contact data | `prds/identity-and-onboarding/profiles.md` | no | Email and cadastral updates with audit; progressive profiling hooks. |
| `identity.onboard_team` | Onboard staff and guardians to school | `prds/identity-and-onboarding/onboarding.md` | no | Owner wizard + team invites; first-login checklists per onboarding mode. |
| `identity.provision_school` | Provision school tenant (white-glove and lifecycle) | `prds/identity-and-onboarding/onboarding.md` | no | provisioning → pending_handoff → active; self-serve + optional white-glove. |
| `identity.reset_password` | Reset or change password | `prds/identity-and-onboarding/auth.md` | no | Forgot-password link + in-app change; passwords never returned by API. |
| `identity.set_password` | Set password from invite token | `prds/identity-and-onboarding/auth.md` | no | Single-use invite token + set-password; replaces random temp passwords. |

### Documents & archive (5 MVP)

| Capability | Label | PRD target | Parity gap | Notes |
|:---|:---|:---|:---:|:---|
| `documents.configure_document_signatories` | Configure secretary and director on official documents | `prds/documents-and-archive/archive.md` | no | Letterhead/signatory block on generated certificates and declarations. Blocked — see capability-map. Differentiator. |
| `documents.export_audit_package` | Export audit-ready document package | `prds/documents-and-archive/archive.md` | no | Conselho de Educacao audit readiness per vision. Blocked — see capability-map. Differentiator. |
| `documents.search_archive` | Search digital archive | `prds/documents-and-archive/archive.md` | no | Basic search MVP; semantic search phase 2. Blocked — see capability-map. Differentiator. |
| `documents.store_student_document` | Store document in digital archive | `prds/documents-and-archive/archive.md` | no | Audit-ready repository per student/school. Blocked — see capability-map. Differentiator. |
| `documents.view_student_documents` | View student documents in archive | `prds/documents-and-archive/archive.md` | no | Per-family isolation; guardian sees own children's documents only. Blocked — see capability-map. Differentiator. |

### Platform & admin (6 MVP)

| Capability | Label | PRD target | Parity gap | Notes |
|:---|:---|:---|:---:|:---|
| `platform.configure_school_year` | Configure school year and calendar periods | `prds/platform-and-admin/school-year.md` | no | Ano letivo, feriados, and period boundaries drive academic and billing cycles. |
| `platform.manage_backoffice_ops` | Backoffice tenant and module operations | `prds/platform-and-admin/backoffice.md` | no | Platform SPA ops: tenant lifecycle, module enablement, upsell — not school staff tasks. |
| `platform.manage_platform_operations` | General platform module operations | `prds/platform-and-admin/staff-users.md` | no | Catch-all for miscatalogued platform tasks pending finer split. |
| `platform.manage_school_calendar` | Manage school calendar and personal events | `prds/platform-and-admin/calendar.md` | no | Institutional calendar plus staff personal events; comms events sync later. |
| `platform.manage_staff_users` | Manage staff users and role menus | `prds/platform-and-admin/staff-users.md` | no | Staff roster and menu visibility; identity owns auth and permission keys. |
| `platform.self_serve_onboarding` | Self-serve school onboarding and product access | `prds/platform-and-admin/onboarding.md` | no | Self-serve with optional white-glove tier; app access FAQs map here not identity. |

## Deferred to phase 2 (P2)

**59** capabilities marked `phase: P2` in taxonomy. Full detail:
[`capability-map.md`](capability-map.md) (filter Phase = P2).

| Domain | P2 count | Representative deferrals |
|--------|--------:|--------------------------|
| Billing | 12 | NFS-e settings, ERP import, boleto protest, corporate payer, online enrollment pay |
| Communication | 7 | Mass announcements, emergency broadcast, AI assistant, read receipts |
| Academic | 11 | Daily routine (infantil), online re-enrollment trilha, advanced scheduling |
| Students & enrollments | 10 | Online enrollment trilha, contract signature gate |
| Identity & onboarding | 1 | Enrollment contract signature blocking |
| Documents & archive | 7 | Livro Ata, minutes signatures, semantic archive search |
| Platform & admin | 6 | Real-time (Solid Cable), advanced BI, landing/sales |
| Integrations | 5 | ERP sync, WhatsApp adapter depth, third-party LMS |

### P2 capability inventory

| Capability | Label | PRD target | Notes |
|:---|:---|:---|:---|
| `billing.configure_nf_settings` | Configure service invoice (NF) settings | `prds/billing/invoices.md` | Per-city NFS-e parameters when required. |
| `billing.import_erp_charges` | Import charges from external ERP | `prds/billing/settings.md` | Open API for adjunct ERPs. |
| `billing.manage_corporate_payer` | Manage corporate (PJ) financial payer | `prds/billing/charges.md` | Scoped access + audit for empresa conveniada. |
| `billing.manage_multi_unit_billing` | Multi-unit billing reports | `prds/billing/charges.md` | Per-school isolation with group roll-ups. |
| `billing.manage_protest` | Manage boleto protest workflow | `prds/billing/dunning.md` | No protest default; softer dunning first. |
| `billing.meter_digital_signatures` | Meter digital signatures on contracts | `prds/billing/invoices.md` | Transparent metering or plan inclusion. |
| `billing.pay_enrollment_online` | Pay during online enrollment | `prds/students-and-enrollments/enrollments.md` | Payment as enrollment trilha final step. |
| `billing.reconcile_bank_statement` | Reconcile bank statement | `prds/billing/payments.md` | Match settlements to open receivables. |
| `billing.select_plan_on_enrollment` | Select payment plan during enrollment | `prds/students-and-enrollments/enrollments.md` | Trilha step: data → contract → plan → pay. |
| `billing.sign_enrollment_contract` | Collect digital signature on enrollment contract | `prds/students-and-enrollments/enrollments.md` | Shares signature infra with documents phase 2. |
| `billing.sync_erp_financial` | Sync financial data with ERP | `prds/billing/settings.md` | Bi-directional sync for hybrid stack. |
| `billing.view_classpay_dashboard` | Embedded payment product dashboard | `prds/billing/payments.md` | ClassPay/ClipPag-like embedded pay reference. |
| `communication.embed_video_call` | Embed video call link in event or message | `prds/communication/announcements.md` | Meet/Zoom links as adapter; not native video infra. |
| `communication.manage_network_broadcast` | Multi-school network broadcast | `prds/communication/channels.md` | Network-level comms with per-school isolation on read. |
| `communication.manage_social_reactions` | Manage likes and comments on announcements | `prds/communication/announcements.md` | Optional reactions; off by default to avoid vanity feed. |
| `communication.send_mass_announcement` | Send mass announcement | `prds/communication/announcements.md` | Post-MVP mass comms. |
| `communication.send_poll_survey` | Send poll or survey in announcement | `prds/communication/announcements.md` | Polls as structured announcement type. |
| `communication.track_event_engagement` | Track calendar event engagement | `prds/communication/announcements.md` | Engagement metrics on events; no vanity feed ranking. |
| `communication.view_communication_engagement` | View communication engagement reports | `prds/communication/index.md` | Delivery and read metrics; not public leaderboards. |
| `academic.deliver_diary_to_families` | Deliver daily diary to guardians | `prds/academic/diary.md` | Push diary entries to families; infantil priority. |
| `academic.issue_transcript` | Issue school transcript (histórico escolar) | `prds/documents-and-archive/archive.md` | Official transcript generation with audit. |
| `academic.log_daily_routine` | Log early childhood daily routine | `prds/academic/routine.md` | Snack/diaper/notes slice built (BC11); sleep/health/mood/photos still deferred. |
| `academic.manage_lesson_lifecycle` | Manage lesson lifecycle (cancel/makeup) | `prds/academic/diary.md` | Cancel and makeup rules explicit. |
| `academic.manage_live_lesson` | Manage live online lessons | `prds/academic/diary.md` | Meet/adapter links; recordings attached to lesson. |
| `academic.manage_special_education` | Manage special education (AEE) records | `prds/academic/special-education.md` | AEE module deferred; document competitor pattern. |
| `academic.manage_transcript_record` | Maintain transcript discipline records | `prds/documents-and-archive/archive.md` | Edit workload and frequency on historical records. |
| `academic.process_reenrollment` | Process online re-enrollment | `prds/students-and-enrollments/enrollments.md` | Online re-enrollment first-class. |
| `academic.schedule_lesson` | Schedule lessons | `prds/academic/diary.md` | Model lesson lifecycle explicitly. |
| `academic.sync_academic_with_erp` | Sync academic data with external ERP | `prds/integrations/erp.md` | API-first SIS; adjunct ERP sync when hybrid. |
| `academic.view_corporate_guardian_students` | Corporate partner view linked students | `prds/students-and-enrollments/enrollments.md` | corporate_partner scoped access + audit. |
| `students.cancel_enrollment` | Cancel enrollment or pre-enrollment | `prds/students-and-enrollments/enrollments.md` | Guardian self-cancel before institution processing. |
| `students.capture_prospect` | Capture enrollment prospect | `prds/students-and-enrollments/records.md` | CRM lead/opportunity before formal enrollment. |
| `students.invite_student_access` | Invite student to self-register | `prds/students-and-enrollments/enrollments.md` | Student login deferred to phase 2; invite + staff review queue. |
| `students.manage_enrollment_campaign` | Manage enrollment campaign | `prds/students-and-enrollments/records.md` | Matrícula campaigns and CRM funnel; not comms mass send. |
| `students.manage_enrollment_slots` | Manage enrollment slots | `prds/students-and-enrollments/enrollments.md` | Vacancy availability for online enrollment trilha. |
| `students.run_online_enrollment_trail` | Run online enrollment trail | `prds/students-and-enrollments/enrollments.md` | Trilha: data → contract → plan → pay; includes re-enrollment. |
| `students.sign_enrollment_contract` | Sign enrollment contract electronically | `prds/students-and-enrollments/enrollments.md` | E-signature step on trilha; shares documents infra. |
| `students.transfer_enrollment` | Transfer enrollment between classes | `prds/students-and-enrollments/enrollments.md` | Class transfer and manual progression between turmas. |
| `students.unify_person_records` | Unify duplicate person records | `prds/students-and-enrollments/records.md` | Merge homonyms with audit trail; irreversible ops guarded. |
| `students.view_student_portal` | Access student portal features | `prds/students-and-enrollments/records.md` | Student login surface; MVP uses guardian/staff proxy. |
| `identity.configure_multi_factor` | Configure multi-factor authentication | `prds/identity-and-onboarding/auth.md` | 2FA and biometric login phase 2; document competitor patterns. |
| `documents.collect_contract_signatures` | Collect digital signatures on contracts | `prds/documents-and-archive/archive.md` | Paperless contracts; shares signature infra with Livro Ata. |
| `documents.collect_minutes_signatures` | Collect digital signatures on minutes | `prds/documents-and-archive/index.md` | Valid digital signature for Conselho audits. |
| `documents.generate_official_minutes` | Generate official minutes (Livro Ata) | `prds/documents-and-archive/index.md` | Phase 2 high priority per vision. |
| `documents.issue_official_declaration` | Issue official declarations and certificates | `prds/documents-and-archive/archive.md` | Enrollment, quitacao, and other formal declarations beyond transcript. |
| `documents.issue_transcript` | Issue school transcript certificate | `prds/documents-and-archive/archive.md` | Under-represented in competitor catalog. |
| `documents.manage_retention_policy` | Manage document retention policy | `prds/documents-and-archive/retention.md` | LGPD retention for archive and photos. |
| `documents.search_archive_semantic` | Semantic search across document archive | `prds/documents-and-archive/index.md` | Phase 2 Livro Ata search per vision; basic search remains MVP. |
| `platform.configure_help_taxonomy` | Configure help center taxonomy | `prds/platform-and-admin/index.md` | Module docs for School Lab product; persona quick-starts per actor. |
| `platform.export_operational_reports` | Export operational and cross-module reports | `prds/platform-and-admin/index.md` | Favorited reports and year-scoped roll-ups; not domain ledger exports. |
| `platform.manage_multi_unit` | Configure multi-unit school group | `prds/platform-and-admin/backoffice.md` | Per-school isolation with group roll-ups; distinct from academic tenancy views. |
| `platform.manage_transport_module` | Manage transport module (deferred) | `prds/platform-and-admin/index.md` | Transport routes deferred; catalog miscatalog captured as quality signal unti... |
| `platform.meter_digital_signatures` | Meter digital signature consumption | `prds/documents-and-archive/archive.md` | Transparent metering for e-sign; shares infra with billing and documents. |
| `platform.view_analytics_dashboard` | View analytics and operational reports | `prds/platform-and-admin/index.md` | Cross-module dashboards; domain-specific exports stay in billing/academic PRDs. |
| `integrations.connect_erp` | Connect external ERP | `prds/integrations/erp.md` | Own core domains; open API for adjuncts. |
| `integrations.export_financial_data` | Export financial data to ERP | `prds/integrations/erp.md` | — |
| `integrations.import_academic_data` | Import academic data from ERP | `prds/integrations/erp.md` | — |
| `integrations.manage_webhooks` | Manage outbound webhooks | `prds/integrations/webhooks.md` | — |
| `integrations.sync_communication_overlay` | Sync comms overlay with ERP SIS | `prds/integrations/comms-sync.md` | API-first SIS; comms native. |

## Explicitly out of scope

### N/A capabilities (not product core)

**8** capabilities marked `phase: N/A` — quality signals, vendor-only
products, or patterns documented for reference only.

| Capability | Label | Notes |
|:---|:---|:---|
| `billing.manage_guaranteed_revenue` | Guaranteed revenue (vendor-assumed risk) | Out of core; document fintech partner pattern only. |
| `billing.quality_signal_support` | Billing help troubleshooting (quality signal) | Support articles and FAQs — friction signal, not parity target. |
| `communication.defer_ai_assistant` | AI virtual assistant (deferred) | Defer Lia/Duda-style AI; document competitor pattern only. |
| `communication.quality_signal_support` | Communication help troubleshooting (quality signal) | Support articles, release notes, FAQs — friction signal, not parity target. |
| `academic.quality_signal_support` | Academic help troubleshooting (quality signal) | Support articles, CST tickets, ERP miscatalog — friction signal, not parity target. |
| `students.quality_signal_support` | Students help troubleshooting (quality signal) | ERP module FAQs, CST tickets, transport/food miscatalog — friction signal. |
| `identity.quality_signal_support` | Identity help troubleshooting (quality signal) | Support articles, cache clears, ERP miscatalog — friction signal, not parity target. |
| `platform.quality_signal_support` | Platform help troubleshooting (quality signal) | CST/GSen license FAQs, ERP vendor articles, transport/RH miscatalog — friction signal. |

### Vision §6 exclusions (anchor prose)

These items are **out of the MVP** per [`vision.md`](../vision.md) §6 even when
related taxonomy rows exist as P2/N/A:

- **Livro Ata & formal minutes** — high priority phase 2; digital signatures, semantic
  search, optional print for physical archive.
- **Contracts + digital signature** — shares signature infrastructure with Livro Ata;
  enrollment contract gate does not block login (BR-O11).
- **Advanced communication** — mass announcements, read receipts (P2 in taxonomy).
- **Landing / sales page** — institutional site only; product sales flow deferred.
- **Advanced reporting and BI** — basic exports in MVP; dashboards deferred.
- **Structured early childhood daily routine** — meals, sleep, hygiene module (P2).
- **Audio messages** — explicitly out per Jul 2026 communication decision.
- **Real-time messaging** — timely delivery via push/queue, not live sync (phase 2).
- **Receivables anticipation / guaranteed revenue** — fintech partner pattern only (`N/A`).
- **AI support agents** — defer; human escalation first ([`DIV-communication-006`](../ref/divergencias.md)).

### Billing partner slice gaps (historical baseline vs MVP inventory)

The partner billing slice in [`fintech-first.md`](../prds/fintech-first.md) implements
core charge/boleto/webhook flows in `web/` but explicitly **excludes** (until domain
**implementations** ship in `web/`):

- Academic, communication, and full digital archive modules (PRDs validated; code pending).
- Platform collection régua (email/WhatsApp automation) — stub only.
- Card/Pix checkout breadth beyond Cora boleto path (per billing PRD waves).
- Treasury (`manage_cash_register`), NFS-e issuance, visual dunning builder.

Domain PRDs under `docs/prds/billing/` remain the **normative** target for full MVP billing
scope; per-capability delivery status and blockers are in [`capability-map.md`](capability-map.md).

## Cross-references

- Non-functional requirements: [`non-functional-requirements.md`](non-functional-requirements.md)
- Divergence decisions: [`divergencias.md`](../ref/divergencias.md)
- Domain delivery status: [`domain-roadmap.md`](domain-roadmap.md)
- Open decisions: [`open-questions.md`](../open-questions.md)
