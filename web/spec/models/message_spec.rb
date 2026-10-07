# frozen_string_literal: true

require "rails_helper"

RSpec.describe Message, type: :model do
  it "is valid with the factory defaults" do
    expect(build(:message)).to be_valid
  end

  it "requires a body" do
    message = build(:message, body: "  ")

    expect(message).not_to be_valid
    expect(message.errors[:body]).to be_present
  end

  it "rejects a conversation from another school" do
    message = build(:message, school: create(:school), conversation: create(:conversation))

    expect(message).not_to be_valid
    expect(message.errors[:conversation]).to be_present
  end

  it "names a guardian sender with the relationship and the class series" do
    school = create(:school)
    school_class = create(:school_class, school: school, grade_level: "fundamental_i_1")
    student = create(:student, school: school, school_class: school_class, name: "Lara")
    user = create(:user)
    guardian = create(:guardian, school: school, user: user, name: "Diego")
    create(:student_guardian, school: school, student: student, guardian: guardian, relationship: "father")
    membership = create(:membership, user: user, school: school, role: "guardian")
    conversation = create(:conversation, school: school, student: student)
    message = create(:message, conversation: conversation, school: school, sender_membership: membership, body: "Oi")

    I18n.with_locale(:"pt-BR") do
      expect(message.sender_line).to eq("Diego, pai da Lara — 1º ano")
    end
  end
end
