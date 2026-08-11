# frozen_string_literal: true

# Demo data for partner validation in development and staging.
# Idempotent — safe to run multiple times via `bin/rails db:seed`.
#
# Local: runs automatically (Rails.env.local?).
# Staging: set SEED_DEMO_DATA=true in deploy.staging.yml.
# Production: never seeded.

require_relative "seeds/demo_school"

if DemoSchool.seed_enabled?
  DemoSchool.seed!

  if Rails.env.development?
    puts "Demo school seeded (#{DemoSchool.target_student_count} students target)."
    puts "  Password for all demo users: #{DemoSchool::PASSWORD}"
    DemoSchool::DEMO_USER_EMAILS.each do |email|
      puts "  #{email}"
    end
  end
end
