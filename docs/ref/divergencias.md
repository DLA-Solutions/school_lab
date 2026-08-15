# Cross-competitor divergences

Harvest: 2026-08-15. Competitors: **Edukante**, **KAITS**, **Sophia**, **TOTVS Educacional**,
**ClassApp**, **Agenda Edu**, **ClipEscola**, **Sponte**, **Proesc**.

Capability inventory (1,325 unique entries): [`catalogo-funcionalidades.md`](catalogo-funcionalidades.md).
Canonical taxonomy (Phase 1): [`capability-taxonomy.yaml`](../product/capability-taxonomy.yaml).
Alias mapping: [`capability-aliases.jsonl`](capability-aliases.jsonl).
Per-competitor inventories: `docs/ref/<competitor>/*/funcionalidades-por-ator.md`.

**Traceability:** divergence rows below carry `DIV-*` IDs linked to canonical capabilities in
`capability-taxonomy.yaml` (`divergence_ref` field). See [`traceability.md`](../product/traceability.md).

Where competitors disagree, the domain is genuinely difficult — each row records
an explicit School Lab decision (or open question).

## Surfaces / channels

| Topic | DIV | Pattern | School Lab decision |
|-------|-----|---------|---------------------|
| Guardian channel priority | DIV-surfaces-001 | Proesc/Agenda: family app first; some ERP web-only | **Mobile primary** for push/messaging; **web guardian routes in MVP** for billing/documents ([`actors-and-surfaces.md`](../actors-and-surfaces.md)) |
| Student login | DIV-surfaces-002 | ~60 student-scoped capabilities in corpus | **Record-only** through MVP; student portal phase 2 |

## Academic domain

| Topic | DIV | Edukante | KAITS | Sophia | TOTVS | ClassApp | Agenda Edu | ClipEscola | Sponte | Proesc | School Lab decision |
|-------|-----|----------|-------|--------|-------|----------|------------|------------|--------|--------|---------------------|
| Evaluation model setup | DIV-academic-001 | Vendor support parametrizes | Marketing: self-config | Not public; implantação-led | Enterprise consultoria | Not in scope (comms product) | Manual vs ERP tracks | ERP integration; diary only | Marketing: self-config; **segment locks** (language schools) | Documented teacher/coord flows; Analytics on diary delivery | **Self-service templates**; ERP mode when integrated |
| Attendance counting | DIV-academic-002 | Lesson-level **or** manual period totals | Not on public pages | Via Ferramenta Professor | RM module (not in public CST harvest) | Cheguei arrival module | Diary sections (infant care) | Check-in/out | Diary + remote teacher entry | Diary + activities; individual lessons article | **School-level policy** with per-period override |
| Re-enrollment | DIV-academic-003 | Online rematrícula flow | Rematriculados report | Clicksign e-signature | Portal (inferred) | Matrículas module + contracts | Matrícula tab in Pagamentos | Digital signature + ClipCoins | Capture + secretariat (marketing) | **Trilha** 4-step online (data → contract → plan → pay) | **Online re-enrollment** first-class |
| Early childhood routine | DIV-academic-004 | Occurrences + routine | Agenda virtual emphasis | Occurrences in teacher tool | Not emphasized publicly | Momentos/photos; not full diary | **Diário** (meals, sleep, etc.) | Diário criança / ficha bebê | Occurrences via Agenda Plus | **Rotina escolar** in Proesc Agenda (push) | **Routine module** MVP-relevant for infantil |
| Lesson scheduling | DIV-academic-005 | Lessons + attendance | Cancel/makeup rules | Not on marketing pages | Network scheduling (inferred) | Events/calendar only | Activities + calendar | Calendar + live classes | Online class in ERP | Activities + Google Meet live class | Model **lesson lifecycle** explicitly |
| Full SIS vs comms overlay | DIV-academic-006 | Full ERP | Full ERP | Full ERP | Full ERP | **Comms + ClassPay**; ERP sync | **Dual**: Manual mini-SIS or ERP sync | **Comms + ClipPag**; 70+ ERP APIs | **Full ERP**; Agenda Plus native | **Full ERP**; Agenda add-on module | API-first SIS; comms native, not bolt-on |
| Corporate guardian | DIV-academic-007 | Company multi-student views | Empresa conveniada portal | Not emphasized | Network portals | Tags/profiles | Channel permissions | Not emphasized | Not emphasized publicly | **PJ responsável financeiro** documented | `corporate_partner` scoped access + audit |
| Multi-school | DIV-academic-008 | Less emphasized | Redes e franquias module | Not emphasized | **Core** network positioning | Comunicação em Rede category | Not primary in corpus | Redes de ensino segment | Sponte Gov (public); private less emphasized | Unidade filter in reports | Multi-school tenancy; per-school isolation |
| Public knowledge base | DIV-academic-009 | Marketing only | Marketing only | Login-gated | Partial CST | Zendesk (274) | Zendesk (368) | Login-gated | **FAQ + in-app chat only** | Zendesk (580), persona taxonomy | Ship searchable help for own product |

## Financial domain

| Topic | DIV | Edukante | KAITS | Sophia | TOTVS | ClassApp | Agenda Edu | ClipEscola | Sponte | Proesc | School Lab decision |
|-------|-----|----------|-------|--------|-------|----------|------------|------------|--------|--------|---------------------|
| Primary billing unit | DIV-financial-001 | Enrollment receivables | + per-lesson/credits/packages | AR/AP integrated ERP | Enterprise AR/NFS-e | **ClassPay charges** | Pagamentos Digitais + ERP import | ClipPag mobile pay | Enrollment **mensalidades** | **Débito** + parcelas per tipo | Core: **enrollment receivables**; extensions per segment PRD |
| Payment product | DIV-financial-002 | Integrated gateway; support KYC | Receba Fácil KAITS | Bank integration + recurring card | Portal boleto/NF | **ClassPay** (embedded) | Native checkout + Pix | ClipPag automation | **Sponte Pay** (boleto, Pix, recurring card) | Boleto remessa + app pay + Meu caixa | Abstract `payment_gateway`; guided onboarding |
| Boleto protest | DIV-financial-003 | Documented workflow | Not mentioned | Not public | Not in harvest | Not in harvest | Not emphasized | Not public | Not in public corpus | Not emphasized in harvest | **No protest default**; softer dunning first |
| Early-payment discounts | DIV-financial-004 | Tiered by payment day | Not mentioned | Not public | Not in harvest | Régua + discounts mentioned | Planos de cobrança | Not public | Régua + payment links | Plan on trilha selection | Support tiered early-payment rules |
| NFS-e scope | DIV-financial-005 | Service NF for tuition | Service + product NF | Service + product NF | **Per-city** NF articles dominate CST | Not in scope | Financeiro module | Not public | NF-e, NFS-e, NFC-e automated | Dedicated NF module + checklist | NFS-e services in billing PRD; product NF later |
| Delinquency tooling | DIV-financial-006 | Protest + dunning (Edukante) | Prevention alerts | Marketing claim | CST finance tickets | **Inadimplências** dashboard + notify | Cobranças status + WhatsApp notify | ClipPag régua (opaque) | Régua + **Mensalidade Garantida** program | Reminder tracking + batch pay | Visual dunning builder + audit; no surprise automation |
| Signature metering | DIV-financial-007 | Not in Edukante corpus | Aceite online | Clicksign integration | Not in harvest | Contract signatures in matrículas | Contrato em massa | **ClipCoins** credits | E-signature in portal/app | Trilha + **Proesc Sign** module | Signatures in plan or transparent metering |
| Guaranteed revenue product | DIV-financial-008 | Not in corpus | Not mentioned | Not public | Not in harvest | Not in harvest | Not in harvest | Not public | **Mensalidade Garantida** (vendor assumes risk) | Not in harvest | **Out of core**; document as fintech partner pattern only |

## Communication domain

| Topic | DIV | Edukante | KAITS | Sophia | TOTVS | ClassApp | Agenda Edu | ClipEscola | Sponte | Proesc | School Lab decision |
|-------|-----|----------|-------|--------|-------|----------|------------|------------|--------|--------|---------------------|
| Primary channel | DIV-communication-001 | Portal + WhatsApp Web | App + campaigns | Terminal Web portal | Portal cliente | **In-app chat + canais** | **Multicanal** (msg + atendimento) | Agenda recados + chat | Portal + **Agenda Plus** chat | **Proesc Agenda** (comunicados + recados) | **Official audited channels**; MVP priority per product-map |
| Attendance / ticket channels | DIV-communication-002 | Not emphasized | Not emphasized | Support tickets (vendor) | CST tickets | **Canal com status** + CSAT | **Canais de atendimento** + CSAT | Auto-agendamento | In-app Atendimento Online | Lia chat → ticket (staff) | Service channels with SLA + satisfaction; family isolation |
| WhatsApp | DIV-communication-003 | Boleto delivery | WhatsApp web | WhatsApp Web desktop | Not in harvest | Not primary | **Payment notifications** | Not emphasized | Payment link delivery | Trilha resend via WhatsApp | WhatsApp as **adapter**; business rules in API |
| Guardian self-service cadastral | DIV-communication-004 | Portal edit | Portal | Portal edit | Portal import | **Mandatory CPF campaign** | Cadastro articles | Not public | School-issued portal URL/login | Trilha step 1 cadastral update | Progressive profiling; LGPD basis shown |
| Media / social features | DIV-communication-005 | Files on portal | Agenda virtual | Material access tracking | Not in harvest | **Momentos** feed | Mural de fotos | Photos/videos in agenda | Calendar + occurrences | Comunicados with optional likes/comments | Photos with retention policy; no vanity feed by default |
| AI support | DIV-communication-006 | Not in corpus | Not in corpus | Carol (RM) | Carol references | Virtual assistant 24h (marketing) | **Duda** AI agent | Not public | Not in public corpus | **Lia** virtual assistant (staff) | Defer AI; human escalation path first |
| Push notification scope | DIV-communication-007 | Not detailed | App alerts | Not public | Not in harvest | Push + email | Push articles | Not public | App notifications (occurrences, etc.) | **Only** rotina, recados, finance push | Explicit per-channel notification policy |

## Integration & go-to-market

| Topic | DIV | Edukante | KAITS | Sophia | TOTVS | ClassApp | Agenda Edu | ClipEscola | Sponte | Proesc | School Lab decision |
|-------|-----|----------|-------|--------|-------|----------|------------|------------|--------|--------|---------------------|
| Onboarding | DIV-integration-001 | White-glove implantação | Sales-led demo | Implantação + treinamentos | Enterprise project | In-app setup + many help articles | Manual vs ERP checklists | **2.5h express** | Demo-led; in-app support | Consultoria category + Lia | Self-serve with optional services tier |
| ERP strategy | DIV-integration-002 | Monolithic | Monolithic | Monolithic + satellites | Monolithic RM | **Best-of-breed** sync (**Sponte**, etc.) | **Sophia integration** + import web | **70+ ERP** partners | **Monolithic**; ERP sync **source** for partners | Monolithic + module extras | Own core domains; open API for adjuncts |
| Help taxonomy | DIV-integration-003 | Module (website) | Module (website) | Unknown (gated) | Product line (CST) | Module (Zendesk) | Module (Zendesk) | Unknown (gated) | Module (marketing) | **Persona** (Secretaria, Professor, …) | Module docs for School Lab; persona quick-starts |
| Pricing model | — | Not in corpus | Per active-student band | Not public | Enterprise license | Not public | Not public | Not public | Not public | Not public | Commercial decision separate from domain model |

## Open questions

1. KAITS self-service evaluation — marketing vs reality (needs demo).
2. TOTVS Educacional pedagogy docs — most behavior behind portal/TDN; CST harvest insufficient for grade flows.
3. ClassPay / Agenda Edu / ClipPag settlement timing and fee schedules — not fully public.
4. ClipEscola ClipCoins pricing and signature legal validity across states.
5. Agenda Edu **Manual** vs **ERP** install base split — affects competitive positioning.
6. Sophia knowledge base contents behind login — may change friction ranking.
7. **Sponte Mensalidade Garantida** — fee structure, eligibility rules, and interaction with standard dunning not public.
8. **Sponte segment matrix** — language-school feature gaps need demo validation before migration messaging.
9. **Proesc Agenda** commercial packaging — which comms features require add-on vs base ERP.

Flag new items in `docs/open-questions.md` when they block a PRD.

## Anchors

- [`edukante/`](edukante/)
- [`kaits/`](kaits/)
- [`sophia/`](sophia/)
- [`totvs/`](totvs/)
- [`classapp/`](classapp/)
- [`agenda-edu/`](agenda-edu/)
- [`clipescola/`](clipescola/)
- [`sponte/`](sponte/)
- [`proesc/`](proesc/)
