# frozen_string_literal: true

module Notifications
  # Fans a "contract signed" notification out to every staff member who could act on it — the
  # same audience `ContractPolicy` already trusts with contracts, so nobody sees a bell entry for
  # something they could not open.
  class NotifyContractSignedService < ApplicationService
    PERMISSION_KEY = "manage_billing"

    def initialize(contract:)
      @contract = contract
    end

    def call
      recipients.each { |user| create_notification(user) }

      ResponseService.success(data: { notified_count: recipients.size })
    end

    private

    attr_reader :contract

    def recipients
      @recipients ||= staff_memberships.filter_map do |membership|
        next unless Identity::ResolveEffectivePermissionsService.allows?(
          membership: membership, permission_key: PERMISSION_KEY
        )

        membership.user
      end
    end

    def staff_memberships
      contract.school.memberships.active.where(role: %w[school staff teacher]).includes(:user)
    end

    def create_notification(user)
      Notification.create!(
        user: user,
        school: contract.school,
        contract: contract,
        kind: "contract_signed",
        title: I18n.t("notifications.contract_signed.title", student: contract.student.name),
        body: I18n.t("notifications.contract_signed.body", student: contract.student.name)
      )
    end
  end
end
