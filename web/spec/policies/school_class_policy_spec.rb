# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolClassPolicy do
  subject(:policy) { described_class.new(user, record) }

  let(:school) { create(:school) }
  let(:record) { create(:school_class, school: school) }
  let(:user) { create(:user) }

  after { Current.reset }

  describe "secretary with manage_enrollment" do
    let!(:membership) { create(:membership, :staff, user: user, school: school) }
    let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }

    before do
      create(:staff_profile, membership: membership, school: school, role_template: secretary_template)
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "permits listing and managing classes" do
      expect(policy.index?).to be(true)
      expect(policy.show?).to be(true)
      expect(policy.create?).to be(true)
      expect(policy.update?).to be(true)
      expect(policy.destroy?).to be(true)
    end
  end

  describe "a stock teacher (holds only `teach`, never `manage_enrollment`)" do
    let!(:membership) { create(:membership, user: user, school: school, role: "teacher") }
    let(:teacher_template) { create_system_templates_for(school).find { |t| t.system_key == "teacher" } }

    before do
      create(:staff_profile, membership: membership, school: school, role_template: teacher_template)
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    # `teach` and `manage_enrollment` are separate permission keys, and the system `teacher`
    # template only grants `teach` (see `lib/school_lab/permissions.rb`). A teacher listing the
    # classes they teach — to pick one for grade entry — is the entire point of this read, so
    # `teach` alone must be enough for `index?`. Mutating a class roster is still an
    # enrollment-management action, not a teaching one.
    it "permits listing classes on `teach` alone, but not managing them" do
      expect(policy.index?).to be(true)
      expect(policy.show?).to be(false)
      expect(policy.create?).to be(false)
      expect(policy.update?).to be(false)
      expect(policy.destroy?).to be(false)
    end
  end

  describe "a staff role with neither `teach` nor `manage_enrollment`" do
    let!(:membership) { create(:membership, :staff, user: user, school: school) }
    let(:billing_only_template) { create(:school_role_template, school: school) }

    before do
      create(:role_template_permission, school: school, role_template: billing_only_template,
                                        permission_key: "manage_billing", scope_kind: "full")
      create(:staff_profile, membership: membership, school: school, role_template: billing_only_template)
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "denies listing classes" do
      expect(policy.index?).to be(false)
    end
  end

  describe "Scope" do
    let!(:membership) { create(:membership, :school_admin, user: user, school: school) }
    let!(:own_class) { create(:school_class, school: school) }
    let!(:other_school_class) { create(:school_class, school: create(:school)) }

    before do
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "resolves only classes in the current school" do
      resolved = SchoolClassPolicy::Scope.new(user, SchoolClass).resolve

      expect(resolved).to include(own_class)
      expect(resolved).not_to include(other_school_class)
    end

    it "resolves to none without a current school" do
      Current.school = nil

      resolved = SchoolClassPolicy::Scope.new(user, SchoolClass).resolve

      expect(resolved).to be_empty
    end
  end
end
