# frozen_string_literal: true

module Auth
  class GoogleLoginService < ApplicationService
    def initialize(id_token:, remember_me: false, client: "mobile", verifier: nil)
      @id_token = id_token
      @remember_me = remember_me
      @client = client
      @verifier = verifier || SchoolLab::Integrations::Google::IdTokenVerifier.new
    end

    def call
      claims = verifier.verify(id_token)
      link_result = Auth::LinkOrResolveIdentityService.call(
        provider: "google",
        provider_uid: claims.sub,
        email: claims.email,
        email_verified: claims.email_verified
      )
      return link_result if link_result.failure?

      eligibility = Auth::ResolveLoginEligibilityService.call(user: link_result.data[:user])
      return eligibility if eligibility.failure?

      Auth::IssueTokensService.call(
        user: link_result.data[:user],
        remember_me: remember_me,
        client: client
      )
    rescue SchoolLab::Integrations::Google::InvalidTokenError,
           SchoolLab::Integrations::Google::ConfigurationError
      ResponseService.failure(code: :invalid_oauth_token)
    end

    private

    attr_reader :id_token, :remember_me, :client, :verifier
  end
end
