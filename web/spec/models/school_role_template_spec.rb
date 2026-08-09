# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolRoleTemplate do
  it "requires a name" do
    template = build(:school_role_template, name: nil)

    expect(template).not_to be_valid
    expect(template.errors[:name]).to be_present
  end

  it "requires system_key when is_system is true" do
    template = build(:school_role_template, :system_director, system_key: nil)

    expect(template).not_to be_valid
    expect(template.errors[:system_key]).to be_present
  end

  it "rejects system_key on custom templates" do
    template = build(:school_role_template, system_key: "director")

    expect(template).not_to be_valid
    expect(template.errors[:system_key]).to be_present
  end

  it "rejects unknown system keys" do
    template = build(:school_role_template, :system_director, system_key: "unknown")

    expect(template).not_to be_valid
    expect(template.errors[:system_key]).to be_present
  end

  it "enforces unique system_key per school among kept templates" do
    template = create(:school_role_template, :system_director)
    duplicate = build(:school_role_template, :system_director, school: template.school)

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:system_key]).to be_present
  end

  it "scopes system templates" do
    school = create(:school)
    system_template = create(:school_role_template, :system_director, school: school)
    create(:school_role_template, school: school)

    expect(described_class.system_templates).to contain_exactly(system_template)
  end

  describe "create_system_templates_for" do
    it "creates all system templates for a school" do
      school = create(:school)

      templates = create_system_templates_for(school)

      expect(templates.size).to eq(SchoolLab::Permissions.system_template_keys.size)
      expect(templates).to all(be_persisted)
      expect(templates.map(&:system_key)).to match_array(SchoolLab::Permissions.system_template_keys)
    end
  end
end
