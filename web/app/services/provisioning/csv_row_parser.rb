# frozen_string_literal: true

require "csv"

module Provisioning
  # Parses white-glove provisioning CSV uploads into normalized row hashes.
  class CsvRowParser
    REQUIRED_HEADERS = %w[
      student_name
      student_birth_date
      student_rg
      school_class_name
      guardian_name
      guardian_email
      guardian_phone
      guardian_relationship
      guardian_zip_code
      guardian_street
      guardian_number
      guardian_neighborhood
      guardian_city
      guardian_state
    ].freeze

    OPTIONAL_HEADERS = %w[
      student_cpf
      guardian_cpf
      guardian_complement
    ].freeze

    ALL_HEADERS = (REQUIRED_HEADERS + OPTIONAL_HEADERS).freeze

    Row = Data.define(:number, :attributes)

    def initialize(io)
      @io = io
    end

    def call
      table = CSV.read(io, headers: true, header_converters: :symbol, skip_blanks: true)
      headers = table.headers.compact.map(&:to_s)
      missing = REQUIRED_HEADERS - headers
      if missing.any?
        return ResponseService.failure(
          code: :import_validation_failed,
          details: {
            error_report: {
              file: [ I18n.t("api.errors.provisioning_import_missing_headers", headers: missing.join(", ")) ]
            }
          }
        )
      end

      rows = table.map.with_index(2) do |raw_row, number|
        attributes = ALL_HEADERS.index_with { |header| raw_row[header.to_sym]&.strip.presence }
        Row.new(number: number, attributes: attributes)
      end

      if rows.empty?
        return ResponseService.failure(
          code: :import_validation_failed,
          details: {
            error_report: {
              file: [ I18n.t("api.errors.provisioning_import_empty_file") ]
            }
          }
        )
      end

      ResponseService.success(data: rows)
    rescue CSV::MalformedCSVError
      ResponseService.failure(
        code: :import_validation_failed,
        details: {
          error_report: {
            file: [ I18n.t("api.errors.provisioning_import_malformed_csv") ]
          }
        }
      )
    end

    private

    attr_reader :io
  end
end
