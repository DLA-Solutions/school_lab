# frozen_string_literal: true

module Platform
  class ResolveBillingContactService < ApplicationService
    def initialize(school:)
      @school = school
    end

    def call
      if school.cnpj.blank?
        return ResponseService.failure(
          code: :validation_error,
          details: { cnpj: [ "is required for checkout" ] }
        )
      end

      email = billing_email
      if email.blank?
        return ResponseService.failure(
          code: :validation_error,
          details: { email: [ "is required for checkout" ] }
        )
      end

      ResponseService.success(
        data: Gateways::PlatformSubscription::ValueObjects::BillingAccountRequest.new(
          school_id: school.id,
          legal_name: school.name,
          tax_id: school.cnpj,
          email: email
        )
      )
    end

    private

    attr_reader :school

    def billing_email
      owner = school.memberships.kept.find_by(role: "staff", status: "active")
      profile_owner = school.staff_profiles.find_by(is_owner: true)
      user = profile_owner&.membership&.user || owner&.user
      user&.email.presence || school.signature_email.presence
    end
  end
end
