# frozen_string_literal: true

require "rails_helper"

RSpec.describe LessonPlan, type: :model do
  it "is valid with a class_discipline, date, and the BR-LP07 template fields" do
    plan = build(:lesson_plan)

    expect(plan).to be_valid
  end

  it "syncs school from the class_discipline" do
    plan = create(:lesson_plan)

    expect(plan.school_id).to eq(plan.class_discipline.school_id)
  end

  # AC-LP05: every BR-LP07 template field is optional — only class_discipline/date are required.
  it "is valid with none of the BR-LP07 template fields set" do
    plan = build(:lesson_plan,
                  duration: nil, unit_stage: nil, topic: nil, general_objective: nil,
                  specific_objectives: nil, bncc_competencies: nil, other_competencies: nil,
                  resources_materials: nil, assessment_types: [], assessment_formats: [])

    expect(plan).to be_valid
  end

  describe "assessment_types" do
    it "accepts any combination of the allowed BR-LP07 values" do
      plan = build(:lesson_plan, assessment_types: %w[diagnostic formative summative])

      expect(plan).to be_valid
    end

    it "rejects a value outside the allowed list" do
      plan = build(:lesson_plan, assessment_types: [ "bogus" ])

      expect(plan).not_to be_valid
      expect(plan.errors[:assessment_types]).to be_present
    end
  end

  describe "assessment_formats" do
    it "accepts any combination of the allowed BR-LP07 values" do
      plan = build(:lesson_plan, assessment_formats: %w[observation exercises participation
                                                         written_production oral_presentation
                                                         practical_activity test])

      expect(plan).to be_valid
    end

    it "rejects a value outside the allowed list" do
      plan = build(:lesson_plan, assessment_formats: [ "bogus" ])

      expect(plan).not_to be_valid
      expect(plan.errors[:assessment_formats]).to be_present
    end
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
