# frozen_string_literal: true

class TeacherBankAccountBlueprint < Blueprinter::Base
  identifier :id

  fields :teacher_id, :pix_key, :bank_name, :agency, :account_number

  # Money leaves on the strength of this record, so it has to say who last wrote it.
  field :updated_by_name do |record|
    record.updated_by&.email
  end

  field :updated_at do |record|
    record.updated_at&.iso8601
  end

  # An unfilled record is a collaborator who cannot be paid yet — a different thing from one
  # whose details failed to load.
  field :filled do |record|
    record.filled?
  end
end
