# frozen_string_literal: true

module Gateways
  module ServiceInvoice
    module Spedy
      module ResponseParser
        module_function

        def parse_issuance(payload)
          data = payload.is_a?(String) ? JSON.parse(payload) : payload
          ValueObjects::Issuance.new(
            provider_document_id: data.fetch("id").to_s,
            status: StatusNormalizer.normalize(data["status"]),
            invoice_number: data["number"],
            verification_code: data["verificationCode"],
            access_key: data["accessKey"]
          )
        end

        def parse_document(payload)
          data = payload.is_a?(String) ? JSON.parse(payload) : payload
          amount = data.dig("total", "invoiceAmount")
          paid_amount_cents = amount ? (amount.to_d * 100).round : 0

          ValueObjects::RemoteDocument.new(
            provider_document_id: data.fetch("id").to_s,
            status: StatusNormalizer.normalize(data["status"]),
            invoice_number: data["number"],
            verification_code: data["verificationCode"],
            access_key: data["accessKey"],
            paid_amount_cents: paid_amount_cents,
            effective_date: parse_date(data["effectiveDate"])
          )
        end

        def parse_cities(payload)
          data = payload.is_a?(String) ? JSON.parse(payload) : payload
          items = data["items"] || data["data"] || Array(data)
          Array(items).map do |item|
            ValueObjects::SupportedCity.new(
              code: item["code"],
              name: item["name"],
              state: item["state"],
              provider: item.dig("provider", "name") || item["provider"],
              provider_options: item.dig("provider", "options") || item["providerOptions"] || {}
            )
          end
        end

        def parse_date(value)
          return Date.current if value.blank?

          Time.zone.parse(value.to_s).to_date
        rescue ArgumentError
          Date.current
        end
        private_class_method :parse_date
      end
    end
  end
end
