# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::BusinessDayCalendar do
  describe ".holiday?" do
    it "includes movable Brazilian holidays derived from Easter" do
      expect(described_class.holiday?(Date.new(2026, 2, 16))).to be(true) # Carnaval Monday 2026
      expect(described_class.holiday?(Date.new(2026, 4, 3))).to be(true)  # Good Friday 2026
      expect(described_class.holiday?(Date.new(2026, 6, 4))).to be(true)  # Corpus Christi 2026
    end
  end
end
