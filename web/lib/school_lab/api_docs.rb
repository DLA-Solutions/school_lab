# frozen_string_literal: true

module SchoolLab
  module ApiDocs
    module_function

    def enabled?
      Rails.env.local? || truthy?(ENV["EXPOSE_API_DOCS"])
    end

    def basic_auth_required?
      enabled? && !Rails.env.local?
    end

    def username
      ENV["API_DOCS_USERNAME"].to_s
    end

    def password
      ENV["API_DOCS_PASSWORD"].to_s
    end

    def truthy?(value)
      ActiveModel::Type::Boolean.new.cast(value)
    end
  end
end
