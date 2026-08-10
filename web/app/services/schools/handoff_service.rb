# frozen_string_literal: true

module Schools
  class HandoffService < ApplicationService
    def initialize(school:, actor:, params: {})
      @school = school
      @actor = actor
      @params = params
    end

    def call
      apply_billing_waived_flag!

      case school.onboarding_status
      when "provisioning"
        provisioning_handoff
      when "pending_handoff"
        activation_handoff
      else
        ResponseService.failure(
          code: :validation_error,
          details: { onboarding_status: [ "cannot hand off from #{school.onboarding_status}" ] }
        )
      end
    end

    private

    attr_reader :school, :actor, :params

    def apply_billing_waived_flag!
      return unless ActiveModel::Type::Boolean.new.cast(params[:billing_waived])

      school.update!(billing_waived_at: Time.current) if school.billing_waived_at.blank?
    end

    def provisioning_handoff
      unless school.white_glove?
        return ResponseService.failure(
          code: :validation_error,
          details: { onboarding_status: [ "provisioning handoff applies to white_glove schools only" ] }
        )
      end

      checklist = HandoffChecklist.new(school: school, phase: :provisioning_handoff)
      unless checklist.complete?
        return ResponseService.failure(code: :validation_error, details: { checklist: checklist.missing_items })
      end

      previous_status = school.onboarding_status
      school.update!(onboarding_status: "pending_handoff")
      Onboarding::EventEmitter.school_handed_off(school: school, previous_status: previous_status)

      ResponseService.success(data: school.reload)
    end

    def activation_handoff
      checklist = HandoffChecklist.new(school: school, phase: :activation)
      unless checklist.complete?
        return ResponseService.failure(code: :validation_error, details: { checklist: checklist.missing_items })
      end

      previous_status = school.onboarding_status
      school.update!(onboarding_status: "active")
      Onboarding::EventEmitter.school_handed_off(school: school, previous_status: previous_status)

      owner_user = school.owner_membership&.user
      Onboarding::EventEmitter.owner_activated(school: school, user: owner_user) if owner_user

      ResponseService.success(data: school.reload)
    end
  end
end
