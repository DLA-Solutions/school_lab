# frozen_string_literal: true

module SchoolLab
  module SchoolSpa
    module_function

    def invite_accept_url(token:, email:)
      uri = URI.parse("#{spa_root_url}/invite/accept")
      uri.query = { token: token, email: email }.to_query
      uri.to_s
    end

    # Where the SPA collects a new password. The token travels in the query string because the
    # link has to survive being clicked from a mail client.
    def password_reset_url(token:)
      uri = URI.parse("#{spa_root_url}/redefinir-senha")
      uri.query = { token: token }.to_query
      uri.to_s
    end

    def guardian_access_url
      "#{spa_root_url}/acesso"
    end

    def spa_root_url
      return ENV["SCHOOL_SPA_URL"].chomp("/") if ENV["SCHOOL_SPA_URL"].present?

      host = ENV.fetch("APP_HOST", "scholarpremium.com.br")
      if local_host?(host)
        base = host.include?(":") ? host : "#{host}:5173"
        "http://#{base}"
      else
        path = ENV.fetch("SCHOOL_SPA_PATH", "/app").chomp("/")
        "https://#{host}#{path}"
      end
    end

    def local_host?(host)
      host.include?("localhost") || host.start_with?("127.0.0.1")
    end
    private_class_method :local_host?
  end
end
