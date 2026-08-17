# frozen_string_literal: true

# Realistic demo tenant for local development and staging E2E testing.
# Idempotent — safe to run multiple times via `bin/rails db:seed`.
#
# Enable on staging with SEED_DEMO_DATA=true (see config/deploy.staging.yml).
# Tune volume with SEED_STUDENT_COUNT (50–100, default 75).
#
# Credentials (password for all: Password123!):
#   Backoffice:  backoffice@demo.schoollab.local
#   Director:    admin@demo.schoollab.local
#   Secretary:   secretary@demo.schoollab.local
#   Coordinator: coordination@demo.schoollab.local
#   Teacher:     teacher@demo.schoollab.local
#   Guardians:   guardian@demo.schoollab.local … guardian5@demo.schoollab.local

module DemoSchool
  SCHOOL_CNPJ = "12.345.678/0001-90"
  ADMIN_EMAIL = "admin@demo.schoollab.local"
  SECRETARY_EMAIL = "secretary@demo.schoollab.local"
  GUARDIAN_EMAIL = "guardian@demo.schoollab.local"
  BACKOFFICE_EMAIL = "backoffice@demo.schoollab.local"
  COORDINATOR_EMAIL = "coordination@demo.schoollab.local"
  TEACHER_EMAIL = "teacher@demo.schoollab.local"
  PASSWORD = "Password123!"
  DEMO_CHARGE_PERIOD = Date.new(2026, 8, 1)

  LOGGED_IN_GUARDIAN_EMAILS = [
    GUARDIAN_EMAIL,
    "guardian2@demo.schoollab.local",
    "guardian3@demo.schoollab.local",
    "guardian4@demo.schoollab.local",
    "guardian5@demo.schoollab.local"
  ].freeze

  DEMO_USER_EMAILS = [
    BACKOFFICE_EMAIL,
    ADMIN_EMAIL,
    SECRETARY_EMAIL,
    COORDINATOR_EMAIL,
    TEACHER_EMAIL,
    *LOGGED_IN_GUARDIAN_EMAILS
  ].freeze
end

require_relative "demo_school/helpers"
require_relative "demo_school/staff"
require_relative "demo_school/people"
require_relative "demo_school/academics"
require_relative "demo_school/billing"

module DemoSchool
  module_function

  def seed!
    school = find_or_create_school!
    ensure_system_role_templates!(school)
    find_or_create_bank_slip_provider!(school)
    find_or_create_billing_settings!(school)

    staff = seed_staff_users!(school)
    people = seed_people!(school)
    seed_academics!(school, people.fetch(:school_classes), logged_in_teacher_user: staff.fetch(:teacher))
    seed_billing!(school, people.fetch(:students), people.fetch(:guardians))

    school
  end

  def find_or_create_school!
    school_group = SchoolGroup.find_or_create_by!(name: seed_school_group_name)

    school = School.find_or_create_by!(cnpj: SCHOOL_CNPJ) do |record|
      record.name = seed_school_name
      record.school_group = school_group
      record.onboarding_mode = "self_serve"
      record.onboarding_status = "active"
    end
    school.update!(
      name: seed_school_name,
      onboarding_mode: "self_serve",
      onboarding_status: "active"
    )
    school
  end

  def seed_school_name
    ENV["SEED_SCHOOL_NAME"].presence || "Colégio Demo School Lab"
  end

  def seed_school_group_name
    ENV["SEED_SCHOOL_GROUP_NAME"].presence || "School Lab Group"
  end

  def ensure_system_role_templates!(school)
    result = Identity::ProvisionSystemRoleTemplatesService.call(school: school)
    return result.data.fetch(:templates) if result.success?

    raise "Demo seed failed to provision role templates: #{result.error_code} #{result.details}"
  end

  def find_or_create_billing_settings!(school)
    settings = SchoolBillingSettings.find_or_initialize_by(school: school)
    settings.overdue_grace_days ||= 3
    settings.interest_rate_percent ||= 1.0
    settings.save!
  end

  def find_or_create_bank_slip_provider!(school)
    SchoolPaymentProvider.find_or_create_by!(
      school: school,
      instrument: "bank_slip",
      provider: "fake"
    ) do |record|
      record.active = true
    end
  end

  def find_or_create_confirmed_user!(email)
    user = User.find_or_initialize_by(email: email)
    user.undiscard if user.discarded?
    user.password = PASSWORD
    user.password_confirmation = PASSWORD
    user.status = "active"
    user.confirmed_at ||= Time.current
    user.disabled_at = nil
    user.save!
    user
  end

  def find_or_create_membership!(user:, school:, role:)
    membership = Membership.find_or_initialize_by(user: user, school: school)
    membership.assign_attributes(role: role, status: "active")
    membership.save!
    membership
  end

  private_class_method :find_or_create_bank_slip_provider!, :find_or_create_billing_settings!,
                      :find_or_create_confirmed_user!, :find_or_create_membership!,
                      :seed_school_name, :seed_school_group_name
end
