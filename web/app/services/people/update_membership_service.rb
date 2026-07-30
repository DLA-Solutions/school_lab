# frozen_string_literal: true

module People
  class UpdateMembershipService < ApplicationService
    def initialize(membership:, params:, actor:)
      @membership = membership
      @params = params
      @actor = actor
    end

    def call
      attributes = permitted_attributes

      if attributes[:status] == "suspended"
        attributes[:suspended_at] = Time.current
        attributes[:suspended_by] = actor
      elsif attributes[:status] == "active"
        attributes[:suspended_at] = nil
        attributes[:suspended_by] = nil
      end

      if membership.update(attributes)
        ResponseService.success(data: membership)
      else
        ResponseService.failure(code: :validation_error, details: membership.errors.to_hash)
      end
    end

    private

    attr_reader :membership, :params, :actor

    def permitted_attributes
      params.slice(:status).compact
    end
  end
end
