# frozen_string_literal: true

require "rails_helper"

RSpec.describe MembershipPermission do
  it "rejects unknown permission keys" do
    permission = build(:membership_permission, permission_key: "unknown")

    expect(permission).not_to be_valid
    expect(permission.errors[:permission_key]).to be_present
  end

  it "rejects invalid effects" do
    permission = build(:membership_permission, effect: "override")

    expect(permission).not_to be_valid
    expect(permission.errors[:effect]).to be_present
  end

  it "requires school_id to match membership school" do
    school = create(:school)
    other_school = create(:school)
    membership = create(:membership, school: school)
    permission = build(:membership_permission, membership: membership, school: other_school)

    expect(permission).not_to be_valid
    expect(permission.errors[:school_id]).to be_present
  end

  it "enforces unique permission keys per membership among kept rows" do
    permission = create(:membership_permission)
    duplicate = build(
      :membership_permission,
      membership: permission.membership,
      school: permission.school,
      permission_key: permission.permission_key
    )

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:permission_key]).to be_present
  end
end
