# frozen_string_literal: true

module Auth
  class RequestPasswordResetService < ApplicationService
    def initialize(email:)
      @email = email.to_s.downcase.strip
    end

    def call
      user = User.kept.find_by(email: email)
      user&.send_reset_password_instructions
      ResponseService.success
    end

    private

    attr_reader :email
  end
end
