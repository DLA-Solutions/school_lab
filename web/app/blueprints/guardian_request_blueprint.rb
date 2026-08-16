# frozen_string_literal: true

class GuardianRequestBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :kind, :status, :details, :reference_date,
         :resolution_note, :resolved_at, :created_at, :updated_at

  field :guardian_id
  field :student_id
  field :subject_id

  # The queue is read by name, not by id: a secretary scanning it needs to see whose child it is
  # about without a second call per row.
  field :guardian_name do |request|
    request.guardian&.name
  end

  field :student_name do |request|
    request.student&.name
  end

  field :subject_name do |request|
    request.subject&.name
  end

  view :staff do
    field :resolved_by_name do |request|
      request.resolved_by&.email
    end
  end
end
