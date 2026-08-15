# Domain model — financial management (KAITS)

Harvest: 2026-08-14.

## Core entities

### Receivable / charge (`cobrança`)

Financial obligations tied to enrollments, packages, or per-lesson consumption.
Collection via **Receba Fácil KAITS** (branded payment product) or traditional
bank boleto generation.

Sources: [homepage](https://kaits.com.br/), [educação básica](https://kaits.com.br/sistema-para-escola-educacao-basica/)

### Billing models (language schools & flexible courses)

KAITS explicitly supports multiple concurrent models:

| Model | Description |
|-------|-------------|
| Per lesson | Charge per attended class |
| Per teaching hour | Hour/aula billing |
| Prepaid credits | Credit balance consumed per lesson |
| Postpaid credits | Lessons accumulated then invoiced |
| Monthly tuition | Fixed mensalidade |
| Packages | Bundled lesson/product packages |

Source: [escola de idiomas](https://kaits.com.br/sistema-para-escola-de-idiomas/)

### Payment rails — Receba Fácil KAITS

Integrated product (marketing: lower fees, faster settlement):

| Rail | Features |
|------|----------|
| Boleto | National banks + cooperatives; auto issue and settlement (`baixa`) |
| Pix | QR code |
| Card | Recurrence and payment links (implied) |
| Payment link | Shareable link without portal login |

Sources: [homepage](https://kaits.com.br/), [escola de idiomas](https://kaits.com.br/sistema-para-escola-de-idiomas/)

### Delinquency prevention

- Scheduled auto-issuance and email delivery of boletos
- Due-date warning emails
- Personalized collection (`cobrança personalizada`)
- Second boleto copy in student portal
- Delinquent tracking and collection workflows in finance module

Sources: [educação básica](https://kaits.com.br/sistema-para-escola-educacao-basica/), [homepage](https://kaits.com.br/)

### Cash management

| Entity | Role |
|--------|------|
| Cash flow (`fluxo de caixa`) | Inflows/outflows; planning vs realization |
| Cost plan (`plano de custo`) | Expense categories |
| Cash center (`centro de caixa`) | Account/cash grouping |
| Inventory (`estoque`) | Teaching material sales and delivery |

Sources: [homepage](https://kaits.com.br/), [blog educação básica](https://kaits.com.br/educacao-basica/)

### Fiscal documents

- **NF-e serviço** — integrated with city hall (`prefeitura`)
- **NF produto** — product invoices (inventory-related)

Source: [homepage FAQ](https://kaits.com.br/)

### Commercial / CRM overlap

- Lead capture from school website (API integration)
- Follow-up tracking
- Batch email campaigns with filters: expiring enrollments, birthdays, former students
- Seller commission not mentioned on public pages

Sources: [homepage](https://kaits.com.br/), [cursos livres](https://kaits.com.br/sistema-para-cursos-livres/)

### Pricing (vendor SaaS)

School pays KAITS by **active-student band**; unlimited internal users.
Source: [homepage FAQ](https://kaits.com.br/)

## Integration with academic domain

```
enrollment created → receivables per billing model
lesson delivered → per-lesson / credit consumption (language schools)
online enrollment paid → student + enrollment + payment in one flow
financial guardian → boleto delivery and portal finance access
inventory sale → product NF + stock movement
```

Sources: [homepage](https://kaits.com.br/), [escola de idiomas](https://kaits.com.br/sistema-para-escola-de-idiomas/)

## Not observed on public pages

The following Edukante-documented capabilities were **not** found in KAITS public
marketing (may still exist in product):

- Payroll (`folha de pagamento`)
- Boleto protest (`protesto`)
- Tiered early-payment discount rules
- Field-level receivable audit log
- Payment gateway KYC workflow details

Treat as corpus gaps, not confirmed absences.
