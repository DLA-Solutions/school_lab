# frozen_string_literal: true

require "rails_helper"

RSpec.describe Schools::CreateSchoolService do
  subject(:result) { described_class.call(params: params) }

  let(:params) { { name: "Provisioned School", cnpj: "12.345.678/0001-99" } }

  it "creates the school and provisions four system role templates" do
    expect(result).to be_success

    school = result.data
    expect(school).to be_persisted
    expect(school.name).to eq("Provisioned School")

    templates = school.school_role_templates.system_templates
    expect(templates.count).to eq(4)
    expect(templates.map(&:system_key)).to contain_exactly(
      "director", "secretary", "coordination", "teacher"
    )
  end

  context "when school validation fails" do
    let(:params) { { name: "" } }

    it "does not persist a school or templates" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)

      expect(School.where(name: "")).not_to exist
      expect(SchoolRoleTemplate.count).to eq(0)
      expect(RoleTemplatePermission.count).to eq(0)
    end
  end

  context "when provisioning fails" do
    before do
      stub_const(
        "SchoolLab::Permissions::SYSTEM_TEMPLATES",
        {
          "director" => {
            default_name: "Direção",
            permissions: [
              { key: "invalid_permission", scope_kind: "full" }
            ].freeze
          }.freeze
        }.freeze
      )
    end

    it "does not leave a school behind" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
      expect(School.where(name: "Provisioned School")).not_to exist
      expect(SchoolRoleTemplate.count).to eq(0)
    end
  end
end
