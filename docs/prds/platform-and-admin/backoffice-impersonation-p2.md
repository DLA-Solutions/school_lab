# Feature slice — Backoffice impersonation (P2)

> Domain: [backoffice-evolution](backoffice-evolution.md) (E3)  
> Parent: BR-BOE07, UC-BOE11  
> Status: draft — **blocked on policy**  
> Wave: **E3 P2**

## Requirements

| Field | Answer |
|-------|--------|
| Actor | Backoffice user with impersonation permission (TBD) |
| Trigger and precondition | Impersonation policy approved ([`open-questions.md`](../../open-questions.md)); target school S active |
| Observable outcome | Operator starts session → receives scoped JWT → school SPA opens with non-dismissable banner "Modo suporte DLA"; all actions audited as impersonated; session ends via explicit stop or TTL |
| Adversarial cases | Cannot impersonate guardian without extra consent; cannot escalate to backoffice from impersonation token; TTL enforced server-side |
| Non-goals | (see section below) |

## Bar

**Reference:** Common SaaS support login-as with audit — `[product decision]` pending LGPD review for children's data context.  
**Rationale:** Reduce time-to-resolve without sharing passwords.  
**Recognizably bad:** yes — support uses shared owner password with no audit trail.

## Acceptance criteria

1. Given approved operator B and school S, when B starts impersonation as director template user, then `POST /api/v1/platform/impersonations` returns scoped token and `ImpersonationStarted` audit row.
   → BR-BOE07 [blocked]

2. Given active impersonation session, when user loads school SPA, then banner displays operator identity and school name until session ends.
   → [blocked]

3. Given impersonation session, when operator performs PATCH on school resource, then audit attributes action to operator B with `impersonating: true`.
   → NFR-005

4. Given session TTL elapsed, when user requests API, then 401 and banner prompts re-auth as operator.
   → [blocked]

5. Given operator ends session via backoffice, then `DELETE /platform/impersonations/:id` invalidates token immediately.
   → UC-BOE11

## Non-goals

- Impersonate guardian (family isolation — separate high-risk flow)
- Permanent delegated access (use proper staff invite)
- Mobile app impersonation in first P2 ship
- Silent impersonation without banner

## Harness notes

- **Blocked:** Policy questions in open-questions must close before rails-implementer work.
- **Identity extension:** JWT claims `impersonated_by`, middleware enforcement in `web/`.
- **Frontend:** Banner in `frontend/app` shell only; backoffice start/stop UI.
