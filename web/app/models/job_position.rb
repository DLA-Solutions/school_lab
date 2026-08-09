# frozen_string_literal: true

# A post a collaborator can occupy. Replaces the free-text `job_title` the register used to keep,
# so two people in the same post are counted as such rather than as two spellings of it.
#
# Distinct from `SchoolRoleTemplate`, which grants a *user account* its permissions: a job position
# says what someone does, not what they may see.
class JobPosition < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  # What a school starts with. Editable afterwards — every school names its posts differently.
  DEFAULT_NAMES = [
    "Professor(a)",
    "Estagiário(a)",
    "Auxiliar de sala",
    "Auxiliar de Serviços Gerais",
    "Secretária",
    "Coordenadora",
    "Diretor(a)"
  ].freeze

  belongs_to :school
  belongs_to :discarded_by, class_name: "User", optional: true

  has_many :teachers, dependent: :restrict_with_error

  validates :name, presence: true
  validates :name, uniqueness: { scope: :school_id, conditions: -> { kept } }, if: :kept?

  scope :ordered, -> { order(:name) }

  # Collaborators keep pointing at their post, so removing one in use would leave them without a
  # post they are required to have.
  def in_use?
    teachers.kept.exists?
  end

  # Creates whatever of the standard set the school is missing, and returns the full list.
  def self.provision_defaults!(school)
    DEFAULT_NAMES.each do |name|
      next if school.job_positions.kept.exists?(name: name)

      school.job_positions.create!(name: name)
    end

    school.job_positions.kept.ordered
  end
end
