# frozen_string_literal: true

class ClassDiscipline < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  belongs_to :school
  belongs_to :school_class
  belongs_to :subject
  belongs_to :school_year
  belongs_to :teacher, optional: true

  has_many :evaluation_components, dependent: :destroy
  has_many :grade_entries, dependent: :destroy
  has_many :grade_overrides, dependent: :destroy
  has_many :grade_launches, dependent: :destroy

  validates :required_on_report_card, inclusion: { in: [ true, false ] }
  validates :subject_id,
            uniqueness: { scope: :school_class_id, conditions: -> { kept } },
            if: :kept?

  before_validation :sync_school_from_class

  scope :required_on_report_card, -> { where(required_on_report_card: true) }

  private

  def sync_school_from_class
    self.school = school_class.school if school_class.present?
  end
end
