# frozen_string_literal: true

require "rails_helper"

RSpec.describe StaffProfile do
  it "requires a role template" do
    profile = build(:staff_profile, role_template: nil)

    expect(profile).not_to be_valid
    expect(profile.errors[:role_template_id]).to be_present
  end

  it "enforces one profile per membership among kept rows" do
    profile = create(:staff_profile)
    duplicate = build(:staff_profile, school: profile.school, membership: profile.membership)

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:membership_id]).to be_present
  end

  it "requires membership school to match profile school" do
    school = create(:school)
    other_school = create(:school)
    membership = create(:membership, :staff, school: school)
    profile = build(:staff_profile, school: other_school, membership: membership)

    expect(profile).not_to be_valid
    expect(profile.errors[:membership_id]).to be_present
  end

  it "requires role template school to match profile school" do
    school = create(:school)
    other_school = create(:school)
    role_template = create(:school_role_template, school: school)
    membership = create(:membership, :staff, school: other_school)
    profile = build(:staff_profile, school: other_school, membership: membership, role_template: role_template)

    expect(profile).not_to be_valid
    expect(profile.errors[:role_template_id]).to be_present
  end

  it "requires segment school to match profile school" do
    school = create(:school)
    other_school = create(:school)
    segment = create(:segment, school: school)
    profile = build(:staff_profile, school: other_school, segment: segment)

    expect(profile).not_to be_valid
    expect(profile.errors[:segment_id]).to be_present
  end

  it "allows only one owner per school among kept profiles" do
    school = create(:school)
    create(:staff_profile, :owner, school: school)
    duplicate_owner = build(:staff_profile, :owner, school: school)

    expect(duplicate_owner).not_to be_valid
    expect(duplicate_owner.errors[:is_owner]).to be_present
  end
end
