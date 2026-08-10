# frozen_string_literal: true

class SchoolRoleTemplate < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  SYSTEM_KEYS = SchoolLab::Permissions.system_template_keys.freeze

  belongs_to :school

  has_many :role_template_permissions, foreign_key: :role_template_id, dependent: :destroy, inverse_of: :role_template
  has_many :staff_profiles, foreign_key: :role_template_id, dependent: :destroy, inverse_of: :role_template

  validates :name, presence: true
  validates :system_key, inclusion: { in: SYSTEM_KEYS }, allow_nil: true
  validates :system_key, uniqueness: { scope: :school_id, conditions: -> { kept } }, allow_nil: true
  validate :system_key_presence_for_system_template
  validate :system_key_absence_for_custom_template

  scope :system_templates, -> { kept.where(is_system: true) }

  ADMIN_CAPABLE_KEYS = %w[manage_people manage_school_settings].freeze

  def admin_capable?
    kept_keys = role_template_permissions.kept.pluck(:permission_key)
    ADMIN_CAPABLE_KEYS.all? { |key| kept_keys.include?(key) }
  end

  def affected_memberships_count
    staff_profiles.kept.count
  end

  def self.school_has_admin_capable_template?(school:, excluding: nil, replacement_keys_for: nil)
    school.school_role_templates.kept.any? do |template|
      keys = if excluding&.id == template.id
        replacement_keys_for || []
      else
        template.role_template_permissions.kept.pluck(:permission_key)
      end

      ADMIN_CAPABLE_KEYS.all? { |key| keys.include?(key) }
    end
  end

  private

  def system_key_presence_for_system_template
    return unless is_system?

    errors.add(:system_key, :blank) if system_key.blank?
  end

  def system_key_absence_for_custom_template
    return if is_system?

    errors.add(:system_key, :present) if system_key.present?
  end
end
