# frozen_string_literal: true

module ModuleEnabledGuard
  extend ActiveSupport::Concern

  class_methods do
    def require_enabled_module(module_key)
      before_action -> { ensure_module_enabled!(module_key) }
    end
  end

  private

  def ensure_module_enabled!(module_key)
    return if school_module_enabled?(module_key)

    render_error(:module_disabled, status: :forbidden)
  end

  def school_module_enabled?(module_key)
    key = module_key.to_s
    return false unless SchoolLab::SchoolModuleKeys.known_key?(key)
    return false unless Current.school

    record = Current.school.school_modules.find_by(module_key: key)
    record.nil? || record.enabled?
  end
end
