# frozen_string_literal: true

class TeacherHealthProfileBlueprint < Blueprinter::Base
  identifier :id

  fields :teacher_id, :blood_type, :health_plan_name, :health_plan_number,
         :emergency_contact_name, :emergency_contact_phone, :special_care_notes,
         :created_at, :updated_at

  field :teacher_name do |profile|
    profile.teacher&.name
  end
end
