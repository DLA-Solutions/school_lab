# frozen_string_literal: true

require "rails_helper"

RSpec.describe Conversation, type: :model do
  it "is valid for coordination without a teacher" do
    conversation = build(:conversation, audience: "coordination", teacher: nil)

    expect(conversation).to be_valid
  end

  it "requires a teacher when the audience is teacher" do
    conversation = build(:conversation, audience: "teacher", teacher: nil)

    expect(conversation).not_to be_valid
    expect(conversation.errors[:teacher]).to be_present
  end

  it "rejects a teacher on a secretary conversation" do
    conversation = build(:conversation, :secretary)
    conversation.teacher = create(:teacher, school: conversation.school)

    expect(conversation).not_to be_valid
    expect(conversation.errors[:teacher]).to be_present
  end

  it "allows one coordination row and one secretary row for the same child" do
    coordination = create(:conversation, audience: "coordination")
    secretary = build(:conversation, :secretary, school: coordination.school, student: coordination.student)

    expect(secretary).to be_valid
  end

  it "rejects a second coordination row for the same child" do
    existing = create(:conversation, audience: "coordination")
    duplicate = build(:conversation, audience: "coordination", school: existing.school, student: existing.student)

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:audience]).to be_present
  end

  it "allows one row per teacher for the same child" do
    school = create(:school)
    student = create(:student, school: school)
    first = create(:conversation, :with_teacher, school: school, student: student)
    second = build(
      :conversation,
      audience: "teacher",
      school: school,
      student: student,
      teacher: create(:teacher, school: school)
    )

    expect(second).to be_valid
    expect(second.teacher).not_to eq(first.teacher)
  end

  it "rejects a second row for the same teacher and child" do
    existing = create(:conversation, :with_teacher)
    duplicate = build(
      :conversation,
      audience: "teacher",
      school: existing.school,
      student: existing.student,
      teacher: existing.teacher
    )

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:teacher_id]).to be_present
  end

  it "rejects a student from another school" do
    conversation = build(:conversation, school: create(:school), student: create(:student))

    expect(conversation).not_to be_valid
    expect(conversation.errors[:student]).to be_present
  end
end
