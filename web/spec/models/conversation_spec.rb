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

  it "names the family on the inbox line and the last speaker on the roster line" do
    school = create(:school)
    school_class = create(:school_class, school: school, grade_level: "fundamental_i_1")
    student = create(:student, school: school, school_class: school_class, name: "Lara")
    father_user = create(:user)
    father = create(:guardian, school: school, user: father_user, name: "Diego")
    mother_user = create(:user)
    mother = create(:guardian, school: school, user: mother_user, name: "Marina")
    create(
      :student_guardian,
      school: school,
      student: student,
      guardian: father,
      relationship: "father",
      primary_guardian: true
    )
    create(
      :student_guardian,
      school: school,
      student: student,
      guardian: mother,
      relationship: "mother",
      primary_guardian: false
    )
    father_membership = create(:membership, user: father_user, school: school, role: "guardian")
    mother_membership = create(:membership, user: mother_user, school: school, role: "guardian")
    staff_membership = create(:membership, user: create(:user), school: school, role: "school")
    conversation = create(:conversation, :secretary, school: school, student: student)
    create(
      :message,
      conversation: conversation,
      school: school,
      sender_membership: father_membership,
      body: "Do pai",
      sent_at: 3.hours.ago
    )
    create(
      :message,
      conversation: conversation,
      school: school,
      sender_membership: mother_membership,
      body: "Da mãe",
      sent_at: 2.hours.ago
    )
    create(
      :message,
      conversation: conversation,
      school: school,
      sender_membership: staff_membership,
      body: "Da secretaria",
      sent_at: 1.hour.ago
    )

    I18n.with_locale(:"pt-BR") do
      expect(conversation.family_sender_line).to eq("Marina, mãe da Lara — 1º ano")
      expect(conversation.sender_line).to eq("professor — Lara — 1º ano")
    end
  end

  it "uses the primary guardian when only staff has written" do
    school = create(:school)
    school_class = create(:school_class, school: school, grade_level: "fundamental_i_1")
    student = create(:student, school: school, school_class: school_class, name: "Lara")
    father = create(:guardian, school: school, name: "Diego")
    mother = create(:guardian, school: school, name: "Marina")
    create(
      :student_guardian,
      school: school,
      student: student,
      guardian: mother,
      relationship: "mother",
      primary_guardian: false
    )
    create(
      :student_guardian,
      school: school,
      student: student,
      guardian: father,
      relationship: "father",
      primary_guardian: true
    )
    conversation = create(:conversation, school: school, student: student)
    create(:message, conversation: conversation, school: school, body: "Da escola")

    I18n.with_locale(:"pt-BR") do
      expect(conversation.family_sender_line).to eq("Diego, pai da Lara — 1º ano")
    end
  end

  it "uses the first kept guardian when none is primary" do
    school = create(:school)
    school_class = create(:school_class, school: school, grade_level: "fundamental_i_1")
    student = create(:student, school: school, school_class: school_class, name: "Lara")
    father = create(:guardian, school: school, name: "Diego")
    mother = create(:guardian, school: school, name: "Marina")
    create(
      :student_guardian,
      school: school,
      student: student,
      guardian: father,
      relationship: "father",
      primary_guardian: false
    )
    create(
      :student_guardian,
      school: school,
      student: student,
      guardian: mother,
      relationship: "mother",
      primary_guardian: false
    )
    conversation = create(:conversation, school: school, student: student)
    create(:message, conversation: conversation, school: school, body: "Da escola")

    I18n.with_locale(:"pt-BR") do
      expect(conversation.family_sender_line).to eq("Diego, pai da Lara — 1º ano")
    end
  end

  it "names the child and series when no guardian is linked" do
    school = create(:school)
    school_class = create(:school_class, school: school, grade_level: "fundamental_i_1")
    student = create(:student, school: school, school_class: school_class, name: "Lara")
    conversation = create(:conversation, school: school, student: student)
    create(:message, conversation: conversation, school: school, body: "Da escola")

    I18n.with_locale(:"pt-BR") do
      expect(conversation.family_sender_line).to eq("Lara — 1º ano")
    end
  end

  it "has no inbox line before any message" do
    conversation = create(:conversation)

    expect(conversation.family_sender_line).to be_nil
    expect(conversation.sender_line).to be_nil
  end

  it "rejects a student from another school" do
    conversation = build(:conversation, school: create(:school), student: create(:student))

    expect(conversation).not_to be_valid
    expect(conversation.errors[:student]).to be_present
  end
end
