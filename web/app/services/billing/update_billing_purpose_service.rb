# frozen_string_literal: true

module Billing
  class UpdateBillingPurposeService < ApplicationService
    def initialize(purpose:, params:, actor:)
      @purpose = purpose
      @params = params
      @actor = actor
    end

    def call
      purpose.assign_attributes(update_attributes)

      unless purpose.save
        return ResponseService.failure(code: :validation_error, details: purpose.errors.to_hash)
      end

      if acknowledge_legal_ownership?
        approval_result = ApprovePurposeConfigurationService.call(
          school: purpose.school,
          actor: actor
        )
        return approval_result if approval_result.failure?
      end

      ResponseService.success(data: purpose)
    end

    private

    attr_reader :purpose, :params, :actor

    def update_attributes
      attrs = {}
      attrs[:name] = params[:name] if params.key?(:name)
      attrs[:tax_declaration_eligible] = params[:tax_declaration_eligible] if params.key?(:tax_declaration_eligible)
      attrs
    end

    def acknowledge_legal_ownership?
      ActiveModel::Type::Boolean.new.cast(params[:acknowledge_legal_ownership])
    end
  end
end
