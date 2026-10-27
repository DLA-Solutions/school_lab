# frozen_string_literal: true

module Backoffice
  # Registers a Spedy company API key the school already owns, instead of provisioning a new
  # company through the platform key (see ProvisionSpedyCompanyService).
  #
  # The key is proven against Spedy before it is stored: a company-scoped key can list (or fetch)
  # only its own company, so a successful call both validates the key and tells us the company id
  # that webhooks, settings and certificate uploads are keyed by. The key is never logged, echoed
  # or placed in an error detail. The key is checked against the school's own `base_url` when one
  # is supplied (stored in `settings`), otherwise against the default / ENV Spedy URL.
  class RegisterSpedyApiKeyService < ApplicationService
    MAX_API_KEY_LENGTH = 512

    def initialize(school:, actor:, api_key:, company_id: nil, base_url: nil, client: nil)
      @school = school
      @actor = actor
      @api_key = api_key.to_s.strip
      @company_id = company_id.to_s.strip.presence
      @base_url = SchoolLab::Integrations::Spedy::Configuration.normalize_base_url(base_url)
      @client = client
    end

    def call
      invalid = validate_api_key || validate_base_url
      return invalid if invalid

      resolved_id = resolve_company_id
      return resolved_id if resolved_id.is_a?(ResponseService)
      return ResponseService.failure(code: :validation_error, details: { company_id: [ "taken" ] }) if taken_elsewhere?(resolved_id)

      ResponseService.success(data: replace_active_configuration(resolved_id))
    rescue SchoolLab::Integrations::Spedy::Error => e
      ResponseService.failure(code: :provider_error, details: { message: e.message })
    rescue JSON::ParserError
      ResponseService.failure(code: :provider_error, details: { message: "Unexpected provider response" })
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :school, :actor, :api_key, :company_id, :base_url

    def validate_api_key
      if api_key.blank?
        ResponseService.failure(code: :validation_error, details: { api_key: [ "blank" ] })
      elsif api_key.length > MAX_API_KEY_LENGTH || api_key.match?(/\s/)
        ResponseService.failure(code: :validation_error, details: { api_key: [ "invalid" ] })
      end
    end

    # A blank base URL means the platform default; anything else must be an https URL.
    def validate_base_url
      return if base_url.nil? || SchoolLab::Integrations::Spedy::Configuration.valid_base_url?(base_url)

      ResponseService.failure(code: :validation_error, details: { base_url: [ "invalid" ] })
    end

    # Returns the company id, or a failure ResponseService.
    def resolve_company_id
      return confirm_supplied_company_id if company_id

      ids = company_ids_from(client.list_companies)
      return ids.first if ids.one?

      ResponseService.failure(code: :fiscal_configuration_incomplete, details: { company_id: [ "required" ] })
    end

    # A supplied id is checked against Spedy, which also proves the key. A 400 means the id is
    # not one this key can see.
    def confirm_supplied_company_id
      client.fetch_company(company_id: company_id)
      company_id
    rescue SchoolLab::Integrations::Spedy::ValidationError
      ResponseService.failure(code: :validation_error, details: { company_id: [ "invalid" ] })
    end

    # Spedy documents the list as a paginated object, but the schema is ambiguous; accept a bare
    # array, `items`/`data` envelopes, or a single company object.
    def company_ids_from(body)
      payload = JSON.parse(body)
      Array(company_entries(payload)).filter_map { |entry| entry["id"].to_s.presence if entry.is_a?(Hash) }.uniq
    end

    def company_entries(payload)
      case payload
      when Array
        payload
      when Hash
        payload["items"] || payload["data"] || [ payload ]
      else
        []
      end
    end

    # Webhooks resolve the school from the company id, so two schools must not share one.
    def taken_elsewhere?(resolved_id)
      SchoolPaymentProvider.active
                           .where(instrument: Gateways::ServiceInvoice::Registry::INSTRUMENT, provider: "spedy")
                           .where.not(school_id: school.id)
                           .any? { |row| row.spedy_company_id.to_s == resolved_id.to_s }
    end

    def replace_active_configuration(resolved_id)
      ActiveRecord::Base.transaction do
        supersede_active_configuration!
        school.school_payment_providers.create!(
          instrument: Gateways::ServiceInvoice::Registry::INSTRUMENT,
          provider: "spedy",
          active: true,
          api_key: api_key,
          settings: { spedy_company_id: resolved_id, base_url: base_url }.compact,
          uploaded_at: Time.current,
          uploaded_by: actor
        )
      end
    end

    def supersede_active_configuration!
      school.school_payment_providers.active
            .where(instrument: Gateways::ServiceInvoice::Registry::INSTRUMENT)
            .find_each { |config| config.update!(active: false) }
    end

    def client
      @client ||= Gateways::ServiceInvoice::Spedy::ClientFactory.build(api_key: api_key, base_url: base_url)
    end
  end
end
