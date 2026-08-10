# frozen_string_literal: true

require "rails_helper"

RSpec.describe Identity::UpdateRoleTemplateService do
  subject(:result) { described_class.call(template: template, params: params) }

  let(:school) { create(:school) }
  let(:templates) { create_system_templates_for(school) }
  let(:secretary) { templates.find { |t| t.system_key == "secretary" } }
  let(:template) { secretary }

  before do
    2.times do
      membership = create(:membership, :staff, school: school)
      create(:staff_profile, membership: membership, school: school, role_template: secretary)
    end
  end

  context "when removing a permission from the template" do
    let(:params) do
      {
        permissions: [
          { permission_key: "manage_people", scope_kind: "full" },
          { permission_key: "manage_documents", scope_kind: "full" }
        ]
      }
    end

    it "syncs permissions and returns affected_memberships_count" do
      expect(result).to be_success

      data = result.data
      expect(data[:affected_memberships_count]).to eq(2)
      keys = data[:template].role_template_permissions.kept.pluck(:permission_key)
      expect(keys).to contain_exactly("manage_people", "manage_documents")
      expect(keys).not_to include("manage_enrollment")
    end
  end

  context "when updating only the name" do
    let(:params) { { name: "Secretaria Atualizada" } }

    it "updates the name without touching permissions" do
      original_keys = template.role_template_permissions.kept.pluck(:permission_key)

      expect(result).to be_success
      expect(result.data[:template].name).to eq("Secretaria Atualizada")
      expect(result.data[:template].role_template_permissions.kept.pluck(:permission_key))
        .to match_array(original_keys)
    end
  end

  context "when the update would remove the last admin-capable template" do
    let(:director) { templates.find { |t| t.system_key == "director" } }
    let(:template) { director }
    let(:params) do
      {
        permissions: [
          { permission_key: "manage_billing", scope_kind: "full" }
        ]
      }
    end

    it "returns last_admin_template" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:last_admin_template)
    end
  end
end
