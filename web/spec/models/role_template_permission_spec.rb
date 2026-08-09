# frozen_string_literal: true

require "rails_helper"

RSpec.describe RoleTemplatePermission do
  it "rejects unknown permission keys" do
    permission = build(:role_template_permission, permission_key: "unknown")

    expect(permission).not_to be_valid
    expect(permission.errors[:permission_key]).to be_present
  end

  it "rejects scope kinds not allowed for the permission" do
    permission = build(:role_template_permission, permission_key: "manage_school_settings", scope_kind: "segment")

    expect(permission).not_to be_valid
    expect(permission.errors[:scope_kind]).to be_present
  end

  it "requires school_id to match the role template school" do
    school = create(:school)
    other_school = create(:school)
    role_template = create(:school_role_template, school: school)
    permission = build(:role_template_permission, role_template: role_template, school: other_school)

    expect(permission).not_to be_valid
    expect(permission.errors[:school_id]).to be_present
  end

  it "enforces unique permission keys per role template among kept rows" do
    permission = create(:role_template_permission)
    duplicate = build(
      :role_template_permission,
      role_template: permission.role_template,
      school: permission.school,
      permission_key: permission.permission_key
    )

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:permission_key]).to be_present
  end
end
