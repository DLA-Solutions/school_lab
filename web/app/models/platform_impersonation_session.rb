# frozen_string_literal: true

class PlatformImpersonationSession < ApplicationRecord
  IMPERSONATABLE_SYSTEM_KEYS = %w[director secretary].freeze

  belongs_to :operator_user, class_name: "User"
  belongs_to :target_user, class_name: "User"
  belongs_to :school
  belongs_to :target_membership, class_name: "Membership"

  audited associated_with: :school

  validates :expires_at, presence: true

  scope :active, -> { where(ended_at: nil).where(expires_at: Time.current..) }

  def active?
    ended_at.nil? && expires_at.future?
  end

  def end!
    update!(ended_at: Time.current)
  end
end
