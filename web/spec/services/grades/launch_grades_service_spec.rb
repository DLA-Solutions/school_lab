# frozen_string_literal: true

require "rails_helper"

RSpec.describe Grades::LaunchGradesService do
  let(:school) { create(:school) }
  let(:school_year) { create(:school_year, :custom, school: school) }
  let(:school_class) { create(:school_class, school: school, year: school_year.name.to_i) }
  let(:subject) { create(:subject, school: school) }
  let(:period) { create(:academic_period, school_year: school_year, school: school) }
  let(:membership) { create(:membership, :staff, school: school) }
  let!(:class_discipline) do
    create(:class_discipline, school: school, school_class: school_class, subject: subject, school_year: school_year)
  end
  let!(:template) do
    create(
      :evaluation_template,
      school: school,
      school_class: school_class,
      academic_period: period,
      lock_on_launch: false,
      created_by_membership: membership
    )
  end
  let!(:component) do
    create(
      :evaluation_component,
      school: school,
      evaluation_template: template,
      class_discipline: class_discipline,
      grade_scale: create(:grade_scale, school: school)
    )
  end
  let(:student) { create(:student, school: school, school_class: school_class) }

  it "creates a launched row with a digest matching current inputs" do
    create(
      :grade_entry,
      school: school,
      student: student,
      class_discipline: class_discipline,
      academic_period: period,
      evaluation_component: component,
      entered_by_membership: membership,
      value: "9.0"
    )

    result = described_class.call(
      class_discipline: class_discipline,
      academic_period: period,
      launched_by_membership: membership
    )

    expect(result).to be_success
    digest = Grades::ComputeInputDigestService.call(
      class_discipline: class_discipline,
      academic_period: period
    ).data[:digest]
    expect(result.data.input_digest).to eq(digest)
    expect(result.data.status).to eq("launched")
  end

  context "when a contributing grade changes after launch" do
    it "invalidates the launch and allows relaunch with a new digest" do
      create(
        :grade_entry,
        school: school,
        student: student,
        class_discipline: class_discipline,
        academic_period: period,
        evaluation_component: component,
        entered_by_membership: membership,
        value: "8.0"
      )

      launch = described_class.call(
        class_discipline: class_discipline,
        academic_period: period,
        launched_by_membership: membership
      ).data

      Grades::UpsertGradeEntryService.call(
        class_discipline: class_discipline,
        academic_period: period,
        evaluation_component: component,
        student: student,
        value: "9.0",
        entered_by_membership: membership
      )

      launch.reload
      expect(launch.status).to eq("invalidated")
      expect(launch.invalidation_reason).to eq("contributing_input_changed")

      relaunch = Grades::RelaunchGradesService.call(
        class_discipline: class_discipline,
        academic_period: period,
        launched_by_membership: membership
      )

      expect(relaunch).to be_success
      expect(relaunch.data.status).to eq("launched")
      expect(relaunch.data.input_digest).not_to eq(launch.input_digest)
      expect(relaunch.data.supersedes_id).to eq(launch.id)
    end
  end
end
