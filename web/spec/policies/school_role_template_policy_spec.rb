# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolRoleTemplatePolicy do
  subject(:policy) { described_class.new(user, record) }

  let(:school) { create(:school) }
  let(:record) { create(:school_role_template, school: school) }
  let(:user) { create(:user) }

  after { Current.reset }

  describe "owner" do
    let!(:membership) { create(:membership, :staff, user: user, school: school) }
    let(:director_template) { create_system_templates_for(school).find { |t| t.system_key == "director" } }

    before do
      create(:staff_profile, :owner, membership: membership, school: school, role_template: director_template)
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "permits index via manage_people" do
      expect(policy.index?).to be(true)
    end

    it "permits create, update, and clone" do
      expect(policy.create?).to be(true)
      expect(policy.update?).to be(true)
      expect(policy.clone?).to be(true)
    end

    it "permits destroying custom templates" do
      expect(policy.destroy?).to be(true)
    end

    it "allows destroying system templates at policy level; service enforces the domain guard" do
      system_record = director_template
      system_policy = described_class.new(user, system_record)

      expect(system_policy.destroy?).to be(true)
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

    it "permits index" do
      expect(policy.index?).to be(true)
    end

    it "denies mutations" do
      expect(policy.create?).to be(false)
      expect(policy.update?).to be(false)
      expect(policy.destroy?).to be(false)
      expect(policy.clone?).to be(false)
    end
  end

  describe "guardian" do
    let!(:guardian_membership) { create(:membership, user: user, school: school, role: "guardian") }

    before do
      Current.user = user
      Current.membership = guardian_membership
      Current.school = school
    end

    it "denies all actions" do
      expect(policy.index?).to be(false)
      expect(policy.create?).to be(false)
      expect(policy.update?).to be(false)
      expect(policy.destroy?).to be(false)
      expect(policy.clone?).to be(false)
    end
  end

  describe "Scope" do
    let!(:kept_template) { create(:school_role_template, school: school) }
    let!(:other_school_template) { create(:school_role_template) }
    let!(:discarded_template) { create(:school_role_template, school: school).tap(&:discard) }

    before do
      Current.school = school
    end

    it "returns kept templates for the current school only" do
      scope = described_class::Scope.new(user, SchoolRoleTemplate.all).resolve

      expect(scope).to include(kept_template)
      expect(scope).not_to include(other_school_template, discarded_template)
    end
  end
end
