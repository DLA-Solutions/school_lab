# frozen_string_literal: true

require "rails_helper"

RSpec.describe Identity::ProvisionSystemRoleTemplatesService do
  subject(:result) { described_class.call(school: school) }

  let(:school) { create(:school) }

  it "provisions four system templates with pt-BR names and system flags" do
    expect(result).to be_success

    templates = result.data[:templates]
    expect(templates.keys).to contain_exactly("director", "secretary", "coordination", "teacher")

    SchoolLab::Permissions::SYSTEM_TEMPLATES.each do |system_key, definition|
      template = templates.fetch(system_key)
      expect(template).to be_persisted
      expect(template.system_key).to eq(system_key)
      expect(template.is_system).to be(true)
      expect(template.name).to eq(definition[:default_name])
    end
  end

  it "assigns permissions matching the system template registry" do
    result = described_class.call(school: school)

    SchoolLab::Permissions::SYSTEM_TEMPLATES.each do |system_key, definition|
      template = result.data[:templates].fetch(system_key)
      actual = template.role_template_permissions.kept.map do |permission|
        { key: permission.permission_key, scope_kind: permission.scope_kind }
      end
      expected = definition[:permissions].map { |entry| entry.slice(:key, :scope_kind) }

      expect(actual).to match_array(expected)
    end
  end

  it "is idempotent when called twice" do
    described_class.call(school: school)
    template_count = SchoolRoleTemplate.count
    permission_count = RoleTemplatePermission.count

    described_class.call(school: school)

    expect(SchoolRoleTemplate.count).to eq(template_count)
    expect(RoleTemplatePermission.count).to eq(permission_count)
  end

  context "when a kept system template was discarded" do
    before do
      described_class.call(school: school)
      school.system_role_template("director").discard
    end

    it "creates a new template row" do
      expect { described_class.call(school: school) }
        .to change { school.school_role_templates.count }.by(1)

      expect(school.system_role_template("director")).to be_present
      expect(school.school_role_templates.discarded.count).to eq(1)
    end
  end

  context "with an unpersisted school" do
    let(:school) { build(:school) }

    it "returns validation_error" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
      expect(result.details).to eq({ school: [ "must be persisted" ] })
    end
  end

  it "scopes all role template permissions to the school" do
    described_class.call(school: school)

    permission_school_ids = RoleTemplatePermission.where(school: school).pluck(:school_id)
    expect(permission_school_ids).to all(eq(school.id))
  end
end
