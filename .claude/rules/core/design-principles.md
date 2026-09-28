> SOLID, coupling/cohesion, and cautious abstraction for all code
>
> **Always relevant** — read this whenever working anywhere in the repo.

# Design Principles

Full guide: `docs/guidelines/process/design-principles.md`.

- Better **duplicated code** than a wrong abstraction. Extract on the third stable case, not before.
- Apply **SOLID** pragmatically: one service per use case, inject dependencies at boundaries, small policies.
- **Maximize cohesion**, **minimize coupling** — controllers call one service; avoid long cross-domain service chains.
- Accepted abstractions (services, policies, serializers, gateway adapters) are project decisions — do not add layers inside them without cause.
