# frozen_string_literal: true

module Platform
  module BillingAccountBuilder
    module_function

    def from_school(school)
      Gateways::PlatformSubscription::ValueObjects::BillingAccount.new(
        name: school.name,
        email: billing_email(school),
        document_number: school.cnpj
      )
    end

    def billing_email(school)
      owner_email(school).presence || director_email(school).presence
    end

    def owner_email(school)
      school.staff_profiles.kept.find_by(is_owner: true)&.membership&.user&.email
    end

    def director_email(school)
      school.memberships.kept.where(role: "staff").includes(:user).filter_map { |m| m.user&.email }.first
    end
  end
end
