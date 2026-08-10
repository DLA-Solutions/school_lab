# Design Principles

Cross-cutting engineering standards for implementation. Applies to `web/`, `mobile/`, and
future surfaces.

Rule: `.cursor/rules/core/design-principles.mdc`.

## Duplication over bad abstraction

> Better duplicated code than a wrong abstraction.

Abstract only when a pattern is **stable and repeated** — not on the first or second
occurrence. Until then, explicit duplication is preferable to premature concerns, base
classes, or generic helpers.

**Rule of thumb:** extract on the **third** similar case, when the shape is clear and the
abstraction has a single, obvious name.

## SOLID in practice

Apply SOLID when designing services, policies, and adapters — not as ceremony, but as a
check on cohesion and coupling.

| Principle | School Lab application |
|-----------|------------------------|
| **S** — Single responsibility | One service = one use case (`Billing::IssueChargeService`, not issue + notify + report) |
| **O** — Open/closed | Extend via new services or adapters, not `if provider == :x` scattered in code |
| **L** — Liskov substitution | Adapters behind a port are interchangeable (`Gateways::BankSlip::Cora::Adapter`, `Gateways::BankSlip::Fake`); fakes work in tests |
| **I** — Interface segregation | Small, focused policies; no god-policy covering unrelated actions |
| **D** — Dependency inversion | Inject external dependencies at boundaries (gateways, mailers); no `Client.new` hidden mid-service |

## Accepted abstractions (project decisions)

These are intentional boundaries — do not second-guess them, but do not add layers inside
them without cause:

| Abstraction | Role |
|-------------|------|
| Service objects (`Domain::VerbService`) | Business logic entry point |
| Pundit policies | Authorization |
| Serializers (blueprinter) | API output shape |
| Return / result objects | Service success and failure channels |
| `SchoolLab::Integrations::<Vendor>` | Vendor HTTP client, OAuth, ENV config, vendor errors |
| Gateway adapters | Port contract — domain ↔ vendor mapping, registry |

## Coupling and cohesion

**Maximize cohesion:** code that changes together lives together. A model owns persistence
and simple invariants; business workflows live in services.

**Minimize coupling:**

- A service may know its domain models; avoid long chains of cross-domain service calls.
  If A → B → C → D is needed, consider an event, a job, or a higher-level orchestrator.
- Controllers orchestrate HTTP only — call one service, render the result.
- Tests requiring many unrelated factories are a smell: the unit under test may be doing
  too much or depending on too many domains.

## When to refactor

Refactor when:

- The same logic appears three times with the same shape
- A service exceeds one clear responsibility
- Tests become hard to set up because of hidden dependencies
- A change in one domain forces edits across unrelated domains

Do **not** refactor preemptively "for cleanliness" before the pattern is proven.
