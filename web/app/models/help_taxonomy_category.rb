# frozen_string_literal: true

class HelpTaxonomyCategory < ApplicationRecord
  include Discard::Model

  PERSONA_TAGS = %w[secretary director teacher guardian].freeze

  audited

  validates :name, presence: true
  validates :slug, presence: true, uniqueness: { conditions: -> { kept } }
  validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validate :persona_tags_allowed
  validate :module_key_allowed

  before_validation :normalize_persona_tags
  before_validation :assign_slug, if: -> { slug.blank? && name.present? }

  scope :ordered, -> { order(:position, :name) }

  private

  def normalize_persona_tags
    self.persona_tags = Array(persona_tags).map(&:to_s).uniq
  end

  def assign_slug
    self.slug = name.to_s.parameterize
  end

  def persona_tags_allowed
    invalid = Array(persona_tags) - PERSONA_TAGS
    return if invalid.empty?

    errors.add(:persona_tags, "contains unknown tags: #{invalid.join(', ')}")
  end

  def module_key_allowed
    return if module_key.blank?
    return if SchoolLab::SchoolModuleKeys.known_key?(module_key)

    errors.add(:module_key, :inclusion)
  end
end
