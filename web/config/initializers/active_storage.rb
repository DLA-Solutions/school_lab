# frozen_string_literal: true

# Cloudflare R2 must be fully configured when it is the selected service: a blank bucket or key
# would otherwise only surface on the first upload, as an opaque signing error.
if Rails.application.config.active_storage.service.to_s == "r2"
  missing = %w[R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET].select { |name| ENV[name].to_s.strip.empty? }
  raise "Active Storage service r2 is selected but #{missing.join(', ')} is not set" if missing.any?
end
