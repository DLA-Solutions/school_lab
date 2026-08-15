# PRD — Documents & Archive: Retention (BC2)

> Status: validated *(P2 policy — MVP hooks only)*  
> Parent PRD: [`index.md`](index.md)  
> Capability IDs: `documents.manage_retention_policy` (P2)  
> Related BCs: [`archive.md`](archive.md), [`communication/media.md`](../communication/media.md), [`retention.md`](../../product/non-functional-requirements.md) NFR-002  
> Modeling: *(pending — extends `docs/modeling/008-documents-archive.md`)*

---

## Objective

Define **retention policy hooks** for the digital archive: what MVP assumes by default, what
phase 2 configures, and how retention interacts with LGPD, communication media, and audit/legal
hold — without implementing purge automation in MVP.

---

## Competitive grounding

| Capability | `capability_id` | Evidence |
|------------|-----------------|----------|
| Manage retention policy | `documents.manage_retention_policy` | `[invented]` — taxonomy decision for LGPD; competitor corpus thin on archive retention UI |

Cross-reference: [`DIV-communication-005`](../../ref/divergencias.md) — photos with retention,
no vanity feed (communication domain parallel).

---

## Segment applicability

| Segment | Applies | Notes |
|---------|---------|-------|
| `infantil` | yes | Health/routine docs may need longer retention — open item |
| `fundamental_medio` | yes | Academic and enrollment records |
| `pj_financeiro` | yes | Contract retention aligns with billing records |
| `multi_unidade` | partial | Policy per `school_id` in P2 |

---

## Context

NFR-002 requires defined retention for communication media and digital archive
([`non-functional-requirements.md`](../../product/non-functional-requirements.md) § NFR-002).
Legal validation is **pending** ([`open-questions.md`](../../open-questions.md) § Digital archive;
§ LGPD).

**MVP stance:** archive entries are **retained indefinitely** at platform default until P2 policy
UI ships. No automated purge job in MVP. Soft-deleted entries (Discard) remain in storage for
audit reconstruction.

**P2 stance:** schools configure retention rules by `document_type` with optional legal-minimum
floors enforced by platform `[product decision]`.

**Boundary:** communication message photos follow **comms retention** — deleting a message photo
does not automatically delete a copy saved to student archive (separate entry lineage).

---

## Business Rules

BR-RET01

**MVP default:** no automatic hard delete of archive blobs. `discarded_at` hides entries from
product UI; bytes remain until P2 purge or manual backoffice action.

BR-RET02

**P2 retention policy** rows are scoped by `school_id`, target `document_type` (or `*` wildcard),
`retention_days` after `created_at` or after `enrollment_end` `[product decision]`, and
`action: archive_only | purge_blob`.

BR-RET03

**Legal hold:** entries with `legal_hold: true` skip purge regardless of policy (P2). MVP staff
may set hold via backoffice only `[product decision]` or defer to P2.

BR-RET04

**Sensitive types** (`health`, `incident`, `identity_document`) require **explicit policy** in P2
— cannot use wildcard purge without director confirmation `[product decision]`.

BR-RET05

**Audit export artifacts** (`audit_exports` ZIP) expire per download token (see [`archive.md`](archive.md));
retention of export files on storage is shorter than archive entries (e.g., 30 days default).

BR-RET06

**Version chains:** purging a superseded entry removes blob only if no other entry references
same blob hash and legal hold is false.

BR-RET07

**Cross-domain:** purging enrollment contract PDF must not delete billing `contracts` row — billing
retains financial audit; archive purge is blob-level with manifest log.

BR-RET08

**Communication media:** `communication.attach_files_to_message` retention is configured in comms
module P2; not readable from documents retention UI except shared **platform default** display
`[product decision]`.

BR-RET09

**Guardian erasure requests (LGPD):** process deferred to identity/legal playbook — archive
entries may require legal hold or anonymized metadata with blob purge `[product decision]`;
flag in [`open-questions.md`](../../open-questions.md) § LGPD.

---

## Use Cases

### UC-RET01 — Apply platform default retention (MVP — implicit)

No user action. All entries retained; discarded entries hidden.

**Status:** MVP behavior (BR-RET01).

### UC-RET02 — Configure retention policy (P2)

Input: `document_type`, `retention_days`, `action`.

Flow

1. Validate `manage_retention_policy` (director or backoffice).
2. Save policy; schedule nightly `RetentionSweepJob`.
3. Job evaluates entries past retention, respects legal hold (BR-RET03, BR-RET04).
4. Purge or mark `retention_purged_at`; audit log immutable.

**Status:** not started.

### UC-RET03 — Set legal hold on entry (P2)

Input: `archive_entry_id`, `hold: true | false`, reason.

Flow

1. Director or backoffice only.
2. Audit hold toggle; exclude from sweep.

**Status:** not started.

---

## API (P2 preview)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/schools/:school_id/archive/retention_policies` | List policies |
| PUT | `/api/v1/schools/:school_id/archive/retention_policies` | Upsert by document_type |
| POST | `/api/v1/schools/:school_id/archive/entries/:id/legal_hold` | Toggle hold |

MVP: no public API — platform default only.

---

## Database (P2 preview)

| Entity | Purpose |
|--------|---------|
| `retention_policies` | Per-school type rules (BR-RET02) |
| `retention_sweep_logs` | Job audit of purged entry ids |

MVP: optional `retention_purged_at` column on `archive_entries` reserved nullable.

---

## Events (P2 preview)

| Event | Trigger |
|-------|---------|
| `ArchiveEntryPurged` | Retention sweep |
| `RetentionPolicyUpdated` | UC-RET02 |

---

## Permissions (P2 preview)

| Action | Permission key |
|--------|----------------|
| Configure retention | `manage_retention_policy` |
| Legal hold | `manage_legal_hold` or backoffice |

---

## Non-functional requirements

- **NFR-002:** Retention supports minimization and lawful basis documentation once legal validates windows.
- **NFR-005:** Purge and policy changes audited; purge logs immutable.
- **NFR-001:** Retention sweep idempotent per entry.

---

## Acceptance Criteria

AC-RET01 (MVP)

- [ ] Given MVP deployment with no retention UI, When entry is soft-deleted, Then blob remains stored and entry excluded from search
- Source: BR-RET01 `[product decision]`

AC-RET02 (P2)

- [ ] Given school sets 365-day retention on `incident_attachment`, When sweep runs after period, Then eligible entries without legal hold are purged and logged
- Source: `documents.manage_retention_policy`

AC-RET03 (P2)

- [ ] Given entry under legal hold, When retention period elapses, Then entry is not purged
- Source: BR-RET03

AC-RET04

- [ ] Given communication photo deleted per comms policy, When same file was saved to student archive, Then archive copy remains unless separately purged
- Source: BR-RET08

---

## Open items / pending decisions

- [ ] Legal retention minimums by document type (Brazilian private school context)
- [ ] Retention anchor: upload date vs enrollment end vs student majority
- [ ] Guardian erasure vs Conselho audit conflict — [`open-questions.md`](../../open-questions.md) § LGPD
- [ ] Unified vs separate retention UI for comms media and archive
- [ ] Backoffice emergency purge procedure

---

## Out of Scope

- MVP automated purge
- Livro Ata-specific retention (P2 livro-ata PRD)
- Billing financial record retention (billing domain — charges/payments immutable)
- Implementation in `web/` until archive W1 ships and legal windows validated
