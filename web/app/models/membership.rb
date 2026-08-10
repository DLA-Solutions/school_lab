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
  validate :platform_permissions_keys, if: -> { role == "backoffice" }

  before_validation :normalize_platform_permissions

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

  def platform_permission?(key)
    return false unless role == "backoffice"

    Array(platform_permissions).map(&:to_s).include?(key.to_s)
  end

  private

  def normalize_platform_permissions
    self.platform_permissions = Array(platform_permissions).map(&:to_s).uniq
  end

  def platform_permissions_keys
    invalid = Array(platform_permissions).reject { |key| SchoolLab::PlatformPermissions.known_key?(key) }
    return if invalid.empty?

    errors.add(:platform_permissions, "contains unknown keys: #{invalid.join(', ')}")
  end
end
