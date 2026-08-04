# frozen_string_literal: true

# Secrets this application refuses to run without.
#
# Development and test use fixed throwaway values so the suite runs without credentials —
# CI has no RAILS_MASTER_KEY. Any other environment must supply real ones and fails to boot
# otherwise, so a misconfigured deploy dies on its health check instead of quietly signing
# tokens and encrypting bank credentials with keys that are public in this repository.
#
# Provisioning a deployed environment (see docs/guidelines/process/deployment.md):
#   bin/rails db:encryption:init      # prints the three keys
#   bin/rails credentials:edit        # store them plus jwt.secret_key
Rails.application.configure do
  if Rails.env.local?
    config.active_record.encryption.primary_key = "development-only-primary-key"
    config.active_record.encryption.deterministic_key = "development-only-deterministic-key"
    config.active_record.encryption.key_derivation_salt = "development-only-key-derivation-salt"
  else
    config.after_initialize do
      begin
        # Reading an unconfigured key raises, which is the boot failure we want. Without
        # this the app would only break the first time a school uploads bank credentials.
        ActiveRecord::Encryption.config.primary_key
        ActiveRecord::Encryption.config.deterministic_key
        ActiveRecord::Encryption.config.key_derivation_salt
      rescue ActiveRecord::Encryption::Errors::Configuration => e
        raise e.class, "#{e.message}. Generate the keys with bin/rails db:encryption:init " \
                       "and store them under active_record_encryption in the credentials."
      end

      Auth::SigningSecret.fetch
    end
  end
end
