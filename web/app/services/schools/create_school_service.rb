# frozen_string_literal: true

module Schools
  class CreateSchoolService < ApplicationService
    def initialize(params:, actor: nil)
      @params = params
      @actor = actor
    end

    def call
      school = School.new(params)
      provision_result = nil

      ActiveRecord::Base.transaction do
        unless school.save
          return ResponseService.failure(code: :validation_error, details: school.errors.to_hash)
        end

        provision_result = Identity::ProvisionSystemRoleTemplatesService.call(school: school)
        unless provision_result.success?
          raise ActiveRecord::Rollback
        end

        grant_founding_membership!(school)
      end

      if provision_result&.success?
        ResponseService.success(data: school.reload)
      elsif provision_result
        ResponseService.failure(code: provision_result.error_code, details: provision_result.details)
      else
        ResponseService.failure(code: :validation_error, details: school.errors.to_hash)
      end
    end

    private

    attr_reader :params, :actor

    # A school admin who opens a school becomes its administrator: SchoolPolicy scopes the
    # register by membership, so without this the creator could not see what they just created.
    # Backoffice users see every school already and get no membership.
    def grant_founding_membership!(school)
      return if actor.blank? || actor.backoffice?

      Membership.create!(user: actor, school: school, role: "school", status: "active")
    end
  end
end
