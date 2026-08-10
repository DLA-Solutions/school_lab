# frozen_string_literal: true

module Identity
  class MigrateSchoolMembershipsService < ApplicationService
    STAFF_ROLES = %w[school staff teacher].freeze

    def initialize(school:, dry_run: false)
      @school = school
      @dry_run = dry_run
    end

    def call
      unless school&.persisted?
        return ResponseService.failure(code: :validation_error, details: { school: [ "must be persisted" ] })
      end

      templates_provisioned = false
      unless dry_run
        provision_result = ProvisionSystemRoleTemplatesService.call(school: school)
        return provision_result unless provision_result.success?

        templates_provisioned = true
      end

      director_template = school.system_role_template("director")
      teacher_template = school.system_role_template("teacher")
      if director_template.blank?
        return ResponseService.failure(code: :validation_error, details: { school: [ "missing director template" ] })
      end

      profiles_created = 0
      school.memberships.kept.where(role: STAFF_ROLES).find_each do |membership|
        profiles_created += 1 if backfill_profile!(membership, director_template, teacher_template)
      end

      owner_membership_id = ensure_owner!(director_template)

      ResponseService.success(
        data: {
          school_id: school.id,
          profiles_created: profiles_created,
          owner_membership_id: owner_membership_id,
          templates_provisioned: templates_provisioned
        }
      )
    end

    private

    attr_reader :school, :dry_run

    def backfill_profile!(membership, director_template, teacher_template)
      profile = StaffProfile.with_discarded.find_by(membership_id: membership.id)
      return false if profile&.kept?

      template = membership.role == "teacher" ? teacher_template : director_template

      unless dry_run
        if profile&.discarded?
          profile.undiscard
          profile.update!(role_template: template, school: school)
        else
          StaffProfile.create!(
            membership: membership,
            school: school,
            role_template: template
          )
        end
      end

      true
    end

    def ensure_owner!(director_template)
      existing_owner = StaffProfile.kept.find_by(school_id: school.id, is_owner: true)
      return existing_owner.membership_id if existing_owner

      candidate = school.memberships.kept.where(role: %w[school staff]).order(:created_at, :id).first
      candidate ||= school.memberships.kept.where(role: STAFF_ROLES).order(:created_at, :id).first
      return nil if candidate.blank?

      unless dry_run
        profile = StaffProfile.with_discarded.find_by!(membership_id: candidate.id)
        attrs = { is_owner: true }
        attrs[:role_template] = director_template unless candidate.role == "teacher"
        profile.update!(attrs)
      end

      candidate.id
    end
  end
end
