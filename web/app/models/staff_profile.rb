# frozen_string_literal: true

class StaffProfile < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  belongs_to :membership
  belongs_to :school
  belongs_to :role_template, class_name: "SchoolRoleTemplate", inverse_of: :staff_profiles
  belongs_to :segment, optional: true

  validates :role_template_id, presence: true
  validates :membership_id, uniqueness: { conditions: -> { kept } }
  validate :membership_belongs_to_school
  validate :role_template_belongs_to_school
  validate :segment_belongs_to_school
  validate :only_one_owner_per_school, if: -> { is_owner? && kept? }

  private

  def membership_belongs_to_school
    return if membership.blank? || school_id.blank?

    errors.add(:membership_id, :invalid) unless membership.school_id == school_id
  end

  def role_template_belongs_to_school
    return if role_template.blank? || school_id.blank?

    errors.add(:role_template_id, :invalid) unless role_template.school_id == school_id
  end

  def segment_belongs_to_school
    return if segment.blank? || school_id.blank?

    errors.add(:segment_id, :invalid) unless segment.school_id == school_id
  end

  def only_one_owner_per_school
    scope = StaffProfile.kept.where(school_id: school_id, is_owner: true)
    scope = scope.where.not(id: id) if persisted?

    errors.add(:is_owner, :taken) if scope.exists?
  end
end
