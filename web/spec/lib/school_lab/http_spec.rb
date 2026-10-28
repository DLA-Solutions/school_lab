# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolLab::Http do
  let(:pair) { OpensslCertificateHelper.generate_certificate_pair }
  let(:base_url) { "https://http-wrapper.test" }

  describe ".build_connection" do
    subject(:connection) do
      described_class.build_connection(
        base_url: base_url,
        certificate_pem: pair[:certificate_pem],
        private_key_pem: pair[:private_key_pem],
        open_timeout: 5,
        read_timeout: 10
      )
    end

    it "configures SSL client cert/key and timeouts" do
      expect(connection.url_prefix.to_s).to eq("#{base_url}/")
      expect(connection.options.open_timeout).to eq(5)
      expect(connection.options.timeout).to eq(10)
      expect(connection.ssl.client_cert).to be_a(OpenSSL::X509::Certificate)
      expect(connection.ssl.client_key).to be_a(OpenSSL::PKey::PKey)
    end

    it "does not write certificate material to temp files" do
      before_files = Dir.children(Dir.tmpdir)

      connection

      after_files = Dir.children(Dir.tmpdir)
      expect(after_files - before_files).to be_empty
    end

    it "builds a connection without client certificates when PEM args are omitted" do
      connection = described_class.build_connection(
        base_url: base_url,
        open_timeout: 5,
        read_timeout: 10
      )

      expect(connection.ssl.client_cert).to be_nil
      expect(connection.ssl.client_key).to be_nil
    end
  end

  describe ".execute" do
    let(:connection) do
      described_class.build_connection(
        base_url: base_url,
        certificate_pem: pair[:certificate_pem],
        private_key_pem: pair[:private_key_pem],
        open_timeout: 5,
        read_timeout: 10
      )
    end

    it "raises ConnectionError when the request times out" do
      stub_request(:get, "#{base_url}/timeout").to_timeout

      expect { described_class.execute { connection.get("/timeout") } }
        .to raise_error(described_class::ConnectionError)
    end

    it "wraps a TLS rejection as ConnectionError exposing the innermost cause" do
      stub_request(:get, "#{base_url}/tls")
        .to_raise(OpenSSL::SSL::SSLError.new("SSL_connect returned=1 (certificate has expired)"))

      expect { described_class.execute { connection.get("/tls") } }
        .to raise_error(described_class::ConnectionError) { |error|
          expect(error.cause_class).to eq("OpenSSL::SSL::SSLError")
          expect(error.cause_message).to include("certificate has expired")
        }
    end

    it "wraps a bare Faraday::SSLError as ConnectionError" do
      stub_request(:get, "#{base_url}/tls").to_raise(Faraday::SSLError.new("handshake failure"))

      expect { described_class.execute { connection.get("/tls") } }
        .to raise_error(described_class::ConnectionError) { |error|
          expect(error.cause_class).to eq("Faraday::SSLError")
          expect(error.cause_message).to eq("handshake failure")
        }
    end

    it "exposes the root cause of a refused connection" do
      stub_request(:get, "#{base_url}/refused").to_raise(Errno::ECONNREFUSED)

      expect { described_class.execute { connection.get("/refused") } }
        .to raise_error(described_class::ConnectionError) { |error|
          expect(error.cause_class).to eq("Errno::ECONNREFUSED")
          expect(error.cause_message).to include("Connection refused")
        }
    end

    it "reports no cause when the error was raised bare" do
      error = described_class::ConnectionError.new("boom")

      expect(error.cause_class).to be_nil
      expect(error.cause_message).to be_nil
    end
  end
end
