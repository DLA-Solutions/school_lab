# frozen_string_literal: true

require "rails_helper"

RSpec.describe Attendance::PeriodSummaryService do
  let(:school) { create(:school) }
  let(:school_year) { create(:school_year, :custom, school: school) }
  let(:school_class) { create(:school_class, school: school, year: school_year.name.to_i) }
  let(:student) { create(:student, school: school, school_class: school_class) }
  let(:period) { create(:academic_period, school_year: school_year, school: school) }

  before do
    create(:attendance_policy, school: school, late_counts_as_absence: late_counts_as_absence)
  end

  def create_session_with_status(status)
    @session_offset ||= 0
    @session_offset += 1
    session = AttendanceSession.create!(
      school: school,
      school_class: school_class,
      school_year: school_year,
      academic_period: period,
      session_date: period.starts_on + @session_offset.days,
      confirmed_at: Time.current
    )
    AttendanceRecord.create!(
      attendance_session: session,
      school: school,
      student: student,
      status: status
    )
  end

  context "when late does not count as absence" do
    let(:late_counts_as_absence) { false }

    it "computes denominator 10, numerator 7, percentage 70.00" do
      6.times { create_session_with_status("present") }
      create_session_with_status("late")
      2.times { create_session_with_status("absent") }
      create_session_with_status("excused")

      summary = described_class.call(student: student, academic_period: period, school_class: school_class).data

      expect(summary.instructional_sessions).to eq(10)
      expect(summary.present_count).to eq(6)
      expect(summary.late_count).to eq(1)
      expect(summary.absent_count).to eq(2)
      expect(summary.excused_count).to eq(1)
      expect(summary.numerator).to eq(7)
      expect(summary.late_counts_as_absence).to be(false)
      expect(summary.percentage).to eq(70.0)
    end
  end

  context "when late counts as absence" do
    let(:late_counts_as_absence) { true }

    it "computes numerator 6 and percentage 60.00" do
      6.times { create_session_with_status("present") }
      create_session_with_status("late")
      2.times { create_session_with_status("absent") }
      create_session_with_status("excused")

      summary = described_class.call(student: student, academic_period: period, school_class: school_class).data

      expect(summary.numerator).to eq(6)
      expect(summary.percentage).to eq(60.0)
    end
  end
end
