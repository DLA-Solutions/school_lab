# frozen_string_literal: true

# One private thread per child. Guardians linked to the student and teachers assigned to the
# child's current class are derived at read time — the row only says which child, in which
# school. A person who leaves stops seeing it; the history stays for whoever remains.
class Conversation < ApplicationRecord
  include Discard::Model

  belongs_to :school
  belongs_to :student

  has_many :messages, dependent: :restrict_with_exception

  validates :student_id, uniqueness: { scope: :school_id, conditions: -> { kept } }, if: :kept?
  validate :student_belongs_to_school

  private

  def student_belongs_to_school
    return if student.blank? || school_id.blank?
    return if student.school_id == school_id

    errors.add(:student, :invalid)
  end
end
