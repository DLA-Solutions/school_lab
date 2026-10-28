# frozen_string_literal: true

require "rails_helper"

# End to end through the real Banco Inter chain (Client -> Adapter/ErrorMapper -> IssueChargeService
# / IssueChargeJob -> IssuanceErrorSerializer -> charge_issuances.last_error), with WebMock as the
# only fake. Proves the diagnostics a failed issuance needs survive every layer.
RSpec.describe "Inter issuance failures stored on the issuance" do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let!(:billing_settings) { create(:school_billing_settings, :issuance_ready, school: school) }
  let!(:provider_config) { create(:school_payment_provider, :inter, school: school) }
  let(:guardian) { create(:guardian, school: school) }
  let(:charge) { create(:charge, school: school, guardian: guardian) }
  let(:cobrancas_url) { "#{INTER_TEST_API_BASE_URL}/cobranca/v3/cobrancas" }
  let(:issuance) { charge.reload.current_issuance }
  let(:stored) { JSON.parse(issuance.last_error) }

  before { stub_inter_token }

  describe "connection failures (job path: transient errors are recorded by the job)" do
    def run_job
      Billing::IssueChargeJob.perform_now(charge.id, school.id)
    end

    it "records a TLS/mTLS rejection as cause_class and cause_message, keeping the public message" do
      stub_request(:post, cobrancas_url)
        .to_raise(OpenSSL::SSL::SSLError.new("SSL_connect returned=1 errno=0 (tlsv13 alert certificate expired)"))

      run_job

      expect(issuance.status).to eq("pending")
      expect(stored).to include(
        "error_class" => "Gateways::BankSlip::TransientError",
        "message" => "Provider connection error",
        "cause_class" => "OpenSSL::SSL::SSLError"
      )
      expect(stored["cause_message"]).to include("certificate expired")
      expect(stored).not_to have_key("http_status")
    end

    it "records a bare Faraday::SSLError raised while minting the token" do
      stub_request(:post, INTER_TEST_TOKEN_URL).to_raise(Faraday::SSLError.new("certificate verify failed"))

      run_job

      expect(stored).to include(
        "message" => "Provider connection error",
        "cause_class" => "Faraday::SSLError",
        "cause_message" => "certificate verify failed"
      )
    end

    it "records a timeout" do
      stub_request(:post, cobrancas_url).to_timeout

      run_job

      expect(stored["message"]).to eq("Provider connection error")
      expect(stored["cause_class"]).to be_present
      expect(stored["cause_message"]).to be_present
    end

    it "marks the issuance failed with the cause once retries are exhausted" do
      stub_request(:post, cobrancas_url).to_raise(Errno::ECONNREFUSED)
      job = Billing::IssueChargeJob.new(charge.id, school.id)
      allow(job).to receive(:executions).and_return(Billing::IssueChargeJob::MAX_ATTEMPTS)

      job.perform_now

      expect(issuance.status).to eq("failed")
      expect(stored).to include("cause_class" => "Errno::ECONNREFUSED")
    end

    it "never lets PEM, tokens or the client secret reach last_error" do
      secret_pem = provider_config.private_key_pem
      stub_request(:post, cobrancas_url).to_raise(
        OpenSSL::SSL::SSLError.new("bad key #{secret_pem} Bearer token-abc secret=#{provider_config.client_secret}")
      )

      run_job

      expect(issuance.last_error).not_to include("BEGIN", "token-abc")
      expect(stored["cause_message"]).to include("[PEM_REDACTED]", "Bearer [REDACTED]")
    end
  end

  describe "connection failures (service path)" do
    it "re-raises a retryable error carrying the root cause" do
      stub_request(:post, cobrancas_url).to_raise(OpenSSL::SSL::SSLError.new("certificate has expired"))

      expect { Billing::IssueChargeService.call(charge: charge) }
        .to raise_error(Gateways::BankSlip::TransientError, "Provider connection error") { |error|
          expect(error.cause_class).to eq("OpenSSL::SSL::SSLError")
          expect(error.cause_message).to eq("certificate has expired")
        }
    end
  end

  describe "malformed 2xx on issue" do
    {
      "a missing codigoSolicitacao" => [ '{"unexpected":"shape"}', { "unexpected" => "shape" } ],
      "a non-JSON body" => [ "<html>bad gateway page</html>", "<html>bad gateway page</html>" ],
      "an empty body" => [ "", nil ]
    }.each do |label, (body, expected_response)|
      it "marks the issuance failed with a parseable JSON last_error for #{label}" do
        stub_request(:post, cobrancas_url).to_return(status: 200, body: body)

        result = Billing::IssueChargeService.call(charge: charge)

        expect(result).to be_failure
        expect(result.error_code).to eq(:provider_error)
        expect(issuance.status).to eq("failed")
        expect(stored).to include("error_class" => "Gateways::BankSlip::ProviderError")
        expect(stored["provider_response"]).to eq(expected_response) if expected_response
        expect(stored).not_to have_key("provider_response") if expected_response.nil?
      end
    end

    it "redacts and caps the received body, and never stores PEM or tokens" do
      body = { "note" => "cpf 123.456.789-00 Bearer abc.def #{provider_config.private_key_pem}" }.to_json
      stub_request(:post, cobrancas_url).to_return(status: 200, body: body)

      Billing::IssueChargeService.call(charge: charge)

      expect(issuance.last_error).not_to include("123.456.789-00", "BEGIN", "abc.def")
      expect(issuance.last_error.bytesize).to be <= Billing::IssuanceErrorSerializer::MAX_BYTES
      expect(stored["provider_response"]["note"]).to include("[CPF]", "[PEM_REDACTED]")
    end

    it "does not crash the job and leaves a failed issuance without scheduling a retry" do
      stub_request(:post, cobrancas_url).to_return(status: 200, body: "not json")

      expect { Billing::IssueChargeJob.perform_now(charge.id, school.id) }
        .not_to change { SolidQueue::Job.where(class_name: Billing::IssueChargeJob.name).count }

      expect(issuance.status).to eq("failed")
      expect(stored["provider_response"]).to eq("not json")
    end
  end
end
