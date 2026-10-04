# frozen_string_literal: true

require "rails_helper"

RSpec.describe TeacherHealthProfile, type: :model do
  let(:school) { create(:school) }
  let(:teacher) { create(:teacher, school: school) }

  it "is valid with the factory defaults" do
    profile = build(:teacher_health_profile, school: school, teacher: teacher)
    expect(profile).to be_valid
  end

  it "rejects an invalid blood type" do
    profile = build(:teacher_health_profile, school: school, teacher: teacher, blood_type: "invalid")
    expect(profile).not_to be_valid
  end

  it "rejects a second profile for the same teacher" do
    create(:teacher_health_profile, school: school, teacher: teacher)
    duplicate = build(:teacher_health_profile, school: school, teacher: teacher)

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:teacher_id]).to be_present
  end

  it "normalizes the emergency contact phone to digits only" do
    profile = build(:teacher_health_profile, school: school, teacher: teacher,
                                             emergency_contact_phone: "(11) 98888-0000")
    profile.valid?

    expect(profile.emergency_contact_phone).to eq("11988880000")
  end

  it "rejects a teacher from a different school" do
    other_school_teacher = create(:teacher, school: create(:school))
    profile = build(:teacher_health_profile, school: school, teacher: other_school_teacher)

    expect(profile).not_to be_valid
    expect(profile.errors[:teacher]).to be_present
  end
end
