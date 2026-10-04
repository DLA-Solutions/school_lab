# frozen_string_literal: true

require "rails_helper"

RSpec.describe Academic::UpsertDailyRoutineService do
  include ActiveSupport::Testing::TimeHelpers

  let(:school) { create(:school) }
  let(:user) { create(:user) }
  let(:teacher) { create(:teacher, school: school, email: user.email) }
  let(:membership) { create(:membership, user: user, school: school, role: "teacher") }
  let(:school_class) { create(:school_class, school: school, grade_level: "infantil_1") }
  let(:student) { create(:student, school: school, school_class: school_class) }
  let(:zone) { Time.find_zone("America/Sao_Paulo") }

  def upsert(attributes:, student: self.student, attachment_ids: nil)
    described_class.call(
      school: school,
      teacher: teacher,
      student: student,
      attributes: attributes,
      attachment_ids: attachment_ids,
      uploaded_by: membership
    )
  end

  it "creates one draft and updates that row on the second upsert" do
    date = DailyRoutine.today

    first = upsert(attributes: { date: date, narrative: "Manhã na rodinha" })
    second = upsert(attributes: { date: date, narrative: "Tarde no parque" })

    expect(first).to be_success
    expect(first.data.status).to eq("draft")
    expect(first.data.sent_at).to be_nil
    expect(first.data.author).to eq(teacher)
    expect(first.data.school_class).to eq(school_class)
    expect(second.data.id).to eq(first.data.id)
    expect(second.data.narrative).to eq("Tarde no parque")
    expect(second.data.status).to eq("draft")
    expect(DailyRoutine.count).to eq(1)
    expect(Message.count).to eq(0)
  end

  it "refuses discomfort without a detail and leaves the row unchanged" do
    date = DailyRoutine.today
    upsert(attributes: { date: date, narrative: "Keep me", discomfort: "no" })

    result = upsert(attributes: { date: date, discomfort: "yes" })

    expect(result).to be_failure
    expect(result.error_code).to eq(:discomfort_detail_required)
    stored = DailyRoutine.find_by!(school: school, student: student, date: date)
    expect(stored.narrative).to eq("Keep me")
    expect(stored.discomfort).to eq("no")
    expect(stored.discomfort_detail).to be_nil
  end

  it "locks a date before today in America/Sao_Paulo and keeps the stored narrative" do
    travel_to zone.local(2026, 10, 3, 15, 0, 0) do
      upsert(attributes: { date: Date.new(2026, 10, 3), narrative: "Original" })
    end

    result = nil
    travel_to zone.local(2026, 10, 4, 15, 0, 0) do
      result = upsert(attributes: { date: Date.new(2026, 10, 3), narrative: "Changed" })
    end

    expect(result).to be_failure
    expect(result.error_code).to eq(:routine_day_locked)
    expect(DailyRoutine.find_by!(student: student).narrative).to eq("Original")
  end

  it "does not insert a routine for a fundamental class" do
    fundamental = create(:school_class, school: school, grade_level: "fundamental_i_1")
    child = create(:student, school: school, school_class: fundamental)

    result = nil
    expect do
      result = upsert(student: child, attributes: { date: DailyRoutine.today, narrative: "Lição" })
    end.not_to change(DailyRoutine, :count)

    expect(result).to be_failure
    expect(result.error_code).to eq(:not_infantil)
  end
end
