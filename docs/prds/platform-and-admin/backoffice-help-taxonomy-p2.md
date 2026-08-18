# Feature slice — Backoffice help taxonomy CMS (P2)

> Domain: [backoffice-evolution](backoffice-evolution.md) (E3)  
> Parent: UC-BOE14, `platform.configure_help_taxonomy`  
> Status: draft  
> Wave: **E3 P2** (may ship parallel to core ops)

## Requirements

| Field | Answer |
|-------|--------|
| Actor | Backoffice or content admin with `configure_help_taxonomy` |
| Trigger and precondition | [`DIV-integration-003`](../../ref/divergencias.md) persona model agreed |
| Observable outcome | CRUD help categories, module tags, persona links (secretary, teacher, guardian); no article body authoring in this slice — taxonomy only |
| Adversarial cases | Public help search not exposed until content exists; school staff cannot edit taxonomy |
| Non-goals | (see section below) |

## Bar

**Reference:** Proesc/Sophia in-app help organized by module and role — taxonomy without full CMS in P2.  
**Rationale:** Unblocks `academic.search_help_center` and BC5 product access linking.  
**Recognizably bad:** yes — hardcoded help links in SPA with no operator-maintained structure.

## Acceptance criteria

1. Given operator creates category "Financeiro" with persona `secretary`, when saving, then `POST /api/v1/platform/help_taxonomy/categories` persists and returns id.
   → UC-BOE14 [P2]

2. Given category C linked to module `billing`, when school SPA help drawer loads (future), then taxonomy API returns C for billing context.
   → [`DIV-integration-003`](../../ref/divergencias.md)

3. Given operator deletes unused category, when no articles reference it (articles out of scope), then delete succeeds.
   → [invented]

4. Given school staff user, when calling taxonomy mutate API, then 403.
   → NFR-003

5. Given taxonomy CRUD, when any mutation occurs, then audit row written.
   → NFR-005

## Non-goals

- Markdown/HTML article editor
- Public marketing site help (`site/`)
- AI-generated articles
- Guardian-facing help in backoffice UI (read via school SPA)

## Harness notes

- **Separate menu item** from core ops — may live under `/help-taxonomy` in backoffice or future content admin SPA.
- **Brief slice:** Full CMS is out of scope; this file covers taxonomy CRUD only per evolution PRD.
- **Blocked partially** on persona list alignment with identity role templates.
