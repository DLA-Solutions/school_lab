# frozen_string_literal: true

class ReportCardSnapshot < ApplicationRecord
  include SchoolAuditable

  belongs_to :school
  belongs_to :report_card_publication
  belongs_to :report_card_publish_batch, optional: true
  belongs_to :report_card_config
  belongs_to :supersedes, class_name: "ReportCardSnapshot", optional: true

  validates :version, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :version, uniqueness: { scope: :report_card_publication_id }
  validates :grade_launch_digest, :snapshot, :released_at, :pdf_storage_key, presence: true

  before_validation :sync_school_from_publication
  before_update :prevent_mutation

  scope :released, -> { where("released_at <= ?", Time.current) }

  def released?
    released_at.present? && released_at <= Time.current
  end

  def guardian_visible?
    released?
  end

  private

  def sync_school_from_publication
    self.school = report_card_publication.school if report_card_publication.present?
  end

  def prevent_mutation
    raise ActiveRecord::ReadOnlyRecord, "report_card_frozen"
  end
end
