# frozen_string_literal: true

require "rails_helper"

# Billing reasons about calendar dates — boleto due dates, grace windows, billing periods —
# rather than about instants. Under the framework default of UTC every `Date.current` in the
# billing code rolls over at 21:00 in Sao Paulo, three hours before the school's day ends,
# which marks charges overdue a day early and opens a billing period a month early.
RSpec.describe "application time zone" do
  include ActiveSupport::Testing::TimeHelpers

  it "resolves dates in the business timezone" do
    expect(Time.zone.name).to eq(Billing::SchoolTimezone::DEFAULT)
  end

  it "keeps storing timestamps in UTC" do
    expect(ActiveRecord.default_timezone).to eq(:utc)
  end

  it "reports the local date late in the evening, when UTC already moved to the next day" do
    travel_to Time.utc(2026, 8, 11, 0, 30, 0) do # Aug 10 21:30 in America/Sao_Paulo
      expect(Time.now.utc.to_date).to eq(Date.new(2026, 8, 11))
      expect(Date.current).to eq(Date.new(2026, 8, 10))
    end
  end

  it "keeps the monthly billing period on the closing month during that window" do
    travel_to Time.utc(2026, 9, 1, 1, 0, 0) do # Aug 31 22:00 in America/Sao_Paulo
      expect(Date.current.beginning_of_month).to eq(Date.new(2026, 8, 1))
    end
  end
end
