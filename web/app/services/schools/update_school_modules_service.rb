# frozen_string_literal: true

module Schools
  class UpdateSchoolModulesService < ApplicationService
    def initialize(school:, modules:)
      @school = school
      @modules = normalize_modules(modules)
    end

    def call
      if modules.blank?
        return ResponseService.failure(
          code: :validation_error,
          details: { modules: [ "must include at least one module key" ] }
        )
      end

      unknown_keys = modules.keys - SchoolLab::SchoolModuleKeys.keys
      if unknown_keys.any?
        return ResponseService.failure(
          code: :validation_error,
          details: { modules: unknown_keys.map { |key| "#{key} is not a valid module key" } }
        )
      end

      ActiveRecord::Base.transaction do
        modules.each do |module_key, enabled|
          record = school.school_modules.find_or_initialize_by(module_key: module_key)
          record.enabled = enabled
          record.save!
        end
      end

      ResponseService.success(data: module_map)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :school, :modules

    def normalize_modules(raw)
      return {} if raw.blank?

      raw.to_h.each_with_object({}) do |(key, value), normalized|
        normalized[key.to_s] = ActiveModel::Type::Boolean.new.cast(value)
      end
    end

    def module_map
      by_key = school.school_modules.reload.index_by(&:module_key)
      SchoolLab::SchoolModuleKeys.keys.index_with do |module_key|
        record = by_key[module_key]
        record ? record.enabled : true
      end
    end
  end
end
