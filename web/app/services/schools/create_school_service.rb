# frozen_string_literal: true

module Schools
  class CreateSchoolService < ApplicationService
    def initialize(params:, actor: nil)
      @params = params
      @actor = actor
    end

    def call
      school = School.new(params)

      ActiveRecord::Base.transaction do
        unless school.save
          return ResponseService.failure(code: :validation_error, details: school.errors.to_hash)
        end

        grant_founding_membership!(school)
      end

      ResponseService.success(data: school)
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
