# frozen_string_literal: true

module Academic
  # UC-IN03 / BR-IN08 — fills whichever of the two fixed approval slots matches the approving
  # membership's role template. IncidentPolicy#approve? already gates this the same way in the
  # controller; the `forbidden` check here is a defensive re-check of a security-critical
  # invariant (AC-IN05), not a replacement for Pundit authorization.
  class ApproveIncidentService < ApplicationService
    def initialize(incident:, membership:)
      @incident = incident
      @membership = membership
    end

    def call
      system_key = membership.staff_profile&.role_template&.system_key
      return ResponseService.failure(code: :forbidden) unless valid_approver?(system_key)

      case system_key
      when "coordination"
        incident.approve_coordination!(membership)
      when "director"
        incident.approve_director!(membership)
      end

      ResponseService.success(data: incident.reload)
    end

    private

    attr_reader :incident, :membership

    def valid_approver?(system_key)
      Incident::ROLE_TEMPLATE_APPROVAL_KEYS.include?(system_key)
    end
  end
end
