# frozen_string_literal: true

require "faraday"

module SchoolLab
  module Http
    class ConnectionError < StandardError; end

    module_function

    def build_connection(base_url:, certificate_pem:, private_key_pem:, open_timeout:, read_timeout:)
      Faraday.new(url: base_url.chomp("/")) do |connection|
        connection.options.open_timeout = open_timeout
        connection.options.timeout = read_timeout
        connection.ssl.client_cert = OpenSSL::X509::Certificate.new(certificate_pem)
        connection.ssl.client_key = OpenSSL::PKey.read(private_key_pem)
        connection.adapter Faraday.default_adapter
      end
    end

    def execute
      yield
    rescue Faraday::ConnectionFailed, Faraday::TimeoutError, Errno::ECONNREFUSED, SocketError
      raise ConnectionError
    end
  end
end
