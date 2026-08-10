# frozen_string_literal: true

class MembershipInviteToken < ApplicationRecord
  belongs_to :membership
  belongs_to :school
  belongs_to :created_by, class_name: "User", optional: true

  validates :token_digest, presence: true, uniqueness: true
  validates :expires_at, presence: true
  validates :membership_id, uniqueness: { conditions: -> { where(used_at: nil) } }

  scope :unused, -> { where(used_at: nil) }
  scope :active, -> { unused.where("expires_at > ?", Time.current) }

  def used?
    used_at.present?
  end

  def expired?
    expires_at <= Time.current
  end
end
