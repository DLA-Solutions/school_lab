# Proesc — competitive corpus

Harvest date: **2026-08-15**

| Field | Value |
|-------|-------|
| Source type | Public Zendesk help center |
| Help center URL | https://suporte.proesc.com/hc/pt-br |
| Articles harvested | 580 |
| Capabilities derived | 576 (100% article coverage) |
| Domains covered | `gestao-academica`, `gestao-financeira`, `comunicacao` |

## Source taxonomy

Proesc organizes help by **persona / role**, not by software module:

| Category (Zendesk) | Articles | Focus |
|--------------------|----------|-------|
| Secretaria | 122 | Enrollment, cadastros, matrículas, secretariat workflows |
| Financeiro | 103 | Débitos, boletos, caixa, NFS-e, cobrança |
| Professor | 55 | Diary, grades, activities, live classes |
| Coordenação | 38 | Academic oversight, boletim, diary delivery |
| Configurações | 92 | School setup, pré-matrícula trail, integrations |
| Módulos extras | 83 | Analytics, AEE, RH, certificates, transport, etc. |
| Proesc Agenda | 14 | Guardian/student app (comms, routine, payments) |
| Finalização de ano letivo | 13 | Year rollover checklist |
| Alunos e Responsáveis | 21 | Portal/app access for families |
| Central de relatórios | 5 | Report hub |
| Consultoria Proesc | 19 | Vendor consulting (out of product scope) |
| Escola pública | 4 | Public-school segment |
| Mais | 11 | Misc |

Persona-first taxonomy implies workflows are documented from the user’s job title;
cross-cutting flows (matrícula → financeiro → assinatura) appear in multiple categories.

### Primary URL

- https://suporte.proesc.com/hc/pt-br

**Out of scope:** authenticated school UI, Lia chat transcripts, Proesc Sign legal terms,
Consultoria Proesc service delivery, public-school-only modules unless they inform shared model.

## Article counts by domain (derived classification)

| School Lab domain | Capabilities |
|-------------------|--------------|
| `billing` | 246 |
| `communication` | 128 |
| `academic` | 113 |
| `students-and-enrollments` | 52 |
| `identity-and-onboarding` | 27 |
| `platform-and-admin` | 9 |
| `documents-and-archive` | 1 |

Capability inventory: [`gestao-academica/funcionalidades-por-ator.md`](gestao-academica/funcionalidades-por-ator.md),
[`gestao-financeira/funcionalidades-por-ator.md`](gestao-financeira/funcionalidades-por-ator.md),
[`comunicacao/funcionalidades-por-ator.md`](comunicacao/funcionalidades-por-ator.md).

Cross-competitor catalog: [`../catalogo-funcionalidades.md`](../catalogo-funcionalidades.md).
