# frozen_string_literal: true

require "faraday"
require "faraday/multipart"

module SchoolLab
  module Http
    # Raised for transport failures (DNS, refused/timed-out connection, TLS/mTLS handshake). The
    # original exception is kept as Ruby's `cause`; `cause_class` / `cause_message` expose the
    # innermost one (e.g. OpenSSL::SSL::SSLError "certificate has expired", Net::OpenTimeout)
    # so callers can record why the call failed. The message is passed through untouched on
    # purpose: redaction and size capping belong to the persisting layer
    # (Billing::IssuanceErrorSerializer), which must redact BEFORE truncating — cutting here
    # could split a PEM block the redactor would no longer recognise.
    class ConnectionError < StandardError
      MAX_CAUSE_DEPTH = 5

      def cause_class
        root_cause&.class&.name
      end

      def cause_message
        root_cause&.message.to_s.presence
      end

      private

      def root_cause
        current = cause
        MAX_CAUSE_DEPTH.times do
          break unless current&.cause

          current = current.cause
        end
        current
      end
    end

    module_function

    def build_connection(base_url:, open_timeout:, read_timeout:, certificate_pem: nil,
                         private_key_pem: nil, multipart: false)
      if certificate_pem.present? ^ private_key_pem.present?
        raise ArgumentError, "certificate_pem and private_key_pem must both be present or both omitted"
      end

      Faraday.new(url: base_url.chomp("/")) do |connection|
        # File uploads only: the middleware turns a payload containing a FilePart into a
        # multipart body, which a JSON API would never want.
        connection.request :multipart if multipart
        connection.options.open_timeout = open_timeout
        connection.options.timeout = read_timeout
        if certificate_pem.present?
          connection.ssl.client_cert = OpenSSL::X509::Certificate.new(certificate_pem)
          connection.ssl.client_key = OpenSSL::PKey.read(private_key_pem)
        end
        connection.adapter Faraday.default_adapter
      end
    end

    def execute
      yield
    rescue Faraday::ConnectionFailed, Faraday::TimeoutError, Faraday::SSLError, Errno::ECONNREFUSED, SocketError
      raise ConnectionError
    end
  end
end
