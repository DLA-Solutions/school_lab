# Web Stack — School Lab

> Folders: `web/` (Rails API), `frontend/main` (React SPA), `app/` (React Native)  
> Status: finalized decision (web layer)

Rails 8.1 API monolith with a versioned JSON REST API consumed by **React web** and
**React Native** clients. Many schools in the same system. Minimal infrastructure in
the MVP: app + PostgreSQL + S3.

## 1. Summary

| Layer | Technology |
|--------|------------|
| Language | Ruby 4.0.x |
| Framework | Rails 8.1.x |
| API | REST JSON `/api/v1` |
| Web UI | **React** SPA (`frontend/main`) — Vite |
| Mobile UI | **React Native** (`app/`) |
| API docs | **rswag** → OpenAPI (`swagger/v1/swagger.yaml`) |
| Database | PostgreSQL 16+ |
| Background jobs | Solid Queue (PostgreSQL) |
| Cache | Solid Cache in the MVP; Redis optional at scale |
| Storage | Active Storage → S3 |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Locale | pt-BR (API errors via i18n) |

**Pinned versions (Jul 2026):** Ruby 4.0.5, Rails 8.1.3.

## 2. Monorepo layout

```
school_lab/
  web/            # Rails — API, services, models, jobs (no Hotwire UI)
  frontend/main/  # React SPA — backoffice, school, teacher, guardian (web)
  frontend/base/  # upstream template the SPA started from — reference only
  app/            # React Native — school, teacher, parents (mobile)
  docs/api/       # API conventions + route narratives
```

| Folder | Role |
|--------|------|
| `web/` | Single source of business rules; `/api/v1` only for product UI |
| `frontend/main` | Consumes API with JWT; refresh via httpOnly cookie |
| `frontend/base` | Upstream template (`dashdark-x`); reference only, not the product |
| `app/` | Consumes same API; refresh in secure device storage |

All product controllers delegate to the same service objects — rules are not duplicated.

## 3. Web frontend (`frontend/main`)

React SPA on Vite + TypeScript; Tailwind planned.

| Concern | Approach |
|---------|----------|
| Routing | React Router (or TanStack Router) |
| API client | Fetch/axios + OpenAPI types (optional `openapi-typescript`) |
| Auth | Access token in memory; refresh in httpOnly cookie |
| State | Context / Zustand per feature |
| Styling | Tailwind CSS |

**Principle:** thin client — validation and business rules stay in the API.

## 4. Mobile frontend (`app/`)

React Native consuming the same `/api/v1` contract.

| Concern | Approach |
|---------|----------|
| Auth | JWT access in memory; refresh in Keychain/Keystore |
| Push | FCM device tokens via `POST /api/v1/me/device_tokens` |
| API client | Shared patterns with the web SPA where possible |

## 5. Authentication and authorization

| Channel | Mechanism |
|-------|-----------|
| **Web SPA** | JWT access (Bearer) + refresh **httpOnly cookie** |
| **Mobile (`app`)** | JWT access + refresh token (secure storage) |
| **Credentials** | **Devise** on `users` (password, reset, lock) |

Details: `docs/modeling/002-api-auth.md`.

| Token | TTL |
|-------|-----|
| Access JWT | 20 minutes |
| Refresh | 90 days sliding (180 with remember me) |
| Rotation | New refresh on every refresh call |

| Component | Decision |
|------------|---------|
| **Authorization** | Pundit — roles: backoffice, school, teacher, guardian |
| **Per-school isolation** | Path `/schools/:school_id/...` + Pundit + services |
| **Per-family isolation** | Guardian `.../me/...` routes + policies |

## 6. API

| Aspect | Decision |
|---------|---------|
| **Format** | REST JSON, versioned (`/api/v1/...`) |
| **Serialization** | **blueprinter** (provisional) |
| **Contracts** | OpenAPI via **rswag** request specs |
| **Conventions** | `docs/api/README.md` |
| **Fintech MVP routes** | `docs/api/v1/fintech-first.md` |

## 7. Domain layer

| Layer | Tool | Example |
|--------|------------|---------|
| **Models** | ActiveRecord + validations | `Student`, `Charge`, `Payment` |
| **Services** | Plain Ruby objects | `Billing::IssueChargeService`, `Auth::IssueTokensService` |
| **Forms** | ActiveModel form objects | Student registration with guardian |
| **Jobs** | ActiveJob + Solid Queue | Boleto issuance, email, push (FCM) |
| **Notifications** | FCM + state machine | Reliable push |
| **Uploads** | Active Storage + S3 | Documents, message images |
| **Auditing** | **audited** | Change history on domain records (`audits` table, jsonb) |
| **State machines** | **aasm** | Domain lifecycles (`status` column — charges, documents, push delivery) |
| **Pagination** | Pagy | List endpoints |
| **Search** | pg_search (MVP) | Search by name/CPF |
| **Soft delete** | **discard** gem | `discarded_at` on domain tables |

## 8. Supporting infrastructure

| Component | Technology | Notes |
|------------|------------|-------|
| **Database** | PostgreSQL 16+ | Data, queues (Solid Queue), cache (Solid Cache) |
| **Background jobs** | Solid Queue | ActiveJob; no Redis |
| **Cache** | Solid Cache (MVP) → Redis (scale) | Redis optional, cache only |
| **Real-time** | WebSocket client (phase 2) | Polling or push-first in MVP |
| **Push** | FCM via Solid Queue | Async delivery |
| **Storage** | Active Storage → S3 | Documents |
| **Server** | Puma | Rails default |
| **CORS** | rack-cors | Web SPA origins |

### Minimal infrastructure (MVP)

```
Rails API  →  PostgreSQL  →  S3
React SPA  →  CDN or static host
React Native → stores
```

### Push notifications (finalized decision)

Push delivery via **FCM**, queued in **Solid Queue**. Events pass through an **AASM**
state machine (see `docs/guidelines/web/state-machines.md`) before triggering push.

```
Event (e.g., attendance recorded)
  → Service validates state
  → State machine confirms transition
  → Job enqueued (Solid Queue)
  → Worker sends via FCM
  → App receives push
```

## 9. Testing

| Type | Tool |
|------|------|
| Unit / model / service | RSpec |
| API + OpenAPI | RSpec request specs + **rswag** |
| Web UI | Vitest + React Testing Library (in `frontend/main`) |
| Mobile | Jest + RN Testing Library (in `app/`) |
| Factories | FactoryBot |

Behavior-focused testing philosophy and conventions: `docs/guidelines/web/testing.md`.

## 10. Client surfaces

| Surface | Channel | MVP |
|---------|---------|-----|
| DLA backoffice | Web SPA | Yes |
| School admin | Web SPA (+ light `app`) | Yes |
| Teacher | Web SPA + `app` | Yes |
| Parents | `app` (+ web SPA phase 2) | App first for boletos |

## 11. Conventions

- Service objects in `app/services/`
- Policies in `app/policies/`
- API controllers in `app/controllers/api/v1/`
- Locale default: `pt-BR`

## 12. Out of scope

- GraphQL
- Microservices
- Redis for background jobs (Sidekiq)
- Server-rendered Hotwire as primary web UI (superseded by React SPA)

## 13. Architecture

```mermaid
flowchart TB
    subgraph clients [Clients]
        WebUI[React SPA]
        MobileApp[app React Native]
    end

    subgraph web [web/ — Rails 8.1]
        API[API v1 JSON]
        Services[Service Objects]
        Models[ActiveRecord]
        Jobs[ActiveJob]
        SQ[Solid Queue]
    end

    subgraph infra [Infra]
        PG[(PostgreSQL)]
        Redis[(Redis — optional)]
        S3[(S3)]
        FCM[FCM]
    end

    WebUI -->|JWT + cookie refresh| API
    MobileApp -->|JWT + secure refresh| API

    API --> Services
    Services --> Models
    Services --> Jobs

    Jobs --> SQ
    SQ --> PG
    Jobs --> FCM

    Models --> PG
    Models --> S3

    Services -.->|cache MVP| PG
    Services -.->|cache scale| Redis

    classDef optional stroke-dasharray: 5 5
    class Redis optional
```

### Detailed layers

```mermaid
flowchart TB
    subgraph clients [Clients]
        WebUI[Web SPA]
        MobileApp[app]
    end

    subgraph presentation [Presentation]
        API[API REST /api/v1]
    end

    subgraph domain [Domain — web/]
        Services[Service Objects]
        Policies[Pundit]
        Models[ActiveRecord]
    end

    subgraph async [Async]
        ActiveJob[ActiveJob]
        SolidQueue[Solid Queue]
    end

    subgraph data [Data]
        PG[(PostgreSQL)]
        S3[(S3)]
    end

    WebUI --> API
    MobileApp --> API

    API --> Services
    Services --> Policies
    Policies --> Models

    Services --> ActiveJob
    ActiveJob --> SolidQueue
    SolidQueue --> PG

    Models --> PG
    Models --> S3
```

## 14. Pending decisions

See `docs/open-questions.md` (Web stack section):

- Email provider (Postmark, SES, etc.)
- When to add Redis (cache only)

**Finalized decisions (Aug 2026):**

- **Bank slip (boleto): Cora** in *Integração Direta* (Direct Integration) on the school's
  own Cora account — the platform is not the payee. mTLS client certificate plus OAuth
  token, registered boleto with embedded Pix. Implemented behind the `Gateways::BankSlip`
  port (`cora` and `fake` adapters); see `docs/guidelines/web/gateways.md`.

**Finalized decisions (Jul 2026):**

- Language & framework: Ruby 4.0.5, Rails 8.1.3.
- **Web UI: React SPA** (`frontend/main`), not Hotwire.
- **Mobile: React Native** (`app/`).
- **One API** for web and mobile (`/api/v1`).
- Auth: Devise credentials + JWT access + `refresh_tokens`.
- Access 20 min; refresh 90 days sliding (180 remember me); rotation on refresh.
- Web refresh: httpOnly cookie; mobile: secure storage.
- API docs: **rswag** → OpenAPI.
- Serialization: **blueprinter** (provisional).
- Push: FCM + Solid Queue + state machine.
- Real-time WebSockets: phase 2 — MVP uses push + polling.

## 15. Phase 2 — technical directions (draft)

| Component | Likely direction | Notes |
|------------|------------------|-------|
| **Digital signature** | Proprietary or DocuSign/Authentique | Legal validation pending |
| **Livro Ata** | Minutes + signatory workflow | Shares signature infra |
| **Semantic search** | pgvector or external service | Minutes / archive |
| **Real-time** | WebSocket or Action Cable for messages | Optional upgrade from push |
