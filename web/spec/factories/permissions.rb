# frozen_string_literal: true

FactoryBot.define do
  factory :segment do
    school
    sequence(:name) { |n| "Segment #{n}" }
  end

  factory :school_role_template do
    school
    sequence(:name) { |n| "Role Template #{n}" }
    is_system { false }

    trait :system_director do
      name { SchoolLab::Permissions::SYSTEM_TEMPLATES["director"][:default_name] }
      system_key { "director" }
      is_system { true }
    end

    trait :secretary do
      name { SchoolLab::Permissions::SYSTEM_TEMPLATES["secretary"][:default_name] }
      system_key { "secretary" }
      is_system { true }
    end

    trait :coordination do
      name { SchoolLab::Permissions::SYSTEM_TEMPLATES["coordination"][:default_name] }
      system_key { "coordination" }
      is_system { true }
    end

    trait :teacher do
      name { SchoolLab::Permissions::SYSTEM_TEMPLATES["teacher"][:default_name] }
      system_key { "teacher" }
      is_system { true }
    end
  end

  factory :role_template_permission do
    school
    role_template { association :school_role_template, school: school }
    permission_key { "manage_people" }
    scope_kind { "full" }
  end

  factory :staff_profile do
    school
    membership { association :membership, school: school, role: "staff" }
    role_template { association :school_role_template, school: school }

    trait :owner do
      is_owner { true }
    end

    trait :also_teaches do
      also_teaches { true }
    end
  end

  factory :membership_permission do
    school
    membership { association :membership, school: school }
    permission_key { "manage_people" }
    effect { "grant" }
  end
end

module PermissionsFactoryHelpers
  def create_system_templates_for(school)
    result = Identity::ProvisionSystemRoleTemplatesService.call(school: school)
    raise "Failed to provision system templates: #{result.details}" unless result.success?

    result.data[:templates].values
  end
end
