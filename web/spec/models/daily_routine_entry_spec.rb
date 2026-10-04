# frozen_string_literal: true

require "rails_helper"

RSpec.describe DailyRoutineEntry, type: :model do
  it "is valid with the factory defaults" do
    entry = build(:daily_routine_entry)

    expect(entry).to be_valid
  end

  it "rejects a student from a different school" do
    school = create(:school)
    other_school_student = create(:student)
    entry = build(:daily_routine_entry, school: school, student: other_school_student)

    expect(entry).not_to be_valid
    expect(entry.errors[:student]).to be_present
  end

  it "rejects an unknown status" do
    entry = build(:daily_routine_entry, status: "whatever")

    expect(entry).not_to be_valid
    expect(entry.errors[:status]).to be_present
  end

  # BR-DR03: snack_eaten is nullable — null means "not yet recorded", distinct from false.
  it "allows snack_eaten to be unset" do
    entry = build(:daily_routine_entry, snack_eaten: nil)

    expect(entry).to be_valid
  end

  describe "poop_count / pee_count" do
    it "defaults to 0" do
      entry = create(:daily_routine_entry)

      expect(entry.poop_count).to eq(0)
      expect(entry.pee_count).to eq(0)
    end

    it "rejects a negative poop_count" do
      entry = build(:daily_routine_entry, poop_count: -1)

      expect(entry).not_to be_valid
      expect(entry.errors[:poop_count]).to be_present
    end

    it "rejects a negative pee_count" do
      entry = build(:daily_routine_entry, pee_count: -1)

      expect(entry).not_to be_valid
      expect(entry.errors[:pee_count]).to be_present
    end
  end

  it "enforces one row per (student, date) — BR-DR01" do
    student = create(:student)
    create(:daily_routine_entry, school: student.school, student: student, date: Date.new(2026, 4, 14))
    duplicate = build(:daily_routine_entry, school: student.school, student: student, date: Date.new(2026, 4, 14))

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:date]).to be_present
  end

  it "allows the same date for a different student" do
    create(:daily_routine_entry, date: Date.new(2026, 4, 14))
    other = build(:daily_routine_entry, date: Date.new(2026, 4, 14))

    expect(other).to be_valid
  end

  describe "#draft? / #sent?" do
    it "is draft by default" do
      entry = build(:daily_routine_entry)

      expect(entry).to be_draft
      expect(entry).not_to be_sent
    end

    it "is sent once status is sent" do
      entry = build(:daily_routine_entry, :sent)

      expect(entry).to be_sent
      expect(entry).not_to be_draft
    end
  end
end
