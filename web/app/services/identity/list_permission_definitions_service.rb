# frozen_string_literal: true

module Identity
  class ListPermissionDefinitionsService < ApplicationService
    def call
      definitions = SchoolLab::Permissions::CATALOG.map do |key, entry|
        {
          key: key,
          domain: entry[:domain],
          scope_kinds: entry[:scope_kinds]
        }
      end

      ResponseService.success(data: { definitions: definitions })
    end
  end
end
