# frozen_string_literal: true

require "rails_helper"

RSpec.describe Auth::SigningSecret do
  describe ".fetch" do
    it "returns the fallback in development and test" do
      expect(described_class.fetch).to eq(described_class::LOCAL_FALLBACK)
    end

    context "outside development and test" do
      before do
        allow(Rails).to receive(:env).and_return(ActiveSupport::EnvironmentInquirer.new("production"))
      end

      it "refuses to fall back to a value stored in the repository" do
        expect { described_class.fetch }.to raise_error(/JWT signing secret missing/)
      end

      it "uses JWT_SECRET_KEY when present" do
        ENV["JWT_SECRET_KEY"] = "from-environment"

        expect(described_class.fetch).to eq("from-environment")
      ensure
        ENV.delete("JWT_SECRET_KEY")
      end
    end
  end
end
