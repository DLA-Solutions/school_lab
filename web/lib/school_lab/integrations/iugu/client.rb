# frozen_string_literal: true

require "base64"
require "cgi"
require "json"
require "uri"

module SchoolLab
  module Integrations
    module Iugu
      class Client
        def initialize(api_token: nil, api_urls: nil, api_base_url: nil)
          @api_token = api_token.presence || Configuration.api_token
          base = api_base_url.presence || api_urls&.fetch(:api_base_url, nil) || Configuration.api_base_url
          @api_urls = { api_base_url: base.to_s.chomp("/") }
        end

        def get(path, params: nil)
          request(:get, path, params: params)
        end

        def post(path, body: nil)
          request(:post, path, body: body)
        end

        def put(path, body: nil)
          request(:put, path, body: body)
        end

        def create_customer(body:)
          post("/v1/customers", body: body)
        end

        def update_customer(id:, body:)
          put("/v1/customers/#{id}", body: body)
        end

        def create_subscription(body:)
          post("/v1/subscriptions", body: body)
        end

        def fetch_subscription(id:)
          get("/v1/subscriptions/#{id}")
        end

        def update_subscription(id:, body:)
          put("/v1/subscriptions/#{id}", body: body)
        end

        def change_plan(id:, plan_identifier:)
          post("/v1/subscriptions/#{id}/change_plan/#{CGI.escape(plan_identifier)}")
        end

        def suspend_subscription(id:)
          post("/v1/subscriptions/#{id}/suspend")
        end

        def activate_subscription(id:)
          post("/v1/subscriptions/#{id}/activate")
        end

        def expire_subscription(id:)
          request(:delete, "/v1/subscriptions/#{id}")
        end

        def fetch_invoice(id:)
          get("/v1/invoices/#{id}")
        end

        def list_invoices(params: {})
          get("/v1/invoices", params: params)
        end

        def fetch_plan(identifier)
          get("/v1/plans/#{CGI.escape(identifier.to_s)}")
        end

        def create_plan(body)
          post("/v1/plans", body: body)
        end

        private

        attr_reader :api_token, :api_urls

        def request(method, path, body: nil, params: nil)
          payload = body.present? ? JSON.generate(body) : nil
          response = SchoolLab::Http.execute do
            connection.run_request(method, path_with_params(path, params), payload, headers(payload))
          end
          map_response!(response)
        rescue SchoolLab::Http::ConnectionError
          raise TransientError, "Provider connection error"
        end

        def connection
          @connection ||= SchoolLab::Http.build_connection(
            base_url: api_urls.fetch(:api_base_url),
            open_timeout: Configuration::CONNECT_TIMEOUT,
            read_timeout: Configuration::READ_TIMEOUT
          )
        end

        def headers(payload)
          encoded = Base64.strict_encode64("#{api_token}:")
          headers = { "Authorization" => "Basic #{encoded}" }
          headers["Content-Type"] = "application/json" if payload
          headers
        end

        def path_with_params(path, params)
          return path if params.blank?

          "#{path}?#{URI.encode_www_form(params)}"
        end

        def map_response!(response)
          parsed = parse_body(response.body)

          case response.status
          when 200, 201, 204
            parsed
          when 401, 403
            raise AuthenticationError, "Iugu authentication failed"
          when 408, 429, 500..599
            raise TransientError, "Iugu transient HTTP #{response.status}"
          when 400, 404, 422
            raise ValidationError.new("Iugu rejected the request", details: parsed)
          else
            raise UnexpectedResponseError, "Unexpected Iugu status #{response.status}"
          end
        end

        def parse_body(body)
          return {} if body.blank?

          JSON.parse(body)
        rescue JSON::ParserError
          { "message" => "unparseable provider error" }
        end
      end
    end
  end
end
