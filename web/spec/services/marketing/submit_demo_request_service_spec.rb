# frozen_string_literal: true

require "rails_helper"

RSpec.describe Marketing::SubmitDemoRequestService do
  subject(:result) do
    described_class.call(
      params: params,
      client_ip: client_ip
    )
  end

  let(:client_ip) { "203.0.113.10" }
  let(:params) do
    {
      name: "Maria Silva",
      email: "maria@example.com",
      phone: "+55 11 99999-0000"
    }
  end

  around do |example|
    original_cache = Rails.cache
    Rails.cache = ActiveSupport::Cache.lookup_store(:memory_store)
    Rails.cache.clear
    example.run
  ensure
    Rails.cache = original_cache
  end

  it "enqueues the demo request and confirmation emails and applies rate limiting" do
    expect { result }.to have_enqueued_job(ActionMailer::MailDeliveryJob).exactly(2).times

    expect(result).to be_success
    expect(Rails.cache.read("marketing_demo_request:#{client_ip}")).to be(true)
  end

  context "when required fields are missing" do
    let(:params) { { name: "", email: "", phone: "" } }

    it "returns validation_error" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
      expect(result.details).to include(
        name: [ I18n.t("errors.messages.blank") ],
        email: [ I18n.t("errors.messages.blank") ],
        phone: [ I18n.t("errors.messages.blank") ]
      )
    end
  end

  context "when the email format is invalid" do
    let(:params) { super().merge(email: "not-an-email") }

    it "returns validation_error for email" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
      expect(result.details).to include(email: [ I18n.t("errors.messages.invalid") ])
    end
  end

  context "when name exceeds the maximum length" do
    let(:params) { super().merge(name: "a" * 121) }

    it "returns validation_error for name" do
      expect(result).to be_failure
      expect(result.details).to include(name: [ I18n.t("errors.messages.too_long", count: 120) ])
    end
  end

  context "when phone exceeds the maximum length" do
    let(:params) { super().merge(phone: "1" * 31) }

    it "returns validation_error for phone" do
      expect(result).to be_failure
      expect(result.details).to include(phone: [ I18n.t("errors.messages.too_long", count: 30) ])
    end
  end

  context "when the client IP is rate limited" do
    before do
      Rails.cache.write("marketing_demo_request:#{client_ip}", true, expires_in: 5.minutes)
    end

    it "returns rate_limited without enqueueing mail" do
      expect { result }.not_to have_enqueued_job(ActionMailer::MailDeliveryJob)

      expect(result).to be_failure
      expect(result.error_code).to eq(:rate_limited)
    end
  end

  context "when the honeypot field is filled" do
    let(:params) { super().merge(website: "https://spam.example") }

    it "returns success without enqueueing mail" do
      expect { result }.not_to have_enqueued_job(ActionMailer::MailDeliveryJob)

      expect(result).to be_success
      expect(Rails.cache.read("marketing_demo_request:#{client_ip}")).to be_nil
    end
  end

  context "when the alternate honeypot field is filled" do
    let(:params) { super().merge(_hp: "bot") }

    it "returns success without enqueueing mail" do
      expect { result }.not_to have_enqueued_job(ActionMailer::MailDeliveryJob)

      expect(result).to be_success
    end
  end
end
