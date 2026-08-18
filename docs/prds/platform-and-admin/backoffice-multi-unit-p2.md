# Feature slice — Backoffice multi-unit (P2)

> Domain: [backoffice-evolution](backoffice-evolution.md) (E3)  
> Parent: BR-BOE09, UC-BOE13  
> Status: draft  
> Wave: **E3 P2**

## Requirements

| Field | Answer |
|-------|--------|
| Actor | Backoffice user with `platform.manage_multi_unit` |
| Trigger and precondition | [`DIV-academic-008`](../../ref/divergencias.md) decision applied; `school_groups` table modeled |
| Observable outcome | CRUD school groups; assign `school.school_group_id`; list schools by group; group-level name and metadata only — no cross-school academic roll-up in P2 MVP |
| Adversarial cases | School belongs to at most one group; discard group with schools → 409 or unlink required |
| Non-goals | (see section below) |

## Bar

**Reference:** Proesc multi-unidade / rede patterns — [`DIV-academic-008`](../../ref/divergencias.md)  
**Rationale:** MVP one-tenant-per-campus blocks enterprise deals; groups are container first.  
**Recognizably bad:** yes — duplicate manual tracking of which campuses belong to same network.

## Acceptance criteria

1. Given operator creates group G "Rede ABC", when assigning schools S1 and S2 to G, then both show `school_group_id` G on tenant detail.
   → BR-BOE09

2. Given group G with schools, when operator lists `GET /api/v1/platform/school_groups/G/schools`, then only member schools return.
   → UC-BOE13

3. Given school S in group G, when academic API called with school scope S, then no automatic data from sibling schools leaks.
   → NFR-003

4. Given operator deletes empty group G, when confirming, then group removed and former members have null `school_group_id`.
   → [invented]

5. Given operator attempts delete of G with member schools, when submitting, then 409 with message to unlink schools first.
   → [invented]

## Non-goals

- Consolidated financial reporting across campuses
- Shared staff membership across schools (identity P2+)
- Group-level school year (each school keeps own year)
- Academic multi-school views (`academic.configure_multi_school`) — consumer only

## Harness notes

- **Modeling first:** migration-agent for `school_groups`, FK on `schools`.
- **Sequence:** multi-unit before platform billing if enterprise pricing is per-group (open question).
- **UI:** `/school-groups` CRUD in backoffice; group chip on tenant detail.
