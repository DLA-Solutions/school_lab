> LGPD / privacy guardrails for children's data (always applies)
>
> **Always relevant** — read this whenever working anywhere in the repo.

# LGPD / Privacy Guardrails

This product handles **children's data** — treat privacy as a hard requirement.

- Enforce per-family isolation: a parent must never see another family's messages/records. Enforce via Pundit policies + services, same rigor as per-school isolation.
- Minimize access and collect only necessary data; guardian consent is the legal basis for a child's data.
- Health/sensitive fields (routine, medications, incidents) need extra care in storage/retention.
- When adding features touching messages, photos, routine, or the digital archive, note retention and access-audit implications and flag open items in `docs/open-questions.md` (LGPD section).
