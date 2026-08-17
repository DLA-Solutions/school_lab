# frozen_string_literal: true

require "rails_helper"

RSpec.describe AcademicPeriods::StartClosureService do
  let(:school) { create(:school) }
  let(:school_year) { create(:school_year, :custom, school: school) }
  let(:school_class) { create(:school_class, school: school, year: school_year.name.to_i) }
  let(:subject) { create(:subject, school: school) }
  let(:period) { create(:academic_period, school_year: school_year, school: school, closure_status: "open") }
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

  def launch_grades!
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
    Grades::LaunchGradesService.call(
      class_discipline: class_discipline,
      academic_period: period,
      launched_by_membership: membership
    )
  end

  it "transitions open to closing when checklist passes" do
    launch_grades!

    result = described_class.call(period: period)

    expect(result).to be_success
    expect(result.data.closure_status).to eq("closing")
  end

  it "returns checklist_incomplete when grade launch is missing" do
    result = described_class.call(period: period)

    expect(result).to be_failure
    expect(result.error_code).to eq(:checklist_incomplete)
    expect(result.details[:blockers]).to include(
      hash_including(code: "missing_grade_launch", class_discipline_id: class_discipline.id)
    )
    expect(period.reload.closure_status).to eq("open")
  end

  it "returns checklist_incomplete when attendance is pending confirmation" do
    launch_grades!
    AttendanceSession.create!(
      school: school,
      school_class: school_class,
      school_year: school_year,
      academic_period: period,
      session_date: period.starts_on,
      confirmed_at: nil
    )

    result = described_class.call(period: period)

    expect(result).to be_failure
    expect(result.error_code).to eq(:checklist_incomplete)
    expect(result.details[:blockers]).to include(hash_including(code: "pending_attendance_confirmation"))
  end
end
