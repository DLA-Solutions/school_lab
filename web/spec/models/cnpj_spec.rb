# frozen_string_literal: true

require "rails_helper"

RSpec.describe Cnpj do
  describe ".normalize" do
    it "keeps the digits alone" do
      expect(described_class.normalize("66.154.330/0001-40")).to eq("66154330000140")
    end

    # A missing document stays NULL rather than becoming "".
    it "returns nil for a blank value" do
      expect(described_class.normalize("  ")).to be_nil
    end
  end

  describe ".format" do
    it "punctuates the bare digits" do
      expect(described_class.format("66154330000140")).to eq("66.154.330/0001-40")
    end

    it "hands back anything that is not fourteen digits" do
      expect(described_class.format("123")).to eq("123")
    end
  end

  describe ".valid?" do
    it "accepts a real document, punctuated or bare" do
      expect(described_class.valid?("66.154.330/0001-40")).to be(true)
      expect(described_class.valid?("66154330000140")).to be(true)
    end

    it "rejects one whose check digits do not match" do
      expect(described_class.valid?("66.154.330/0001-41")).to be(false)
    end

    # Repdigits satisfy the arithmetic by accident.
    it "rejects a repeated digit" do
      expect(described_class.valid?("00000000000000")).to be(false)
    end

    it "rejects the wrong length and a blank" do
      expect(described_class.valid?("6615433000014")).to be(false)
      expect(described_class.valid?(nil)).to be(false)
    end
  end
end
