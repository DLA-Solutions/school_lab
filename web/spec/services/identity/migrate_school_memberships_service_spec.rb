# frozen_string_literal: true

require "rails_helper"

RSpec.describe Identity::MigrateSchoolMembershipsService do
  subject(:result) { described_class.call(school: school, dry_run: dry_run) }

  let(:school) { create(:school) }
  let(:dry_run) { false }

  context "with legacy school-role membership without staff_profile" do
    let!(:legacy_membership) { create(:membership, :school_admin, user: create(:user), school: school) }

    before do
      StaffProfile.where(membership_id: legacy_membership.id).delete_all
      legacy_membership.update!(role: "school")
    end

    it "provisions templates and creates a director staff_profile" do
      expect(result).to be_success
      profile = legacy_membership.reload.staff_profile
      expect(profile).to be_kept
      expect(profile.role_template.system_key).to eq("director")
      expect(profile.is_owner).to be(true)
    end

    it "is idempotent on a second run" do
      described_class.call(school: school)
      second = described_class.call(school: school)

      expect(second).to be_success
      expect(second.data[:profiles_created]).to eq(0)
      expect(StaffProfile.kept.where(school: school).count).to eq(1)
    end
  end

  context "with a teacher membership" do
    let!(:teacher_membership) { create(:membership, user: create(:user), school: school, role: "teacher") }

    it "assigns the teacher template and marks sole staff as owner" do
      expect(result).to be_success
      profile = teacher_membership.reload.staff_profile
      expect(profile.role_template.system_key).to eq("teacher")
      expect(profile.is_owner).to be(true)
    end
  end

  context "when an owner already exists" do
    let!(:owner_user) { create(:user) }
    let!(:owner_membership) { create(:membership, :staff, user: owner_user, school: school) }
    let!(:second_admin) { create(:membership, :staff, user: create(:user), school: school) }

    before do
      templates = Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates]
      create(
        :staff_profile,
        :owner,
        membership: owner_membership,
        school: school,
        role_template: templates["director"]
      )
    end

    it "does not create a second owner" do
      expect(result).to be_success
      expect(result.data[:owner_membership_id]).to eq(owner_membership.id)
      expect(StaffProfile.kept.where(school: school, is_owner: true).count).to eq(1)
    end
  end

  context "with dry_run enabled" do
    let(:dry_run) { true }
    let!(:legacy_membership) { create(:membership, user: create(:user), school: school, role: "school") }

    before { Identity::ProvisionSystemRoleTemplatesService.call(school: school) }

    it "does not persist profiles" do
      expect(result).to be_success
      expect(legacy_membership.reload.staff_profile).to be_nil
    end
  end

  context "when staff_profile was discarded" do
    let!(:legacy_membership) { create(:membership, :staff, user: create(:user), school: school) }

    before do
      templates = Identity::ProvisionSystemRoleTemplatesService.call(school: school).data[:templates]
      profile = create(:staff_profile, membership: legacy_membership, school: school, role_template: templates["secretary"])
      profile.discard
    end

    it "undiscards and updates the profile" do
      expect(result).to be_success
      profile = legacy_membership.reload.staff_profile
      expect(profile).to be_kept
      expect(profile.role_template.system_key).to eq("director")
    end
  end
end
