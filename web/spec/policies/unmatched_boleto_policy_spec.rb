# frozen_string_literal: true

require "rails_helper"

RSpec.describe UnmatchedBoletoPolicy do
  subject(:policy) { described_class.new(user, record) }

  let(:school) { create(:school) }
  let(:record) { build(:unmatched_boleto, school: school) }
  let(:user) { create(:user) }

  after { Current.reset }

  describe "staff with manage_billing" do
    let!(:membership) { create(:membership, :school_admin, user: user, school: school) }

    before do
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "permits the staff-review actions" do
      expect(policy.index?).to be(true)
      expect(policy.resolve?).to be(true)
      expect(policy.dismiss?).to be(true)
    end
  end

  describe "staff without manage_billing" do
    let!(:membership) { create(:membership, :staff, user: user, school: school) }
    let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }

    before do
      create(:staff_profile, membership: membership, school: school, role_template: secretary_template)
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "denies the staff-review actions" do
      expect(policy.index?).to be(false)
      expect(policy.resolve?).to be(false)
      expect(policy.dismiss?).to be(false)
    end
  end

  describe "guardian membership" do
    let(:guardian_user) { create(:user) }
    let!(:membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
    let!(:guardian) { create(:guardian, school: school, user: guardian_user) }
    let(:user) { guardian_user }

    before do
      Current.user = guardian_user
      Current.membership = membership
      Current.school = school
      Current.guardian = guardian
    end

    it "denies every action — there is no guardian-facing branch for unmatched boletos" do
      expect(policy.index?).to be(false)
      expect(policy.resolve?).to be(false)
      expect(policy.dismiss?).to be(false)
    end
  end

  describe "Scope" do
    subject(:resolved_scope) { UnmatchedBoletoPolicy::Scope.new(user, UnmatchedBoleto.all).resolve }

    let!(:membership) { create(:membership, :school_admin, user: user, school: school) }
    let!(:own_boleto) { create(:unmatched_boleto, school: school) }

    before do
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "returns only the current school's rows" do
      other_school = create(:school)
      create(:unmatched_boleto, school: other_school)

      expect(resolved_scope).to contain_exactly(own_boleto)
    end

    it "excludes another school's rows entirely, not just by filtering the same query" do
      other_school = create(:school)
      other_boleto = create(:unmatched_boleto, school: other_school)

      expect(resolved_scope).not_to include(other_boleto)
    end

    it "returns none when staff lacks manage_billing" do
      secretary_template = create_system_templates_for(school).find { |t| t.system_key == "secretary" }
      secretary_user = create(:user)
      staff_membership = create(:membership, :staff, user: secretary_user, school: school)
      create(:staff_profile, membership: staff_membership, school: school, role_template: secretary_template)
      Current.user = secretary_user
      Current.membership = staff_membership
      Current.effective_permission_keys = nil

      expect(UnmatchedBoletoPolicy::Scope.new(secretary_user, UnmatchedBoleto.all).resolve).to be_empty
    end

    it "returns none for a guardian membership" do
      guardian_user = create(:user)
      guardian_membership = create(:membership, user: guardian_user, school: school, role: "guardian")
      guardian = create(:guardian, school: school, user: guardian_user)
      Current.user = guardian_user
      Current.membership = guardian_membership
      Current.guardian = guardian

      expect(UnmatchedBoletoPolicy::Scope.new(guardian_user, UnmatchedBoleto.all).resolve).to be_empty
    end

    it "returns none when there is no current school" do
      Current.school = nil

      expect(resolved_scope).to be_empty
    end
  end
end
