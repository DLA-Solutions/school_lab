# Architecture Decision Records (ADR)

Short, durable records of significant structural and technical decisions. Anchor docs
(`vision.md`, `product-map.md`, `web-stack.md`, `actors-and-surfaces.md`) stay the
high-level source of truth; ADRs capture **why** a decision was made and **what changes**.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [001](001-monorepo-surfaces.md) | Monorepo surfaces: `mobile/`, `frontend/app`, `frontend/backoffice`, `web/` | Accepted |
| [002](002-platform-billing-gateway.md) | Platform billing gateway port (`Gateways::PlatformSubscription`; Asaas first) | Accepted |

## Format

Each ADR includes: **Status**, **Context**, **Decision**, **Consequences**, and
**Migration** (when the decision is not yet fully reflected in the tree).

When an ADR is superseded, change its status to **Superseded** and link to the replacing ADR.
