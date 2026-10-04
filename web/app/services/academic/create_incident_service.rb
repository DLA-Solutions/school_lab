# frozen_string_literal: true

module Academic
  # UC-IN01 — records an incident ("Ata", BC7). Receives an already-authorized, already-scoped
  # `student`/`reported_by_membership` — authorization (BR-IN03's teacher-vs-manage_academic gate)
  # already ran in the controller via IncidentPolicy; this service only applies the type-resolution
  # and visibility business rules (BR-IN01/BR-IN02).
  class CreateIncidentService < ApplicationService
    def initialize(
      school:, student:, reported_by_membership:,
      incident_type_id: nil, description: nil,
      guardian_points_raised: nil, school_response: nil,
      visibility: nil
    )
      @school = school
      @student = student
      @reported_by_membership = reported_by_membership
      @incident_type_id = incident_type_id
      @description = description
      @guardian_points_raised = guardian_points_raised
      @school_response = school_response
      @visibility = visibility
    end

    def call
      incident_type = resolve_incident_type
      return ResponseService.failure(code: :not_found) if incident_type.nil?

      incident = Incident.new(
        school: school,
        student: student,
        incident_type: incident_type,
        reported_by_membership: reported_by_membership,
        visibility: resolve_visibility(incident_type),
        description: description,
        guardian_points_raised: guardian_points_raised,
        school_response: school_response
      )

      # UC-IN01 "draft or published per visibility rules": `guardian` visibility is live the
      # moment it's created — there is no separate publish step for it (see
      # docs/modeling/007-academic.md § Incidents, "Visibility and publish"). `guardian_on_publish`
      # and `staff_only` both stay unpublished until a later explicit PublishIncidentService call.
      incident.published_at = Time.current if incident.visibility == "guardian"

      unless incident.save
        return ResponseService.failure(code: :validation_error, details: incident.errors.to_hash)
      end

      # BR-IN09 / UC-IN04: mandatory, informational-only notice to whichever BR-IN08 approval
      # slot(s) still need a holder. Independent of approval — never fills a slot, never touches
      # `status`.
      Incidents::EventEmitter.incident_created(incident: incident)

      ResponseService.success(data: incident)
    end

    private

    attr_reader :school, :student, :reported_by_membership, :incident_type_id, :description,
                :guardian_points_raised, :school_response, :visibility

    # An explicit `incident_type_id` that doesn't resolve to a kept row in this school is a
    # `not_found` failure (bad reference) — only the absence of any `incident_type_id` falls back
    # to the lazily-seeded default (BR-IN01).
    def resolve_incident_type
      return IncidentType.provision_guardian_meeting!(school) if incident_type_id.blank?

      IncidentType.kept.find_by(id: incident_type_id, school_id: school.id)
    end

    # BR-IN02/AC-IN01: an explicit `visibility` param is used as given (the model's `inclusion`
    # validation catches a bad value as `validation_error` — not pre-filtered here). Blank falls
    # back to `staff_only` for `health` category regardless of the type's own `default_visibility`
    # (AC-IN01), otherwise the type's `default_visibility`.
    def resolve_visibility(incident_type)
      return visibility if visibility.present?
      return "staff_only" if incident_type.category == "health"

      incident_type.default_visibility
    end
  end
end
