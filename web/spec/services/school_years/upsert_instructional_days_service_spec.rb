# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolYears::UpsertInstructionalDaysService do
  let(:school) { create(:school) }
  let(:school_year) { create(:school_year, school: school) }
  let(:first_date) { school_year.starts_on + 1.month }
  let(:second_date) { school_year.starts_on + 2.months }

  subject(:result) { described_class.call(school_year: school_year, days: days) }

  context "when upserting two new dates" do
    let(:days) do
      [
        { date: first_date, instructional: true },
        { date: second_date, instructional: false }
      ]
    end

    it "creates both rows with the right instructional values" do
      expect(result).to be_success
      expect(SchoolInstructionalDay.count).to eq(2)

      first_row = SchoolInstructionalDay.find_by(school_year: school_year, date: first_date)
      second_row = SchoolInstructionalDay.find_by(school_year: school_year, date: second_date)

      expect(first_row.instructional).to be(true)
      expect(second_row.instructional).to be(false)
    end
  end

  context "when called again for a date that already has a row" do
    let!(:existing) do
      create(:school_instructional_day, school_year: school_year, date: first_date, instructional: true)
    end
    let(:days) { [ { date: first_date, instructional: false } ] }

    it "updates it in place without creating a duplicate row" do
      expect(result).to be_success
      expect(SchoolInstructionalDay.count).to eq(1)
      expect(existing.reload.instructional).to be(false)
    end
  end

  context "when one date in the batch is outside the school year bounds" do
    let(:out_of_bounds_date) { school_year.ends_on + 10.days }
    let(:days) do
      [
        { date: first_date, instructional: true },
        { date: out_of_bounds_date, instructional: true }
      ]
    end

    it "rolls back the whole batch and returns a single validation_error" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
      expect(result.details[:date]).to be_present

      expect(SchoolInstructionalDay.where(school_year: school_year, date: first_date)).not_to exist
      expect(SchoolInstructionalDay.where(school_year: school_year, date: out_of_bounds_date)).not_to exist
      expect(SchoolInstructionalDay.count).to eq(0)
    end
  end

  context "for dates never mentioned in any call" do
    let(:days) { [ { date: first_date, instructional: true } ] }

    it "leaves them absent (still undecided)" do
      result

      expect(SchoolInstructionalDay.exists?(school_year: school_year, date: second_date)).to be(false)
    end
  end
end
