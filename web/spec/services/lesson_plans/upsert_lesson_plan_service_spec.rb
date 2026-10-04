# frozen_string_literal: true

require "rails_helper"

RSpec.describe LessonPlans::UpsertLessonPlanService do
  let(:school) { create(:school) }
  let(:school_year) { create(:school_year, school: school) }
  let(:class_discipline) { create(:class_discipline, school: school, school_year: school_year) }
  let(:date) { school_year.starts_on + 1.month }

  subject(:result) do
    described_class.call(class_discipline: class_discipline, date: date, content: "Fractions — exercises 1-5.")
  end

  context "when the date has no SchoolInstructionalDay row at all" do
    it "fails with non_instructional_day and persists nothing" do
      expect { result }.not_to change(LessonPlan, :count)

      expect(result).to be_failure
      expect(result.error_code).to eq(:non_instructional_day)
    end
  end

  context "when the date is explicitly marked non-instructional" do
    before do
      create(:school_instructional_day, school_year: school_year, date: date, instructional: false)
    end

    it "fails with non_instructional_day and persists nothing" do
      expect { result }.not_to change(LessonPlan, :count)

      expect(result).to be_failure
      expect(result.error_code).to eq(:non_instructional_day)
    end
  end

  context "when the date is marked instructional" do
    before do
      create(:school_instructional_day, school_year: school_year, date: date, instructional: true)
    end

    it "creates the lesson plan with the given content" do
      expect(result).to be_success
      expect(result.data).to be_persisted
      expect(result.data.content).to eq("Fractions — exercises 1-5.")
      expect(result.data.class_discipline).to eq(class_discipline)
      expect(result.data.date).to eq(date)
    end

    it "updates the existing row in place on a second call for the same pair (BR-LP04)" do
      first = described_class.call(class_discipline: class_discipline, date: date, content: "First draft.")
      expect(first).to be_success

      second = described_class.call(class_discipline: class_discipline, date: date, content: "Revised plan.")

      expect(second).to be_success
      expect(LessonPlan.count).to eq(1)
      expect(second.data.id).to eq(first.data.id)
      expect(second.data.reload.content).to eq("Revised plan.")
    end

    it "fails with validation_error when content is blank" do
      blank_result = described_class.call(class_discipline: class_discipline, date: date, content: "")

      expect(blank_result).to be_failure
      expect(blank_result.error_code).to eq(:validation_error)
      expect(blank_result.details[:content]).to be_present
    end
  end
end
