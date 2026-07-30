# frozen_string_literal: true

module Auth
  class LoginService < ApplicationService
    def initialize(email:, password:, remember_me: false, client: "mobile")
      @email = email.to_s.downcase.strip
      @password = password
      @remember_me = remember_me
      @client = client
    end

    def call
      user = User.kept.find_by(email: email)
      return ResponseService.failure(code: :invalid_credentials) unless user&.valid_password?(password)
      return ResponseService.failure(code: :unauthorized) unless user.active_for_authentication?

      Auth::IssueTokensService.call(user: user, remember_me: remember_me, client: client)
    end

    private

    attr_reader :email, :password, :remember_me, :client
  end
end
