# frozen_string_literal: true

require "rails_helper"

RSpec.describe Identity::SyncRoleTemplatePermissionsService do
  subject(:result) { described_class.call(template: template, permissions: permissions) }

  let(:school) { create(:school) }
  let(:template) { create(:school_role_template, school: school) }

  context "with valid permissions" do
    let(:permissions) do
      [
        { permission_key: "manage_people", scope_kind: "full" },
        { permission_key: "manage_enrollment", scope_kind: "full" }
      ]
    end

    it "creates kept permissions on the template" do
      expect(result).to be_success
      keys = template.role_template_permissions.kept.pluck(:permission_key)
      expect(keys).to contain_exactly("manage_people", "manage_enrollment")
    end
  end

  context "when defaulting scope_kind to full" do
    let(:permissions) do
      [ { permission_key: "manage_enrollment" } ]
    end

    it "applies the full scope kind" do
      expect(result).to be_success
      permission = template.role_template_permissions.kept.find_by!(permission_key: "manage_enrollment")
      expect(permission.scope_kind).to eq("full")
    end
  end

  context "with duplicate permission keys" do
    let(:permissions) do
      [
        { permission_key: "manage_people", scope_kind: "full" },
        { permission_key: "manage_people", scope_kind: "partial" }
      ]
    end

    it "returns validation_error" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
    end
  end

  context "when syncing replaces an existing set" do
    before do
      create(:role_template_permission, role_template: template, school: school,
                                        permission_key: "manage_people", scope_kind: "full")
      create(:role_template_permission, role_template: template, school: school,
                                        permission_key: "manage_enrollment", scope_kind: "full")
    end

    let(:permissions) do
      [ { permission_key: "manage_documents", scope_kind: "full" } ]
    end

    it "discards removed permissions and keeps the new set" do
      expect(result).to be_success
      kept_keys = template.role_template_permissions.kept.pluck(:permission_key)
      expect(kept_keys).to eq([ "manage_documents" ])
    end
  end
end
