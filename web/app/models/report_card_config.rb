# frozen_string_literal: true

class ReportCardConfig < ApplicationRecord
  include SchoolAuditable

  DEFAULT_TEMPLATE_KEY = "standard_v1"

  belongs_to :school
  belongs_to :document_signatory
  belongs_to :created_by_membership, class_name: "Membership"

  has_many :report_card_snapshots, dependent: :restrict_with_error

  validates :version, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :template_key, presence: true
  validates :version, uniqueness: { scope: :school_id }
  validates :display_config, presence: true

  before_validation :sync_school_from_signatory

  def self.current_for(school)
    where(school: school).order(version: :desc).first
  end

  def signatory_snapshot
    {
      id: document_signatory_id,
      role_label: document_signatory.role_label,
      name: document_signatory.name,
      title: document_signatory.title
    }
  end

  private

  def sync_school_from_signatory
    self.school = document_signatory.school if document_signatory.present?
  end
end
