# Storage (Active Storage on Cloudflare R2)

Every uploaded file — guardian "Meus documentos", staff documents, incident attachments,
service-invoice PDF/XML, health-record PDFs, contract logos, authorized-pickup photos — is an
Active Storage attachment. In production they live in a **private Cloudflare R2 bucket**
(S3-compatible). Children's data: the bucket is never public (rule `lgpd-privacy`).

Stack: [`web-stack.md`](../../web-stack.md). Decision: [`open-questions.md`](../../open-questions.md)
§ Infrastructure. Configuration: `web/config/storage.yml`, `web/config/application.rb`,
`web/config/environments/production.rb`, `web/config/initializers/active_storage.rb`.

## Services per environment

| Environment | Service | Notes |
|-------------|---------|-------|
| development | `local` (Disk) | `web/storage` |
| test | `test` (Disk) | `tmp/storage`; specs never reach R2 |
| production | `r2` | `ACTIVE_STORAGE_SERVICE: r2` in `web/config/deploy.production.yml` |
| staging | `local` (Disk) | Own Kamal volume (`scholarpremium_staging_storage`); no R2 bucket |

Staging also runs with `RAILS_ENV=production`, so the service is chosen by the
`ACTIVE_STORAGE_SERVICE` variable, defaulting to `local`: a destination that forgets it keeps its
files on its volume and can never write into the production bucket. To give staging R2, create a
**separate** bucket and token and set the variables in `deploy.staging.yml` and the staging
secrets — never reuse the production bucket or token.

## Environment variables

| Variable | Kind | Purpose |
|----------|------|---------|
| `ACTIVE_STORAGE_SERVICE` | clear | `r2` selects the bucket; default `local` |
| `R2_ACCOUNT_ID` | clear | Builds `https://<id>.r2.cloudflarestorage.com` |
| `R2_BUCKET` | clear | Bucket name (`scholarpremium` in production) |
| `R2_ACCESS_KEY_ID` | secret | R2 API token, from `R2_ACCESS_KEY_ID_PRODUCTION` |
| `R2_SECRET_ACCESS_KEY` | secret | R2 API token, from `R2_SECRET_ACCESS_KEY_PRODUCTION` |

Credentials come from ENV only (Kamal secrets / GitHub Environment `production` secrets); never
commit them. Boot fails with a clear message when `r2` is selected and one is blank. Create the
API token in Cloudflare with **Object Read & Write**, limited to the production bucket.

R2 specifics (in `storage.yml`): `region: auto`, `force_path_style: true`, and
`request_checksum_calculation` / `response_checksum_validation: when_required` — `aws-sdk-s3`
defaults to CRC32 checksum headers that R2 rejects.

## How files are written and read

- **Uploads go through the API** as multipart (`POST .../documents`, `.../me/documents`, ...).
  Services validate type and size before attaching; the browser never talks to the bucket, so
  **no bucket CORS policy is needed**. The stock `POST /api/active_storage/direct_uploads`
  endpoint answers `404` (initializer) — it would let an anonymous caller mint presigned PUT URLs.
- **Reads** are API endpoints that authorize with Pundit (`policy_scope` / `authorize`; cross-school
  and cross-family give `404`) and either stream the bytes (`send_data`: service invoices,
  report cards, dossiers, incident/tax PDFs) or return a signed Active Storage link (`file_url`,
  `document_url`, `photo_url`, `logo_url`).
- A signed link is a **short-lived bearer capability**, not re-authorized when clicked:
  - the signed id inside it expires after `urls_expire_in` (15 minutes);
  - it resolves to a 302 to the bucket URL, presigned per request for `service_urls_expire_in`
    (5 minutes);
  - it is served under `/api/active_storage/...` so kamal-proxy (`/api` prefix) routes it to Rails.
  Clients must read the link from a fresh API response, never store it.
- Never log or audit blob URLs, keys or credentials.

## Moving legacy files from the volume to R2

A blob remembers the service it was written to (`active_storage_blobs.service_name`). Switching
`ACTIVE_STORAGE_SERVICE` only changes **new** uploads; blobs written before stay `local` and keep
being read from the volume (kept mounted). Move them with the idempotent task, which copies each
file under the same key, then repoints the blob; it never deletes the source:

```bash
# On the production app container (new code, R2 secrets present). Never run from CI.
bin/rails storage:migrate_blobs DRY_RUN=true   # counts only (reads R2, writes nothing)
bin/rails storage:migrate_blobs                # FROM=local TO=r2 by default
```

Run it, check `failed=0`, spot-check a few documents in the SPA, and only then remove the old
files from the volume by hand. Blobs whose source file is already gone are listed as `missing`.

## Operations (not code)

- **Backup / versioning:** R2 has no cross-region replica by default. Decide on bucket object
  versioning or periodic copy to a second bucket — open item in `open-questions.md`.
- **Lifecycle / retention:** LGPD retention windows are still open; configure R2 lifecycle rules
  only after legal sign-off (children's data).
- **Public access:** keep "Public Development URL" and any custom public domain **disabled** on the
  bucket.
