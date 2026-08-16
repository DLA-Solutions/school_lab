# frozen_string_literal: true

class PreceptorshipReportBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :status, :body, :published_at, :created_at, :updated_at

  field :student_id
  field :teacher_id
  field :academic_period_id

  # Read by name, not by id: a teacher scanning their own list, and a guardian reading one, are
  # both looking for a person rather than a row.
  field :student_name do |report|
    report.student&.name
  end

  field :teacher_name do |report|
    report.teacher&.name
  end

  field :period_name do |report|
    report.academic_period&.name
  end

  # The screen needs to know whether the report can still be worked on without re-deriving the
  # rule from the status — and the rule is the model's to state.
  field :editable do |report|
    report.editable?
  end
end
