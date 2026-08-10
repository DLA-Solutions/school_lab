# frozen_string_literal: true

require "rails_helper"

RSpec.describe MembershipPolicy do
  subject(:policy) { described_class.new(user, record) }

  let(:school) { create(:school) }
  let(:record) { create(:membership, school: school, role: "guardian") }
  let(:user) { create(:user) }

  after { Current.reset }

  describe "owner" do
    let!(:membership) { create(:membership, :school_admin, user: user, school: school) }

    before do
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "permits index and create via manage_people" do
      expect(policy.index?).to be(true)
      expect(policy.create?).to be(true)
    end

    it "permits update, destroy, and invite for same-school memberships" do
      expect(policy.update?).to be(true)
      expect(policy.destroy?).to be(true)

      invited = create(:membership, :invited, school: school, role: "guardian")
      invite_policy = described_class.new(user, invited)

      expect(invite_policy.invite?).to be(true)
    end
  end

  describe "secretary with manage_people" do
    let!(:membership) { create(:membership, :staff, user: user, school: school) }
    let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }

    before do
      create(:staff_profile, membership: membership, school: school, role_template: secretary_template)
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "permits index and create" do
      expect(policy.index?).to be(true)
      expect(policy.create?).to be(true)
    end
  end

  describe "teacher without manage_people" do
    let!(:membership) { create(:membership, user: user, school: school, role: "teacher") }
    let(:teacher_template) { create_system_templates_for(school).find { |t| t.system_key == "teacher" } }

    before do
      create(:staff_profile, membership: membership, school: school, role_template: teacher_template)
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "denies index and create" do
      expect(policy.index?).to be(false)
      expect(policy.create?).to be(false)
    end
  end

  describe "guardian" do
    let!(:guardian_membership) { create(:membership, user: user, school: school, role: "guardian") }

    before do
      Current.user = user
      Current.membership = guardian_membership
      Current.school = school
    end

    it "denies management actions" do
      expect(policy.index?).to be(false)
      expect(policy.create?).to be(false)
      expect(policy.update?).to be(false)
    end
  end

  describe "update_permissions?" do
    let(:owner_user) { create(:user) }
    let!(:membership) { create(:membership, :school_admin, user: owner_user, school: school) }
    let(:target) { create(:membership, :staff, school: school) }

    before do
      secretary_template = create_system_templates_for(school).find { |t| t.system_key == "secretary" }
      create(:staff_profile, membership: target, school: school, role_template: secretary_template)
    end

    it "permits owner" do
      Current.user = owner_user
      Current.membership = membership
      Current.school = school

      owner_policy = described_class.new(owner_user, target)
      expect(owner_policy.update_permissions?).to be(true)
    end

    it "denies secretary with manage_people" do
      secretary_membership = create(:membership, :staff, user: create(:user), school: school)
      secretary_template = create_system_templates_for(school).find { |t| t.system_key == "secretary" }
      create(:staff_profile, membership: secretary_membership, school: school, role_template: secretary_template)

      Current.user = secretary_membership.user
      Current.membership = secretary_membership
      Current.school = school
      Current.effective_permission_keys = nil

      secretary_policy = described_class.new(secretary_membership.user, target)
      expect(secretary_policy.update_permissions?).to be(false)
    end
  end

  describe "accept?" do
    let(:invitee) { create(:user) }
    let(:record) { create(:membership, :invited, user: invitee, school: school, role: "guardian") }

    it "permits the invitee to accept" do
      accept_policy = described_class.new(invitee, record)

      expect(accept_policy.accept?).to be(true)
    end
  end
end
