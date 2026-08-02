# frozen_string_literal: true

module Backoffice
  class UploadBankCredentialsService < ApplicationService
    MAX_FILE_BYTES = 64.kilobytes

    def initialize(school:, actor:, provider:, instrument:, client_id:,
                   certificate_io:, private_key_io:)
      @school = school
      @actor = actor
      @provider = provider
      @instrument = instrument
      @client_id = client_id
      @certificate_io = certificate_io
      @private_key_io = private_key_io
    end

    def call
      certificate_pem = read_limited_pem(certificate_io, field: :certificate)
      return certificate_pem if certificate_pem.is_a?(ResponseService)

      private_key_pem = read_limited_pem(private_key_io, field: :private_key)
      return private_key_pem if private_key_pem.is_a?(ResponseService)

      record = nil
      ActiveRecord::Base.transaction do
        supersede_active_configuration!
        record = school.school_payment_providers.create!(
          instrument: instrument,
          provider: provider,
          active: true,
          client_id: client_id,
          certificate_pem: certificate_pem,
          private_key_pem: private_key_pem,
          uploaded_at: Time.current,
          uploaded_by: actor
        )
      end

      ResponseService.success(data: record)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: api_error_details(e.record))
    end

    private

    attr_reader :school, :actor, :provider, :instrument, :client_id,
                :certificate_io, :private_key_io

    def api_error_details(record)
      record.errors.to_hash.transform_keys do |key|
        case key
        when :certificate_pem then :certificate
        when :private_key_pem then :private_key
        else key
        end
      end
    end

    def read_limited_pem(io, field:)
      return ResponseService.failure(code: :validation_error, details: { field => ["blank"] }) if io.blank?

      bytes = io.read(MAX_FILE_BYTES + 1)
      if bytes.bytesize > MAX_FILE_BYTES
        return ResponseService.failure(code: :validation_error, details: { field => ["too_large"] })
      end

      bytes.to_s
    end

    # One active configuration per instrument, so uploading new credentials replaces whatever
    # was active — including a different provider.
    def supersede_active_configuration!
      school.school_payment_providers.active.where(instrument: instrument)
            .find_each { |config| config.update!(active: false) }
    end
  end
end
