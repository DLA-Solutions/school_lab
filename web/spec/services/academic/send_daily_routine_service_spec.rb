# frozen_string_literal: true

require "rails_helper"

RSpec.describe Academic::SendDailyRoutineService do
  let(:school) { create(:school) }
  let(:user) { create(:user) }
  let(:teacher) { create(:teacher, school: school, email: user.email) }
  let(:membership) { create(:membership, user: user, school: school, role: "teacher") }
  let(:school_class) { create(:school_class, school: school, grade_level: "infantil_1") }
  let(:student) { create(:student, school: school, school_class: school_class) }

  def draft_routine(child: student, narrative: nil)
    Academic::UpsertDailyRoutineService.call(
      school: school,
      teacher: teacher,
      student: child,
      attributes: { date: DailyRoutine.today, narrative: narrative },
      uploaded_by: membership
    ).data
  end

  it "sends a narrative as one routine message and refuses a second send" do
    routine = draft_routine(narrative: "Brincou no parque")

    result = described_class.call(school: school, membership: membership, routine: routine)

    expect(result).to be_success
    expect(result.data[:created]).to be(true)
    expect(result.data[:routine].status).to eq("sent")
    expect(result.data[:routine].sent_at).to be_present
    message = result.data[:message]
    expect(message.kind).to eq("routine")
    expect(message.body).to be_nil
    expect(message.daily_routine_id).to eq(routine.id)
    expect(message.sender_membership).to eq(membership)
    expect(message.conversation.student).to eq(student)
    expect(Message.where(daily_routine_id: routine.id).count).to eq(1)

    second = described_class.call(school: school, membership: membership, routine: routine.reload)

    expect(second).to be_failure
    expect(second.error_code).to eq(:routine_already_sent)
    expect(Message.where(daily_routine_id: routine.id).count).to eq(1)
    expect(routine.reload.status).to eq("sent")
  end

  it "rejects a send with every field blank and no attachment" do
    routine = draft_routine(narrative: nil)

    result = nil
    expect do
      result = described_class.call(school: school, membership: membership, routine: routine)
    end.not_to change(Message, :count)

    expect(result).to be_failure
    expect(result.error_code).to eq(:empty_content)
    expect(routine.reload.status).to eq("draft")
    expect(routine.sent_at).to be_nil
  end
end
