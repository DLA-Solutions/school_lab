# Capability taxonomy (canonical)

_Generated view — edit [`capability-taxonomy.yaml`](capability-taxonomy.yaml), not this file._

Regenerate:

```bash
python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py \
  --generate-taxonomy-md \
  --taxonomy docs/product/capability-taxonomy.yaml \
  --out docs/product/capability-taxonomy.md
```

**191** canonical capabilities across **8** domains.

## Billing

### `billing.accept_card_payment`

- **Label:** Accept card payment
- **Actors:** guardian
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-financial-002
- **PRD target:** `prds/billing/payments.md`
- **Decision:** Checkout for guardians; gateway abstracted.
- **Alias count:** 0

### `billing.accept_pix_payment`

- **Label:** Accept Pix payment
- **Actors:** staff, guardian
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-financial-002
- **PRD target:** `prds/billing/payments.md`
- **Decision:** Pix QR and copy-paste via payment gateway.
- **Alias count:** 8
- **Sample aliases:** `raw:agenda-edu:billing.manage_funciona_o_bolepix_da_agenda_e`, `raw:agenda-edu:billing.manage_gerar_o_pix_para_responsaveis_`, `raw:agenda-edu:billing.manage_realizar_pagamentos_via_pix`

### `billing.adjust_charge`

- **Label:** Adjust charge amount or apply scholarship
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/billing/charges.md`
- **Decision:** Bolsa, isenção, adjustments with audit.
- **Alias count:** 5
- **Sample aliases:** `raw:agenda-edu:billing.create_ajustar_as_permissoes_dos_cada`, `raw:classapp:billing.configure_configurando_ajustes_do_modulo`, `raw:totvs:billing.manage_cst_contrvend_como_solicitar_a`

### `billing.build_dunning_workflow`

- **Label:** Build visual dunning workflow
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-financial-006
- **PRD target:** `prds/billing/dunning.md`
- **Decision:** Configurable régua with audit trail.
- **Alias count:** 7
- **Sample aliases:** `raw:agenda-edu:billing.manage_ativar_o_lembrete_de_cobrancas`, `raw:agenda-edu:billing.manage_utilize_o_whatsapp_como_canal_`, `raw:agenda-edu:billing.manage_whatsapp_como_canal_de_notific`

### `billing.cancel_charge`

- **Label:** Cancel or reverse charge
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/billing/charges.md`
- **Decision:** Estorno and cancellation with reason code.
- **Alias count:** 7
- **Sample aliases:** `raw:agenda-edu:billing.delete_cancelar_matricula_no_menu_pag`, `raw:classapp:billing.manage_estorno_de_pagamentos_no_class`, `raw:proesc:billing.delete_cancelar_notas_fiscais`

### `billing.configure_billing_notifications`

- **Label:** Configure billing notification channels
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/billing/dunning.md`
- **Decision:** Explicit per-channel policy for finance pushes.
- **Alias count:** 7
- **Sample aliases:** `raw:agenda-edu:billing.manage_ativar_a_central_de_notificaco`, `raw:agenda-edu:billing.manage_gerenciar_notificacoes`, `raw:agenda-edu:billing.manage_nao_estou_recebendo_notificaco`

### `billing.configure_early_payment_discount`

- **Label:** Configure tiered early-payment discounts
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-financial-004
- **PRD target:** `prds/billing/settings.md`
- **Decision:** Discount by payment day before due date.
- **Alias count:** 12
- **Sample aliases:** `raw:agenda-edu:billing.manage_aplicar_descontos_por_pontuali`, `raw:agenda-edu:billing.manage_desconto_por_pontualidade`, `raw:classapp:billing.configure_configurar_o_desconto_de_antec`

### `billing.configure_nf_settings`

- **Label:** Configure service invoice (NF) settings
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** P2
- **Divergence:** DIV-financial-005
- **PRD target:** `prds/billing/invoices.md`
- **Decision:** Per-city NFS-e parameters when required.
- **Alias count:** 0

### `billing.configure_payment_gateway`

- **Label:** Configure payment gateway settings
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-financial-002
- **PRD target:** `prds/billing/payments.md`
- **Decision:** Fees, settlement accounts, enabled methods.
- **Alias count:** 0

### `billing.export_financial_report`

- **Label:** Export financial reports
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/billing/charges.md`
- **Decision:** Receivables, cash flow, delinquency exports.
- **Alias count:** 13
- **Sample aliases:** `raw:agenda-edu:billing.export_exportar_relatorios_em_pagamen`, `raw:agenda-edu:billing.export_exportar_um_arquivo_de_retorno`, `raw:classapp:billing.manage_exportando_informacoes_da_camp`

### `billing.import_erp_charges`

- **Label:** Import charges from external ERP
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/billing/settings.md`
- **Decision:** Open API for adjunct ERPs.
- **Alias count:** 14
- **Sample aliases:** `raw:agenda-edu:billing.import_integrar_o_sistema_de_gestao_s`, `raw:agenda-edu:billing.manage_etapa_1_como_realizar_a_progre`, `raw:agenda-edu:billing.manage_etapa_5_divulgar_a_agenda_edu_`

### `billing.integrate_boleto_bank`

- **Label:** Configure boleto bank remittance integration
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-financial-002
- **PRD target:** `prds/billing/boletos.md`
- **Decision:** Abstract bank integration; guided onboarding.
- **Alias count:** 9
- **Sample aliases:** `raw:agenda-edu:billing.manage_fazer_a_importacao_de_um_arqui`, `raw:agenda-edu:billing.send_enviar_cobrancas_a_partir_de_u`, `raw:agenda-edu:billing.view_acompanhar_as_cobrancas_feitas`

### `billing.issue_boleto`

- **Label:** Generate boleto for charge
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/billing/boletos.md`
- **Decision:** Automated boleto generation and tracking in app.
- **Alias count:** 21
- **Sample aliases:** `raw:agenda-edu:billing.manage_acessar_meus_boletos_da_agenda`, `raw:agenda-edu:billing.manage_acessar_o_portal_de_boletos_da`, `raw:agenda-edu:billing.manage_acessar_os_boletos_na_agenda_e`

### `billing.issue_charge`

- **Label:** Issue charge to guardian
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-financial-001
- **PRD target:** `prds/billing/charges.md`
- **Decision:** Core enrollment receivables (débito + parcelas); extensions per segment PRD.
- **Alias count:** 53
- **Sample aliases:** `raw:agenda-edu:billing.create_criar_uma_cobranca_unica`, `raw:agenda-edu:billing.create_etapa_2_criar_planos_de_cobran`, `raw:agenda-edu:billing.create_etapa_3_criar_planos_de_cobran`

### `billing.issue_service_invoice`

- **Label:** Issue NFS-e for tuition services
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-financial-005
- **PRD target:** `prds/billing/invoices.md`
- **Decision:** Service NF in billing PRD; product NF later.
- **Alias count:** 9
- **Sample aliases:** `raw:proesc:billing.manage_checklist_nota_fiscal`, `raw:proesc:billing.manage_conheca_o_modulo_de_nota_fisca`, `raw:proesc:billing.manage_emitir_nfs_de_produto`

### `billing.manage_cash_register`

- **Label:** Treasury and cash register operations
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/billing/payments.md`
- **Decision:** Meu caixa pattern: receipts, expenses, cost centers.
- **Alias count:** 14
- **Sample aliases:** `raw:classapp:billing.manage_organizar_sua_caixa_de_mensage`, `raw:proesc:billing.create_cadastrar_categorias_de_despes`, `raw:proesc:billing.create_criar_despesas_fixas_e_variave`

### `billing.manage_charge_types`

- **Label:** Configure charge types and categories
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/billing/charges.md`
- **Decision:** Typed debits with chart-of-accounts mapping.
- **Alias count:** 0

### `billing.manage_corporate_payer`

- **Label:** Manage corporate (PJ) financial payer
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/billing/charges.md`
- **Decision:** Scoped access + audit for empresa conveniada.
- **Alias count:** 4
- **Sample aliases:** `raw:agenda-edu:billing.manage_definir_o_responsavel_financei`, `raw:proesc:billing.create_cadastrar_pessoa_juridica_como`, `raw:proesc:billing.create_vincular_responsavel_financeir`

### `billing.manage_financial_operations`

- **Label:** General financial module operations
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/billing/charges.md`
- **Decision:** Catch-all for ERP finance tasks pending finer split.
- **Alias count:** 177
- **Sample aliases:** `raw:agenda-edu:billing.manage_aplicativo_da_agenda_edu_respo`, `raw:agenda-edu:billing.manage_ativar_o_horario_de_atendiment`, `raw:agenda-edu:billing.manage_baixe_os_guias_de_boas_pratica`

### `billing.manage_guaranteed_revenue`

- **Label:** Guaranteed revenue (vendor-assumed risk)
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** N/A
- **Divergence:** DIV-financial-008
- **Decision:** Out of core; document fintech partner pattern only.
- **Alias count:** 0

### `billing.manage_multi_unit_billing`

- **Label:** Multi-unit billing reports
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/billing/charges.md`
- **Decision:** Per-school isolation with group roll-ups.
- **Alias count:** 0

### `billing.manage_payment_links`

- **Label:** Manage payment links
- **Actors:** staff, guardian
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/billing/payments.md`
- **Decision:** Shareable links for overdue or ad-hoc pay.
- **Alias count:** 3
- **Sample aliases:** `raw:agenda-edu:billing.manage_funciona_o_link_de_pagamento_e`, `raw:agenda-edu:billing.manage_gerar_um_link_de_pagamento`, `raw:agenda-edu:billing.manage_tudo_que_voce_precisa_saber_so`

### `billing.manage_payment_plan`

- **Label:** Configure payment plans and installment schedules
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/billing/charges.md`
- **Decision:** Plans drive parcel generation; tie to enrollment contracts.
- **Alias count:** 60
- **Sample aliases:** `raw:agenda-edu:billing.configure_acessar_a_aba_de_configuracoes`, `raw:agenda-edu:billing.configure_configurando_os_perfis_e_permi`, `raw:agenda-edu:billing.configure_configurar_a_exibicao_da_carte`

### `billing.manage_protest`

- **Label:** Manage boleto protest workflow
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** P2
- **Divergence:** DIV-financial-003
- **PRD target:** `prds/billing/dunning.md`
- **Decision:** No protest default; softer dunning first.
- **Alias count:** 1
- **Sample aliases:** `raw:proesc:billing.create_adicionar_etiqueta_de_protesto`

### `billing.manage_recurring_card`

- **Label:** Manage recurring card billing
- **Actors:** staff, guardian
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/billing/payments.md`
- **Decision:** Opt-in recurring card with clear consent.
- **Alias count:** 25
- **Sample aliases:** `raw:agenda-edu:billing.configure_configurar_juros_e_multa_nas_c`, `raw:agenda-edu:billing.create_cadastrando_seu_cartao_de_cred`, `raw:agenda-edu:billing.create_cadastrar_a_recorrencia_no_car`

### `billing.meter_digital_signatures`

- **Label:** Meter digital signatures on contracts
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** P2
- **Divergence:** DIV-financial-007
- **PRD target:** `prds/billing/invoices.md`
- **Decision:** Transparent metering or plan inclusion.
- **Alias count:** 9
- **Sample aliases:** `raw:agenda-edu:billing.create_criar_uma_nova_assinatura_em_l`, `raw:agenda-edu:billing.manage_o_que_significa_quando_a_cobra`, `raw:agenda-edu:billing.sign_assinar_contratos_de_matricula`

### `billing.negotiate_receivable`

- **Label:** Mark receivable under negotiation
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/billing/charges.md`
- **Decision:** Manual negotiation status with audit.
- **Alias count:** 2
- **Sample aliases:** `raw:agenda-edu:billing.create_criar_uma_negociacao_no_menu_p`, `raw:proesc:billing.manage_desfazer_uma_negociacao`

### `billing.onboard_payment_gateway`

- **Label:** Onboard payment gateway (KYC)
- **Actors:** staff, backoffice
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-financial-002
- **PRD target:** `prds/billing/payments.md`
- **Decision:** Guided gateway onboarding; abstract provider.
- **Alias count:** 1
- **Sample aliases:** `raw:proesc:billing.create_cadastro_ou_troca_de_conta_ban`

### `billing.pay_enrollment_online`

- **Label:** Pay during online enrollment
- **Actors:** guardian
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/students-and-enrollments/enrollments.md`
- **Decision:** Payment as enrollment trilha final step.
- **Alias count:** 0

### `billing.pay_online`

- **Label:** Guardian pay charges online
- **Actors:** guardian
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-financial-002
- **PRD target:** `prds/billing/payments.md`
- **Decision:** Checkout for boleto, Pix, card.
- **Alias count:** 1
- **Sample aliases:** `raw:agenda-edu:billing.manage_o_novo_checkout_do_superapp`

### `billing.process_batch_payment`

- **Label:** Process batch payments
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/billing/payments.md`
- **Decision:** Batch settlement and bulk status updates.
- **Alias count:** 2
- **Sample aliases:** `raw:agenda-edu:billing.send_enviar_contrato_em_massa`, `raw:classapp:billing.create_adicionar_contratos_em_massa`

### `billing.quality_signal_support`

- **Label:** Billing help troubleshooting (quality signal)
- **Actors:** staff, guardian
- **Surfaces:** web, mobile
- **Phase:** N/A
- **Quality signal:** yes (support/troubleshooting — not feature parity)
- **Decision:** Support articles and FAQs — friction signal, not parity target.
- **Alias count:** 29
- **Sample aliases:** `raw:agenda-edu:billing.create_cadastrar_um_novo_produto_ou_o`, `raw:agenda-edu:billing.create_visualizar_minhas_ofertas_cada`, `raw:agenda-edu:billing.export_exportar_as_cobrancas_do_shop`

### `billing.reconcile_bank_statement`

- **Label:** Reconcile bank statement
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/billing/payments.md`
- **Decision:** Match settlements to open receivables.
- **Alias count:** 1
- **Sample aliases:** `raw:proesc:billing.manage_manual_de_conciliacao_bancaria`

### `billing.record_manual_payment`

- **Label:** Record manual payment receipt
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/billing/payments.md`
- **Decision:** Cash, negotiation, or external transfer with audit.
- **Alias count:** 1
- **Sample aliases:** `raw:classapp:billing.manage_dar_baixa_manual_na_fatura`

### `billing.resend_boleto`

- **Label:** Resend boleto to guardian
- **Actors:** staff, guardian
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/billing/boletos.md`
- **Decision:** Staff-triggered resend; WhatsApp as adapter.
- **Alias count:** 4
- **Sample aliases:** `raw:agenda-edu:billing.manage_conseguir_segunda_via_de_uma_f`, `raw:classapp:billing.send_reenviar_uma_cobranca`, `raw:totvs:billing.manage_portal_do_cliente_como_emitir_`

### `billing.select_plan_on_enrollment`

- **Label:** Select payment plan during enrollment
- **Actors:** guardian, staff
- **Staff templates:** secretary
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/students-and-enrollments/enrollments.md`
- **Decision:** Trilha step: data → contract → plan → pay.
- **Alias count:** 8
- **Sample aliases:** `raw:classapp:billing.create_adicionar_um_plano_contrato_a_`, `raw:proesc:billing.configure_configurar_a_fase_de_inscricao`, `raw:proesc:billing.configure_configurar_e_utilizar_o_portal`

### `billing.send_boleto_remittance`

- **Label:** Send boleto remittance file to bank
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/billing/boletos.md`
- **Decision:** CNAB/remessa batch export.
- **Alias count:** 0

### `billing.send_payment_reminder`

- **Label:** Send payment reminders
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-financial-006
- **PRD target:** `prds/billing/dunning.md`
- **Decision:** Email/push/WhatsApp adapters; rules in API.
- **Alias count:** 0

### `billing.sign_enrollment_contract`

- **Label:** Collect digital signature on enrollment contract
- **Actors:** guardian
- **Surfaces:** web, mobile
- **Phase:** P2
- **Divergence:** DIV-financial-007
- **PRD target:** `prds/students-and-enrollments/enrollments.md`
- **Decision:** Shares signature infra with documents phase 2.
- **Alias count:** 0

### `billing.sync_erp_financial`

- **Label:** Sync financial data with ERP
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/billing/settings.md`
- **Decision:** Bi-directional sync for hybrid stack.
- **Alias count:** 0

### `billing.track_boleto_status`

- **Label:** Track boleto registration and settlement
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/billing/boletos.md`
- **Decision:** Never lose billing state; webhook + manual reconciliation.
- **Alias count:** 0

### `billing.view_classpay_dashboard`

- **Label:** Embedded payment product dashboard
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** P2
- **Divergence:** DIV-financial-002
- **PRD target:** `prds/billing/payments.md`
- **Decision:** ClassPay/ClipPag-like embedded pay reference.
- **Alias count:** 10
- **Sample aliases:** `raw:agenda-edu:billing.manage_o_que_muda_nos_pagamentos_digi`, `raw:classapp:billing.create_primeiros_passos_para_utilizar`, `raw:classapp:billing.manage_existe_alguma_taxa_de_utilizac`

### `billing.view_delinquency_dashboard`

- **Label:** View delinquency dashboard
- **Actors:** staff
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-financial-006
- **PRD target:** `prds/billing/dunning.md`
- **Decision:** Visual overdue portfolio; no surprise automation.
- **Alias count:** 17
- **Sample aliases:** `raw:agenda-edu:billing.manage_duvidas_frequentes_sobre_o_uso`, `raw:agenda-edu:billing.manage_tire_duvidas_sobre_a_bemobi_no`, `raw:classapp:billing.manage_gerenciar_os_inadimplentes`

### `billing.view_guardian_charges`

- **Label:** Guardian view open charges
- **Actors:** guardian
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/billing/guardian-portal.md`
- **Decision:** Parent billing view in app and web.
- **Alias count:** 0

### `billing.view_payment_history`

- **Label:** View payment history
- **Actors:** guardian
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/billing/guardian-portal.md`
- **Decision:** Settled and pending history per family.
- **Alias count:** 0

### `billing.view_student_receivables`

- **Label:** View and search student receivables
- **Actors:** staff, guardian
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/billing/charges.md`
- **Decision:** Parcel search by student or guardian.
- **Alias count:** 10
- **Sample aliases:** `raw:agenda-edu:billing.manage_primeiro_acesso_como_confirmar`, `raw:agenda-edu:billing.view_visualizar_contratos_de_matric`, `raw:agenda-edu:billing.view_visualizar_e_confirmar_a_leitu`

## Communication

### `communication.approve_pending_communication`

- **Label:** Approve pending communications and events
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/communication/announcements.md`
- **Decision:** Moderation queue for teacher-submitted content.
- **Alias count:** 2
- **Sample aliases:** `raw:agenda-edu:communication.manage_aprovar_atividades_comunicados`, `raw:agenda-edu:communication.manage_aprovar_um_evento_em_calendari`

### `communication.assign_recipients_to_channel`

- **Label:** Assign users or classes to message channel
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/communication/channels.md`
- **Decision:** Channel membership by class, staff role, or individual.
- **Alias count:** 0

### `communication.attach_files_to_message`

- **Label:** Attach files to messages
- **Actors:** teacher, staff, guardian
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/communication/media.md`
- **Decision:** Multi-attachment messages with size/type policy.
- **Alias count:** 6
- **Sample aliases:** `raw:classapp:communication.manage_administradores_como_utilizar_`, `raw:classapp:communication.manage_anexar_multiplos_arquivos_em_m`, `raw:classapp:communication.manage_utilizar_acessos_externos_no_c`

### `communication.collect_channel_csat`

- **Label:** Collect CSAT on service channels
- **Actors:** guardian
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-communication-002
- **PRD target:** `prds/communication/channels.md`
- **Decision:** Post-resolution CSAT; aggregate per channel.
- **Alias count:** 1
- **Sample aliases:** `raw:classapp:communication.manage_funciona_a_avaliacao_csat_nos_`

### `communication.collect_guardian_cpf`

- **Label:** Collect guardian CPF (progressive profiling)
- **Actors:** guardian, staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-communication-004
- **PRD target:** `prds/identity-and-onboarding/profiles.md`
- **Decision:** Campaign-style CPF collection with LGPD basis shown.
- **Alias count:** 1
- **Sample aliases:** `raw:classapp:communication.create_adicionar_meu_cpf_no_classapp`

### `communication.configure_communication_module`

- **Label:** Configure communication module settings
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/communication/channels.md`
- **Decision:** Branding, defaults, module enablement per school.
- **Alias count:** 5
- **Sample aliases:** `raw:agenda-edu:communication.create_adicionar_acesso_rapido_na_age`, `raw:agenda-edu:communication.manage_personalizar_o_perfil_da_escol`, `raw:classapp:communication.manage_trocar_o_logo_e_a_capa_do_cole`

### `communication.configure_push_policy`

- **Label:** Configure push notification policy
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-communication-007
- **PRD target:** `prds/communication/notifications.md`
- **Decision:** Explicit per-channel notification policy.
- **Alias count:** 3
- **Sample aliases:** `raw:agenda-edu:communication.manage_ativar_a_central_de_notificaco`, `raw:agenda-edu:communication.manage_utilizar_a_central_de_notifica`, `raw:agenda-edu:communication.view_visualizar_a_central_de_notifi`

### `communication.defer_ai_assistant`

- **Label:** AI virtual assistant (deferred)
- **Actors:** staff, guardian
- **Surfaces:** web, mobile
- **Phase:** N/A
- **Divergence:** DIV-communication-006
- **Decision:** Defer Lia/Duda-style AI; document competitor pattern only.
- **Alias count:** 1
- **Sample aliases:** `raw:proesc:communication.manage_funciona_o_atendimento_com_a_l`

### `communication.distribute_learning_materials`

- **Label:** Distribute learning materials and attachments
- **Actors:** teacher
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/communication/media.md`
- **Decision:** Class materials via comms; not LMS replacement.
- **Alias count:** 1
- **Sample aliases:** `raw:proesc:communication.create_adicionar_materiais_de_apoio_a`

### `communication.edit_message_content`

- **Label:** Edit sent message with audit trail
- **Actors:** teacher, staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/communication/messages.md`
- **Decision:** Edit history visible to recipients; no silent edits.
- **Alias count:** 5
- **Sample aliases:** `raw:agenda-edu:communication.update_editar_mensagens_em_grupos`, `raw:classapp:communication.manage_utilizar_as_opcoes_de_formatac`, `raw:classapp:communication.update_conversas_como_editar_mensagen`

### `communication.embed_video_call`

- **Label:** Embed video call link in event or message
- **Actors:** teacher, staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/communication/announcements.md`
- **Decision:** Meet/Zoom links as adapter; not native video infra.
- **Alias count:** 5
- **Sample aliases:** `raw:agenda-edu:communication.manage_entrar_na_reuniao_meet_em_even`, `raw:agenda-edu:communication.manage_transmitir_os_eventos_da_sua_e`, `raw:classapp:communication.manage_acessar_links_de_videochamadas`

### `communication.escalate_to_human_support`

- **Label:** Escalate to human support
- **Actors:** staff, guardian
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-communication-006
- **PRD target:** `prds/communication/channels.md`
- **Decision:** Defer AI; human escalation first.
- **Alias count:** 2
- **Sample aliases:** `raw:classapp:communication.manage_posso_denunciar_um_conteudo_im`, `raw:proesc:communication.manage_agendar_uma_reuniao_com_um_con`

### `communication.manage_announcement_categories`

- **Label:** Manage announcement categories
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/communication/announcements.md`
- **Decision:** Typed comunicados for filtering and retention.
- **Alias count:** 1
- **Sample aliases:** `raw:agenda-edu:communication.create_criar_categorias_para_os_comun`

### `communication.manage_announcement_templates`

- **Label:** Manage announcement templates and duplication
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/communication/announcements.md`
- **Decision:** Model comunicados; duplicate with audit.
- **Alias count:** 2
- **Sample aliases:** `raw:agenda-edu:communication.create_criar_modelos_de_comunicados`, `raw:agenda-edu:communication.manage_duplicar_um_comunicado`

### `communication.manage_channel_permissions`

- **Label:** Manage channel access permissions
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/communication/channels.md`
- **Decision:** Revoke staff channel access with audit.
- **Alias count:** 0

### `communication.manage_communication_groups`

- **Label:** Manage communication groups (group vs channel vs DM)
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-communication-001
- **PRD target:** `prds/communication/channels.md`
- **Decision:** Explicit group/channel/DM model; family isolation.
- **Alias count:** 4
- **Sample aliases:** `raw:classapp:communication.create_criar_grupos_especificos_para_`, `raw:classapp:communication.create_criar_grupos_no_classapp_para_`, `raw:classapp:communication.manage_qual_e_a_diferenca_entre_grupo`

### `communication.manage_communication_operations`

- **Label:** General communication module operations
- **Actors:** staff, teacher, guardian
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/communication/messages.md`
- **Decision:** Catch-all for miscatalogued or edge comms tasks pending finer split.
- **Alias count:** 94
- **Sample aliases:** `raw:agenda-edu:communication.create_adicionar_uma_turma_no_cadastr`, `raw:agenda-edu:communication.create_aluno_saiu_da_escola_como_faco`, `raw:agenda-edu:communication.create_cadastrar_a_ficha_medica_do_al`

### `communication.manage_emergency_contacts`

- **Label:** Manage emergency contact alert list
- **Actors:** guardian, staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/communication/notifications.md`
- **Decision:** Emergency contacts for school alert button.
- **Alias count:** 1
- **Sample aliases:** `raw:proesc:communication.create_botao_de_alerta_escolar_cadast`

### `communication.manage_message_inbox`

- **Label:** Manage message inbox (read, archive, delete)
- **Actors:** teacher, staff, guardian
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/communication/messages.md`
- **Decision:** Audited inbox; bulk archive; read-state per user.
- **Alias count:** 8
- **Sample aliases:** `raw:agenda-edu:communication.manage_silenciar_um_grupo`, `raw:classapp:communication.manage_arquivar_mensagens`, `raw:classapp:communication.manage_arquivar_mensagens_em_massa`

### `communication.manage_message_templates`

- **Label:** Manage message and WhatsApp templates
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-communication-003
- **PRD target:** `prds/communication/notifications.md`
- **Decision:** Reusable templates; WhatsApp adapter uses approved templates.
- **Alias count:** 1
- **Sample aliases:** `raw:agenda-edu:communication.create_criar_modelo_de_mensagem_para_`

### `communication.manage_network_broadcast`

- **Label:** Multi-school network broadcast
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/communication/channels.md`
- **Decision:** Network-level comms with per-school isolation on read.
- **Alias count:** 0

### `communication.manage_notification_inbox`

- **Label:** Manage notification inbox (clear, dismiss)
- **Actors:** guardian, staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/communication/notifications.md`
- **Decision:** User-controlled notification list; not push policy.
- **Alias count:** 1
- **Sample aliases:** `raw:classapp:communication.pay_apagar_limpar_as_notificacoes`

### `communication.manage_photo_album`

- **Label:** Manage photo albums and mural
- **Actors:** teacher, staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-communication-005
- **PRD target:** `prds/communication/media.md`
- **Decision:** Album-based photos; download with retention policy.
- **Alias count:** 6
- **Sample aliases:** `raw:agenda-edu:communication.create_criar_um_album_no_mural_de_fot`, `raw:agenda-edu:communication.delete_faco_para_excluir_um_album_ou_`, `raw:agenda-edu:communication.manage_recuperar_um_album_de_fotos`

### `communication.manage_service_channel`

- **Label:** Manage service channel with SLA
- **Actors:** staff, guardian
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-communication-002
- **PRD target:** `prds/communication/channels.md`
- **Decision:** Ticket channels with CSAT; family isolation.
- **Alias count:** 18
- **Sample aliases:** `raw:agenda-edu:communication.create_adicionar_um_usuario_da_escola`, `raw:agenda-edu:communication.create_adicionar_uma_turma_em_um_cana`, `raw:agenda-edu:communication.create_criar_um_canal_de_atendimento`

### `communication.manage_social_reactions`

- **Label:** Manage likes and comments on announcements
- **Actors:** guardian, teacher
- **Surfaces:** web, mobile
- **Phase:** P2
- **Divergence:** DIV-communication-005
- **PRD target:** `prds/communication/announcements.md`
- **Decision:** Optional reactions; off by default to avoid vanity feed.
- **Alias count:** 3
- **Sample aliases:** `raw:agenda-edu:academic.manage_comentar_nas_atividades_solici`, `raw:agenda-edu:communication.manage_comentar_nas_atividades_enviad`, `raw:agenda-edu:communication.view_visualizar_os_comentarios_nos_`

### `communication.manage_user_profiles`

- **Label:** Manage user profiles and multi-profile switching
- **Actors:** guardian, staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/identity-and-onboarding/profiles.md`
- **Decision:** Multi-profile app UX; staff assigns profiles to groups.
- **Alias count:** 4
- **Sample aliases:** `raw:agenda-edu:communication.create_criar_e_personalizar_um_novo_p`, `raw:classapp:communication.create_adicionar_perfis_as_turmas_e_g`, `raw:classapp:communication.manage_alternar_entre_diferentes_perf`

### `communication.onboard_communication_users`

- **Label:** Onboard users to communication module
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/communication/index.md`
- **Decision:** Staff verification checklist; guardian invite flow.
- **Alias count:** 5
- **Sample aliases:** `raw:agenda-edu:communication.manage_aplicativo_equipe_escolar_cheg`, `raw:agenda-edu:communication.manage_etapa_3_verificar_o_acesso_dos`, `raw:agenda-edu:communication.manage_etapa_4_verificar_o_acesso_dos`

### `communication.open_support_ticket`

- **Label:** Open support ticket with attachments
- **Actors:** guardian, staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-communication-002
- **PRD target:** `prds/communication/channels.md`
- **Decision:** Ticket channel distinct from direct chat; family-scoped.
- **Alias count:** 7
- **Sample aliases:** `raw:agenda-edu:communication.create_criar_um_ticket_de_atendimento`, `raw:agenda-edu:communication.manage_abrir_um_ticket_de_atendimento`, `raw:agenda-edu:communication.manage_reabrir_um_ticket_de_atendimen`

### `communication.publish_calendar_event`

- **Label:** Publish calendar event or activity
- **Actors:** staff, teacher
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/communication/announcements.md`
- **Decision:** Events as comms objects; academic calendar sync later.
- **Alias count:** 11
- **Sample aliases:** `raw:agenda-edu:communication.create_adicionar_link_em_uma_atividad`, `raw:agenda-edu:communication.create_criar_um_evento_usando_a_funci`, `raw:agenda-edu:communication.create_criar_um_novo_evento`

### `communication.quality_signal_support`

- **Label:** Communication help troubleshooting (quality signal)
- **Actors:** staff, guardian
- **Surfaces:** web, mobile
- **Phase:** N/A
- **Quality signal:** yes (support/troubleshooting — not feature parity)
- **Decision:** Support articles, release notes, FAQs — friction signal, not parity target.
- **Alias count:** 84
- **Sample aliases:** `raw:agenda-edu:communication.create_cadastrar_equipe_escolar`, `raw:agenda-edu:communication.create_cadastrar_um_cardapio`, `raw:agenda-edu:communication.create_cadastrar_um_medicamento`

### `communication.schedule_message_delivery`

- **Label:** Schedule message delivery
- **Actors:** staff, teacher
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/communication/messages.md`
- **Decision:** Deferred send with timezone-aware delivery window.
- **Alias count:** 1
- **Sample aliases:** `raw:classapp:communication.manage_agendar_o_envio_de_mensagens_n`

### `communication.send_direct_message`

- **Label:** Send direct message
- **Actors:** teacher, guardian, staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-communication-001
- **PRD target:** `prds/communication/messages.md`
- **Decision:** Official audited channels; MVP priority.
- **Alias count:** 49
- **Sample aliases:** `raw:agenda-edu:communication.create_criar_um_grupo_de_conversa_par`, `raw:agenda-edu:communication.create_o_que_significa_reenviar_convi`, `raw:agenda-edu:communication.delete_posso_excluir_uma_mensagem_env`

### `communication.send_email_notification`

- **Label:** Send email notification
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-communication-007
- **PRD target:** `prds/communication/notifications.md`
- **Decision:** Email adapter alongside push; opt-in policy.
- **Alias count:** 0

### `communication.send_group_message`

- **Label:** Send group or class message
- **Actors:** teacher, staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-communication-001
- **PRD target:** `prds/communication/messages.md`
- **Decision:** Group threads with school-scoped recipients; family isolation enforced.
- **Alias count:** 7
- **Sample aliases:** `raw:classapp:communication.manage_conversas_atendimentos_estrutu`, `raw:classapp:communication.manage_conversas_atendimentos_simples`, `raw:classapp:communication.manage_conversas_como_encaminhar_o_at`

### `communication.send_individual_announcement`

- **Label:** Send individual targeted announcement
- **Actors:** staff, teacher
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/communication/announcements.md`
- **Decision:** Per-family or per-student comunicados; not mass blast.
- **Alias count:** 1
- **Sample aliases:** `raw:agenda-edu:communication.manage_comunicados_individuais_na_age`

### `communication.send_mass_announcement`

- **Label:** Send mass announcement
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/communication/announcements.md`
- **Decision:** Post-MVP mass comms.
- **Alias count:** 16
- **Sample aliases:** `raw:agenda-edu:communication.create_adicionar_link_em_um_comunicad`, `raw:agenda-edu:communication.delete_faco_para_excluir_um_comunicad`, `raw:agenda-edu:communication.manage_fazer_um_agendamento_de_um_com`

### `communication.send_poll_survey`

- **Label:** Send poll or survey in announcement
- **Actors:** staff, teacher
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/communication/announcements.md`
- **Decision:** Polls as structured announcement type.
- **Alias count:** 6
- **Sample aliases:** `raw:agenda-edu:academic.manage_modelos_de_enquetes_para_sua_e`, `raw:agenda-edu:communication.manage_responder_uma_enquete`, `raw:agenda-edu:communication.view_visualizar_as_respostas_de_uma`

### `communication.send_whatsapp_notification`

- **Label:** Send WhatsApp notification via adapter
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-communication-003
- **PRD target:** `prds/communication/notifications.md`
- **Decision:** WhatsApp as adapter; rules in API.
- **Alias count:** 2
- **Sample aliases:** `raw:agenda-edu:communication.manage_fazer_captacao_no_whatsapp_pel`, `raw:proesc:communication.manage_entrar_em_contato_pelo_whatsap`

### `communication.share_photo_update`

- **Label:** Share photo update to families
- **Actors:** teacher, staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-communication-005
- **PRD target:** `prds/communication/media.md`
- **Decision:** Photos with retention policy; no vanity feed.
- **Alias count:** 2
- **Sample aliases:** `raw:agenda-edu:communication.create_inserir_foto_no_meu_cadastro`, `raw:classapp:communication.manage_utilizar_a_funcionalidade_mome`

### `communication.share_video_content`

- **Label:** Share video in messages or activities
- **Actors:** teacher, staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/communication/media.md`
- **Decision:** Video attachments with bandwidth and retention limits.
- **Alias count:** 3
- **Sample aliases:** `raw:agenda-edu:communication.create_adicionar_video_em_uma_ativida`, `raw:classapp:communication.pay_baixar_videos_no_classapp_pelo`, `raw:classapp:communication.send_enviar_videos_pelo_classapp`

### `communication.switch_active_child`

- **Label:** Switch active child context (multi-child guardian)
- **Actors:** guardian
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/identity-and-onboarding/profiles.md`
- **Decision:** Guardian switches child without cross-family leak.
- **Alias count:** 2
- **Sample aliases:** `raw:agenda-edu:communication.manage_alternar_a_agenda_de_dois_alun`, `raw:agenda-edu:communication.view_como_visualizar_a_agenda_de_do`

### `communication.track_delivery_status`

- **Label:** Track message and activity delivery status
- **Actors:** staff, teacher
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/communication/index.md`
- **Decision:** Delivery receipts for activities and announcements.
- **Alias count:** 3
- **Sample aliases:** `raw:agenda-edu:communication.manage_receber_as_atividades_pela_age`, `raw:proesc:communication.manage_utilizar_o_ambiente_de_acompan`, `raw:proesc:communication.view_acompanhar_a_entrega_de_ativid`

### `communication.track_event_engagement`

- **Label:** Track calendar event engagement
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/communication/announcements.md`
- **Decision:** Engagement metrics on events; no vanity feed ranking.
- **Alias count:** 1
- **Sample aliases:** `raw:agenda-edu:communication.view_acompanhar_o_engajamento_de_um`

### `communication.track_service_inbox`

- **Label:** Track conversations and tickets in real time
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-communication-002
- **PRD target:** `prds/communication/channels.md`
- **Decision:** Staff inbox for channels and tickets; SLA indicators.
- **Alias count:** 1
- **Sample aliases:** `raw:agenda-edu:communication.view_acompanhar_conversas_e_tickets`

### `communication.update_guardian_profile`

- **Label:** Guardian progressive profile update
- **Actors:** guardian
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-communication-004
- **PRD target:** `prds/identity-and-onboarding/profiles.md`
- **Decision:** Progressive profiling; LGPD basis shown.
- **Alias count:** 6
- **Sample aliases:** `raw:agenda-edu:communication.create_fazer_cadastros_manuais_na_age`, `raw:agenda-edu:communication.create_realizar_cadastro_via_importac`, `raw:classapp:communication.create_atualizacao_cadastral_no_class`

### `communication.view_communication_engagement`

- **Label:** View communication engagement reports
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/communication/index.md`
- **Decision:** Delivery and read metrics; not public leaderboards.
- **Alias count:** 6
- **Sample aliases:** `raw:agenda-edu:communication.manage_dicas_de_como_engajar_familias`, `raw:agenda-edu:communication.manage_engajamento_e_historico_de_fun`, `raw:agenda-edu:communication.manage_melhore_a_adesao_e_o_engajamen`

## Academic

### `academic.assign_teacher_to_subject`

- **Label:** Assign teachers to subjects and diaries
- **Actors:** staff
- **Staff templates:** coordinator
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/academic/diary.md`
- **Decision:** Bulk and individual teacher–discipline links.
- **Alias count:** 5
- **Sample aliases:** `raw:proesc:academic.manage_desvincular_professor_da_disci`, `raw:proesc:academic.manage_vincular_professor_a_disciplin`, `raw:proesc:academic.manage_vincular_professores_as_discip`

### `academic.configure_evaluation_template`

- **Label:** Configure evaluation templates
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-academic-001
- **PRD target:** `prds/academic/grades.md`
- **Decision:** Self-service templates; ERP mode when integrated.
- **Alias count:** 16
- **Sample aliases:** `raw:agenda-edu:communication.create_cadastrar_disciplinas`, `raw:agenda-edu:communication.create_registrar_uma_ocorrencia_disci`, `raw:agenda-edu:communication.manage_o_que_significa_disciplina_pol`

### `academic.configure_multi_school`

- **Label:** Configure multi-school tenancy views
- **Actors:** staff, backoffice
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-academic-008
- **PRD target:** `prds/platform-and-admin/backoffice.md`
- **Decision:** Multi-school tenancy; per-school isolation.
- **Alias count:** 1
- **Sample aliases:** `raw:proesc:academic.manage_transferir_aluno_entre_unidade`

### `academic.configure_report_card`

- **Label:** Configure report card display rules
- **Actors:** staff
- **Staff templates:** coordinator
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/academic/report-cards.md`
- **Decision:** Hide disciplines or final grades per policy.
- **Alias count:** 5
- **Sample aliases:** `raw:proesc:academic.create_registrar_as_datas_de_disparo_`, `raw:proesc:academic.manage_ambiente_de_boletim_personaliz`, `raw:proesc:academic.manage_o_que_preciso_saber_sobre_o_bo`

### `academic.deliver_diary_to_families`

- **Label:** Deliver daily diary to guardians
- **Actors:** teacher
- **Surfaces:** web, mobile
- **Phase:** P2
- **Divergence:** DIV-academic-004
- **PRD target:** `prds/academic/diary.md`
- **Decision:** Push diary entries to families; infantil priority.
- **Alias count:** 1
- **Sample aliases:** `raw:agenda-edu:academic.send_enviar_um_diario_no_aplicativo`

### `academic.enter_grades`

- **Label:** Enter grades in diary and activities
- **Actors:** teacher, staff
- **Staff templates:** secretary
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/academic/grades.md`
- **Decision:** Teacher diary grade entry; secretary override with audit.
- **Alias count:** 8
- **Sample aliases:** `raw:proesc:academic.create_cadastrar_o_relatorio_descriti`, `raw:proesc:academic.create_criar_e_lancar_notas_no_diario`, `raw:proesc:academic.launch_lancar_notas_de_recuperacao`

### `academic.export_attendance`

- **Label:** Export and print attendance records
- **Actors:** staff, teacher
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/academic/attendance.md`
- **Decision:** Blank frequency sheets and period exports.
- **Alias count:** 1
- **Sample aliases:** `raw:proesc:academic.export_imprimir_frequencia_em_branco`

### `academic.issue_transcript`

- **Label:** Issue school transcript (histórico escolar)
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/documents/certificates.md`
- **Decision:** Official transcript generation with audit.
- **Alias count:** 6
- **Sample aliases:** `raw:proesc:academic.create_cadastrar_disciplina_no_histor`, `raw:proesc:academic.manage_comandos_avancados_do_historic`, `raw:proesc:academic.manage_emitir_um_historico_escolar`

### `academic.justify_absence`

- **Label:** Justify student absences
- **Actors:** teacher, staff, guardian
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-academic-002
- **PRD target:** `prds/academic/attendance.md`
- **Decision:** Documented justification with audit trail.
- **Alias count:** 1
- **Sample aliases:** `raw:proesc:academic.manage_justificar_a_ausencia_falta_do`

### `academic.log_daily_routine`

- **Label:** Log early childhood daily routine
- **Actors:** teacher
- **Surfaces:** web, mobile
- **Phase:** P2
- **Divergence:** DIV-academic-004
- **PRD target:** `prds/academic/diary.md`
- **Decision:** Routine module MVP-relevant for infantil.
- **Alias count:** 11
- **Sample aliases:** `raw:agenda-edu:communication.create_criar_secoes_em_diario`, `raw:agenda-edu:communication.export_exportar_relatorios_de_diarios`, `raw:agenda-edu:communication.manage_a_funcionalidade_diario`

### `academic.log_lesson_content`

- **Label:** Log lesson content in diary
- **Actors:** teacher
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/academic/diary.md`
- **Decision:** Per-lesson content with copy-from-prior term.
- **Alias count:** 3
- **Sample aliases:** `raw:proesc:academic.create_acompanhar_o_conteudo_cadastra`, `raw:proesc:academic.import_copiar_importar_conteudos_de_a`, `raw:proesc:academic.launch_inserir_conteudo_nas_minhas_au`

### `academic.manage_academic_operations`

- **Label:** General academic module operations
- **Actors:** staff, teacher
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/academic/diary.md`
- **Decision:** Catch-all for miscatalogued academic tasks pending finer split.
- **Alias count:** 4
- **Sample aliases:** `raw:classapp:academic.create_atualizar_os_dados_cadastrais_`, `raw:proesc:academic.create_cadastrar_a_disponibilidade_de`, `raw:proesc:academic.create_notas_fiscais_como_adicionar_o`

### `academic.manage_attendance_policy`

- **Label:** Manage attendance counting policy
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-academic-002
- **PRD target:** `prds/academic/attendance.md`
- **Decision:** School-level policy with per-period override.
- **Alias count:** 1
- **Sample aliases:** `raw:proesc:academic.manage_utilizar_o_ambiente_de_frequen`

### `academic.manage_class_diary`

- **Label:** Manage class diary lessons and activities
- **Actors:** teacher, staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-academic-005
- **PRD target:** `prds/academic/diary.md`
- **Decision:** Individual and batch lessons tied to evaluation.
- **Alias count:** 5
- **Sample aliases:** `raw:proesc:academic.create_criar_aulas_em_lote`, `raw:proesc:academic.create_criar_aulas_individuais_no_dia`, `raw:proesc:academic.manage_desvincular_uma_atividade_da_a`

### `academic.manage_curriculum_matrix`

- **Label:** Manage curriculum matrix and disciplines
- **Actors:** staff
- **Staff templates:** coordinator
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-academic-001
- **PRD target:** `prds/academic/curriculum.md`
- **Decision:** Disciplines, subdisciplines, skills matrix self-service.
- **Alias count:** 11
- **Sample aliases:** `raw:proesc:academic.create_adicionar_disciplinas_na_matri`, `raw:proesc:academic.create_cadastrar_habilidades_na_matri`, `raw:proesc:academic.create_criar_subdisciplinas`

### `academic.manage_grade_scale`

- **Label:** Configure grading criteria and formulas
- **Actors:** staff
- **Staff templates:** coordinator
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-academic-001
- **PRD target:** `prds/academic/grades.md`
- **Decision:** Self-service grade scales; ERP mode when integrated.
- **Alias count:** 4
- **Sample aliases:** `raw:classapp:academic.manage_utilizar_a_solucao_de_formular`, `raw:proesc:academic.manage_gerar_avaliacoes_obrigatorias_`, `raw:proesc:academic.manage_um_criterio_personalizado_pra_`

### `academic.manage_lesson_lifecycle`

- **Label:** Manage lesson lifecycle (cancel/makeup)
- **Actors:** teacher
- **Surfaces:** web, mobile
- **Phase:** P2
- **Divergence:** DIV-academic-005
- **PRD target:** `prds/academic/diary.md`
- **Decision:** Cancel and makeup rules explicit.
- **Alias count:** 1
- **Sample aliases:** `raw:proesc:academic.manage_realizar_a_reposicao_de_aulas`

### `academic.manage_live_lesson`

- **Label:** Manage live online lessons
- **Actors:** teacher, staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **Divergence:** DIV-academic-005
- **PRD target:** `prds/academic/diary.md`
- **Decision:** Meet/adapter links; recordings attached to lesson.
- **Alias count:** 4
- **Sample aliases:** `raw:proesc:academic.create_criar_aula_ao_vivo_no_proesc`, `raw:proesc:academic.manage_acessar_aulas_ao_vivo_pelo_goo`, `raw:proesc:academic.manage_google_meet_como_anexar_link_d`

### `academic.manage_period_closure`

- **Label:** Close academic period and year
- **Actors:** staff
- **Staff templates:** coordinator
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/academic/periods.md`
- **Decision:** Checklist-driven period close; blocks incomplete diaries.
- **Alias count:** 3
- **Sample aliases:** `raw:proesc:academic.manage_checklist_de_fechamento_de_per`, `raw:proesc:academic.manage_checklist_plantao_pedagogico_e`, `raw:proesc:academic.manage_qual_a_importancia_da_atuacao_`

### `academic.manage_recovery_grades`

- **Label:** Manage recovery and reassessment grades
- **Actors:** teacher, staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/academic/grades.md`
- **Decision:** Parallel recovery and dependency flows explicit.
- **Alias count:** 3
- **Sample aliases:** `raw:proesc:academic.create_registrar_alunos_em_dependenci`, `raw:proesc:academic.launch_lancar_notas_de_reavaliacoes_d`, `raw:proesc:academic.manage_recuperacao_paralela`

### `academic.manage_special_education`

- **Label:** Manage special education (AEE) records
- **Actors:** staff, teacher
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/academic/special-education.md`
- **Decision:** AEE module deferred; document competitor pattern.
- **Alias count:** 5
- **Sample aliases:** `raw:proesc:academic.manage_modulo_aee_gestao_completa_do_`, `raw:proesc:academic.manage_modulo_aee_listagem_de_alunos`, `raw:proesc:academic.manage_modulo_aee_registros`

### `academic.manage_teacher_diary`

- **Label:** Manage teacher diary workflow
- **Actors:** staff, teacher
- **Staff templates:** coordinator
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/academic/diary.md`
- **Decision:** Submit, return, and monitor diary delivery.
- **Alias count:** 9
- **Sample aliases:** `raw:proesc:academic.create_adicionar_avaliacoes_nos_diari`, `raw:proesc:academic.export_imprimir_os_diarios_pelo_menu_`, `raw:proesc:academic.manage_devolver_um_diario_para_o_prof`

### `academic.manage_transcript_record`

- **Label:** Maintain transcript discipline records
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/documents/certificates.md`
- **Decision:** Edit workload and frequency on historical records.
- **Alias count:** 0

### `academic.process_reenrollment`

- **Label:** Process online re-enrollment
- **Actors:** guardian, staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **Divergence:** DIV-academic-003
- **PRD target:** `prds/students-and-enrollments/enrollments.md`
- **Decision:** Online re-enrollment first-class.
- **Alias count:** 1
- **Sample aliases:** `raw:proesc:academic.manage_emitir_relatorio_de_alunos_nao`

### `academic.publish_report_card`

- **Label:** Publish report cards (boletim)
- **Actors:** staff
- **Staff templates:** coordinator
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/academic/report-cards.md`
- **Decision:** Scheduled boletim release with guardian notification.
- **Alias count:** 0

### `academic.quality_signal_support`

- **Label:** Academic help troubleshooting (quality signal)
- **Actors:** staff, teacher, guardian
- **Surfaces:** web, mobile
- **Phase:** N/A
- **Quality signal:** yes (support/troubleshooting — not feature parity)
- **Decision:** Support articles, CST tickets, ERP miscatalog — friction signal, not parity target.
- **Alias count:** 24
- **Sample aliases:** `raw:agenda-edu:academic.manage_faq_perguntas_frequentes_sobre`, `raw:classapp:academic.manage_2fa_no_login_faq_para_administ`, `raw:classapp:academic.resolve_por_que_e_importante_adicionar`

### `academic.record_attendance`

- **Label:** Record attendance
- **Actors:** teacher
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-academic-002
- **PRD target:** `prds/academic/attendance.md`
- **Decision:** Reliable attendance; legal impact if wrong.
- **Alias count:** 9
- **Sample aliases:** `raw:classapp:academic.manage_cheguei_funcionarios`, `raw:classapp:communication.manage_duvidas_frequentes_meu_arco`, `raw:classapp:identity-and-onboarding.manage_cheguei_pais_e_responsaveis`

### `academic.record_incidents`

- **Label:** Record disciplinary and pastoral incidents
- **Actors:** teacher, staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/academic/incidents.md`
- **Decision:** Typed occurrences with family visibility policy.
- **Alias count:** 2
- **Sample aliases:** `raw:proesc:academic.create_cadastrar_tipos_de_ocorrencias`, `raw:proesc:academic.create_criar_ocorrencias`

### `academic.schedule_lesson`

- **Label:** Schedule lessons
- **Actors:** staff, teacher
- **Surfaces:** web, mobile
- **Phase:** P2
- **Divergence:** DIV-academic-005
- **PRD target:** `prds/academic/diary.md`
- **Decision:** Model lesson lifecycle explicitly.
- **Alias count:** 4
- **Sample aliases:** `raw:proesc:academic.create_criar_editar_e_excluir_eventos`, `raw:proesc:communication.create_registrar_uma_aula_de_recupera`, `raw:proesc:communication.manage_quais_os_recursos_do_proesc_po`

### `academic.search_help_center`

- **Label:** Search product help center
- **Actors:** staff, teacher, guardian
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-academic-009
- **Decision:** Ship searchable help for own product.
- **Alias count:** 0

### `academic.sync_academic_with_erp`

- **Label:** Sync academic data with external ERP
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **Divergence:** DIV-academic-006
- **PRD target:** `prds/integrations/erp.md`
- **Decision:** API-first SIS; adjunct ERP sync when hybrid.
- **Alias count:** 2
- **Sample aliases:** `raw:agenda-edu:academic.manage_acessar_e_usar_o_monitor_de_in`, `raw:proesc:academic.import_sincronizacao_da_dados_proesc_`

### `academic.view_academic_dashboard`

- **Label:** View academic coordination dashboard
- **Actors:** staff
- **Staff templates:** coordinator
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/academic/coordination.md`
- **Decision:** Diary status, grades, and activity monitoring.
- **Alias count:** 17
- **Sample aliases:** `raw:agenda-edu:academic.manage_selecionar_destinatarios_por_a`, `raw:proesc:academic.launch_inserir_a_satisfacao_do_profes`, `raw:proesc:academic.manage_acessar_o_sistema_proesc_com_p`

### `academic.view_corporate_guardian_students`

- **Label:** Corporate partner view linked students
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **Divergence:** DIV-academic-007
- **PRD target:** `prds/students-and-enrollments/enrollments.md`
- **Decision:** corporate_partner scoped access + audit.
- **Alias count:** 0

### `academic.view_report_card`

- **Label:** View report card and grades
- **Actors:** guardian, student, staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/academic/report-cards.md`
- **Decision:** Family-scoped grade view; student portal when enabled.
- **Alias count:** 6
- **Sample aliases:** `raw:proesc:academic.manage_acessar_as_aulas_pelo_proesc_a`, `raw:proesc:academic.manage_acessar_notas_no_portal_do_alu`, `raw:proesc:academic.manage_acessar_o_conteudo_e_anexos_da`

## Students

### `students.assign_class`

- **Label:** Assign student to class
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/students-and-enrollments/classes.md`
- **Decision:** Enrollment-to-class assignment; respects capacity.
- **Alias count:** 0

### `students.cancel_enrollment`

- **Label:** Cancel enrollment or pre-enrollment
- **Actors:** guardian, staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/students-and-enrollments/enrollments.md`
- **Decision:** Guardian self-cancel before institution processing.
- **Alias count:** 1
- **Sample aliases:** `raw:proesc:students-and-enrollments.delete_cancelar_a_inscricao_na_pre_ma`

### `students.capture_prospect`

- **Label:** Capture enrollment prospect
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/students-and-enrollments/capture.md`
- **Decision:** CRM lead/opportunity before formal enrollment.
- **Alias count:** 7
- **Sample aliases:** `raw:proesc:communication.create_cadastrar_uma_oportunidade_ou_`, `raw:proesc:communication.create_criar_formularios_online_no_cr`, `raw:proesc:communication.manage_agendar_uma_atividade_no_ambie`

### `students.enroll_student`

- **Label:** Enroll student
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/students-and-enrollments/enrollment.md`
- **Decision:** Core enrollment; links student, class, and guardians.
- **Alias count:** 33
- **Sample aliases:** `raw:agenda-edu:communication.create_cadastrar_alunos`, `raw:agenda-edu:communication.create_cadastrar_responsaveis`, `raw:agenda-edu:communication.create_cadastrar_turmas`

### `students.export_enrollment_reports`

- **Label:** Export enrollment reports
- **Actors:** staff
- **Surfaces:** web
- **Phase:** MVP
- **PRD target:** `prds/students-and-enrollments/enrollment.md`
- **Decision:** Carteirinha, CRM opportunity reports, enrollment lists.
- **Alias count:** 5
- **Sample aliases:** `raw:proesc:students-and-enrollments.export_imprimir_carteirinha_estudanti`, `raw:proesc:students-and-enrollments.export_imprimir_os_cartoes_de_simulad`, `raw:proesc:students-and-enrollments.view_consultar_os_relatorios_com_os`

### `students.import_students_bulk`

- **Label:** Import students in bulk
- **Actors:** staff
- **Surfaces:** web
- **Phase:** MVP
- **PRD target:** `prds/students-and-enrollments/enrollment.md`
- **Decision:** Spreadsheet import with validation; no duplicate CPF per school.
- **Alias count:** 1
- **Sample aliases:** `raw:classapp:students-and-enrollments.create_adicionar_alunos_em_massa_atra`

### `students.invite_student_access`

- **Label:** Invite student to self-register
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/students-and-enrollments/enrollment.md`
- **Decision:** Student login deferred to phase 2; invite + staff review queue.
- **Alias count:** 1
- **Sample aliases:** `raw:agenda-edu:students-and-enrollments.send_enviar_link_de_convite_para_al`

### `students.manage_class_structure`

- **Label:** Manage class structure
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/students-and-enrollments/classes.md`
- **Decision:** Classes, shifts, capacity, multigrade parent/child turmas.
- **Alias count:** 7
- **Sample aliases:** `raw:proesc:students-and-enrollments.create_adicionar_disciplinas_em_uma_t`, `raw:proesc:students-and-enrollments.create_cadastrar_turnos_e_horarios_pa`, `raw:proesc:students-and-enrollments.create_criar_turmas`

### `students.manage_enrollment_campaign`

- **Label:** Manage enrollment campaign
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/students-and-enrollments/capture.md`
- **Decision:** Matrícula campaigns and CRM funnel; not comms mass send.
- **Alias count:** 1
- **Sample aliases:** `raw:classapp:students-and-enrollments.manage_filtrar_e_ordenar_campanhas_de`

### `students.manage_enrollment_contract`

- **Label:** Manage enrollment contract
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-financial-007
- **PRD target:** `prds/students-and-enrollments/enrollments.md`
- **Decision:** Contract templates and enrollment binding; signature in phase 2.
- **Alias count:** 0

### `students.manage_enrollment_operations`

- **Label:** General enrollment module operations
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/students-and-enrollments/enrollment.md`
- **Decision:** Catch-all for miscatalogued enrollment tasks pending finer split.
- **Alias count:** 5
- **Sample aliases:** `raw:proesc:students-and-enrollments.manage_emitir_a_declaracao_de_quitaca`, `raw:proesc:students-and-enrollments.manage_emitir_um_historico_escolar_de`, `raw:proesc:students-and-enrollments.manage_emitir_uma_declaracao_escolar`

### `students.manage_enrollment_slots`

- **Label:** Manage enrollment slots
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **Divergence:** DIV-academic-003
- **PRD target:** `prds/students-and-enrollments/enrollments.md`
- **Decision:** Vacancy availability for online enrollment trilha.
- **Alias count:** 1
- **Sample aliases:** `raw:proesc:students-and-enrollments.manage_arquivar_desarquivar_uma_vaga`

### `students.manage_guardian_link`

- **Label:** Manage guardian–student link
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/students-and-enrollments/guardians.md`
- **Decision:** Family isolation boundary; multiple guardians per student.
- **Alias count:** 2
- **Sample aliases:** `raw:proesc:students-and-enrollments.create_editar_grupos_de_um_cadastro`, `raw:proesc:students-and-enrollments.export_imprimir_a_declaracao_do_bolsa`

### `students.quality_signal_support`

- **Label:** Students help troubleshooting (quality signal)
- **Actors:** staff, guardian, student
- **Surfaces:** web, mobile
- **Phase:** N/A
- **Quality signal:** yes (support/troubleshooting — not feature parity)
- **Decision:** ERP module FAQs, CST tickets, transport/food miscatalog — friction signal.
- **Alias count:** 17
- **Sample aliases:** `raw:classapp:students-and-enrollments.manage_localizar_a_sigla_da_sua_insti`, `raw:classapp:students-and-enrollments.manage_pegar_o_id_da_minha_escola`, `raw:proesc:students-and-enrollments.manage_criei_um_relatorio_para_todas_`

### `students.run_online_enrollment_trail`

- **Label:** Run online enrollment trail
- **Actors:** guardian
- **Surfaces:** web, mobile
- **Phase:** P2
- **Divergence:** DIV-academic-003
- **PRD target:** `prds/students-and-enrollments/enrollments.md`
- **Decision:** Trilha: data → contract → plan → pay; includes re-enrollment.
- **Alias count:** 1
- **Sample aliases:** `raw:proesc:academic.manage_matriculas_simplificadas_com_p`

### `students.sign_enrollment_contract`

- **Label:** Sign enrollment contract electronically
- **Actors:** guardian, staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **Divergence:** DIV-financial-007
- **PRD target:** `prds/students-and-enrollments/enrollments.md`
- **Decision:** E-signature step on trilha; shares documents infra.
- **Alias count:** 0

### `students.transfer_enrollment`

- **Label:** Transfer enrollment between classes
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/students-and-enrollments/transfers.md`
- **Decision:** Class transfer and manual progression between turmas.
- **Alias count:** 4
- **Sample aliases:** `raw:agenda-edu:communication.manage_realizar_a_progressao_manual_d`, `raw:agenda-edu:communication.manage_transferir_alunos_entre_turmas`, `raw:proesc:academic.manage_remanejar_um_aluno_de_turma_pa`

### `students.unify_person_records`

- **Label:** Unify duplicate person records
- **Actors:** staff
- **Surfaces:** web
- **Phase:** P2
- **PRD target:** `prds/students-and-enrollments/records.md`
- **Decision:** Merge homonyms with audit trail; irreversible ops guarded.
- **Alias count:** 2
- **Sample aliases:** `raw:proesc:identity-and-onboarding.create_realizar_o_cadastro_de_pessoas`, `raw:proesc:students-and-enrollments.manage_fazer_unificacao_de_pessoas`

### `students.update_student_record`

- **Label:** Update student record
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/students-and-enrollments/records.md`
- **Decision:** Cadastral data, RA, and identifiers; LGPD minimization.
- **Alias count:** 5
- **Sample aliases:** `raw:proesc:communication.create_cadastrar_as_midias_no_modulo_`, `raw:proesc:communication.create_cadastrar_editoras_no_modulo_d`, `raw:proesc:communication.create_cadastrar_um_autor_no_modulo_d`

### `students.view_student_portal`

- **Label:** Access student portal features
- **Actors:** student
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/students-and-enrollments/portal.md`
- **Decision:** Student login surface; MVP uses guardian/staff proxy.
- **Alias count:** 3
- **Sample aliases:** `raw:agenda-edu:students-and-enrollments.view_acessar_e_visualizar_a_carteir`, `raw:proesc:identity-and-onboarding.manage_acessar_o_portal_do_aluno`, `raw:proesc:platform-and-admin.manage_ver_as_minhas_atividades_no_po`

## Identity

### `identity.authenticate_user`

- **Label:** Authenticate user
- **Actors:** staff, teacher, guardian, student
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/identity-and-onboarding/auth.md`
- **Decision:** JWT login; OTP/code login where competitors use it; MFA phase 2.
- **Alias count:** 0

### `identity.complete_registration`

- **Label:** Complete registration from invite
- **Actors:** guardian, staff, teacher
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/identity-and-onboarding/invites.md`
- **Decision:** Guardian/staff self-register via invite link or SMS code.
- **Alias count:** 1
- **Sample aliases:** `raw:classapp:identity-and-onboarding.create_me_cadastro_no_classapp`

### `identity.configure_multi_factor`

- **Label:** Configure multi-factor authentication
- **Actors:** staff, teacher, guardian, student
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/identity-and-onboarding/auth.md`
- **Decision:** 2FA and biometric login phase 2; document competitor patterns.
- **Alias count:** 2
- **Sample aliases:** `raw:agenda-edu:communication.manage_ativar_a_autenticacao_de_dois_`, `raw:agenda-edu:identity-and-onboarding.manage_tudo_que_voce_precisa_saber_so`

### `identity.configure_school_profile`

- **Label:** Configure school profile
- **Actors:** staff, backoffice
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/identity-and-onboarding/onboarding.md`
- **Decision:** School name, branding, and tenant profile during onboarding.
- **Alias count:** 0

### `identity.invite_user`

- **Label:** Invite user to school
- **Actors:** staff, backoffice
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/identity-and-onboarding/invites.md`
- **Decision:** Staff/guardian invites with role_template_id; digest-stored tokens.
- **Alias count:** 3
- **Sample aliases:** `raw:agenda-edu:students-and-enrollments.send_enviar_link_de_convite_para_a_`, `raw:classapp:identity-and-onboarding.manage_aba_de_contas_gerencie_os_aces`, `raw:proesc:identity-and-onboarding.create_cadastrar_um_novo_usuario_no_p`

### `identity.manage_consent`

- **Label:** Manage guardian consent (LGPD)
- **Actors:** guardian, staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/identity-and-onboarding/consent.md`
- **Decision:** LGPD consent record for staff/guardian onboarding; basis shown in UI.
- **Alias count:** 1
- **Sample aliases:** `raw:classapp:communication.manage_privacidade_e_protecao_de_dado`

### `identity.manage_identity_operations`

- **Label:** General identity module operations
- **Actors:** staff, backoffice, guardian
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/identity-and-onboarding/auth.md`
- **Decision:** Catch-all for miscatalogued identity tasks pending finer split.
- **Alias count:** 0

### `identity.manage_roles`

- **Label:** Manage roles and permissions
- **Actors:** staff, backoffice
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/identity-and-onboarding/permissions.md`
- **Decision:** System + custom role templates; permission keys + overrides.
- **Alias count:** 4
- **Sample aliases:** `raw:agenda-edu:communication.manage_um_usuario_master`, `raw:classapp:communication.manage_conceder_permissoes_administra`, `raw:classapp:communication.manage_transformar_um_funcionario_em_`

### `identity.manage_user_accounts`

- **Label:** Manage user accounts (activate, deactivate, delete)
- **Actors:** staff, backoffice
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/identity-and-onboarding/permissions.md`
- **Decision:** Account tab pattern; deactivate preferred over hard delete.
- **Alias count:** 2
- **Sample aliases:** `raw:proesc:identity-and-onboarding.delete_excluir_um_usuario`, `raw:proesc:identity-and-onboarding.update_editar_ativar_e_desativar_usua`

### `identity.manage_user_profile`

- **Label:** Manage user profile and contact data
- **Actors:** staff, teacher, guardian
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-communication-004
- **PRD target:** `prds/identity-and-onboarding/profiles.md`
- **Decision:** Email and cadastral updates with audit; progressive profiling hooks.
- **Alias count:** 1
- **Sample aliases:** `raw:proesc:identity-and-onboarding.create_alterar_o_e_mail_de_um_usuario`

### `identity.onboard_team`

- **Label:** Onboard staff and guardians to school
- **Actors:** staff, backoffice, guardian
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-integration-001
- **PRD target:** `prds/identity-and-onboarding/onboarding.md`
- **Decision:** Owner wizard + team invites; first-login checklists per onboarding mode.
- **Alias count:** 1
- **Sample aliases:** `raw:proesc:identity-and-onboarding.manage_acessar_o_proesc_pela_primeira`

### `identity.provision_school`

- **Label:** Provision school tenant (white-glove and lifecycle)
- **Actors:** backoffice, staff
- **Surfaces:** web
- **Phase:** MVP
- **Divergence:** DIV-integration-001
- **PRD target:** `prds/identity-and-onboarding/onboarding.md`
- **Decision:** provisioning → pending_handoff → active; self-serve + optional white-glove.
- **Alias count:** 0

### `identity.quality_signal_support`

- **Label:** Identity help troubleshooting (quality signal)
- **Actors:** staff, teacher, guardian, student
- **Surfaces:** web, mobile
- **Phase:** N/A
- **Quality signal:** yes (support/troubleshooting — not feature parity)
- **Decision:** Support articles, cache clears, ERP miscatalog — friction signal, not parity target.
- **Alias count:** 20
- **Sample aliases:** `raw:agenda-edu:identity-and-onboarding.manage_faq_lgpd`, `raw:classapp:identity-and-onboarding.manage_2fa_no_login_faq_para_alunos_e`, `raw:classapp:identity-and-onboarding.resolve_nao_consigo_adicionar_meu_cpf_`

### `identity.reset_password`

- **Label:** Reset or change password
- **Actors:** staff, teacher, guardian, student
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/identity-and-onboarding/auth.md`
- **Decision:** Forgot-password link + in-app change; passwords never returned by API.
- **Alias count:** 18
- **Sample aliases:** `raw:agenda-edu:communication.manage_ativar_a_autenticacao_com_biom`, `raw:agenda-edu:communication.manage_definir_uma_senha_temporaria_p`, `raw:agenda-edu:communication.manage_esqueci_a_senha_o_que_fazer`

### `identity.set_password`

- **Label:** Set password from invite token
- **Actors:** staff, teacher, guardian
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/identity-and-onboarding/auth.md`
- **Decision:** Single-use invite token + set-password; replaces random temp passwords.
- **Alias count:** 0

## Documents

### `documents.collect_contract_signatures`

- **Label:** Collect digital signatures on contracts
- **Actors:** staff, guardian
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/documents/contracts.md`
- **Decision:** Paperless contracts; shares signature infra with Livro Ata.
- **Alias count:** 0

### `documents.collect_minutes_signatures`

- **Label:** Collect digital signatures on minutes
- **Actors:** staff, guardian
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/documents/livro-ata.md`
- **Decision:** Valid digital signature for Conselho audits.
- **Alias count:** 0

### `documents.configure_document_signatories`

- **Label:** Configure secretary and director on official documents
- **Actors:** staff
- **Staff templates:** secretary
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/documents/archive.md`
- **Decision:** Letterhead/signatory block on generated certificates and declarations.
- **Alias count:** 1
- **Sample aliases:** `raw:proesc:documents-and-archive.create_adicionar_os_dados_de_secretar`

### `documents.export_audit_package`

- **Label:** Export audit-ready document package
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/documents/archive.md`
- **Decision:** Conselho de Educacao audit readiness per vision.
- **Alias count:** 0

### `documents.generate_official_minutes`

- **Label:** Generate official minutes (Livro Ata)
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/documents/livro-ata.md`
- **Decision:** Phase 2 high priority per vision.
- **Alias count:** 0

### `documents.issue_official_declaration`

- **Label:** Issue official declarations and certificates
- **Actors:** staff
- **Staff templates:** secretary
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/documents/certificates.md`
- **Decision:** Enrollment, quitacao, and other formal declarations beyond transcript.
- **Alias count:** 0

### `documents.issue_transcript`

- **Label:** Issue school transcript certificate
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/documents/certificates.md`
- **Decision:** Under-represented in competitor catalog.
- **Alias count:** 0

### `documents.manage_retention_policy`

- **Label:** Manage document retention policy
- **Actors:** staff, backoffice
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/documents/retention.md`
- **Decision:** LGPD retention for archive and photos.
- **Alias count:** 0

### `documents.search_archive`

- **Label:** Search digital archive
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/documents/archive.md`
- **Decision:** Basic search MVP; semantic search phase 2.
- **Alias count:** 5
- **Sample aliases:** `raw:classapp:communication.update_editar_relatorios_apos_o_envio`, `raw:proesc:communication.export_salvar_e_imprimir_documentos_e`, `raw:proesc:communication.export_visualizar_imprimir_os_relator`

### `documents.search_archive_semantic`

- **Label:** Semantic search across document archive
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/documents/livro-ata.md`
- **Decision:** Phase 2 Livro Ata search per vision; basic search remains MVP.
- **Alias count:** 0

### `documents.store_student_document`

- **Label:** Store document in digital archive
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/documents/archive.md`
- **Decision:** Audit-ready repository per student/school.
- **Alias count:** 7
- **Sample aliases:** `raw:agenda-edu:communication.create_adicionar_um_arquivo_ou_editar`, `raw:agenda-edu:communication.create_cadastrar_um_modelo_de_contrat`, `raw:agenda-edu:communication.sign_assinar_meus_contratos_em_assi`

### `documents.view_student_documents`

- **Label:** View student documents in archive
- **Actors:** guardian, student
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/documents/archive.md`
- **Decision:** Per-family isolation; guardian sees own children's documents only.
- **Alias count:** 0

## Platform

### `platform.configure_help_taxonomy`

- **Label:** Configure help center taxonomy
- **Actors:** backoffice
- **Surfaces:** web
- **Phase:** P2
- **Divergence:** DIV-integration-003
- **PRD target:** `prds/platform-and-admin/index.md`
- **Decision:** Module docs for School Lab product; persona quick-starts per actor.
- **Alias count:** 0

### `platform.configure_school_year`

- **Label:** Configure school year and calendar periods
- **Actors:** staff
- **Staff templates:** secretary
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/platform-and-admin/school-year.md`
- **Decision:** Ano letivo, feriados, and period boundaries drive academic and billing cycles.
- **Alias count:** 1
- **Sample aliases:** `raw:proesc:identity-and-onboarding.create_cadastrar_feriados_no_proesc`

### `platform.export_operational_reports`

- **Label:** Export operational and cross-module reports
- **Actors:** staff
- **Surfaces:** web
- **Phase:** P2
- **PRD target:** `prds/platform-and-admin/index.md`
- **Decision:** Favorited reports and year-scoped roll-ups; not domain ledger exports.
- **Alias count:** 0

### `platform.manage_backoffice_ops`

- **Label:** Backoffice tenant and module operations
- **Actors:** backoffice
- **Surfaces:** web
- **Phase:** MVP
- **PRD target:** `prds/platform-and-admin/backoffice.md`
- **Decision:** Platform SPA ops: tenant lifecycle, module enablement, upsell — not school staff tasks.
- **Alias count:** 0

### `platform.manage_multi_unit`

- **Label:** Configure multi-unit school group
- **Actors:** staff, backoffice
- **Surfaces:** web
- **Phase:** P2
- **Divergence:** DIV-academic-008
- **PRD target:** `prds/platform-and-admin/backoffice.md`
- **Decision:** Per-school isolation with group roll-ups; distinct from academic tenancy views.
- **Alias count:** 0

### `platform.manage_platform_operations`

- **Label:** General platform module operations
- **Actors:** staff, backoffice
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/platform-and-admin/staff-users.md`
- **Decision:** Catch-all for miscatalogued platform tasks pending finer split.
- **Alias count:** 0

### `platform.manage_school_calendar`

- **Label:** Manage school calendar and personal events
- **Actors:** staff, teacher
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/platform-and-admin/calendar.md`
- **Decision:** Institutional calendar plus staff personal events; comms events sync later.
- **Alias count:** 2
- **Sample aliases:** `raw:agenda-edu:platform-and-admin.manage_duplicar_um_evento_em_calendar`, `raw:proesc:platform-and-admin.create_criar_eventos_pessoais`

### `platform.manage_staff_users`

- **Label:** Manage staff users and role menus
- **Actors:** staff, backoffice
- **Surfaces:** web, mobile
- **Phase:** MVP
- **PRD target:** `prds/platform-and-admin/staff-users.md`
- **Decision:** Staff roster and menu visibility; identity owns auth and permission keys.
- **Alias count:** 15
- **Sample aliases:** `raw:proesc:communication.manage_quais_menus_a_secretaria_tem_a`, `raw:proesc:communication.manage_quais_menus_e_funcionalidades_`, `raw:proesc:communication.manage_quais_menus_o_auxiliar_de_coor`

### `platform.manage_transport_module`

- **Label:** Manage transport module (deferred)
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/platform-and-admin/index.md`
- **Decision:** Transport routes deferred; catalog miscatalog captured as quality signal until PRD.
- **Alias count:** 0

### `platform.meter_digital_signatures`

- **Label:** Meter digital signature consumption
- **Actors:** staff, backoffice
- **Staff templates:** financial
- **Surfaces:** web, mobile
- **Phase:** P2
- **Divergence:** DIV-financial-007
- **PRD target:** `prds/documents-and-archive/archive.md`
- **Decision:** Transparent metering for e-sign; shares infra with billing and documents.
- **Alias count:** 1
- **Sample aliases:** `raw:agenda-edu:platform-and-admin.view_acompanhar_o_consumo_de_assina`

### `platform.quality_signal_support`

- **Label:** Platform help troubleshooting (quality signal)
- **Actors:** staff, backoffice
- **Surfaces:** web, mobile
- **Phase:** N/A
- **Quality signal:** yes (support/troubleshooting — not feature parity)
- **Decision:** CST/GSen license FAQs, ERP vendor articles, transport/RH miscatalog — friction signal.
- **Alias count:** 26
- **Sample aliases:** `raw:proesc:platform-and-admin.create_criar_editar_ou_excluir_grupos`, `raw:proesc:platform-and-admin.manage_desativar_a_traducao_automatic`, `raw:totvs:platform-and-admin.create_cst_gsen_como_incluir_instalac`

### `platform.self_serve_onboarding`

- **Label:** Self-serve school onboarding and product access
- **Actors:** staff, backoffice, guardian
- **Surfaces:** web, mobile
- **Phase:** MVP
- **Divergence:** DIV-integration-001
- **PRD target:** `prds/platform-and-admin/onboarding.md`
- **Decision:** Self-serve with optional white-glove tier; app access FAQs map here not identity.
- **Alias count:** 4
- **Sample aliases:** `raw:agenda-edu:communication.manage_acessar_a_agenda_edu`, `raw:proesc:communication.manage_acessar_a_central_de_ajuda_pro`, `raw:proesc:identity-and-onboarding.manage_contratar_modulos_extra`

### `platform.view_analytics_dashboard`

- **Label:** View analytics and operational reports
- **Actors:** staff
- **Staff templates:** director, coordinator
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/platform-and-admin/index.md`
- **Decision:** Cross-module dashboards; domain-specific exports stay in billing/academic PRDs.
- **Alias count:** 0

## Integrations

### `integrations.connect_erp`

- **Label:** Connect external ERP
- **Actors:** staff, backoffice
- **Surfaces:** web, mobile
- **Phase:** P2
- **Divergence:** DIV-integration-002
- **PRD target:** `prds/integrations/erp.md`
- **Decision:** Own core domains; open API for adjuncts.
- **Alias count:** 0

### `integrations.export_financial_data`

- **Label:** Export financial data to ERP
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/integrations/erp.md`
- **Alias count:** 0

### `integrations.import_academic_data`

- **Label:** Import academic data from ERP
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/integrations/erp.md`
- **Alias count:** 0

### `integrations.manage_webhooks`

- **Label:** Manage outbound webhooks
- **Actors:** backoffice
- **Surfaces:** web, mobile
- **Phase:** P2
- **PRD target:** `prds/integrations/webhooks.md`
- **Alias count:** 1
- **Sample aliases:** `raw:proesc:communication.manage_uma_api_e_como_posso_utilizar_`

### `integrations.sync_communication_overlay`

- **Label:** Sync comms overlay with ERP SIS
- **Actors:** staff
- **Surfaces:** web, mobile
- **Phase:** P2
- **Divergence:** DIV-academic-006
- **PRD target:** `prds/integrations/comms-sync.md`
- **Decision:** API-first SIS; comms native.
- **Alias count:** 8
- **Sample aliases:** `raw:agenda-edu:communication.manage_etapa_7_conheca_todas_as_funci`, `raw:agenda-edu:communication.manage_habilitar_a_integracao_sophia_`, `raw:agenda-edu:communication.manage_realizar_a_progressao_de_ano_l`
