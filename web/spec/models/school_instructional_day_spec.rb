# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolInstructionalDay, type: :model do
  let(:school_year) { create(:school_year, :custom) }

  it "is valid with a date within the school year's bounds" do
    day = build(:school_instructional_day, school_year: school_year, date: school_year.starts_on + 1.day)

    expect(day).to be_valid
  end

  it "syncs school from the school year" do
    day = create(:school_instructional_day, school_year: school_year)

    expect(day.school_id).to eq(school_year.school_id)
  end

  it "requires instructional to be true or false, never nil" do
    day = build(:school_instructional_day, school_year: school_year, instructional: nil)

    expect(day).not_to be_valid
    expect(day.errors[:instructional]).to be_present
  end

  it "rejects a date before the school year starts" do
    day = build(:school_instructional_day, school_year: school_year, date: school_year.starts_on - 1.day)

    expect(day).not_to be_valid
    expect(day.errors[:date]).to be_present
  end

  it "rejects a date after the school year ends" do
    day = build(:school_instructional_day, school_year: school_year, date: school_year.ends_on + 1.day)

    expect(day).not_to be_valid
    expect(day.errors[:date]).to be_present
  end

  it "enforces one row per (school_year, date)" do
    create(:school_instructional_day, school_year: school_year, date: school_year.starts_on + 1.day)
    duplicate = build(:school_instructional_day, school_year: school_year, date: school_year.starts_on + 1.day)

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:date]).to be_present
  end
end
