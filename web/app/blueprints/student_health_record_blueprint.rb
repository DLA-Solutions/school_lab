# frozen_string_literal: true

class StudentHealthRecordBlueprint < Blueprinter::Base
  identifier :id

  fields :student_id, :content, :content_updated_at

  # Names the child, so a guardian's list of sheets reads without a lookup per row.
  field :student_name do |record|
    record.student&.name
  end

  # A note nobody can attribute is one nobody trusts: the secretary has to know whether the
  # allergy came from the mother or from the front desk.
  field :updated_by_name do |record|
    record.updated_by&.email
  end

  # Blank until somebody fills it in. An empty sheet is a family that has not been asked yet,
  # which is a different thing from a child with nothing to report.
  field :filled do |record|
    record.filled?
  end
end
