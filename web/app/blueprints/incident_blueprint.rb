# frozen_string_literal: true

# "Ata" (BC7). The default view is the staff shape — it carries both BR-IN08 approval slots and
# who filed the record. The `:guardian` view strips those down to what a family may see about
# their own published incident (IncidentPolicy already keeps an unpublished or staff_only one out
# of reach entirely; this view is about field shape, not row access).
class IncidentBlueprint < Blueprinter::Base
  identifier :id

  fields :student_id, :incident_type_id, :category, :severity, :visibility, :status, :description,
         :guardian_points_raised, :school_response, :published_at, :created_at, :updated_at

  field :reported_by_membership_id

  field :coordination_approved_at
  field :coordination_approved_by_membership_id
  field :director_approved_at
  field :director_approved_by_membership_id

  # The "Ata" grid is read by name, not by id.
  field :student_name do |incident|
    incident.student&.name
  end

  field :incident_type_name do |incident|
    incident.incident_type&.name
  end

  # BR-IN11 — the guardian set recorded on this incident at save time, not derived live from the
  # student's current `student_guardians` the way this field used to work. `guardian_id` is
  # nullable (a later guardian deletion nullifies rather than cascades), so a snapshot row can
  # outlive the guardian it was taken from — `name`/`relationship` are what survive either way.
  field :guardians do |incident|
    incident.incident_guardians.map do |incident_guardian|
      {
        guardian_id: incident_guardian.guardian_id,
        name: incident_guardian.name,
        relationship: incident_guardian.relationship
      }
    end
  end

  view :guardian do
    excludes :reported_by_membership_id,
             :coordination_approved_at, :coordination_approved_by_membership_id,
             :director_approved_at, :director_approved_by_membership_id
  end
end
