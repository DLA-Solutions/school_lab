# frozen_string_literal: true

require "rails_helper"

# Every attachment lives in a private Cloudflare R2 bucket in production. These examples pin the
# parts of that setup that can be checked without the network: the suite never reaches R2, the
# `r2` service is wired the way R2 needs, and the URLs it signs are short-lived.
RSpec.describe "Active Storage configuration" do
  def r2_env
    {
      "R2_ACCOUNT_ID" => "acct123",
      "R2_ACCESS_KEY_ID" => "test-access-key",
      "R2_SECRET_ACCESS_KEY" => "test-secret-key",
      "R2_BUCKET" => "school-files"
    }
  end

  def with_r2_env(overrides = {})
    values = r2_env.merge(overrides)
    previous = values.keys.index_with { |name| ENV.fetch(name, nil) }
    values.each { |name, value| ENV[name] = value }
    yield
  ensure
    previous.each { |name, value| ENV[name] = value }
  end

  def with_selected_service(name)
    config = Rails.application.config.active_storage
    previous = config.service
    config.service = name
    yield
  ensure
    config.service = previous
  end

  def r2_service
    configs = ActiveSupport::ConfigurationFile.parse(Rails.root.join("config/storage.yml")).deep_symbolize_keys
    ActiveStorage::Service.configure(:r2, configs)
  end

  it "keeps the test suite on local disk, never on the bucket" do
    expect(Rails.application.config.active_storage.service).to eq(:test)
    expect(ActiveStorage::Blob.service).to be_a(ActiveStorage::Service::DiskService)
  end

  it "serves blob links under /api so the reverse proxy routes them to Rails" do
    expect(ActiveStorage.routes_prefix).to eq("/api/active_storage")
  end

  it "expires the signed blob ids and the redirect to the bucket" do
    expect(ActiveStorage.urls_expire_in).to eq(15.minutes)
    expect(ActiveStorage.service_urls_expire_in).to eq(5.minutes)
  end

  describe "the r2 service" do
    it "is an S3 service pointed at the account endpoint, bucket and region auto" do
      with_r2_env do
        service = r2_service

        expect(service).to be_a(ActiveStorage::Service::S3Service)
        expect(service.bucket.name).to eq("school-files")
        expect(service.client.client.config.endpoint.to_s).to eq("https://acct123.r2.cloudflarestorage.com")
        expect(service.client.client.config.region).to eq("auto")
      end
    end

    it "only checksums when R2 requires it, since R2 rejects the default CRC32 headers" do
      with_r2_env do
        config = r2_service.client.client.config

        expect(config.request_checksum_calculation).to eq("when_required")
        expect(config.response_checksum_validation).to eq("when_required")
      end
    end

    it "signs short-lived private URLs locally, without calling R2" do
      with_r2_env do
        url = r2_service.url(
          "some-key", expires_in: 5.minutes, filename: ActiveStorage::Filename.new("rg.pdf"),
                      content_type: "application/pdf", disposition: :inline
        )
        uri = URI.parse(url)
        query = Rack::Utils.parse_query(uri.query)

        expect(uri.host).to eq("acct123.r2.cloudflarestorage.com")
        expect(uri.path).to eq("/school-files/some-key")
        expect(query).to include("X-Amz-Expires" => "300", "X-Amz-Signature" => be_present)
      end
    end
  end

  describe "boot guard" do
    let(:initializer) { Rails.root.join("config/initializers/active_storage.rb") }

    it "refuses to boot with r2 selected and a credential missing" do
      with_selected_service(:r2) do
        with_r2_env("R2_SECRET_ACCESS_KEY" => "") do
          expect { load initializer }.to raise_error(RuntimeError, /R2_SECRET_ACCESS_KEY/)
        end
      end
    end

    it "boots when r2 is selected and fully configured" do
      with_selected_service(:r2) do
        with_r2_env { expect { load initializer }.not_to raise_error }
      end
    end

    it "does not ask for R2 credentials when another service is selected" do
      with_r2_env("R2_BUCKET" => "") { expect { load initializer }.not_to raise_error }
    end
  end
end
