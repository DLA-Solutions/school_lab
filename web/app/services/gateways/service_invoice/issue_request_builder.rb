# frozen_string_literal: true

module Gateways
  module ServiceInvoice
    module IssueRequestBuilder
      MAX_NAME_LENGTH = 60
      MAX_EMAIL_LENGTH = 60
      MAX_DESCRIPTION_LENGTH = 2000

      module_function

      def from_payment(payment, idempotency_key: nil, fiscal_settings: nil)
        charge = payment.charge
        fiscal_settings ||= charge.school.school_fiscal_setting
        raise ValidationError, "fiscal settings are required" unless fiscal_settings

        guardian = charge.guardian
        customer = build_customer(guardian)

        ValueObjects::IssueRequest.new(
          integration_id: ::ServiceInvoice.integration_id_for(payment),
          idempotency_key: idempotency_key || SecureRandom.uuid,
          paid_amount_cents: payment.paid_amount_cents,
          paid_at: payment.paid_at,
          description: resolve_description(charge, fiscal_settings),
          customer: customer,
          fiscal_settings: build_fiscal_settings(fiscal_settings),
          payment_id: payment.id,
          charge_id: charge.id,
          school_id: charge.school_id
        )
      end

      def build_customer(guardian)
        cpf = Gateways::BankSlip::FieldNormalizer.normalize_cpf(guardian.cpf)
        raise ValidationError, "customer document_number is required" if cpf.blank?

        address = Gateways::BankSlip::GuardianAddress.from(guardian)
        raise ValidationError, "customer address is incomplete" if address.nil?

        Gateways::BankSlip::ValueObjects::Customer.new(
          name: Gateways::BankSlip::FieldNormalizer.truncate_text(guardian.name, max_length: MAX_NAME_LENGTH),
          document_number: cpf,
          email: Gateways::BankSlip::FieldNormalizer.truncate_text(resolve_email(guardian),
                                                                   max_length: MAX_EMAIL_LENGTH),
          phone: Gateways::BankSlip::FieldNormalizer.normalize_phone_e164(guardian.phone),
          address: address
        )
      end
      private_class_method :build_customer

      def build_fiscal_settings(settings)
        ValueObjects::FiscalSettings.new(
          federal_service_code: settings.federal_service_code,
          cnae_code: settings.cnae_code,
          city_service_code: settings.city_service_code,
          nbs_code: settings.nbs_code,
          national_taxation_code: settings.national_taxation_code,
          iss_rate_percent: settings.iss_rate_percent,
          service_description: settings.service_description,
          taxation_type: settings.taxation_type,
          tax_location: settings.tax_location,
          spedy_city_code: settings.spedy_city_code,
          issuance_city_name: settings.issuance_city_name,
          issuance_state: settings.issuance_state,
          reform_tributaria_enabled: settings.reform_tributaria_enabled,
          ibs_cbs_config: settings.ibs_cbs_config
        )
      end
      private_class_method :build_fiscal_settings

      def resolve_description(charge, fiscal_settings)
        if charge.description.present?
          return Gateways::BankSlip::FieldNormalizer.truncate_text(charge.description,
                                                                     max_length: MAX_DESCRIPTION_LENGTH)
        end

        if charge.kind == "tuition" && charge.billing_period.present?
          period = charge.billing_period.strftime("%m/%Y")
          base = fiscal_settings.service_description.presence ||
                 I18n.t("billing.settings.default_service_description")
          return Gateways::BankSlip::FieldNormalizer.truncate_text("#{base} - ref. #{period}",
                                                                     max_length: MAX_DESCRIPTION_LENGTH)
        end

        if charge.billing_purpose&.name.present?
          return Gateways::BankSlip::FieldNormalizer.truncate_text(charge.billing_purpose.name,
                                                                     max_length: MAX_DESCRIPTION_LENGTH)
        end

        description = fiscal_settings.service_description.presence ||
                      I18n.t("billing.settings.default_service_description")
        Gateways::BankSlip::FieldNormalizer.truncate_text(description, max_length: MAX_DESCRIPTION_LENGTH)
      end
      private_class_method :resolve_description

      def resolve_email(guardian)
        guardian.email.presence || guardian.user&.email
      end
      private_class_method :resolve_email
    end
  end
end
