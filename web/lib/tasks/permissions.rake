# frozen_string_literal: true

namespace :permissions do
  desc "UC-P04: provision templates and backfill staff_profiles (idempotent)"
  task migrate_memberships: :environment do
    dry_run = ENV["DRY_RUN"] == "1"
    fail_fast = ENV["FAIL_FAST"] == "1"
    skip_role_rename = ENV["SKIP_ROLE_RENAME"] == "1"

    schools = if ENV["SCHOOL_ID"].present?
      School.kept.where(id: ENV["SCHOOL_ID"])
    else
      School.kept
    end

    schools.find_each do |school|
      result = Identity::MigrateSchoolMembershipsService.call(school: school, dry_run: dry_run)

      if result.success?
        Rails.logger.info({ event: "MembershipRoleMigrated", **result.data })
      else
        Rails.logger.error({ event: "MembershipRoleMigrationFailed", school_id: school.id, error: result.error_code, details: result.details })
        raise "Migration failed for school #{school.id}" if fail_fast
      end

      next if dry_run || skip_role_rename

      renamed = school.memberships.kept.where(role: "school").update_all(role: "staff")
      if renamed.positive?
        Rails.logger.info({ event: "MembershipRoleRenamed", school_id: school.id, count: renamed })
      end
    end
  end
end
