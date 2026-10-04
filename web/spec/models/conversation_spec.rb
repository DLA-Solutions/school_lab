# frozen_string_literal: true

require "rails_helper"

RSpec.describe Conversation, type: :model do
  it "is valid with the factory" do
    expect(build(:conversation)).to be_valid
  end

  it "allows one kept thread per school and student" do
    existing = create(:conversation)
    duplicate = build(:conversation, school: existing.school, student: existing.student)

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:student_id]).to be_present
  end

  it "allows another kept thread after the first is discarded" do
    existing = create(:conversation)
    existing.discard!

    replacement = build(:conversation, school: existing.school, student: existing.student)

    expect(replacement).to be_valid
  end

  it "rejects a student from another school" do
    conversation = build(:conversation, school: create(:school), student: create(:student))

    expect(conversation).not_to be_valid
    expect(conversation.errors[:student]).to be_present
  end
end
