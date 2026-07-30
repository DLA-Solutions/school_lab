# frozen_string_literal: true

Audited.config do |config|
  config.auditing_enabled = true
  config.current_user_method = :current_user

  config.ignored_attributes = %w[
    lock_version
    created_at
    updated_at
    created_on
    updated_on
  ]
end
