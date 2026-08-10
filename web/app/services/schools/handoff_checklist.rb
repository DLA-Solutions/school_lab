# frozen_string_literal: true

module Schools
  class HandoffChecklist
    PHASES = %w[provisioning_handoff activation].freeze

    def initialize(school:, phase:)
      @school = school
      @phase = phase.to_s
    end

    def complete?
      missing_items.empty?
    end

    def missing_items
      @missing_items ||= case phase
      when "provisioning_handoff"
                           provisioning_handoff_missing
      when "activation"
                           activation_missing
      else
                           [ "invalid_phase" ]
      end
    end

    private

    attr_reader :school, :phase

    def provisioning_handoff_missing
      items = []
      items << "billing" unless billing_ready?
      items << "owner_invite" unless owner_invite_sent?
      items
    end

    def activation_missing
      items = []
      items << "owner_active" unless owner_active?
      items << "billing" unless billing_ready?
      items
    end

    def billing_ready?
      school.billing_waived_at.present? ||
        school.school_payment_providers.active.exists?
    end

    def owner_invite_sent?
      owner_membership = school.owner_membership
      return false if owner_membership.blank?

      owner_membership.membership_invite_tokens.exists?
    end

    def owner_active?
      owner_membership = school.owner_membership
      owner_membership&.active? == true
    end
  end
end
