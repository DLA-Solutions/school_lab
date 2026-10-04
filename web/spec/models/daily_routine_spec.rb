# frozen_string_literal: true

require "rails_helper"

RSpec.describe DailyRoutine, type: :model do
  it "is valid with the factory" do
    expect(build(:daily_routine)).to be_valid
  end

  it "stores a blank narrative as null" do
    routine = create(:daily_routine, narrative: "  ")

    expect(routine.narrative).to be_nil
  end

  it "requires a detail when discomfort is yes" do
    routine = build(:daily_routine, discomfort: "yes", discomfort_detail: nil)

    expect(routine).not_to be_valid
    expect(routine.errors[:discomfort_detail]).to be_present
  end

  it "rejects a detail when discomfort is not yes" do
    routine = build(:daily_routine, discomfort: "no", discomfort_detail: "Dor de barriga")

    expect(routine).not_to be_valid
    expect(routine.errors[:discomfort_detail]).to be_present
  end

  it "allows one row per school, student, and date" do
    existing = create(:daily_routine)
    duplicate = build(:daily_routine, school: existing.school, student: existing.student, date: existing.date,
                                      school_class: existing.school_class, author: existing.author)

    expect(duplicate).not_to be_valid
  end
end
