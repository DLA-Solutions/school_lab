# frozen_string_literal: true

module GuardianRequests
  # Opening a request. Called both by a guardian asking for themselves and by staff writing down
  # what a guardian asked for on the telephone, which is why the guardian is passed in rather than
  # read from the current membership.
  class CreateGuardianRequestService < ApplicationService
    def initialize(school:, guardian:, actor:, params:)
      @school = school
      @guardian = guardian
      @actor = actor
      @params = params
    end

    def call
      return ResponseService.failure(code: :not_found) if guardian.blank?

      request = GuardianRequest.new(
        school: school,
        guardian: guardian,
        requested_by: actor,
        **permitted_attributes
      )

      # A declaration is about no subject and no test date. Silently dropping them rather than
      # refusing the request: the fields belong to the other kind's form, and a guardian who
      # switched kind mid-form should not be told off for what the form left behind.
      if request.kind == "declaration"
        request.subject = nil
        request.reference_date = nil
      end

      return ResponseService.failure(code: :validation_error, details: request.errors.to_hash) unless request.save

      ResponseService.success(data: request)
    end

    private

    attr_reader :school, :guardian, :actor, :params

    def permitted_attributes
      params.to_h.symbolize_keys.slice(:student_id, :kind, :details, :subject_id, :reference_date)
    end
  end
end
