# frozen_string_literal: true

module Schools
  class SeedSchoolModulesService < ApplicationService
    def initialize(school:, overrides: nil)
      @school = school
      @overrides = normalize_overrides(overrides)
    end

    def call
      unless school&.persisted?
        return ResponseService.failure(
          code: :validation_error,
          details: { school: [ "must be persisted" ] }
        )
      end

      unknown_keys = overrides.keys - SchoolLab::SchoolModuleKeys.keys
      if unknown_keys.any?
        return ResponseService.failure(
          code: :validation_error,
          details: { modules: unknown_keys.map { |key| "#{key} is not a valid module key" } }
        )
      end

      ActiveRecord::Base.transaction do
        SchoolLab::SchoolModuleKeys.keys.each do |module_key|
          ensure_module!(module_key, overrides.fetch(module_key, true))
        end
      end

      ResponseService.success(data: school.school_modules.reload)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :school, :overrides

    def normalize_overrides(raw)
      return {} if raw.blank?

      raw.to_h.each_with_object({}) do |(key, value), normalized|
        normalized[key.to_s] = ActiveModel::Type::Boolean.new.cast(value)
      end
    end

    def ensure_module!(module_key, enabled)
      record = school.school_modules.find_or_initialize_by(module_key: module_key)
      return unless record.new_record? || record.enabled != enabled

      record.enabled = enabled
      record.save!
    end
  end
end
