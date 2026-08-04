# frozen_string_literal: true

module SchoolLab
  module Middleware
    class ApiDocsBasicAuth
      REALM = "API Docs"

      def initialize(app)
        @app = app
      end

      def call(env)
        return @app.call(env) unless api_docs_path?(env)

        username, password = extract_credentials(env)

        if valid_credentials?(username, password)
          @app.call(env)
        else
          unauthorized
        end
      end

      private

      def api_docs_path?(env)
        env["PATH_INFO"].to_s.start_with?("/api-docs")
      end

      def extract_credentials(env)
        auth = env["HTTP_AUTHORIZATION"]
        return [ nil, nil ] unless auth&.start_with?("Basic ")

        decoded = Base64.decode64(auth.delete_prefix("Basic ")).split(":", 2)
        [ decoded[0], decoded[1] ]
      rescue ArgumentError
        [ nil, nil ]
      end

      def valid_credentials?(username, password)
        expected_user = SchoolLab::ApiDocs.username
        expected_pass = SchoolLab::ApiDocs.password
        return false if expected_user.blank? || expected_pass.blank? || username.blank? || password.blank?

        ActiveSupport::SecurityUtils.secure_compare(username, expected_user) &
          ActiveSupport::SecurityUtils.secure_compare(password, expected_pass)
      end

      def unauthorized
        [
          401,
          {
            "Content-Type" => "text/plain",
            "WWW-Authenticate" => %(Basic realm="#{REALM}")
          },
          [ "HTTP Basic: Access denied.\n" ]
        ]
      end
    end
  end
end
