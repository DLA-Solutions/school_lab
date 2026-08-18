# frozen_string_literal: true

module SchoolLab
  # Redacts PII from audit diffs for cross-tenant backoffice display (BR-BOE05 default).
  class AuditPiiRedactor
    SENSITIVE_KEYS = %w[
      email cpf phone name birth_date address rg zip_code street number neighborhood city state
      password encrypted_password token_digest signature_email internal_notes api_token api_key
      certificate_pem private_key_pem client_id webhook_secret
    ].freeze

    REDACTED = "[REDACTED]"

    def self.call(audited_changes)
      new(audited_changes).call
    end

    def initialize(audited_changes)
      @audited_changes = audited_changes
    end

    def call
      return {} if audited_changes.blank?

      audited_changes.each_with_object({}) do |(key, value), redacted|
        redacted[key.to_s] = redact_value(key.to_s, value)
      end
    end

    def self.changed_keys(audited_changes)
      Array(audited_changes&.keys).map(&:to_s).sort
    end

    private

    attr_reader :audited_changes

    def redact_value(key, value)
      return redact_pair(value) if value.is_a?(Array)
      return REDACTED if sensitive_key?(key)

      redact_scalar(value)
    end

    def redact_pair(pair)
      pair.map { |entry| redact_scalar(entry) }
    end

    def redact_scalar(value)
      return value unless value.is_a?(String)
      return REDACTED if value.blank?

      Billing::PiiRedactor.call(value)
    end

    def sensitive_key?(key)
      normalized = key.to_s.downcase
      SENSITIVE_KEYS.any? { |sensitive| normalized.include?(sensitive) }
    end
  end
end
