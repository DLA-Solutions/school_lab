# frozen_string_literal: true

require "rails_helper"

RSpec.describe Identity::DestroyRoleTemplateService do
  subject(:result) { described_class.call(template: template) }

  let(:school) { create(:school) }
  let(:templates) { create_system_templates_for(school) }

  context "when deleting a system template" do
    let(:template) { templates.find { |t| t.system_key == "director" } }

    it "returns cannot_delete_system_template" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:cannot_delete_system_template)
    end
  end

  context "when deleting a custom template in use" do
    let(:template) { create(:school_role_template, school: school) }

    before do
      membership = create(:membership, :staff, school: school)
      create(:staff_profile, membership: membership, school: school, role_template: template)
    end

    it "returns template_in_use with count" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:template_in_use)
      expect(result.details[:count]).to eq(1)
    end
  end

  context "when deleting the last admin-capable custom template" do
    let(:template) do
      create(:school_role_template, school: school, name: "Admin Custom").tap do |record|
        create(:role_template_permission, role_template: record, school: school,
                                          permission_key: "manage_people", scope_kind: "full")
        create(:role_template_permission, role_template: record, school: school,
                                          permission_key: "manage_school_settings", scope_kind: "full")
      end
    end

    before do
      templates.find { |t| t.system_key == "director" }.discard
    end

    it "returns last_admin_template" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:last_admin_template)
    end
  end

  context "when deleting an unused custom template" do
    let(:template) { create(:school_role_template, school: school) }

    before do
      create(:role_template_permission, role_template: template, school: school,
                                        permission_key: "manage_documents", scope_kind: "full")
    end

    it "discards the template and its permissions" do
      expect(result).to be_success
      expect(template.reload).to be_discarded
      expect(template.role_template_permissions.kept).to be_empty
    end
  end
end
