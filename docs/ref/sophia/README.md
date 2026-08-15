# Sophia — competitive corpus

Harvest date: **2026-08-15**

| Field | Value |
|-------|-------|
| Source type | Public marketing pages (no public help center) |
| Maturity | `claimed_not_verified` — feature claims from marketing; knowledge base login-gated |
| Pages harvested | 3 |
| Capabilities derived | 3 (100% article coverage) |
| Domains covered | `gestao-academica`, `gestao-financeira`, `comunicacao` |

### Capability breakdown (from `coverage.json`)

| School Lab domain | Capabilities |
|-------------------|--------------|
| `billing` | 2 |
| `communication` | 1 |

## Source taxonomy

Sophia does **not** publish a self-service help center. The **Base de Conhecimento**
lives inside the authenticated **Área do Cliente** (login required).
([nova área do cliente](https://sophia.com.br/nova-area-do-cliente-e-lancada-com-recursos-adicionais-para-os-usuarios/))

- Taxonomy on the public site is **module-oriented**: Financeiro, Acadêmico/Pedagógico,
  Comunicação, Secretaria, Controle Completo.
- Heavy **implementation-led onboarding** (implantação, treinamentos, configurações).
- Product mental model: desktop-first ERP with web portal for guardians (`Terminal Web`).

### Primary URLs

- https://sophia.com.br/sophia-gestao-escolar/
- https://sophia.com.br/home/
- https://sophia.com.br/suporte/ (remote-access utilities only)

**Out of scope:** authenticated Área do Cliente knowledge base, product UI,
Untis/Philos/Odilo satellite products, payroll module depth.

Cross-competitor comparison: [`../divergencias.md`](../divergencias.md).
