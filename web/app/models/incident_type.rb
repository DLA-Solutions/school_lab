# frozen_string_literal: true

# School-configurable incident catalog (BR-IN01) — e.g. "Reunião com os pais", "Advertência
# verbal". `category` and `default_visibility` are fixed enums; `severity` is a free label with
# no catalog mandated by the PRD, so a school can name its own scale.
#
# One row is seeded per school (`system_key: "guardian_meeting"`, see .provision_guardian_meeting!
# below) so the "Ata" feature works without a type-management screen. Full CRUD for custom types
# is deferred — see docs/open-questions.md § Incidents.
class IncidentType < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  CATEGORIES = %w[disciplinary pastoral health].freeze
  VISIBILITIES = %w[staff_only guardian guardian_on_publish].freeze

  GUARDIAN_MEETING_SYSTEM_KEY = "guardian_meeting"

  belongs_to :school

  has_many :incidents, dependent: :destroy

  validates :name, presence: true
  validates :category, inclusion: { in: CATEGORIES }
  validates :default_visibility, inclusion: { in: VISIBILITIES }
  validates :name, uniqueness: { scope: :school_id, conditions: -> { kept } }, allow_blank: true
  validates :system_key,
            uniqueness: { scope: :school_id, conditions: -> { kept } },
            allow_blank: true

  # Fetches the school's seeded "Reunião com os pais" type, creating it on first use. Idempotent —
  # safe to call from every incident creation rather than requiring a provisioning step, since
  # this domain ships with no type-management UI yet.
  def self.provision_guardian_meeting!(school)
    kept.find_or_create_by!(school: school, system_key: GUARDIAN_MEETING_SYSTEM_KEY) do |type|
      type.name = "Reunião com os pais"
      type.category = "pastoral"
      # Product judgment call, not a literal BR-IN02 requirement (only `health` is forced
      # staff_only by that rule) — meeting notes about a family stay internal until a staff
      # member explicitly decides to share them.
      type.default_visibility = "staff_only"
      type.is_system = true
    end
  end
end
