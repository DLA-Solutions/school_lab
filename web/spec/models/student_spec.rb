# frozen_string_literal: true

require "rails_helper"

RSpec.describe Student do
  it "requires a name and valid status" do
    student = build(:student, name: nil, status: "invalid")

    expect(student).not_to be_valid
    expect(student.errors[:name]).to be_present
    expect(student.errors[:status]).to be_present
  end
end
