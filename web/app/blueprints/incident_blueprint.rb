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

  # Derived from the student's linked family on every read — never stored on the incident itself.
  field :guardian_names do |incident|
    incident.student.student_guardians.kept.filter_map { |link| link.guardian&.name }
  end

  view :guardian do
    excludes :reported_by_membership_id,
             :coordination_approved_at, :coordination_approved_by_membership_id,
             :director_approved_at, :director_approved_by_membership_id
  end
end
