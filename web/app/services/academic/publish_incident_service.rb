# frozen_string_literal: true

module Academic
  # UC-IN02 — publishes an incident to guardians. Authorization (IncidentPolicy#publish?) already
  # ran in the controller; this service only enforces the `staff_only` invariant (BR-IN02) and the
  # idempotent-republish rule, then emits the optional BR-IN06 event on an actual transition.
  class PublishIncidentService < ApplicationService
    def initialize(incident:)
      @incident = incident
    end

    def call
      return ResponseService.success(data: incident) if incident.published_at.present?
      return ResponseService.failure(code: :invalid_state_transition) if incident.visibility == "staff_only"

      incident.publish!
      Incidents::EventEmitter.incident_published(incident: incident)

      ResponseService.success(data: incident)
    end

    private

    attr_reader :incident
  end
end
