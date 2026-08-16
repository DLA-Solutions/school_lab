# frozen_string_literal: true

class SchoolModule < ApplicationRecord
  include SchoolAuditable

  belongs_to :school

  validates :module_key, presence: true
  validates :module_key, uniqueness: { scope: :school_id }
  validates :enabled, inclusion: { in: [ true, false ] }
  validate :module_key_must_be_known

  private

  def module_key_must_be_known
    return if module_key.blank?

    errors.add(:module_key, :inclusion) unless SchoolLab::SchoolModuleKeys.known_key?(module_key)
  end
end
