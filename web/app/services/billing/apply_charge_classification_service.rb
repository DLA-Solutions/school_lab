# frozen_string_literal: true

module Billing
  # Copies immutable purpose classification onto a charge at creation time. Later school
  # configuration changes must not rewrite historical charges used by tax declarations.
  class ApplyChargeClassificationService < ApplicationService
    def initialize(charge:, billing_purpose:)
      @charge = charge
      @billing_purpose = billing_purpose
    end

    def call
      return missing_purpose if billing_purpose.blank?
      return cross_school if billing_purpose.school_id != charge.school_id

      charge.billing_purpose = billing_purpose
      charge.billing_purpose_code = billing_purpose.code
      charge.tax_declaration_eligible = billing_purpose.tax_declaration_eligible

      ResponseService.success(data: charge)
    end

    private

    attr_reader :charge, :billing_purpose

    def missing_purpose
      ResponseService.failure(
        code: :validation_error,
        details: { billing_purpose_id: [ I18n.t("api.errors.billing_purpose_required") ] }
      )
    end

    def cross_school
      ResponseService.failure(code: :not_found)
    end
  end
end
