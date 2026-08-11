# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Provisioning audit metadata on audited models" do
  let(:school) { create(:school, :provisioning) }
  let(:backoffice_user) { create(:user) }

  before do
    create(:membership, :with_provision_school, user: backoffice_user)
    Current.user = backoffice_user
    Current.school = school
    Audited.store[:audited_user] = backoffice_user
  end

  after do
    Current.reset
    Audited.store.delete(:audited_user)
    Audited.store.delete(SchoolLab::ProvisioningAuditMetadata::STORE_KEY)
  end

  def expect_provisioning_audit_metadata(audit)
    expect(audit).to be_present
    expect(audit.user).to eq(backoffice_user)
    expect(JSON.parse(audit.comment)).to eq(
      "actor_type" => "backoffice",
      "on_behalf_of" => school.id
    )
  end

  it "stores metadata on student creation during provisioning" do
    SchoolLab::ProvisioningAuditMetadata.with_comment do
      student = create(:student, school: school)
      expect_provisioning_audit_metadata(student.audits.find_by(action: "create"))
    end
  end

  it "stores metadata on guardian creation during provisioning" do
    SchoolLab::ProvisioningAuditMetadata.with_comment do
      guardian = create(:guardian, school: school)
      expect_provisioning_audit_metadata(guardian.audits.find_by(action: "create"))
    end
  end

  it "stores metadata on staff profile creation during provisioning" do
    membership = create(:membership, :invited, :staff, school: school)
    director = create_system_templates_for(school).find { |t| t.system_key == "director" }

    SchoolLab::ProvisioningAuditMetadata.with_comment do
      staff_profile = create(:staff_profile, membership: membership, school: school, role_template: director)
      expect_provisioning_audit_metadata(staff_profile.audits.find_by(action: "create"))
    end
  end

  it "does not store metadata outside provisioning context" do
    school.update!(onboarding_status: "pending_handoff")

    SchoolLab::ProvisioningAuditMetadata.with_comment do
      student = create(:student, school: school)
      audit = student.audits.find_by(action: "create")
      expect(audit.comment).to be_nil
    end
  end
end
