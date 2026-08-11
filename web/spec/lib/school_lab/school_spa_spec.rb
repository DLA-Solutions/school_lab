# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolLab::SchoolSpa do
  describe ".invite_accept_url" do
    it "builds a school SPA invite URL with token and email" do
      original_host = ENV["APP_HOST"]
      original_spa_url = ENV["SCHOOL_SPA_URL"]
      ENV.delete("SCHOOL_SPA_URL")
      ENV["APP_HOST"] = "scholarpremium.com.br"

      url = described_class.invite_accept_url(token: "abc123", email: "owner@example.com")

      expect(url).to eq(
        "https://scholarpremium.com.br/app/invite/accept?email=owner%40example.com&token=abc123"
      )
    ensure
      ENV["APP_HOST"] = original_host
      ENV["SCHOOL_SPA_URL"] = original_spa_url
    end

    it "uses SCHOOL_SPA_URL when set" do
      original_spa_url = ENV["SCHOOL_SPA_URL"]
      ENV["SCHOOL_SPA_URL"] = "http://localhost:5173"

      url = described_class.invite_accept_url(token: "abc123", email: "owner@example.com")

      expect(url).to start_with("http://localhost:5173/invite/accept?")
    ensure
      ENV["SCHOOL_SPA_URL"] = original_spa_url
    end
  end
end
