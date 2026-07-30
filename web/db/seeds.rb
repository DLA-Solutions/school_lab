# frozen_string_literal: true

# Demo data for partner validation in development.
# Idempotent — safe to run multiple times via `bin/rails db:seed`.
#
# Guardian login: guardian@demo.schoollab.local / password123
# School admin:   admin@demo.schoollab.local / password123

require_relative "seeds/demo_school"

DemoSchool.seed!

if Rails.env.development?
  puts "Demo school seeded."
  puts "  Guardian: #{DemoSchool::GUARDIAN_EMAIL} / #{DemoSchool::PASSWORD}"
  puts "  Admin:    #{DemoSchool::ADMIN_EMAIL} / #{DemoSchool::PASSWORD}"
end
