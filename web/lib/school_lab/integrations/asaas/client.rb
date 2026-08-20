# frozen_string_literal: true

require "json"
require "uri"

module SchoolLab
  module Integrations
    module Asaas
      class Client
        def initialize(api_token: nil, api_base_url: nil)
          @api_token = api_token.presence || Configuration.api_token
          @api_base_url = (api_base_url.presence || Configuration.api_base_url).to_s.chomp("/")
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

        def delete(path)
          request(:delete, path)
        end

        def create_customer(body:)
          post("/v3/customers", body: body)
        end

        def update_customer(id:, body:)
          put("/v3/customers/#{id}", body: body)
        end

        def create_subscription(body:)
          post("/v3/subscriptions", body: body)
        end

        def fetch_subscription(id:)
          get("/v3/subscriptions/#{id}")
        end

        def update_subscription(id:, body:)
          put("/v3/subscriptions/#{id}", body: body)
        end

        def delete_subscription(id:)
          delete("/v3/subscriptions/#{id}")
        end

        def list_subscription_payments(id:, params: {})
          get("/v3/subscriptions/#{id}/payments", params: params)
        end

        def fetch_payment(id:)
          get("/v3/payments/#{id}")
        end

        def list_payments(params: {})
          get("/v3/payments", params: params)
        end

        private

        attr_reader :api_token, :api_base_url

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
            base_url: api_base_url,
            open_timeout: Configuration::CONNECT_TIMEOUT,
            read_timeout: Configuration::READ_TIMEOUT
          )
        end

        def headers(payload)
          headers = { "access_token" => api_token }
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
            raise AuthenticationError, "Asaas authentication failed"
          when 408, 429, 500..599
            raise TransientError, "Asaas transient HTTP #{response.status}"
          when 400, 404, 422
            raise ValidationError.new("Asaas rejected the request", details: parsed)
          else
            raise UnexpectedResponseError, "Unexpected Asaas status #{response.status}"
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
