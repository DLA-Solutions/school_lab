# frozen_string_literal: true

require "rails_helper"

RSpec.describe GradeEntryPolicy do
  subject(:policy) { described_class.new(user, record) }

  let(:school) { create(:school) }
  let(:record) { create(:grade_entry, school: school) }
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

    it "permits creating and updating a grade entry" do
      expect(policy.create?).to be(true)
      expect(policy.update?).to be(true)
    end
  end

  describe "teacher without manage_enrollment" do
    let!(:membership) { create(:membership, user: user, school: school, role: "teacher") }
    let(:teacher_template) { create_system_templates_for(school).find { |t| t.system_key == "teacher" } }

    before do
      create(:staff_profile, membership: membership, school: school, role_template: teacher_template)
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "denies creating and updating a grade entry" do
      expect(policy.create?).to be(false)
      expect(policy.update?).to be(false)
    end
  end

  describe "Scope" do
    let!(:membership) { create(:membership, :school_admin, user: user, school: school) }
    let!(:own_entry) { create(:grade_entry, school: school) }
    let!(:other_school_entry) { create(:grade_entry, school: create(:school)) }

    before do
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "resolves only grade entries in the current school" do
      resolved = GradeEntryPolicy::Scope.new(user, GradeEntry).resolve

      expect(resolved).to include(own_entry)
      expect(resolved).not_to include(other_school_entry)
    end

    it "resolves to none without a current school" do
      Current.school = nil

      resolved = GradeEntryPolicy::Scope.new(user, GradeEntry).resolve

      expect(resolved).to be_empty
    end
  end
end
