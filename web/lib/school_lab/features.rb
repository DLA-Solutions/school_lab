# frozen_string_literal: true

module SchoolLab
  module Features
    module_function

    def auto_provision_guardian_access?
      Rails.env.local? || truthy?(ENV["AUTO_PROVISION_GUARDIAN_ACCESS"])
    end

    def truthy?(value)
      ActiveModel::Type::Boolean.new.cast(value) == true
    end
  end
end
