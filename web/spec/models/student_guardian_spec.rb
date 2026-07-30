# frozen_string_literal: true

require "rails_helper"

RSpec.describe StudentGuardian do
  it "enforces unique guardian-student pairs among kept links" do
    link = create(:student_guardian)
    duplicate = build(:student_guardian, school: link.school, guardian: link.guardian, student: link.student)

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:guardian_id]).to be_present
  end
end
