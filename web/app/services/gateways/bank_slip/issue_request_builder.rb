# frozen_string_literal: true

module Gateways
  module BankSlip
    module IssueRequestBuilder
      MIN_AMOUNT_CENTS = 500
      MAX_NAME_LENGTH = 60
      MAX_EMAIL_LENGTH = 60
      MAX_DESCRIPTION_LENGTH = 100

      module_function

      def from_charge(charge, idempotency_key: nil, service_description: nil)
        validate_charge!(charge)

        guardian = charge.guardian
        description = resolve_service_description(charge, service_description)
        settings = Billing::SchoolSettings.for(charge.school)

        ValueObjects::IssueRequest.new(
          idempotency_key: idempotency_key || "charge-#{charge.id}",
          total_amount_cents: charge.total_amount_cents,
          due_date: charge.due_date,
          customer: build_customer(guardian),
          service_description: FieldNormalizer.truncate_text(description, max_length: MAX_DESCRIPTION_LENGTH),
          school_id: charge.school_id,
          charge_id: charge.id,
          interest_rate_percent: settings.interest_rate_percent,
          early_payment_discount_percent: settings.early_payment_discount_percent,
          fine_type: settings.fine_type,
          fine_rate_percent: settings.fine_rate_percent,
          fine_amount_cents: settings.fine_amount_cents
        )
      end

      def build_customer(guardian)
        cpf = FieldNormalizer.normalize_cpf(guardian.cpf)
        raise ValidationError, "customer document_number is required" if cpf.blank?

        ValueObjects::Customer.new(
          name: FieldNormalizer.truncate_text(guardian.name, max_length: MAX_NAME_LENGTH),
          document_number: cpf,
          email: FieldNormalizer.truncate_text(resolve_email(guardian), max_length: MAX_EMAIL_LENGTH),
          phone: FieldNormalizer.normalize_phone_e164(guardian.phone),
          address: GuardianAddress.from(guardian)
        )
      end
      private_class_method :build_customer

      def validate_charge!(charge)
        if charge.total_amount_cents < MIN_AMOUNT_CENTS
          raise ValidationError, "total_amount_cents must be at least #{MIN_AMOUNT_CENTS}"
        end

        if charge.due_date.blank?
          raise ValidationError, "due_date is required"
        end

        today = Billing::SchoolTimezone.today_for(charge.school)
        if charge.due_date < today
          raise ValidationError, "due_date cannot be in the past"
        end
      end
      private_class_method :validate_charge!

      # What the boleto says it is for, most specific first. A charge that names its own reason —
      # a trip, a replacement uniform — is describing itself better than any school-wide default
      # could, and that description is what the payer was shown when it was raised. The school
      # setting is the fallback for everything that says nothing, which is most tuition.
      def resolve_service_description(charge, override)
        override.presence || charge.description.presence ||
          Billing::SchoolSettings.for(charge.school).service_description
      end
      private_class_method :resolve_service_description

      def resolve_email(guardian)
        guardian.email.presence || guardian.user&.email
      end
      private_class_method :resolve_email
    end
  end
end
