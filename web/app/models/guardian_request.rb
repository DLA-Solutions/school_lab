# frozen_string_literal: true

# Something a guardian asks the school for, and the school's answer to it.
#
# Two kinds so far: a declaration — proof of enrolment or attendance, usually wanted by an
# employer or a court — and a second sitting of a test the student missed. They share a table
# because the school works them from one queue; see the migration for why.
class GuardianRequest < ApplicationRecord
  include Discard::Model
  include SchoolAuditable
  include GuardianRequestStateMachine

  KINDS = %w[declaration second_call].freeze
  OPEN_STATUSES = %w[pending in_progress].freeze

  belongs_to :school
  belongs_to :guardian
  belongs_to :student
  # Which test the second sitting is for. Optional, and meaningless on a declaration.
  belongs_to :subject, optional: true
  belongs_to :requested_by, class_name: "User", optional: true
  belongs_to :resolved_by, class_name: "User", optional: true

  validates :kind, inclusion: { in: KINDS }
  validates :details, presence: true
  validate :student_is_in_the_guardians_care
  validate :parties_belong_to_the_same_school

  scope :open, -> { where(status: OPEN_STATUSES) }
  scope :of_kind, ->(kind) { where(kind: kind) }

  def open?
    OPEN_STATUSES.include?(status)
  end

  private

  # The request names both the guardian and the student, and nothing in the routing checks that
  # the two have anything to do with each other. Without this, a guardian could ask for a
  # declaration about somebody else's child — and a declaration is exactly the document you would
  # forge if you wanted to prove a connection to a child you have none to.
  def student_is_in_the_guardians_care
    return if guardian.blank? || student.blank?

    errors.add(:student, :invalid) unless guardian.students.kept.exists?(id: student_id)
  end

  # Each association is school-scoped on its own; this stops a request from stitching together
  # records belonging to different schools.
  def parties_belong_to_the_same_school
    return if school_id.blank?

    { guardian: guardian, student: student, subject: subject }.each do |name, record|
      next if record.blank? || record.school_id == school_id

      errors.add(name, :invalid)
    end
  end
end
