# frozen_string_literal: true

module People
  class CreateMembershipService < ApplicationService
    def initialize(school:, params:)
      @school = school
      @params = params
    end

    def call
      email = params[:email].to_s.strip.downcase
      return ResponseService.failure(code: :validation_error, details: { email: [ "can't be blank" ] }) if email.blank?

      user = find_or_create_user(email)
      return user if user.is_a?(ResponseService)

      membership = school.memberships.build(
        user: user,
        role: params[:role],
        status: "invited"
      )

      if membership.save
        People::InviteMembershipNotificationJob.perform_later(membership.id)
        ResponseService.success(data: membership)
      else
        ResponseService.failure(code: :validation_error, details: membership.errors.to_hash)
      end
    end

    private

    attr_reader :school, :params

    def find_or_create_user(email)
      existing = User.kept.find_by("LOWER(email) = ?", email)
      return existing if existing

      password = SecureRandom.hex(16)
      user = User.new(
        email: email,
        password: password,
        password_confirmation: password
      )
      user.skip_confirmation!

      if user.save
        user
      else
        ResponseService.failure(code: :validation_error, details: user.errors.to_hash)
      end
    end
  end
end
