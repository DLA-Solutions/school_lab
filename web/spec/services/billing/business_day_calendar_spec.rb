# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::BusinessDayCalendar do
  describe ".holiday?" do
    it "includes movable Brazilian holidays derived from Easter" do
      expect(described_class.holiday?(Date.new(2026, 2, 16))).to be(true) # Carnaval Monday 2026
      expect(described_class.holiday?(Date.new(2026, 4, 3))).to be(true)  # Good Friday 2026
      expect(described_class.holiday?(Date.new(2026, 6, 4))).to be(true)  # Corpus Christi 2026
    end

    it "includes Black Awareness Day" do
      expect(described_class.holiday?(Date.new(2026, 11, 20))).to be(true)
      expect(described_class.holiday?(Date.new(2027, 11, 20))).to be(true)
    end
  end

  describe ".effective_due_date" do
    it "rolls a due date on Black Awareness Day forward to the next business day" do
      # 2025-11-20 is a Thursday, so the next business day is the Friday after it.
      expect(described_class.effective_due_date(Date.new(2025, 11, 20))).to eq(Date.new(2025, 11, 21))
    end
  end
end
