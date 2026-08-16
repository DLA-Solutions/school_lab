# frozen_string_literal: true

module Billing
  class CreateBillingPurposeService < ApplicationService
    def initialize(school:, params:)
      @school = school
      @params = params
    end

    def call
      purpose = school.billing_purposes.build(
        code: params[:code],
        name: params[:name],
        tax_declaration_eligible: false
      )

      if purpose.save
        ResponseService.success(data: purpose)
      else
        ResponseService.failure(code: :validation_error, details: purpose.errors.to_hash)
      end
    end

    private

    attr_reader :school, :params
  end
end
