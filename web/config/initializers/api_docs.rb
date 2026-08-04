# frozen_string_literal: true

require Rails.root.join("lib/school_lab/api_docs")
require Rails.root.join("lib/school_lab/middleware/api_docs_basic_auth")

# Staging exposes Swagger UI at /api-docs behind HTTP Basic Auth (see deploy.staging.yml).
# Local dev/test mount the same routes without credentials.
Rails.application.configure do
  next if ENV["SECRET_KEY_BASE_DUMMY"].present?

  config.after_initialize do
    next unless SchoolLab::ApiDocs.basic_auth_required?

    if SchoolLab::ApiDocs.username.blank? || SchoolLab::ApiDocs.password.blank?
      raise "API_DOCS_USERNAME and API_DOCS_PASSWORD must be set when EXPOSE_API_DOCS is enabled"
    end
  end
end

if SchoolLab::ApiDocs.basic_auth_required?
  Rails.application.config.middleware.use SchoolLab::Middleware::ApiDocsBasicAuth
end
