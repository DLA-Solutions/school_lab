# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolLab::Integrations::Fcm::Client do
  let(:client_email) { "fcm-test@school-lab-test.iam.gserviceaccount.com" }
  let(:private_key) { OpenSSL::PKey::RSA.new(2048).to_pem }
  let(:project_id) { "school-lab-test" }
  let(:cache) { ActiveSupport::Cache.lookup_store(:memory_store) }
  let(:token_cache) do
    SchoolLab::Integrations::Fcm::TokenCache.new(client_email: client_email, cache: cache)
  end
  let(:client) do
    described_class.new(
      client_email: client_email,
      private_key: private_key,
      project_id: project_id,
      token_cache: token_cache
    )
  end

  let(:send_url) { "https://fcm.googleapis.com/v1/projects/#{project_id}/messages:send" }

  def stub_token(status: 200, access_token: "test-access-token", expires_in: 3_599)
    stub_request(:post, "https://oauth2.googleapis.com/token")
      .to_return(status: status, body: { access_token: access_token, expires_in: expires_in, token_type: "Bearer" }.to_json)
  end

  def fcm_error_body(status_text, error_code)
    { error: { code: 0, message: status_text, status: status_text,
              details: [ { "@type" => "type.googleapis.com/google.firebase.fcm.v1.FcmError", errorCode: error_code } ] } }.to_json
  end

  before { stub_token }

  describe "#send_message" do
    it "authenticates with a self-signed JWT and sends the message" do
      stub_request(:post, send_url)
        .with(headers: { "Authorization" => "Bearer test-access-token" })
        .to_return(status: 200, body: { name: "projects/#{project_id}/messages/0:123" }.to_json)

      response = client.send_message(token: "device-token", title: "Title", body: "Body")

      expect(response["name"]).to eq("projects/#{project_id}/messages/0:123")
      expect(WebMock).to have_requested(:post, "https://oauth2.googleapis.com/token")
        .with(body: hash_including("grant_type" => "urn:ietf:params:oauth:grant-type:jwt-bearer"))
    end

    it "stringifies data payload values" do
      stub_request(:post, send_url)
        .with { |request| JSON.parse(request.body)["message"]["data"] == { "count" => "3" } }
        .to_return(status: 200, body: { name: "ok" }.to_json)

      client.send_message(token: "device-token", title: "T", body: "B", data: { count: 3 })

      expect(WebMock).to have_requested(:post, send_url)
    end

    it "caches the access token across calls" do
      stub_request(:post, send_url).to_return(status: 200, body: { name: "ok" }.to_json)

      client.send_message(token: "t1", title: "T", body: "B")
      client.send_message(token: "t2", title: "T", body: "B")

      expect(WebMock).to have_requested(:post, "https://oauth2.googleapis.com/token").once
    end

    it "raises UnregisteredTokenError when FCM reports the token as unregistered" do
      stub_request(:post, send_url).to_return(status: 404, body: fcm_error_body("NOT_FOUND", "UNREGISTERED"))

      expect { client.send_message(token: "dead-token", title: "T", body: "B") }
        .to raise_error(SchoolLab::Integrations::Fcm::UnregisteredTokenError)
    end

    it "raises ValidationError on an invalid argument" do
      stub_request(:post, send_url).to_return(status: 400, body: fcm_error_body("INVALID_ARGUMENT", "INVALID_ARGUMENT"))

      expect { client.send_message(token: "t", title: "T", body: "B") }
        .to raise_error(SchoolLab::Integrations::Fcm::ValidationError)
    end

    it "retries once after a 401 and raises AuthenticationError when the retry also fails" do
      stub_request(:post, send_url)
        .to_return(status: 401, body: fcm_error_body("UNAUTHENTICATED", "UNAUTHENTICATED")).times(2)

      expect { client.send_message(token: "t", title: "T", body: "B") }
        .to raise_error(SchoolLab::Integrations::Fcm::AuthenticationError)
      expect(WebMock).to have_requested(:post, "https://oauth2.googleapis.com/token").twice
    end

    it "raises TransientError on quota exceeded (429)" do
      stub_request(:post, send_url).to_return(status: 429, body: fcm_error_body("RESOURCE_EXHAUSTED", "QUOTA_EXCEEDED"))

      expect { client.send_message(token: "t", title: "T", body: "B") }
        .to raise_error(SchoolLab::Integrations::Fcm::TransientError)
    end

    it "raises TransientError on a provider server error" do
      stub_request(:post, send_url).to_return(status: 500, body: { error: { code: 500, message: "boom" } }.to_json)

      expect { client.send_message(token: "t", title: "T", body: "B") }
        .to raise_error(SchoolLab::Integrations::Fcm::TransientError)
    end

    it "raises UnexpectedResponseError for an unmapped status" do
      stub_request(:post, send_url).to_return(status: 418, body: "teapot")

      expect { client.send_message(token: "t", title: "T", body: "B") }
        .to raise_error(SchoolLab::Integrations::Fcm::UnexpectedResponseError)
    end

    it "maps a connection timeout to TransientError" do
      stub_request(:post, send_url).to_timeout

      expect { client.send_message(token: "t", title: "T", body: "B") }
        .to raise_error(SchoolLab::Integrations::Fcm::TransientError, /connection error/)
    end
  end
end
