# frozen_string_literal: true

require "rails_helper"

RSpec.describe Message, type: :model do
  it "is valid with the factory" do
    expect(build(:message)).to be_valid
  end

  it "rejects a routine card without a daily routine" do
    message = build(:message, kind: "routine", daily_routine: nil)

    expect(message).not_to be_valid
    expect(message.errors[:daily_routine]).to be_present
  end

  it "rejects a text message that points at a daily routine" do
    routine = create(:daily_routine)
    message = build(:message, kind: "text", daily_routine: routine, school: routine.school,
                              conversation: create(:conversation, school: routine.school, student: routine.student))

    expect(message).not_to be_valid
    expect(message.errors[:daily_routine]).to be_present
  end

  it "rejects a school that does not match the conversation" do
    message = build(:message, school: create(:school))

    expect(message).not_to be_valid
    expect(message.errors[:school]).to be_present
  end
end
