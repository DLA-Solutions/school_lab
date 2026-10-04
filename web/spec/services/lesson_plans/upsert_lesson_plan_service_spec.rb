# frozen_string_literal: true

require "rails_helper"

RSpec.describe LessonPlans::UpsertLessonPlanService do
  let(:school) { create(:school) }
  let(:school_year) { create(:school_year, school: school) }
  let(:class_discipline) { create(:class_discipline, school: school, school_year: school_year) }
  let(:date) { school_year.starts_on + 1.month }

  let(:template_attributes) do
    {
      duration: "50 minutos",
      topic: "Introdução a frações",
      general_objective: "Compreender o conceito de fração como parte de um todo.",
      assessment_types: [ "formative" ],
      assessment_formats: [ "exercises", "participation" ]
    }
  end

  subject(:result) do
    described_class.call(class_discipline: class_discipline, date: date, attributes: template_attributes)
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

    it "creates the lesson plan with the given BR-LP07 template fields" do
      expect(result).to be_success
      expect(result.data).to be_persisted
      expect(result.data.duration).to eq("50 minutos")
      expect(result.data.topic).to eq("Introdução a frações")
      expect(result.data.assessment_types).to eq([ "formative" ])
      expect(result.data.assessment_formats).to eq([ "exercises", "participation" ])
      expect(result.data.class_discipline).to eq(class_discipline)
      expect(result.data.date).to eq(date)
    end

    # AC-LP05: a plan may be saved with none of the BR-LP07 fields set.
    it "creates the lesson plan with no template fields at all" do
      empty_result = described_class.call(class_discipline: class_discipline, date: date, attributes: {})

      expect(empty_result).to be_success
      expect(empty_result.data).to be_persisted
      expect(empty_result.data.topic).to be_nil
      expect(empty_result.data.assessment_types).to eq([])
    end

    it "updates the existing row in place on a second call for the same pair (BR-LP04)" do
      first = described_class.call(
        class_discipline: class_discipline, date: date, attributes: { topic: "First draft" }
      )
      expect(first).to be_success

      second = described_class.call(
        class_discipline: class_discipline, date: date, attributes: { topic: "Revised plan" }
      )

      expect(second).to be_success
      expect(LessonPlan.count).to eq(1)
      expect(second.data.id).to eq(first.data.id)
      expect(second.data.reload.topic).to eq("Revised plan")
    end

    it "fails with validation_error when assessment_types has a value outside the allowed list" do
      bad_result = described_class.call(
        class_discipline: class_discipline, date: date, attributes: { assessment_types: [ "bogus" ] }
      )

      expect(bad_result).to be_failure
      expect(bad_result.error_code).to eq(:validation_error)
      expect(bad_result.details[:assessment_types]).to be_present
    end

    it "fails with validation_error when assessment_formats has a value outside the allowed list" do
      bad_result = described_class.call(
        class_discipline: class_discipline, date: date, attributes: { assessment_formats: [ "bogus" ] }
      )

      expect(bad_result).to be_failure
      expect(bad_result.error_code).to eq(:validation_error)
      expect(bad_result.details[:assessment_formats]).to be_present
    end
  end
end
