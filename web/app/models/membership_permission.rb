# frozen_string_literal: true

class MembershipPermission < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  EFFECTS = %w[grant deny].freeze

  belongs_to :membership
  belongs_to :school

  validates :permission_key, presence: true
  validates :permission_key, uniqueness: { scope: :membership_id, conditions: -> { kept } }
  validates :effect, inclusion: { in: EFFECTS }
  validate :permission_key_must_be_known
  validate :school_matches_membership

  private

  def permission_key_must_be_known
    return if permission_key.blank?

    errors.add(:permission_key, :inclusion) unless SchoolLab::Permissions.known_key?(permission_key)
  end

  def school_matches_membership
    return if membership.blank? || school_id.blank?

    errors.add(:school_id, :invalid) unless school_id == membership.school_id
  end
end
