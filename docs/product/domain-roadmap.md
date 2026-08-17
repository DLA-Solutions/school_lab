# Domain roadmap

Delivery status for requirement domains listed in [`product-map.md`](../product-map.md) §5.
Update this table when a PRD, modeling doc, or API narrative reaches a new maturity level.

**Status legend**

| PRD / modeling / API | Meaning |
|----------------------|---------|
| — | Not started |
| draft | Written; not partner-validated |
| in progress | Active modeling or partial implementation |
| implemented | Shipped in `web/` (may still have open PRD items) |
| validated | Documentation-phase sign-off (anchor + corpus grounding); live partner workshop is separate |
| draft (modeling/API) | Narrative written; DBML hardening and rswag pending |
| frozen W1 (4C.x) | API narrative frozen for a domain wave (e.g. Platform school year — Phase 4C.1) |
| phase 2 | Explicitly deferred post-MVP |

**Capability IDs:** canonical taxonomy in [`capability-taxonomy.yaml`](capability-taxonomy.yaml)
with aliases in [`capability-aliases.jsonl`](../ref/capability-aliases.jsonl). Per-capability
School Lab decisions, phases, and MVP parity gaps: [`capability-map.md`](capability-map.md)
(**191** rows; regen via `--generate-capability-map`). Competitor presence:
[`parity-matrix.md`](parity-matrix.md). **Billing:** 543/543 raw
IDs mapped (100%). **Communication:** 499/499 (100%; **46** canonicals). **Academic:** 140/140
(100%; **34** canonicals). **Students:** 69/69 (100%; **20** canonicals). **Identity:** 38/38
(100%; **15** canonicals). **Platform:** 35/35 (100%; **13** canonicals). **Documents:** 1/1
(100%; **12** canonicals). **Overall:** **1,325/1,325 (100%)** — Phase 1 alias gate **complete**.
See [`taxonomy-report.json`](../ref/taxonomy-report.json).

| # | Domain | PRD | Modeling | API | Dependencies | Notes |
|---|--------|-----|----------|-----|--------------|-------|
| 1 | Product vision & scope | validated | — | — | — | Anchor: [`vision.md`](../vision.md) |
| 2 | Multi-tenancy & schools | validated | in progress | in progress | — | [`prds/identity-and-onboarding/`](../prds/identity-and-onboarding/); modeling [`004-school-onboarding.md`](../modeling/004-school-onboarding.md) |
| 3 | Identity & roles | validated | in progress | in progress | #2 | BC slices: auth, invites, profiles, consent; [`003-identity-permissions.md`](../modeling/003-identity-permissions.md); [`identity-onboarding.md`](../api/v1/identity-onboarding.md) |
| 4 | Students & enrollments | validated | validated | draft | #3, #9 | [`005-students-enrollments.md`](../modeling/005-students-enrollments.md); DBML validated and published; DER exported; [`students-and-enrollments.md`](../api/v1/students-and-enrollments.md) |
| 5 | Communication | validated | validated | draft | #3, #4 | [`006-communication.md`](../modeling/006-communication.md) DBML validated Phase 4B.2; [`communication.md`](../api/v1/communication.md) |
| 6 | Academic | validated | validated | draft *(report-card narrative reconciled; OpenAPI pending)* | #4, #5, #9 | [`007-academic.md`](../modeling/007-academic.md); report-card prerequisite/snapshot narrative reconciled but not frozen; implemented Preceptoria backfilled with an authorization hardening blocker; executable freeze awaits rswag; [`academic.md`](../api/v1/academic.md) |
| 7 | Billing | validated *(tax release legally gated)* | implemented baseline + validated declaration model | implemented baseline; tax narrative draft, OpenAPI pending | #3, #8 | [`billing/`](../prds/billing/) validated; automatic annual payer declaration model/narrative added; legal/accounting release blockers remain; [`billing.md`](../api/v1/billing.md) |
| 8 | Documents & digital archive | validated | validated | draft + implemented requests backfill | #4 | [`008-documents-archive.md`](../modeling/008-documents-archive.md); guardian Meus pedidos/Solicitações backfilled; tax declaration calculation stays in billing |
| 9 | Platform & admin | validated | validated | **frozen W1 (4C.1)** | #2, #3 | [`009-platform-admin.md`](../modeling/009-platform-admin.md); Wave 1 DBML validated; API W1 frozen 2026-08-15; W2–W5 deferred 4C.1b; [`platform-and-admin.md`](../api/v1/platform-and-admin.md); `school_year_id` contract |
| 10 | Livro Ata, formal minutes & digital signature | phase 2 | — | — | #8 | High priority post-MVP; future `livro-ata.md`, `contracts.md`, `certificates.md` under documents folder |
| 11 | Landing / sales | phase 2 | — | — | — | [`site/`](../product-map.md) placeholder |

## Derived / historical PRDs

Cross-cutting and historical records. **Normative billing** is [`billing/`](../prds/billing/).
The fintech-first entry is the **implemented partner baseline** in `web/` — not a product
strategy label.

| PRD | Scope | PRD status | Modeling | API | Notes |
|-----|-------|------------|----------|-----|-------|
| [`fintech-first`](../prds/fintech-first.md) | Billing partner slice (historical baseline) | implemented | [`001-fintech-first`](../modeling/001-fintech-first.md) | [`fintech-first`](../api/v1/fintech-first.md) | Superseded for **new** billing requirements by [`billing/`](../prds/billing/); identity supersedes partial UC/BR |
| [`billing/`](../prds/billing/) | Full MVP billing domain | validated | [`001-fintech-first`](../modeling/001-fintech-first.md) *(baseline + PRD delta)* | [`billing.md`](../api/v1/billing.md) | Extends fintech-first; régua automation deferred Aug 2026; MVP gap tables in DBML Phase 4B.3 |
| [`fintech-first/resend-boleto`](../prds/fintech-first/resend-boleto.md) | Feature slice | absorbed | — | [`billing.md`](../api/v1/billing.md) | Merged into [`billing/boletos.md`](../prds/billing/boletos.md) |
| [`layer-web-spa`](../prds/layer-web-spa.md) | Frontend design system + MVP menus | draft | — | — | Layer PRD |
| [`layer-mobile-app`](../prds/layer-mobile-app.md) | Mobile guardian/teacher MVP | draft | — | — | Layer PRD |

## Suggested maturation order (implementation)

1. **Platform school year** (009) — unblocks enrollments and academic periods.
2. **Students & enrollments** (005) — base records for comms and academic.
3. **Communication** (006) — MVP priority pillar.
4. **Academic** (007) — attendance reliability (NFR-001).
5. **Billing** — extend `web/` beyond fintech-first per billing PRD waves.
6. **Documents & archive** (008).
7. **Identity** — remaining W2–W4 onboarding waves (partial code exists).

**Phase 4 documentation gate (2026-08-15):** all **7** domain PRDs **`validated`** (doc sign-off).
Modeling **005**, **006**, **007**, **008**, and **009 Wave 1** have validated DBML/narratives;
billing DBML delta documented in **001** appendix. Cross-domain API narratives for **005–008** and Platform **W2–W5** remain draft. **Platform W1**
(school years, periods, holidays) is **frozen** (Phase 4C.1 — 2026-08-15). Layer PRDs remain
**draft**. Engineering W1 implementation may proceed against frozen Platform contract.

Billing-first partner delivery (`fintech-first`) is **complete** in `web/` for the validating
school. Future waves follow the maturation order above; see [`fintech-first.md`](../prds/fintech-first.md)
positioning note (historical baseline only).

## Planned product artifacts

| Artifact | Phase | Status | Purpose |
|----------|-------|--------|---------|
| `capability-taxonomy.yaml` | 1 | **Complete** (all catalog domains curated) | Canonical capability inventory |
| `capability-aliases.jsonl` | 1 | **Complete** (**1,325/1,325** raw IDs mapped) | Raw catalog → canonical mapping |
| `capability-map.md` | 2 | **Complete** | Per-capability School Lab decisions; links blockers to open questions |
| `parity-matrix.md` | 2 | **Complete** | Competitor vs School Lab coverage |
| `mvp-scope.md` | 2 | **Complete** | **124** MVP capabilities; P2/N/A inventory; vision exclusions |
| `non-functional-requirements.md` | 2 | **Complete** | Cross-cutting NFR catalog for PRD template links |
