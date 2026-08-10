# frozen_string_literal: true

require "rails_helper"

RSpec.describe Identity::CreateRoleTemplateService do
  subject(:result) { described_class.call(school: school, params: params) }

  let(:school) { create(:school) }
  let(:params) do
    {
      name: "Recepção",
      permissions: [
        { permission_key: "manage_people", scope_kind: "full" }
      ]
    }
  end

  it "creates a custom template with permissions" do
    expect(result).to be_success

    template = result.data
    expect(template).to be_persisted
    expect(template.is_system).to be(false)
    expect(template.system_key).to be_nil
    expect(template.name).to eq("Recepção")
    expect(template.role_template_permissions.kept.pluck(:permission_key)).to eq([ "manage_people" ])
  end

  context "with invalid name" do
    let(:params) { { name: "", permissions: [] } }

    it "returns validation_error" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
    end
  end
end
