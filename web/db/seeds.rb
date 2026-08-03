# frozen_string_literal: true

# Demo data for partner validation in development.
# Idempotent — safe to run multiple times via `bin/rails db:seed`.
#
# Guardian login: guardian@demo.schoollab.local / password123
# School admin:   admin@demo.schoollab.local / password123

require_relative "seeds/demo_school"

# db:prepare runs seeds on an empty database, including the first production boot.
# Demo data carries well-known credentials and must never reach a deployed environment.
DemoSchool.seed! if Rails.env.local?

if Rails.env.development?
  puts "Demo school seeded."
  puts "  Guardian: #{DemoSchool::GUARDIAN_EMAIL} / #{DemoSchool::PASSWORD}"
  puts "  Admin:    #{DemoSchool::ADMIN_EMAIL} / #{DemoSchool::PASSWORD}"
end
