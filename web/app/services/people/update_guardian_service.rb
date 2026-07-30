# frozen_string_literal: true

module People
  class UpdateGuardianService < ApplicationService
    def initialize(guardian:, params:)
      @guardian = guardian
      @params = params
    end

    def call
      if guardian.update(params)
        ResponseService.success(data: guardian)
      else
        ResponseService.failure(code: :validation_error, details: guardian.errors.to_hash)
      end
    end

    private

    attr_reader :guardian, :params
  end
end
