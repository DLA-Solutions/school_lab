# frozen_string_literal: true

require "rails_helper"

RSpec.describe StudentHealthProfile, type: :model do
  let(:school) { create(:school) }
  let(:student) { create(:student, school: school) }

  it "rejects an invalid blood type" do
    profile = build(:student_health_profile, school: school, student: student, blood_type: "invalid")
    expect(profile).not_to be_valid
  end
end
