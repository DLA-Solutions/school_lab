# frozen_string_literal: true

require "rails_helper"

RSpec.describe CrmContactPolicy do
  subject(:policy) { described_class.new(user, record) }

  let(:school) { create(:school) }
  let(:record) { create(:crm_contact, school: school) }
  let(:user) { create(:user) }

  after { Current.reset }

  def act_as(membership)
    Current.user = user
    Current.membership = membership
    Current.school = school
    Current.effective_permission_keys = nil
  end

  describe "school admin (director, owner)" do
    before { act_as(create(:membership, :school_admin, user: user, school: school)) }

    it "permits every action on a contact of the same school" do
      expect(policy.index?).to be(true)
      expect(policy.show?).to be(true)
      expect(policy.create?).to be(true)
      expect(policy.update?).to be(true)
      expect(policy.destroy?).to be(true)
    end

    it "denies show/update/destroy on a contact of another school" do
      other = described_class.new(user, create(:crm_contact, school: create(:school)))

      expect(other.show?).to be(false)
      expect(other.update?).to be(false)
      expect(other.destroy?).to be(false)
    end

    it "scopes to kept contacts of the current school only" do
      mine = create(:crm_contact, school: school)
      create(:crm_contact, school: school, discarded_at: Time.current)
      create(:crm_contact, school: create(:school))

      expect(described_class::Scope.new(user, CrmContact).resolve).to contain_exactly(mine)
    end
  end

  describe "secretary (holds manage_enrollment)" do
    before do
      membership = create(:membership, :staff, user: user, school: school)
      template = create_system_templates_for(school).find { |t| t.system_key == "secretary" }
      create(:staff_profile, membership: membership, school: school, role_template: template)
      act_as(membership)
    end

    it "is permitted" do
      expect(policy.index?).to be(true)
      expect(policy.create?).to be(true)
    end
  end

  describe "teacher" do
    before do
      membership = create(:membership, :staff, user: user, school: school)
      template = create_system_templates_for(school).find { |t| t.system_key == "teacher" }
      create(:staff_profile, membership: membership, school: school, role_template: template)
      act_as(membership)
      record
    end

    it "is denied every action" do
      expect(policy.index?).to be(false)
      expect(policy.show?).to be(false)
      expect(policy.create?).to be(false)
      expect(policy.update?).to be(false)
      expect(policy.destroy?).to be(false)
    end
  end

  describe "guardian" do
    before { act_as(create(:membership, user: user, school: school, role: "guardian")) }

    it "is denied every action" do
      expect(policy.index?).to be(false)
      expect(policy.show?).to be(false)
      expect(policy.create?).to be(false)
    end
  end
end
