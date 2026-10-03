# frozen_string_literal: true

require "rails_helper"

RSpec.describe TeacherHealthProfilePolicy do
  subject(:policy) { described_class.new(user, record) }

  let(:school) { create(:school) }
  let(:teacher) { create(:teacher, school: school, email: "ana@example.com") }
  let(:record) { create(:teacher_health_profile, school: school, teacher: teacher) }

  after { Current.reset }

  describe "the owning teacher" do
    let(:user) { create(:user, email: "ana@example.com") }
    let!(:membership) { create(:membership, user: user, school: school, role: "teacher") }

    before do
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "permits reading and updating their own profile" do
      expect(policy.show?).to be(true)
      expect(policy.update?).to be(true)
    end
  end

  describe "a different teacher" do
    let(:other_teacher) { create(:teacher, school: school, email: "bruno@example.com") }
    let(:user) { create(:user, email: "bruno@example.com") }
    let!(:membership) { create(:membership, user: user, school: school, role: "teacher") }

    before do
      other_teacher
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "denies reading and updating a colleague's profile" do
      expect(policy.show?).to be(false)
      expect(policy.update?).to be(false)
    end
  end

  describe "staff with manage_people" do
    let(:user) { create(:user) }
    let!(:membership) { create(:membership, :staff, user: user, school: school) }

    before do
      secretary_template = create_system_templates_for(school).find { |t| t.system_key == "secretary" }
      create(:staff_profile, membership: membership, school: school, role_template: secretary_template)
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "permits reading any teacher's profile in the same school" do
      expect(policy.show?).to be(true)
    end

    it "denies updating" do
      expect(policy.update?).to be(false)
    end
  end

  describe "staff without manage_people" do
    let(:user) { create(:user) }
    let!(:membership) { create(:membership, user: user, school: school, role: "teacher") }

    before do
      teacher_template = create_system_templates_for(school).find { |t| t.system_key == "teacher" }
      create(:staff_profile, membership: membership, school: school, role_template: teacher_template)
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "denies reading and updating" do
      expect(policy.show?).to be(false)
      expect(policy.update?).to be(false)
    end
  end

  describe "cross-school" do
    let(:other_school) { create(:school) }

    context "staff with manage_people at a different school" do
      let(:user) { create(:user) }
      let!(:membership) { create(:membership, :staff, user: user, school: other_school) }

      before do
        director = create_system_templates_for(other_school).find { |t| t.system_key == "director" }
        create(:staff_profile, :owner, membership: membership, school: other_school, role_template: director)
        Current.user = user
        Current.membership = membership
        Current.school = other_school
        Current.effective_permission_keys = nil
      end

      it "cannot read a profile belonging to another school" do
        expect(policy.show?).to be(false)
      end
    end

    context "teacher whose email matches but is a membership at a different school" do
      let(:user) { create(:user, email: "ana@example.com") }
      let!(:membership) { create(:membership, user: user, school: other_school, role: "teacher") }

      before do
        Current.user = user
        Current.membership = membership
        Current.school = other_school
        Current.effective_permission_keys = nil
      end

      it "cannot read or update the profile from the other school" do
        expect(policy.show?).to be(false)
        expect(policy.update?).to be(false)
      end
    end
  end

  describe "guardian membership" do
    let(:user) { create(:user) }
    let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }

    before do
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "denies reading and updating" do
      expect(policy.show?).to be(false)
      expect(policy.update?).to be(false)
    end
  end

  describe "Scope" do
    it "returns scope.none without a current school" do
      resolved = described_class::Scope.new(nil, TeacherHealthProfile.all).resolve

      expect(resolved).to eq(TeacherHealthProfile.none)
    end

    it "scopes to the current school" do
      in_school = record
      other_school = create(:school)
      other_teacher = create(:teacher, school: other_school)
      create(:teacher_health_profile, school: other_school, teacher: other_teacher)

      Current.school = school
      resolved = described_class::Scope.new(nil, TeacherHealthProfile.all).resolve

      expect(resolved).to contain_exactly(in_school)
    end
  end
end
