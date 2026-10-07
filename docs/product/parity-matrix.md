# Parity matrix (canonical capabilities)

_Generated view — regen from taxonomy + aliases + catalog; do not edit by hand._

Regenerate:

```bash
python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py \
  --generate-parity-matrix \
  --taxonomy docs/product/capability-taxonomy.yaml \
  --aliases docs/ref/capability-aliases.jsonl \
  --catalog-path docs/ref/catalogo-funcionalidades.md \
  --out docs/product/parity-matrix.md
```

Optional CSV:

```bash
python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py \
  --generate-parity-matrix --csv docs/ref/parity-matrix.csv
```

**191** canonical capabilities vs primary competitors (Proesc, Sponte, Agenda Edu, ClassApp). Evidence from [`capability-aliases.jsonl`](../ref/capability-aliases.jsonl) and help-center maturity in [`catalogo-funcionalidades.md`](../ref/catalogo-funcionalidades.md).

## Presence legend

| Value | Meaning |
|-------|---------|
| `documented` | Help-center how-to or configuration article observed |
| `claimed` | Conceptual/marketing-only article (no step-by-step) |
| `noise` | Quality-signal alias only (FAQ, troubleshooting, miscatalog) |
| `—` | No mapped alias for this competitor |

## Coverage summary (primary competitors)

| Competitor | Documented | Claimed | Noise | Absent | % documented | % any presence |
|------------|------------|---------|-------|--------|--------------|----------------|
| Proesc | 94 | 1 | 6 | 90 | 49.2% | 52.9% |
| Sponte | 2 | 0 | 0 | 189 | 1.0% | 1.0% |
| Agenda Edu | 70 | 2 | 4 | 115 | 36.6% | 39.8% |
| ClassApp | 61 | 0 | 5 | 125 | 31.9% | 34.6% |

School Lab **phase** and **PRD** columns come from [`capability-taxonomy.yaml`](capability-taxonomy.yaml). Cross-competitor decisions: [`divergencias.md`](../ref/divergencias.md).

## Billing

| Canonical capability | Proesc | Sponte | Agenda Edu | ClassApp | School Lab phase | PRD | Notes |
|---|:---:|:---:|:---:|:---:|---|---|---|
| `billing.accept_card_payment` — Accept card payment | — | — | — | — | MVP | `prds/billing/payments.md` | `DIV-financial-002` Checkout for guardians; gateway abstracted. |
| `billing.accept_pix_payment` — Accept Pix payment | documented | — | documented | documented | MVP | `prds/billing/payments.md` | `DIV-financial-002` Pix QR and copy-paste via payment gateway. Aliases (Proesc: 2, Agenda Edu: 4, ClassApp: 2) |
| `billing.adjust_charge` — Adjust charge amount or apply scholarship | — | — | documented | documented | MVP | `prds/billing/charges.md` | Bolsa, isenção, adjustments with audit. Aliases (Agenda Edu: 1, ClassApp: 1) |
| `billing.build_dunning_workflow` — Build visual dunning workflow | documented | — | documented | documented | MVP | `prds/billing/dunning.md` | `DIV-financial-006` Configurable régua with audit trail. Aliases (Proesc: 3, Agenda Edu: 3, ClassApp: 1) |
| `billing.cancel_charge` — Cancel or reverse charge | documented | — | documented | documented | MVP | `prds/billing/charges.md` | Estorno and cancellation with reason code. Aliases (Proesc: 3, Agenda Edu: 1, ClassApp: 1) |
| `billing.configure_billing_notifications` — Configure billing notification channels | documented | — | documented | documented | MVP | `prds/billing/dunning.md` | Explicit per-channel policy for finance pushes. Aliases (Proesc: 1, Agenda Edu: 3, ClassApp: 3) |
| `billing.configure_early_payment_discount` — Configure tiered early-payment discounts | documented | — | documented | documented | MVP | `prds/billing/settings.md` | `DIV-financial-004` Discount by payment day before due date. Aliases (Proesc: 5, Agenda Edu: 2, ClassApp: 4) |
| `billing.configure_nf_settings` — Configure service invoice (NF) settings | — | — | — | — | P2 | `prds/billing/invoices.md` | `DIV-financial-005` Per-city NFS-e parameters when required. |
| `billing.configure_payment_gateway` — Configure payment gateway settings | — | — | — | — | MVP | `prds/billing/payments.md` | `DIV-financial-002` Fees, settlement accounts, enabled methods. |
| `billing.export_financial_report` — Export financial reports | documented | — | documented | documented | MVP | `prds/billing/charges.md` | Receivables, cash flow, delinquency exports. Aliases (Proesc: 9, Agenda Edu: 2, ClassApp: 2) |
| `billing.import_erp_charges` — Import charges from external ERP | documented | — | documented | documented | P2 | `prds/billing/settings.md` | Open API for adjunct ERPs. Aliases (Proesc: 6, Agenda Edu: 6, ClassApp: 1) |
| `billing.integrate_boleto_bank` — Configure boleto bank remittance integration | documented | — | documented | — | MVP | `prds/billing/boletos.md` | `DIV-financial-002` Abstract bank integration; guided onboarding. Aliases (Proesc: 5, Agenda Edu: 4) |
| `billing.issue_boleto` — Generate boleto for charge | documented | — | documented | documented | MVP | `prds/billing/boletos.md` | Automated boleto generation and tracking in app. Aliases (Proesc: 11, Agenda Edu: 5, ClassApp: 4) |
| `billing.issue_charge` — Issue charge to guardian | documented | — | documented | documented | MVP | `prds/billing/charges.md` | `DIV-financial-001` Core enrollment receivables (débito + parcelas); extensions per segment PRD. Aliases (Proesc: 32, Agenda Edu: 10, ClassApp: 9) |
| `billing.issue_service_invoice` — Issue NFS-e for tuition services | documented | — | — | — | MVP | `prds/billing/invoices.md` | `DIV-financial-005` Service NF in billing PRD; product NF later. Aliases (Proesc: 6) |
| `billing.manage_cash_register` — Treasury and cash register operations | documented | — | — | documented | MVP | `prds/billing/payments.md` | Meu caixa pattern: receipts, expenses, cost centers. Aliases (Proesc: 13, ClassApp: 1) |
| `billing.manage_charge_types` — Configure charge types and categories | — | — | — | — | MVP | `prds/billing/charges.md` | Typed debits with chart-of-accounts mapping. |
| `billing.manage_corporate_payer` — Manage corporate (PJ) financial payer | documented | — | documented | — | P2 | `prds/billing/charges.md` | Scoped access + audit for empresa conveniada. Aliases (Proesc: 3, Agenda Edu: 1) |
| `billing.manage_financial_operations` — General financial module operations | documented | documented | documented | documented | MVP | `prds/billing/charges.md` | Catch-all for ERP finance tasks pending finer split. Aliases (Proesc: 81, Sponte: 8, Agenda Edu: 31, ClassApp: 28) |
| `billing.manage_guaranteed_revenue` — Guaranteed revenue (vendor-assumed risk) | — | — | — | — | N/A | — | `DIV-financial-008` Out of core; document fintech partner pattern only. |
| `billing.manage_multi_unit_billing` — Multi-unit billing reports | — | — | — | — | P2 | `prds/billing/charges.md` | Per-school isolation with group roll-ups. |
| `billing.manage_payment_links` — Manage payment links | — | — | documented | — | MVP | `prds/billing/payments.md` | Shareable links for overdue or ad-hoc pay. Aliases (Agenda Edu: 3) |
| `billing.manage_payment_plan` — Configure payment plans and installment schedules | documented | — | documented | documented | MVP | `prds/billing/charges.md` | Plans drive parcel generation; tie to enrollment contracts. Aliases (Proesc: 29, Agenda Edu: 13, ClassApp: 17) |
| `billing.manage_protest` — Manage boleto protest workflow | documented | — | — | — | P2 | `prds/billing/dunning.md` | `DIV-financial-003` No protest default; softer dunning first. Aliases (Proesc: 1) |
| `billing.manage_recurring_card` — Manage recurring card billing | documented | — | documented | documented | MVP | `prds/billing/payments.md` | Opt-in recurring card with clear consent. Aliases (Proesc: 6, Agenda Edu: 15, ClassApp: 3) |
| `billing.meter_digital_signatures` — Meter digital signatures on contracts | documented | — | documented | documented | P2 | `prds/billing/invoices.md` | `DIV-financial-007` Transparent metering or plan inclusion. Aliases (Proesc: 4, Agenda Edu: 4, ClassApp: 1) |
| `billing.negotiate_receivable` — Mark receivable under negotiation | documented | — | documented | — | MVP | `prds/billing/charges.md` | Manual negotiation status with audit. Aliases (Proesc: 1, Agenda Edu: 1) |
| `billing.onboard_payment_gateway` — Onboard payment gateway (KYC) | documented | — | — | — | MVP | `prds/billing/payments.md` | `DIV-financial-002` Guided gateway onboarding; abstract provider. Aliases (Proesc: 1) |
| `billing.pay_enrollment_online` — Pay during online enrollment | — | — | — | — | P2 | `prds/students-and-enrollments/enrollments.md` | Payment as enrollment trilha final step. |
| `billing.pay_online` — Guardian pay charges online | — | — | claimed | — | MVP | `prds/billing/payments.md` | `DIV-financial-002` Checkout for boleto, Pix, card. Aliases (Agenda Edu: 1) |
| `billing.process_batch_payment` — Process batch payments | — | — | documented | documented | MVP | `prds/billing/payments.md` | Batch settlement and bulk status updates. Aliases (Agenda Edu: 1, ClassApp: 1) |
| `billing.quality_signal_support` — Billing help troubleshooting (quality signal) | noise | — | noise | noise | N/A | — | Canonical quality signal — not an MVP parity target. Support articles and FAQs — friction signal, not parity target. Aliases (Proesc: 5, Agenda Edu: 16, ClassApp: 8) |
| `billing.reconcile_bank_statement` — Reconcile bank statement | documented | — | — | — | P2 | `prds/billing/payments.md` | Match settlements to open receivables. Aliases (Proesc: 1) |
| `billing.record_manual_payment` — Record manual payment receipt | — | — | — | documented | MVP | `prds/billing/payments.md` | Cash, negotiation, or external transfer with audit. Aliases (ClassApp: 1) |
| `billing.resend_boleto` — Resend boleto to guardian | — | — | documented | documented | MVP | `prds/billing/boletos.md` | Staff-triggered resend; WhatsApp as adapter. Aliases (Agenda Edu: 1, ClassApp: 1) |
| `billing.select_plan_on_enrollment` — Select payment plan during enrollment | documented | — | — | documented | P2 | `prds/students-and-enrollments/enrollments.md` | Trilha step: data → contract → plan → pay. Aliases (Proesc: 7, ClassApp: 1) |
| `billing.send_boleto_remittance` — Send boleto remittance file to bank | — | — | — | — | MVP | `prds/billing/boletos.md` | CNAB/remessa batch export. |
| `billing.send_payment_reminder` — Send payment reminders | — | — | — | — | MVP | `prds/billing/dunning.md` | `DIV-financial-006` Email/push/WhatsApp adapters; rules in API. |
| `billing.sign_enrollment_contract` — Collect digital signature on enrollment contract | — | — | — | — | P2 | `prds/students-and-enrollments/enrollments.md` | `DIV-financial-007` Shares signature infra with documents phase 2. |
| `billing.sync_erp_financial` — Sync financial data with ERP | — | — | — | — | P2 | `prds/billing/settings.md` | Bi-directional sync for hybrid stack. |
| `billing.track_boleto_status` — Track boleto registration and settlement | — | — | — | — | MVP | `prds/billing/boletos.md` | Never lose billing state; webhook + manual reconciliation. |
| `billing.view_classpay_dashboard` — Embedded payment product dashboard | — | — | documented | documented | P2 | `prds/billing/payments.md` | `DIV-financial-002` ClassPay/ClipPag-like embedded pay reference. Aliases (Agenda Edu: 1, ClassApp: 9) |
| `billing.view_delinquency_dashboard` — View delinquency dashboard | documented | documented | documented | documented | MVP | `prds/billing/dunning.md` | `DIV-financial-006` Visual overdue portfolio; no surprise automation. Aliases (Proesc: 9, Sponte: 2, Agenda Edu: 2, ClassApp: 2) |
| `billing.view_guardian_charges` — Guardian view open charges | — | — | — | — | MVP | `prds/billing/guardian-portal.md` | Parent billing view in app and web. |
| `billing.view_payment_history` — View payment history | — | — | — | — | MVP | `prds/billing/guardian-portal.md` | Settled and pending history per family. |
| `billing.view_student_receivables` — View and search student receivables | documented | — | documented | documented | MVP | `prds/billing/charges.md` | Parcel search by student or guardian. Aliases (Proesc: 2, Agenda Edu: 6, ClassApp: 1) |

## Communication

| Canonical capability | Proesc | Sponte | Agenda Edu | ClassApp | School Lab phase | PRD | Notes |
|---|:---:|:---:|:---:|:---:|---|---|---|
| `communication.approve_pending_communication` — Approve pending communications and events | — | — | documented | — | MVP | `prds/communication/announcements.md` | Moderation queue for teacher-submitted content. Aliases (Agenda Edu: 2) |
| `communication.assign_recipients_to_channel` — Assign users or classes to message channel | — | — | — | — | MVP | `prds/communication/channels.md` | Channel membership by class, staff role, or individual. |
| `communication.attach_files_to_message` — Attach files to messages | — | — | — | documented | MVP | `prds/communication/media.md` | Multi-attachment messages with size/type policy. Aliases (ClassApp: 6) |
| `communication.collect_channel_csat` — Collect CSAT on service channels | — | — | — | documented | MVP | `prds/communication/channels.md` | `DIV-communication-002` Post-resolution CSAT; aggregate per channel. Aliases (ClassApp: 1) |
| `communication.collect_guardian_cpf` — Collect guardian CPF (progressive profiling) | — | — | — | documented | MVP | `prds/identity-and-onboarding/profiles.md` | `DIV-communication-004` Campaign-style CPF collection with LGPD basis shown. Aliases (ClassApp: 1) |
| `communication.configure_communication_module` — Configure communication module settings | documented | — | documented | documented | MVP | `prds/communication/channels.md` | Branding, defaults, module enablement per school. Aliases (Proesc: 1, Agenda Edu: 2, ClassApp: 1) |
| `communication.configure_push_policy` — Configure push notification policy | — | — | documented | — | MVP | `prds/communication/notifications.md` | `DIV-communication-007` Explicit per-channel notification policy. Aliases (Agenda Edu: 3) |
| `communication.defer_ai_assistant` — AI virtual assistant (deferred) | documented | — | — | — | N/A | — | `DIV-communication-006` Defer Lia/Duda-style AI; document competitor pattern only. Aliases (Proesc: 1) |
| `communication.distribute_learning_materials` — Distribute learning materials and attachments | documented | — | — | — | MVP | `prds/communication/media.md` | Class materials via comms; not LMS replacement. Aliases (Proesc: 1) |
| `communication.edit_message_content` — Edit sent message with audit trail | — | — | documented | documented | MVP | `prds/communication/messages.md` | Edit history visible to recipients; no silent edits. Aliases (Agenda Edu: 1, ClassApp: 4) |
| `communication.embed_video_call` — Embed video call link in event or message | documented | — | documented | documented | P2 | `prds/communication/announcements.md` | Meet/Zoom links as adapter; not native video infra. Aliases (Proesc: 1, Agenda Edu: 2, ClassApp: 2) |
| `communication.escalate_to_human_support` — Escalate to human support | documented | — | — | documented | MVP | `prds/communication/channels.md` | `DIV-communication-006` Defer AI; human escalation first. Aliases (Proesc: 1, ClassApp: 1) |
| `communication.manage_announcement_categories` — Manage announcement categories | — | — | documented | — | MVP | `prds/communication/announcements.md` | Typed comunicados for filtering and retention. Aliases (Agenda Edu: 1) |
| `communication.manage_announcement_templates` — Manage announcement templates and duplication | — | — | documented | — | MVP | `prds/communication/announcements.md` | Model comunicados; duplicate with audit. Aliases (Agenda Edu: 2) |
| `communication.manage_channel_permissions` — Manage channel access permissions | — | — | — | — | MVP | `prds/communication/channels.md` | Revoke staff channel access with audit. |
| `communication.manage_communication_groups` — Manage communication groups (group vs channel vs DM) | — | — | — | documented | MVP | `prds/communication/channels.md` | `DIV-communication-001` Explicit group/channel/DM model; family isolation. Aliases (ClassApp: 4) |
| `communication.manage_communication_operations` — General communication module operations | documented | — | documented | documented | MVP | `prds/communication/messages.md` | Catch-all for miscatalogued or edge comms tasks pending finer split. Aliases (Proesc: 15, Agenda Edu: 53, ClassApp: 22) |
| `communication.manage_emergency_contacts` — Manage emergency contact alert list | documented | — | — | — | MVP | `prds/communication/notifications.md` | Emergency contacts for school alert button. Aliases (Proesc: 1) |
| `communication.manage_message_inbox` — Manage message inbox (read, archive, delete) | — | — | documented | documented | MVP | `prds/communication/messages.md` | Audited inbox; bulk archive; read-state per user. Aliases (Agenda Edu: 1, ClassApp: 7) |
| `communication.manage_message_templates` — Manage message and WhatsApp templates | — | — | documented | — | MVP | `prds/communication/notifications.md` | `DIV-communication-003` Reusable templates; WhatsApp adapter uses approved templates. Aliases (Agenda Edu: 1) |
| `communication.manage_network_broadcast` — Multi-school network broadcast | — | — | — | — | P2 | `prds/communication/channels.md` | Network-level comms with per-school isolation on read. |
| `communication.manage_notification_inbox` — Manage notification inbox (clear, dismiss) | — | — | — | documented | MVP | `prds/communication/notifications.md` | User-controlled notification list; not push policy. Aliases (ClassApp: 1) |
| `communication.manage_photo_album` — Manage photo albums and mural | — | — | documented | documented | MVP | `prds/communication/media.md` | `DIV-communication-005` Album-based photos; download with retention policy. Aliases (Agenda Edu: 5, ClassApp: 1) |
| `communication.manage_service_channel` — Manage service channel with SLA | documented | — | documented | documented | MVP | `prds/communication/channels.md` | `DIV-communication-002` Ticket channels with CSAT; family isolation. Aliases (Proesc: 4, Agenda Edu: 8, ClassApp: 6) |
| `communication.manage_social_reactions` — Manage likes and comments on announcements | — | — | documented | — | P2 | `prds/communication/announcements.md` | `DIV-communication-005` Optional reactions; off by default to avoid vanity feed. Aliases (Agenda Edu: 3) |
| `communication.manage_user_profiles` — Manage user profiles and multi-profile switching | — | — | documented | documented | MVP | `prds/identity-and-onboarding/profiles.md` | Multi-profile app UX; staff assigns profiles to groups. Aliases (Agenda Edu: 1, ClassApp: 3) |
| `communication.onboard_communication_users` — Onboard users to communication module | — | — | documented | documented | MVP | `prds/communication/index.md` | Staff verification checklist; guardian invite flow. Aliases (Agenda Edu: 3, ClassApp: 2) |
| `communication.open_support_ticket` — Open support ticket with attachments | documented | — | documented | — | MVP | `prds/communication/channels.md` | `DIV-communication-002` Ticket channel distinct from direct chat; family-scoped. Aliases (Proesc: 1, Agenda Edu: 3) |
| `communication.publish_calendar_event` — Publish calendar event or activity | documented | — | documented | documented | MVP | `prds/communication/announcements.md` | Events as comms objects; academic calendar sync later. Aliases (Proesc: 3, Agenda Edu: 6, ClassApp: 2) |
| `communication.quality_signal_support` — Communication help troubleshooting (quality signal) | noise | — | noise | noise | N/A | — | Canonical quality signal — not an MVP parity target. Support articles, release notes, FAQs — friction signal, not parity target. Aliases (Proesc: 29, Agenda Edu: 25, ClassApp: 13) |
| `communication.schedule_message_delivery` — Schedule message delivery | — | — | — | documented | MVP | `prds/communication/messages.md` | Deferred send with timezone-aware delivery window. Aliases (ClassApp: 1) |
| `communication.send_direct_message` — Send direct message | documented | — | documented | documented | MVP | `prds/communication/messages.md` | `DIV-communication-001` Official audited channels; MVP priority. Aliases (Proesc: 2, Agenda Edu: 16, ClassApp: 31) |
| `communication.send_email_notification` — Send email notification | — | — | — | — | MVP | `prds/communication/notifications.md` | `DIV-communication-007` Email adapter alongside push; opt-in policy. |
| `communication.send_group_message` — Send group or class message | — | — | — | documented | MVP | `prds/communication/messages.md` | `DIV-communication-001` Group threads with school-scoped recipients; family isolation enforced. Aliases (ClassApp: 7) |
| `communication.send_individual_announcement` — Send individual targeted announcement | — | — | documented | — | MVP | `prds/communication/announcements.md` | Per-family or per-student comunicados; not mass blast. Aliases (Agenda Edu: 1) |
| `communication.send_mass_announcement` — Send mass announcement | — | — | documented | documented | P2 | `prds/communication/announcements.md` | Post-MVP mass comms. Aliases (Agenda Edu: 7, ClassApp: 9) |
| `communication.send_poll_survey` — Send poll or survey in announcement | documented | — | documented | documented | P2 | `prds/communication/announcements.md` | Polls as structured announcement type. Aliases (Proesc: 1, Agenda Edu: 3, ClassApp: 2) |
| `communication.send_whatsapp_notification` — Send WhatsApp notification via adapter | documented | — | documented | — | MVP | `prds/communication/notifications.md` | `DIV-communication-003` WhatsApp as adapter; rules in API. Aliases (Proesc: 1, Agenda Edu: 1) |
| `communication.share_photo_update` — Share photo update to families | — | — | documented | documented | MVP | `prds/communication/media.md` | `DIV-communication-005` Photos with retention policy; no vanity feed. Aliases (Agenda Edu: 1, ClassApp: 1) |
| `communication.share_video_content` — Share video in messages or activities | — | — | documented | documented | MVP | `prds/communication/media.md` | Video attachments with bandwidth and retention limits. Aliases (Agenda Edu: 1, ClassApp: 2) |
| `communication.switch_active_child` — Switch active child context (multi-child guardian) | — | — | documented | — | MVP | `prds/identity-and-onboarding/profiles.md` | Guardian switches child without cross-family leak. Aliases (Agenda Edu: 2) |
| `communication.track_delivery_status` — Track message and activity delivery status | documented | — | documented | — | MVP | `prds/communication/index.md` | Delivery receipts for activities and announcements. Aliases (Proesc: 2, Agenda Edu: 1) |
| `communication.track_event_engagement` — Track calendar event engagement | — | — | documented | — | P2 | `prds/communication/announcements.md` | Engagement metrics on events; no vanity feed ranking. Aliases (Agenda Edu: 1) |
| `communication.track_service_inbox` — Track conversations and tickets in real time | — | — | documented | — | MVP | `prds/communication/channels.md` | `DIV-communication-002` Staff inbox for channels and tickets; SLA indicators. Aliases (Agenda Edu: 1) |
| `communication.update_guardian_profile` — Guardian progressive profile update | documented | — | documented | documented | MVP | `prds/identity-and-onboarding/profiles.md` | `DIV-communication-004` Progressive profiling; LGPD basis shown. Aliases (Proesc: 1, Agenda Edu: 2, ClassApp: 3) |
| `communication.view_communication_engagement` — View communication engagement reports | — | — | documented | documented | P2 | `prds/communication/index.md` | Delivery and read metrics; not public leaderboards. Aliases (Agenda Edu: 4, ClassApp: 2) |

## Academic

| Canonical capability | Proesc | Sponte | Agenda Edu | ClassApp | School Lab phase | PRD | Notes |
|---|:---:|:---:|:---:|:---:|---|---|---|
| `academic.assign_teacher_to_subject` — Assign teachers to subjects and diaries | documented | — | — | — | MVP | `prds/academic/diary.md` | Bulk and individual teacher–discipline links. Aliases (Proesc: 5) |
| `academic.configure_evaluation_template` — Configure evaluation templates | documented | — | documented | — | MVP | `prds/academic/grades.md` | `DIV-academic-001` Self-service templates; ERP mode when integrated. Aliases (Proesc: 11, Agenda Edu: 4) |
| `academic.configure_multi_school` — Configure multi-school tenancy views | documented | — | — | — | MVP | `prds/platform-and-admin/backoffice.md` | `DIV-academic-008` Multi-school tenancy; per-school isolation. Aliases (Proesc: 1) |
| `academic.configure_report_card` — Configure report card display rules | documented | — | — | — | MVP | `prds/academic/report-cards.md` | Hide disciplines or final grades per policy. Aliases (Proesc: 5) |
| `academic.deliver_diary_to_families` — Deliver daily diary to guardians | — | — | documented | — | P2 | `prds/academic/diary.md` | `DIV-academic-004` Push diary entries to families; infantil priority. Aliases (Agenda Edu: 1) |
| `academic.enter_grades` — Enter grades in diary and activities | documented | — | — | — | MVP | `prds/academic/grades.md` | Teacher diary grade entry; secretary override with audit. Aliases (Proesc: 8) |
| `academic.export_attendance` — Export and print attendance records | documented | — | — | — | MVP | `prds/academic/attendance.md` | Blank frequency sheets and period exports. Aliases (Proesc: 1) |
| `academic.issue_transcript` — Issue school transcript (histórico escolar) | documented | — | — | — | P2 | `prds/documents-and-archive/archive.md` | Official transcript generation with audit. Aliases (Proesc: 6) |
| `academic.justify_absence` — Justify student absences | documented | — | — | — | MVP | `prds/academic/attendance.md` | `DIV-academic-002` Documented justification with audit trail. Aliases (Proesc: 1) |
| `academic.log_daily_routine` — Log early childhood daily routine | documented | — | documented | — | MVP (slice) | `prds/academic/routine.md` | `DIV-academic-004` Snack/diaper/notes slice built (BC11); sleep/health/mood/photos still P2. Aliases (Proesc: 3, Agenda Edu: 8) |
| `academic.log_lesson_content` — Log lesson content in diary | documented | — | — | — | MVP | `prds/academic/diary.md` | Per-lesson content with copy-from-prior term. Aliases (Proesc: 3) |
| `academic.manage_academic_operations` — General academic module operations | documented | — | — | documented | MVP | `prds/academic/diary.md` | Catch-all for miscatalogued academic tasks pending finer split. Aliases (Proesc: 3, ClassApp: 1) |
| `academic.manage_attendance_policy` — Manage attendance counting policy | documented | — | — | — | MVP | `prds/academic/attendance.md` | `DIV-academic-002` School-level policy with per-period override. Aliases (Proesc: 1) |
| `academic.manage_class_diary` — Manage class diary lessons and activities | documented | — | — | — | MVP | `prds/academic/diary.md` | `DIV-academic-005` Individual and batch lessons tied to evaluation. Aliases (Proesc: 5) |
| `academic.manage_curriculum_matrix` — Manage curriculum matrix and disciplines | documented | — | — | — | MVP | `prds/academic/curriculum.md` | `DIV-academic-001` Disciplines, subdisciplines, skills matrix self-service. Aliases (Proesc: 11) |
| `academic.manage_grade_scale` — Configure grading criteria and formulas | documented | — | — | documented | MVP | `prds/academic/grades.md` | `DIV-academic-001` Self-service grade scales; ERP mode when integrated. Aliases (Proesc: 3, ClassApp: 1) |
| `academic.manage_lesson_lifecycle` — Manage lesson lifecycle (cancel/makeup) | documented | — | — | — | P2 | `prds/academic/diary.md` | `DIV-academic-005` Cancel and makeup rules explicit. Aliases (Proesc: 1) |
| `academic.manage_live_lesson` — Manage live online lessons | documented | — | — | — | P2 | `prds/academic/diary.md` | `DIV-academic-005` Meet/adapter links; recordings attached to lesson. Aliases (Proesc: 4) |
| `academic.manage_period_closure` — Close academic period and year | documented | — | — | — | MVP | `prds/academic/periods.md` | Checklist-driven period close; blocks incomplete diaries. Aliases (Proesc: 3) |
| `academic.manage_recovery_grades` — Manage recovery and reassessment grades | documented | — | — | — | MVP | `prds/academic/grades.md` | Parallel recovery and dependency flows explicit. Aliases (Proesc: 3) |
| `academic.manage_special_education` — Manage special education (AEE) records | documented | — | — | — | P2 | `prds/academic/special-education.md` | AEE module deferred; document competitor pattern. Aliases (Proesc: 5) |
| `academic.manage_teacher_diary` — Manage teacher diary workflow | documented | — | — | — | MVP | `prds/academic/diary.md` | Submit, return, and monitor diary delivery. Aliases (Proesc: 9) |
| `academic.manage_transcript_record` — Maintain transcript discipline records | — | — | — | — | P2 | `prds/documents-and-archive/archive.md` | Edit workload and frequency on historical records. |
| `academic.process_reenrollment` — Process online re-enrollment | documented | — | — | — | P2 | `prds/students-and-enrollments/enrollments.md` | `DIV-academic-003` Online re-enrollment first-class. Aliases (Proesc: 1) |
| `academic.publish_report_card` — Publish report cards (boletim) | — | — | — | — | MVP | `prds/academic/report-cards.md` | Scheduled boletim release with guardian notification. |
| `academic.quality_signal_support` — Academic help troubleshooting (quality signal) | noise | — | noise | noise | N/A | — | Canonical quality signal — not an MVP parity target. Support articles, CST tickets, ERP miscatalog — friction signal, not parity target. Aliases (Proesc: 9, Agenda Edu: 1, ClassApp: 2) |
| `academic.record_attendance` — Record attendance | documented | — | — | documented | MVP | `prds/academic/attendance.md` | `DIV-academic-002` Reliable attendance; legal impact if wrong. Aliases (Proesc: 6, ClassApp: 3) |
| `academic.record_incidents` — Record disciplinary and pastoral incidents | documented | — | — | — | MVP | `prds/academic/incidents.md` | Typed occurrences with family visibility policy. Aliases (Proesc: 2) |
| `academic.schedule_lesson` — Schedule lessons | documented | — | — | — | P2 | `prds/academic/diary.md` | `DIV-academic-005` Model lesson lifecycle explicitly. Aliases (Proesc: 4) |
| `academic.search_help_center` — Search product help center | — | — | — | — | MVP | — | `DIV-academic-009` Ship searchable help for own product. |
| `academic.sync_academic_with_erp` — Sync academic data with external ERP | documented | — | documented | — | P2 | `prds/integrations/erp.md` | `DIV-academic-006` API-first SIS; adjunct ERP sync when hybrid. Aliases (Proesc: 1, Agenda Edu: 1) |
| `academic.view_academic_dashboard` — View academic coordination dashboard | documented | — | documented | — | MVP | `prds/academic/coordination.md` | Diary status, grades, and activity monitoring. Aliases (Proesc: 16, Agenda Edu: 1) |
| `academic.view_corporate_guardian_students` — Corporate partner view linked students | — | — | — | — | P2 | `prds/students-and-enrollments/enrollments.md` | `DIV-academic-007` corporate_partner scoped access + audit. |
| `academic.view_report_card` — View report card and grades | documented | — | — | — | MVP | `prds/academic/report-cards.md` | Family-scoped grade view; student portal when enabled. Aliases (Proesc: 6) |

## Students & enrollments

| Canonical capability | Proesc | Sponte | Agenda Edu | ClassApp | School Lab phase | PRD | Notes |
|---|:---:|:---:|:---:|:---:|---|---|---|
| `students.assign_class` — Assign student to class | — | — | — | — | MVP | `prds/students-and-enrollments/records.md` | Enrollment-to-class assignment; respects capacity. |
| `students.cancel_enrollment` — Cancel enrollment or pre-enrollment | documented | — | — | — | P2 | `prds/students-and-enrollments/enrollments.md` | Guardian self-cancel before institution processing. Aliases (Proesc: 1) |
| `students.capture_prospect` — Capture enrollment prospect | documented | — | — | — | P2 | `prds/students-and-enrollments/records.md` | CRM lead/opportunity before formal enrollment. Aliases (Proesc: 7) |
| `students.enroll_student` — Enroll student | documented | — | documented | documented | MVP | `prds/students-and-enrollments/enrollments.md` | Core enrollment; links student, class, and guardians. Aliases (Proesc: 23, Agenda Edu: 6, ClassApp: 4) |
| `students.export_enrollment_reports` — Export enrollment reports | documented | — | — | — | MVP | `prds/students-and-enrollments/enrollments.md` | Carteirinha, CRM opportunity reports, enrollment lists. Aliases (Proesc: 5) |
| `students.import_students_bulk` — Import students in bulk | — | — | — | documented | MVP | `prds/students-and-enrollments/enrollments.md` | Spreadsheet import with validation; no duplicate CPF per school. Aliases (ClassApp: 1) |
| `students.invite_student_access` — Invite student to self-register | — | — | documented | — | P2 | `prds/students-and-enrollments/enrollments.md` | Student login deferred to phase 2; invite + staff review queue. Aliases (Agenda Edu: 1) |
| `students.manage_class_structure` — Manage class structure | documented | — | — | — | MVP | `prds/students-and-enrollments/records.md` | Classes, shifts, capacity, multigrade parent/child turmas. Aliases (Proesc: 7) |
| `students.manage_enrollment_campaign` — Manage enrollment campaign | — | — | — | documented | P2 | `prds/students-and-enrollments/records.md` | Matrícula campaigns and CRM funnel; not comms mass send. Aliases (ClassApp: 1) |
| `students.manage_enrollment_contract` — Manage enrollment contract | — | — | — | — | MVP | `prds/students-and-enrollments/enrollments.md` | `DIV-financial-007` Contract templates and enrollment binding; signature in phase 2. |
| `students.manage_enrollment_operations` — General enrollment module operations | documented | — | — | — | MVP | `prds/students-and-enrollments/enrollments.md` | Catch-all for miscatalogued enrollment tasks pending finer split. Aliases (Proesc: 5) |
| `students.manage_enrollment_slots` — Manage enrollment slots | documented | — | — | — | P2 | `prds/students-and-enrollments/enrollments.md` | `DIV-academic-003` Vacancy availability for online enrollment trilha. Aliases (Proesc: 1) |
| `students.manage_guardian_link` — Manage guardian–student link | documented | — | — | — | MVP | `prds/students-and-enrollments/records.md` | Family isolation boundary; multiple guardians per student. Aliases (Proesc: 2) |
| `students.quality_signal_support` — Students help troubleshooting (quality signal) | noise | — | — | noise | N/A | — | Canonical quality signal — not an MVP parity target. ERP module FAQs, CST tickets, transport/food miscatalog — friction signal. Aliases (Proesc: 8, ClassApp: 2) |
| `students.run_online_enrollment_trail` — Run online enrollment trail | documented | — | — | — | P2 | `prds/students-and-enrollments/enrollments.md` | `DIV-academic-003` Trilha: data → contract → plan → pay; includes re-enrollment. Aliases (Proesc: 1) |
| `students.sign_enrollment_contract` — Sign enrollment contract electronically | — | — | — | — | P2 | `prds/students-and-enrollments/enrollments.md` | `DIV-financial-007` E-signature step on trilha; shares documents infra. |
| `students.transfer_enrollment` — Transfer enrollment between classes | documented | — | documented | — | P2 | `prds/students-and-enrollments/enrollments.md` | Class transfer and manual progression between turmas. Aliases (Proesc: 2, Agenda Edu: 2) |
| `students.unify_person_records` — Unify duplicate person records | documented | — | — | — | P2 | `prds/students-and-enrollments/records.md` | Merge homonyms with audit trail; irreversible ops guarded. Aliases (Proesc: 2) |
| `students.update_student_record` — Update student record | documented | — | — | — | MVP | `prds/students-and-enrollments/records.md` | Cadastral data, RA, and identifiers; LGPD minimization. Aliases (Proesc: 5) |
| `students.view_student_portal` — Access student portal features | documented | — | documented | — | P2 | `prds/students-and-enrollments/records.md` | Student login surface; MVP uses guardian/staff proxy. Aliases (Proesc: 2, Agenda Edu: 1) |

## Identity & onboarding

| Canonical capability | Proesc | Sponte | Agenda Edu | ClassApp | School Lab phase | PRD | Notes |
|---|:---:|:---:|:---:|:---:|---|---|---|
| `identity.authenticate_user` — Authenticate user | — | — | — | — | MVP | `prds/identity-and-onboarding/auth.md` | JWT login; OTP/code login where competitors use it; MFA phase 2. |
| `identity.complete_registration` — Complete registration from invite | — | — | — | documented | MVP | `prds/identity-and-onboarding/invites.md` | Guardian/staff self-register via invite link or SMS code. Aliases (ClassApp: 1) |
| `identity.configure_multi_factor` — Configure multi-factor authentication | — | — | documented | — | P2 | `prds/identity-and-onboarding/auth.md` | 2FA and biometric login phase 2; document competitor patterns. Aliases (Agenda Edu: 2) |
| `identity.configure_school_profile` — Configure school profile | — | — | — | — | MVP | `prds/identity-and-onboarding/onboarding.md` | School name, branding, and tenant profile during onboarding. |
| `identity.invite_user` — Invite user to school | documented | — | documented | documented | MVP | `prds/identity-and-onboarding/invites.md` | Staff/guardian invites with role_template_id; digest-stored tokens. Aliases (Proesc: 1, Agenda Edu: 1, ClassApp: 1) |
| `identity.manage_consent` — Manage guardian consent (LGPD) | — | — | — | documented | MVP | `prds/identity-and-onboarding/consent.md` | LGPD consent record for staff/guardian onboarding; basis shown in UI. Aliases (ClassApp: 1) |
| `identity.manage_identity_operations` — General identity module operations | — | — | — | — | MVP | `prds/identity-and-onboarding/auth.md` | Catch-all for miscatalogued identity tasks pending finer split. |
| `identity.manage_roles` — Manage roles and permissions | documented | — | claimed | documented | MVP | `prds/identity-and-onboarding/permissions.md` | System + custom role templates; permission keys + overrides. Aliases (Proesc: 1, Agenda Edu: 1, ClassApp: 2) |
| `identity.manage_user_accounts` — Manage user accounts (activate, deactivate, delete) | documented | — | — | — | MVP | `prds/identity-and-onboarding/permissions.md` | Account tab pattern; deactivate preferred over hard delete. Aliases (Proesc: 2) |
| `identity.manage_user_profile` — Manage user profile and contact data | documented | — | — | — | MVP | `prds/identity-and-onboarding/profiles.md` | `DIV-communication-004` Email and cadastral updates with audit; progressive profiling hooks. Aliases (Proesc: 1) |
| `identity.onboard_team` — Onboard staff and guardians to school | documented | — | — | — | MVP | `prds/identity-and-onboarding/onboarding.md` | `DIV-integration-001` Owner wizard + team invites; first-login checklists per onboarding mode. Aliases (Proesc: 1) |
| `identity.provision_school` — Provision school tenant (white-glove and lifecycle) | — | — | — | — | MVP | `prds/identity-and-onboarding/onboarding.md` | `DIV-integration-001` provisioning → pending_handoff → active; self-serve + optional white-glove. |
| `identity.quality_signal_support` — Identity help troubleshooting (quality signal) | noise | — | noise | noise | N/A | — | Canonical quality signal — not an MVP parity target. Support articles, cache clears, ERP miscatalog — friction signal, not parity target. Aliases (Proesc: 14, Agenda Edu: 1, ClassApp: 3) |
| `identity.reset_password` — Reset or change password | documented | — | documented | documented | MVP | `prds/identity-and-onboarding/auth.md` | Forgot-password link + in-app change; passwords never returned by API. Aliases (Proesc: 5, Agenda Edu: 9, ClassApp: 4) |
| `identity.set_password` — Set password from invite token | — | — | — | — | MVP | `prds/identity-and-onboarding/auth.md` | Single-use invite token + set-password; replaces random temp passwords. |

## Documents & archive

| Canonical capability | Proesc | Sponte | Agenda Edu | ClassApp | School Lab phase | PRD | Notes |
|---|:---:|:---:|:---:|:---:|---|---|---|
| `documents.collect_contract_signatures` — Collect digital signatures on contracts | — | — | — | — | P2 | `prds/documents-and-archive/archive.md` | Paperless contracts; shares signature infra with Livro Ata. |
| `documents.collect_minutes_signatures` — Collect digital signatures on minutes | — | — | — | — | P2 | `prds/documents-and-archive/index.md` | Valid digital signature for Conselho audits. |
| `documents.configure_document_signatories` — Configure secretary and director on official documents | documented | — | — | — | MVP | `prds/documents-and-archive/archive.md` | Letterhead/signatory block on generated certificates and declarations. Aliases (Proesc: 1) |
| `documents.export_audit_package` — Export audit-ready document package | — | — | — | — | MVP | `prds/documents-and-archive/archive.md` | Conselho de Educacao audit readiness per vision. |
| `documents.generate_official_minutes` — Generate official minutes (Livro Ata) | — | — | — | — | P2 | `prds/documents-and-archive/index.md` | Phase 2 high priority per vision. |
| `documents.issue_official_declaration` — Issue official declarations and certificates | — | — | — | — | P2 | `prds/documents-and-archive/archive.md` | Enrollment, quitacao, and other formal declarations beyond transcript. |
| `documents.issue_transcript` — Issue school transcript certificate | — | — | — | — | P2 | `prds/documents-and-archive/archive.md` | Under-represented in competitor catalog. |
| `documents.manage_retention_policy` — Manage document retention policy | — | — | — | — | P2 | `prds/documents-and-archive/retention.md` | LGPD retention for archive and photos. |
| `documents.search_archive` — Search digital archive | documented | — | — | documented | MVP | `prds/documents-and-archive/archive.md` | Basic search MVP; semantic search phase 2. Aliases (Proesc: 4, ClassApp: 1) |
| `documents.search_archive_semantic` — Semantic search across document archive | — | — | — | — | P2 | `prds/documents-and-archive/index.md` | Phase 2 Livro Ata search per vision; basic search remains MVP. |
| `documents.store_student_document` — Store document in digital archive | documented | — | documented | documented | MVP | `prds/documents-and-archive/archive.md` | Audit-ready repository per student/school. Aliases (Proesc: 2, Agenda Edu: 3, ClassApp: 1) |
| `documents.view_student_documents` — View student documents in archive | — | — | — | — | MVP | `prds/documents-and-archive/archive.md` | Per-family isolation; guardian sees own children's documents only. |

## Platform & admin

| Canonical capability | Proesc | Sponte | Agenda Edu | ClassApp | School Lab phase | PRD | Notes |
|---|:---:|:---:|:---:|:---:|---|---|---|
| `platform.configure_help_taxonomy` — Configure help center taxonomy | — | — | — | — | P2 | `prds/platform-and-admin/index.md` | `DIV-integration-003` Module docs for School Lab product; persona quick-starts per actor. |
| `platform.configure_school_year` — Configure school year and calendar periods | documented | — | — | — | MVP | `prds/platform-and-admin/school-year.md` | Ano letivo, feriados, and period boundaries drive academic and billing cycles. Holidays/instructional days (not year/period creation) also open to coordenação via `manage_calendar` [product decision 2026-10-07]. Aliases (Proesc: 1) |
| `platform.export_operational_reports` — Export operational and cross-module reports | — | — | — | — | P2 | `prds/platform-and-admin/index.md` | Favorited reports and year-scoped roll-ups; not domain ledger exports. |
| `platform.manage_backoffice_ops` — Backoffice tenant and module operations | — | — | — | — | MVP | `prds/platform-and-admin/backoffice.md` | Platform SPA ops: tenant lifecycle, module enablement, upsell — not school staff tasks. |
| `platform.manage_multi_unit` — Configure multi-unit school group | — | — | — | — | P2 | `prds/platform-and-admin/backoffice.md` | `DIV-academic-008` Per-school isolation with group roll-ups; distinct from academic tenancy views. |
| `platform.manage_platform_operations` — General platform module operations | — | — | — | — | MVP | `prds/platform-and-admin/staff-users.md` | Catch-all for miscatalogued platform tasks pending finer split. |
| `platform.manage_school_calendar` — Manage school calendar and personal events | documented | — | documented | — | MVP | `prds/platform-and-admin/calendar.md` | Institutional calendar plus staff personal events; comms events sync later. Guardians get read-only institutional-event access; institutional CRUD open to director, secretaria, and coordenação via `manage_calendar` [product decision 2026-10-07]. Aliases (Proesc: 1, Agenda Edu: 1) |
| `platform.manage_staff_users` — Manage staff users and role menus | documented | — | — | — | MVP | `prds/platform-and-admin/staff-users.md` | Staff roster and menu visibility; identity owns auth and permission keys. Aliases (Proesc: 15) |
| `platform.manage_transport_module` — Manage transport module (deferred) | — | — | — | — | P2 | `prds/platform-and-admin/index.md` | Transport routes deferred; catalog miscatalog captured as quality signal until PRD. |
| `platform.meter_digital_signatures` — Meter digital signature consumption | — | — | documented | — | P2 | `prds/documents-and-archive/archive.md` | `DIV-financial-007` Transparent metering for e-sign; shares infra with billing and documents. Aliases (Agenda Edu: 1) |
| `platform.quality_signal_support` — Platform help troubleshooting (quality signal) | noise | — | — | — | N/A | — | Canonical quality signal — not an MVP parity target. CST/GSen license FAQs, ERP vendor articles, transport/RH miscatalog — friction signal. Aliases (Proesc: 2) |
| `platform.self_serve_onboarding` — Self-serve school onboarding and product access | documented | — | documented | — | MVP | `prds/platform-and-admin/onboarding.md` | `DIV-integration-001` Self-serve with optional white-glove tier; app access FAQs map here not identity. Aliases (Proesc: 3, Agenda Edu: 1) |
| `platform.view_analytics_dashboard` — View analytics and operational reports | — | — | — | — | P2 | `prds/platform-and-admin/index.md` | Cross-module dashboards; domain-specific exports stay in billing/academic PRDs. |

## Integrations

| Canonical capability | Proesc | Sponte | Agenda Edu | ClassApp | School Lab phase | PRD | Notes |
|---|:---:|:---:|:---:|:---:|---|---|---|
| `integrations.connect_erp` — Connect external ERP | — | — | — | — | P2 | `prds/integrations/erp.md` | `DIV-integration-002` Own core domains; open API for adjuncts. |
| `integrations.export_financial_data` — Export financial data to ERP | — | — | — | — | P2 | `prds/integrations/erp.md` |  |
| `integrations.import_academic_data` — Import academic data from ERP | — | — | — | — | P2 | `prds/integrations/erp.md` |  |
| `integrations.manage_webhooks` — Manage outbound webhooks | claimed | — | — | — | P2 | `prds/integrations/webhooks.md` | Aliases (Proesc: 1) |
| `integrations.sync_communication_overlay` — Sync comms overlay with ERP SIS | documented | — | documented | documented | P2 | `prds/integrations/comms-sync.md` | `DIV-academic-006` API-first SIS; comms native. Aliases (Proesc: 2, Agenda Edu: 5, ClassApp: 1) |
