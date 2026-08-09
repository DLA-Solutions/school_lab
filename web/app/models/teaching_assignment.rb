# frozen_string_literal: true

# "This teacher teaches this subject to this class." A teacher has many classes, and within a
# class may hold more than one subject — which is why the three together are the unit.
class TeachingAssignment < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  belongs_to :school
  belongs_to :teacher
  belongs_to :school_class
  belongs_to :subject
  belongs_to :discarded_by, class_name: "User", optional: true

  validates :school_class_id,
            uniqueness: { scope: %i[teacher_id subject_id], conditions: -> { kept } },
            if: :kept?

  validate :parties_belong_to_the_same_school

  private

  # Every association is school-scoped on its own; this stops a request from stitching together
  # records that belong to different schools.
  def parties_belong_to_the_same_school
    return if school_id.blank?

    { teacher: teacher, school_class: school_class, subject: subject }.each do |name, record|
      next if record.blank? || record.school_id == school_id

      errors.add(name, :invalid)
    end
  end
end
