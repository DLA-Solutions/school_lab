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
      visibility: nil, guardian_ids: nil
    )
      @school = school
      @student = student
      @reported_by_membership = reported_by_membership
      @incident_type_id = incident_type_id
      @description = description
      @guardian_points_raised = guardian_points_raised
      @school_response = school_response
      @visibility = visibility
      @guardian_ids = guardian_ids
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

      # Multi-model write (incident + its incident_guardians snapshot, BR-IN11): both must commit
      # together. The block evaluates to a boolean (never a bare `return` inside — that's a
      # non-local-exit footgun across `transaction do...end`) and the caller branches on it below,
      # after the block returns.
      saved = ActiveRecord::Base.transaction do
        next false unless incident.save

        snapshot_guardians!(incident)
        true
      end

      unless saved
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
                :guardian_points_raised, :school_response, :visibility, :guardian_ids

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

    # BR-IN11/UC-IN06 — snapshots the chosen guardian set onto the incident as `incident_guardians`
    # rows. Called only after `incident.save` succeeds inside the same transaction, so a failure
    # here rolls back the incident too.
    #
    # NOTE for a future update/edit endpoint: BR-IN05 expects editing an incident to *replace* its
    # existing `incident_guardians` set the same way (not merge/append) — but there is no
    # update service yet, so that replace behavior is intentionally not built here (only one
    # caller today; extract on the third stable case, not before).
    def snapshot_guardians!(incident)
      if guardian_ids.present?
        snapshot_explicit_guardians!(incident)
      else
        snapshot_current_student_guardians!(incident)
      end
    end

    # Explicit `guardian_ids` (UC-IN06: a guardian found via the BR-IN11 name search, possibly not
    # one of the student's existing `student_guardians`). Cross-tenant ids are silently dropped —
    # never trusted blindly, never surfaced as a validation error — by scoping the lookup through
    # this incident's own `school`.
    def snapshot_explicit_guardians!(incident)
      Guardian.where(school_id: school.id, id: guardian_ids).find_each do |guardian|
        link = student.student_guardians.kept.find_by(guardian_id: guardian.id)
        # The guardian isn't actually linked to this student (e.g. an unrelated guardian picked
        # via name search) — "other" is the cleanest fallback: it's a valid enum value and doesn't
        # require inventing a new "unknown" relationship just for this snapshot.
        relationship = link&.relationship || "other"

        incident.incident_guardians.create!(guardian: guardian, name: guardian.name, relationship: relationship)
      end
    end

    # Default (no `guardian_ids` given) — reproduce today's live-derivation behavior
    # (`IncidentBlueprint#guardian_names`'s `student.student_guardians.kept` walk), but persist it
    # as a point-in-time snapshot instead of leaving it to be computed live later.
    def snapshot_current_student_guardians!(incident)
      student.student_guardians.kept.find_each do |link|
        next if link.guardian.nil?

        incident.incident_guardians.create!(guardian: link.guardian, name: link.guardian.name, relationship: link.relationship)
      end
    end
  end
end
