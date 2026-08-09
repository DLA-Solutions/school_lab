# frozen_string_literal: true

class RoleTemplatePermission < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  SCOPE_KINDS = %w[full segment partial].freeze

  belongs_to :role_template, class_name: "SchoolRoleTemplate", inverse_of: :role_template_permissions
  belongs_to :school

  validates :permission_key, presence: true
  validates :permission_key, uniqueness: { scope: :role_template_id, conditions: -> { kept } }
  validates :scope_kind, inclusion: { in: SCOPE_KINDS }
  validate :permission_key_must_be_known
  validate :scope_kind_allowed_for_permission
  validate :school_matches_role_template

  private

  def permission_key_must_be_known
    return if permission_key.blank?

    errors.add(:permission_key, :inclusion) unless SchoolLab::Permissions.known_key?(permission_key)
  end

  def scope_kind_allowed_for_permission
    return if permission_key.blank? || scope_kind.blank?
    return unless SchoolLab::Permissions.known_key?(permission_key)

    allowed = SchoolLab::Permissions::CATALOG[permission_key][:scope_kinds]
    return if allowed.include?(scope_kind)

    errors.add(:scope_kind, :inclusion)
  end

  def school_matches_role_template
    return if role_template.blank? || school_id.blank?

    errors.add(:school_id, :invalid) unless school_id == role_template.school_id
  end
end
