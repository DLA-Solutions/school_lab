# frozen_string_literal: true

class SchoolBlueprint < Blueprinter::Base
  identifier :id

  fields :name, :cnpj, :address, :saas_plan, :school_group_id,
         :onboarding_status, :onboarding_mode, :billing_waived_at, :segments_skipped_at,
         :signature_email

  field :discarded_at do |school|
    school.discarded_at&.iso8601
  end

  # Whether the school is itself a party to the contracts it sends, which needs both the address
  # and a valid CNPJ — so the screen can say why signing is off without re-deriving the rule.
  field :signs_contracts do |school|
    school.signs_contracts?
  end

  view :summary do
    fields :name, :onboarding_status
  end

  view :backoffice_detail do
    field :created_at

    field :modules,
          if: ->(_field_name, _school, options) { options[:include]&.include?("modules") } do |school|
      Schools::UpdateSchoolModulesService.module_map_for(school)
    end

    field :active_school_year,
          if: ->(_field_name, _school, options) { options[:include]&.include?("active_school_year") } do |school|
      year = school.school_years.kept.active_status.first
      next nil if year.blank?

      { id: year.id, name: year.name, status: year.status }
    end

    field :aggregate_counts,
          if: ->(_field_name, _school, options) { options[:include]&.include?("aggregate_counts") } do |school|
      {
        staff_count: school.memberships.kept.where(role: %w[school staff teacher], status: "active").count,
        student_count: school.students.kept.where(status: "active").count,
        guardian_count: school.guardians.kept.count
      }
    end
  end
end
