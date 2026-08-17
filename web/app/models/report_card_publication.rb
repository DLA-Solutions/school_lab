# frozen_string_literal: true

class ReportCardPublication < ApplicationRecord
  include SchoolAuditable

  belongs_to :school
  belongs_to :student
  belongs_to :academic_period
  belongs_to :created_by_membership, class_name: "Membership"
  belongs_to :active_snapshot, class_name: "ReportCardSnapshot", optional: true

  has_many :report_card_snapshots, dependent: :destroy

  validates :student_id, uniqueness: { scope: %i[school_id academic_period_id] }

  before_validation :sync_school_from_student

  def initial_release?
    active_snapshot_id.blank?
  end

  private

  def sync_school_from_student
    self.school = student.school if student.present?
  end
end
