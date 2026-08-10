# frozen_string_literal: true

class Membership < ApplicationRecord
  include Discard::Model

  ROLES = %w[backoffice school staff teacher guardian].freeze
  STATUSES = %w[active invited suspended].freeze

  belongs_to :user
  belongs_to :school, optional: true
  belongs_to :suspended_by, class_name: "User", optional: true

  has_one :staff_profile, dependent: :destroy
  has_many :membership_permissions, dependent: :destroy
  has_many :membership_invite_tokens, dependent: :destroy

  validates :role, inclusion: { in: ROLES }
  validates :status, inclusion: { in: STATUSES }
  validates :user_id, uniqueness: { scope: :school_id, conditions: -> { kept } }

  scope :active, -> { kept.where(status: "active") }
  scope :invited, -> { kept.where(status: "invited") }

  def active?
    status == "active"
  end

  def invited?
    status == "invited"
  end

  def suspended?
    status == "suspended"
  end

  def staff_member?
    %w[school staff teacher].include?(role)
  end
end
