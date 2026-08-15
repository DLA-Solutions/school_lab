# Feature slice — [Feature name]

> Domain: [domain](../domain-prd.md)
> Status: draft — codelet execution contract
> Corpus area: [gestao-financeira | comunicacao | gestao-academica | n/a]

## Requirements

| Field | Answer |
|-------|--------|
| Actor | [who, role, surface, permission] |
| Trigger and precondition | [state + trigger event] |
| Observable outcome | [checkable result without asking builder] |
| Adversarial cases | [prioritized edge cases for this delivery] |
| Non-goals | (see section below) |

## Bar

**Reference:** [concrete path, product, or metric]
**Rationale:** [one sentence — why this bar]
**Recognizably bad:** [no | yes — dimension to beat]

## Acceptance criteria

1. Given [initial state], when [action], then [observable outcome].
   → docs/ref/... or [invented]

2. Given [adversarial state], when [action], then [observable outcome].
   → docs/ref/... or [invented]

## Non-goals

- [explicit out-of-scope item]
- [another non-goal]

---

**Distinction from domain PRD ACs:** domain PRD acceptance criteria are product-level outcome bullets. Feature slice ACs are **full GWT scenarios** verifiable by codelet critics — finer granularity, one shippable unit.
