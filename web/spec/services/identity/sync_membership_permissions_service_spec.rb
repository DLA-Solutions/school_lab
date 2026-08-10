# frozen_string_literal: true

require "rails_helper"

RSpec.describe Identity::SyncMembershipPermissionsService do
  subject(:result) { described_class.call(membership: membership, grants: grants, denies: denies) }

  let(:school) { create(:school) }
  let(:membership) { create(:membership, :staff, school: school) }
  let(:grants) { [] }
  let(:denies) { [] }

  before do
    secretary = create_system_templates_for(school).find { |t| t.system_key == "secretary" }
    create(:staff_profile, membership: membership, school: school, role_template: secretary)
  end

  context "with grants" do
    let(:grants) { [ "manage_billing" ] }

    it "creates a grant override" do
      expect(result).to be_success
      override = membership.membership_permissions.kept.find_by!(permission_key: "manage_billing")
      expect(override.effect).to eq("grant")
    end
  end

  context "with denies" do
    let(:denies) { [ "manage_enrollment" ] }

    it "creates a deny override" do
      expect(result).to be_success
      override = membership.membership_permissions.kept.find_by!(permission_key: "manage_enrollment")
      expect(override.effect).to eq("deny")
    end
  end

  context "when the same key appears in grants and denies" do
    let(:grants) { [ "manage_billing" ] }
    let(:denies) { [ "manage_billing" ] }

    it "returns validation_error" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
    end
  end

  context "with an unknown permission key" do
    let(:grants) { [ "not_a_permission" ] }

    it "returns validation_error" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
    end
  end

  context "when teach is granted to staff without also_teaches" do
    let(:grants) { [ "teach" ] }

    it "returns invalid_permission_for_role" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:invalid_permission_for_role)
    end
  end

  context "when syncing replaces an existing set" do
    before do
      create(:membership_permission, membership: membership, school: school, permission_key: "manage_billing", effect: "grant")
      create(:membership_permission, membership: membership, school: school, permission_key: "manage_enrollment", effect: "deny")
    end

    let(:grants) { [ "manage_documents" ] }
    let(:denies) { [] }

    it "discards removed overrides" do
      expect(result).to be_success
      kept_keys = membership.membership_permissions.kept.pluck(:permission_key)
      expect(kept_keys).to eq([ "manage_documents" ])
    end
  end
end
