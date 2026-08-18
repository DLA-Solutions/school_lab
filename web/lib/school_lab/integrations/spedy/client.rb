# frozen_string_literal: true

module SchoolLab
  module Integrations
    module Spedy
      class Client
        def initialize(api_key:, api_urls: Configuration.current)
          @api_key = api_key
          @api_urls = api_urls
        end

        def list_cities(query: nil, state: nil, code: nil)
          params = {}
          params[:filterText] = query if query.present?
          params[:state] = state if state.present?
          params[:code] = code if code.present?
          get("/v1/service-invoices/cities", params: params)
        end

        def create_company(body:)
          post("/v1/companies", body: body.to_json)
        end

        def update_company_settings(company_id:, body:)
          put("/v1/companies/#{company_id}/settings", body: body.to_json)
        end

        def add_certificate(company_id:, file_io:, password:)
          post_multipart("/v1/companies/#{company_id}/certificates",
                         file: file_io, fields: { password: password })
        end

        def create_service_invoice(body:)
          post("/v1/service-invoices", body: body.to_json)
        end

        def fetch_service_invoice(document_id:)
          get("/v1/service-invoices/#{document_id}")
        end

        def check_status(document_id:)
          post("/v1/service-invoices/#{document_id}/check-status")
        end

        def cancel(document_id:, reason: nil)
          body = reason.present? ? { reason: reason }.to_json : nil
          post("/v1/service-invoices/#{document_id}/cancel", body: body)
        end

        def download_pdf(document_id:)
          get("/v1/service-invoices/#{document_id}/pdf", raw: true)
        end

        def download_xml(document_id:)
          get("/v1/service-invoices/#{document_id}/xml", raw: true)
        end

        def list_service_invoices(since:, limit: 100)
          get("/v1/service-invoices", params: { effectiveDateStart: since.iso8601, pageSize: limit })
        end

        private

        attr_reader :api_key, :api_urls

        def get(path, params: nil, raw: false)
          request(:get, path, params: params, raw: raw)
        end

        def post(path, body: nil)
          request(:post, path, body: body)
        end

        def put(path, body: nil)
          request(:put, path, body: body)
        end

        def post_multipart(path, file:, fields: {})
          response = SchoolLab::Http.execute do
            connection.post(path) do |req|
              req.headers["X-Api-Key"] = api_key
              req.body = multipart_body(file: file, fields: fields)
            end
          end
          map_response!(response)
        rescue SchoolLab::Http::ConnectionError
          raise TransientError, "Provider connection error"
        end

        def request(method, path, body: nil, params: nil, raw: false)
          response = SchoolLab::Http.execute do
            connection.run_request(method, path_with_params(path, params), body, headers(body))
          end
          raw ? response.body : map_response!(response)
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

        def headers(body)
          headers = { "X-Api-Key" => api_key }
          headers["Content-Type"] = "application/json" if body
          headers
        end

        def path_with_params(path, params)
          return path if params.blank?

          query = URI.encode_www_form(params.compact)
          "#{path}?#{query}"
        end

        def multipart_body(file:, fields:)
          boundary = "----SpedyBoundary#{SecureRandom.hex(8)}"
          body = +""
          fields.each do |key, value|
            body << "--#{boundary}\r\n"
            body << "Content-Disposition: form-data; name=\"#{key}\"\r\n\r\n"
            body << "#{value}\r\n"
          end
          filename = File.basename(file.respond_to?(:path) ? file.path : "certificate.pfx")
          file_content = file.read
          body << "--#{boundary}\r\n"
          body << "Content-Disposition: form-data; name=\"file\"; filename=\"#{filename}\"\r\n"
          body << "Content-Type: application/octet-stream\r\n\r\n"
          body << file_content
          body << "\r\n--#{boundary}--\r\n"
          body
        end

        def map_response!(response)
          code = response.status
          body = response.body.to_s

          case code
          when 200..299
            body
          when 400, 422
            raise ValidationError.new("Provider validation error", details: safe_error_body(body))
          when 401, 403
            raise AuthenticationError, "Provider authentication failed (#{code})"
          when 429
            raise TransientError, "Provider rate limit (429)"
          when 500..599
            raise TransientError, "Provider server error (#{code})"
          else
            raise UnexpectedResponseError, "Unexpected provider response (#{code})"
          end
        end

        def safe_error_body(body)
          JSON.parse(body)
        rescue JSON::ParserError
          { "message" => "unparseable provider error" }
        end
      end
    end
  end
end
