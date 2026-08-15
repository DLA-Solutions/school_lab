# Domain model — financial (ClassApp / ClassPay)

Harvest: 2026-08-14.

## Entities

### Charge (`cobrança`)

Receivable sent to guardians via ClassPay; statuses tracked (pending, paid, overdue).
([cobranças](https://ajuda.classapp.com.br/hc/pt-br/articles/19673522008475))

### Delinquency panel (`inadimplências`)

Aggregates overdue charges with principal vs updated totals (fees), aging buckets,
student filters including **disabled students with open debt**.
([inadimplentes](https://ajuda.classapp.com.br/hc/pt-br/articles/1260804719849))

### Payout / settlement (`saque`)

School bank account onboarding; settlement timing for card payments documented separately.

### Dunning rule (`régua de cobrança`)

Automated reminder schedule for overdue charges.

### Enrollment contract (finance link)

Matrículas module links proposals/contracts to payment — overlaps enrollment domain.
