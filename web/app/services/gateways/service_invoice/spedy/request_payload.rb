# frozen_string_literal: true

module Gateways
  module ServiceInvoice
    module Spedy
      module RequestPayload
        module_function

        def from(issue_request)
          payload = {
            integrationId: issue_request.integration_id,
            description: issue_request.description,
            effectiveDate: issue_request.paid_at.iso8601,
            sendEmailToCustomer: issue_request.customer.email.present?,
            receiver: receiver_payload(issue_request.customer),
            total: total_payload(issue_request),
            taxationType: issue_request.fiscal_settings.taxation_type,
            taxLocation: issue_request.fiscal_settings.tax_location
          }

          add_fiscal_codes!(payload, issue_request.fiscal_settings)
          add_reform_tributaria!(payload, issue_request.fiscal_settings)
          add_additional_information!(payload, issue_request)

          payload.compact
        end

        def receiver_payload(customer)
          data = {
            name: customer.name,
            federalTaxNumber: customer.document_number,
            email: customer.email,
            phoneNumber: customer.phone
          }.compact

          data[:address] = address_payload(customer.address) if customer.address
          data
        end
        private_class_method :receiver_payload

        def address_payload(address)
          {
            street: address.street,
            number: address.number,
            district: address.neighborhood,
            postalCode: address.postal_code,
            additionalInformation: address.complement.presence,
            city: {
              name: address.city,
              state: address.state,
              code: nil
            }.compact
          }.compact
        end
        private_class_method :address_payload

        def total_payload(issue_request)
          {
            invoiceAmount: issue_request.paid_amount_cents / 100.0,
            issRate: issue_request.fiscal_settings.iss_rate_percent&.to_f
          }.compact
        end
        private_class_method :total_payload

        def add_fiscal_codes!(payload, settings)
          payload[:federalServiceCode] = settings.federal_service_code if settings.federal_service_code.present?
          payload[:cnaeCode] = settings.cnae_code if settings.cnae_code.present?
          payload[:cityServiceCode] = settings.city_service_code if settings.city_service_code.present?
          payload[:nbsCode] = settings.nbs_code if settings.nbs_code.present?
          payload[:nationalTaxationCode] = settings.national_taxation_code if settings.national_taxation_code.present?
        end
        private_class_method :add_fiscal_codes!

        def add_reform_tributaria!(payload, settings)
          return unless settings.reform_tributaria_enabled

          config = settings.ibs_cbs_config.presence || {}
          payload[:ibsCbs] = config if config.present?
        end
        private_class_method :add_reform_tributaria!

        def add_additional_information!(payload, issue_request)
          payload[:additionalInformation] = "charge_id=#{issue_request.charge_id};payment_id=#{issue_request.payment_id}"
        end
        private_class_method :add_additional_information!
      end
    end
  end
end
