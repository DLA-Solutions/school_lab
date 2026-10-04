# frozen_string_literal: true

require "rails_helper"

RSpec.describe LessonPlan, type: :model do
  it "is valid with a class_discipline, date, and content" do
    plan = build(:lesson_plan)

    expect(plan).to be_valid
  end

  it "syncs school from the class_discipline" do
    plan = create(:lesson_plan)

    expect(plan.school_id).to eq(plan.class_discipline.school_id)
  end

  it "requires content" do
    plan = build(:lesson_plan, content: nil)

    expect(plan).not_to be_valid
    expect(plan.errors[:content]).to be_present
  end

  it "enforces one row per (class_discipline, date) — BR-LP04" do
    class_discipline = create(:class_discipline)
    create(:lesson_plan, class_discipline: class_discipline, date: Date.new(2026, 4, 14))
    duplicate = build(:lesson_plan, class_discipline: class_discipline, date: Date.new(2026, 4, 14))

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:date]).to be_present
  end

  it "allows the same date for a different class_discipline" do
    create(:lesson_plan, date: Date.new(2026, 4, 14))
    other = build(:lesson_plan, date: Date.new(2026, 4, 14))

    expect(other).to be_valid
  end
end
