# frozen_string_literal: true

require "rails_helper"

RSpec.describe ReportCards::ExecuteBatchService do
  include PermissionsFactoryHelpers
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let(:owner_user) { create(:user) }
  let!(:owner_membership) { create_owner_membership(school, user: owner_user).last }
  let(:school_year) { create(:school_year, :custom, school: school) }
  let(:period) do
    create(:academic_period, school_year: school_year, school: school, closure_status: "closing")
  end
  let(:school_class) { create(:school_class, school: school, year: school_year.name.to_i) }
  let(:subject_record) { create(:subject, school: school) }
  let!(:class_discipline) do
    create(:class_discipline, school: school, school_class: school_class, subject: subject_record,
                              school_year: school_year)
  end
  let!(:student) { create(:student, school: school, school_class: school_class) }
  let!(:signatory) { create(:document_signatory, school: school) }
  let!(:config) do
    create(:report_card_config, school: school, document_signatory: signatory,
                                created_by_membership: owner_membership)
  end

  before do
    Current.membership = owner_membership
    template = create(
      :evaluation_template,
      school: school,
      school_class: school_class,
      academic_period: period,
      created_by_membership: owner_membership
    )
    component = create(
      :evaluation_component,
      school: school,
      evaluation_template: template,
      class_discipline: class_discipline,
      grade_scale: create(:grade_scale, school: school)
    )
    create(
      :grade_entry,
      school: school,
      student: student,
      class_discipline: class_discipline,
      academic_period: period,
      evaluation_component: component,
      entered_by_membership: owner_membership,
      value: "9.0"
    )
    Grades::LaunchGradesService.call(
      class_discipline: class_discipline,
      academic_period: period,
      launched_by_membership: owner_membership
    )
    session = create(
      :attendance_session,
      school: school,
      school_class: school_class,
      academic_period: period,
      school_year: school_year,
      session_date: period.starts_on,
      confirmed_at: Time.current
    )
    create(:attendance_record, attendance_session: session, student: student, status: "present")
  end

  it "releases all students atomically and emits ReportCardPublished" do
    batch = create(
      :report_card_publish_batch,
      school: school,
      school_class: school_class,
      academic_period: period,
      requested_by_membership: owner_membership,
      requested_count: 1
    )

    expect do
      result = described_class.call(batch: batch)
      expect(result).to be_success
      expect(result.data.dig(:counts, :released)).to eq(1)
    end.to have_enqueued_job(ReportCards::ReportCardPublishedJob).once
  end
end
