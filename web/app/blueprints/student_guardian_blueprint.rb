# frozen_string_literal: true

class StudentGuardianBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :guardian_id, :student_id, :financial_percentage, :primary_guardian

  association :guardian, blueprint: GuardianBlueprint
end
