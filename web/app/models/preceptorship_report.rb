# frozen_string_literal: true

# Preceptoria: a teacher's account, in prose, of how one student is getting on.
#
# See the migration for why it is text and not a scale, and why it is published rather than saved.
class PreceptorshipReport < ApplicationRecord
  include Discard::Model
  include SchoolAuditable
  include PreceptorshipReportStateMachine

  belongs_to :school
  belongs_to :student
  belongs_to :teacher
  belongs_to :academic_period, optional: true
  belongs_to :author, class_name: "User", optional: true

  validates :body, presence: true
  validate :parties_belong_to_the_same_school

  scope :published, -> { where(status: "published") }

  def published?
    status == "published"
  end

  # A published report is the school's record of what was said. Editing one after a family has
  # read it would change what they were told without their knowing.
  def editable?
    !published?
  end

  private

  # Each association is school-scoped on its own; this stops a report from stitching together
  # records belonging to different schools.
  def parties_belong_to_the_same_school
    return if school_id.blank?

    { student: student, teacher: teacher, academic_period: academic_period }.each do |name, record|
      next if record.blank? || record.school_id == school_id

      errors.add(name, :invalid)
    end
  end
end
