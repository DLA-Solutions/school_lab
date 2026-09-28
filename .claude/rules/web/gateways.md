> External API adapters — boleto, FCM; thin port over integrations lib
>
> **Relevant when touching:** `web/app/services/gateways/**/*.rb`, `web/spec/gateways/**/*.rb`, `web/app/services/**/*.rb`

# web/ — Gateway Adapters

Full guide: `docs/guidelines/web/gateways.md`. Integrations: rule `integrations`, skill `use-vendor-integration`. Transport: rule `http-client`. Related: `services`, `jobs`.

## Role

- Wrap third-party APIs (boleto, FCM) behind small port interfaces — services stay provider-agnostic.
- Inject via constructor — no `Client.new` hidden in services.

## Design

- Vendor HTTP lives in `lib/school_lab/integrations/` — adapter + mappers only under `gateways/`.
- Adapter owns `ErrorMapper` (lib errors → port errors) and client factory wiring.
- Plain Ruby in/out; port `TransientError` for job `retry_on`.
- Gateway does not query tenant data globally — services pass scoped records.
- `Fake` implementation for tests; WebMock only for integration/adapter unit specs.

## When to skip

- Active Storage S3 — Rails config. Email — mailer + env until second provider.
