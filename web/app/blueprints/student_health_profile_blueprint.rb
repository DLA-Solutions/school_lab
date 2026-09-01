# frozen_string_literal: true

class StudentHealthProfileBlueprint < Blueprinter::Base
  identifier :id

  fields :student_id, :blood_type, :health_plan_name, :health_plan_number,
         :emergency_contact_name, :emergency_contact_phone, :special_care_notes,
         :created_at, :updated_at

  field :student_name do |profile|
    profile.student&.name
  end
end
