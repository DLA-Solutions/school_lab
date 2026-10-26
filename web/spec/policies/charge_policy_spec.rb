# frozen_string_literal: true

require "rails_helper"

RSpec.describe ChargePolicy do
  subject(:policy) { described_class.new(user, record) }

  let(:school) { create(:school) }
  let(:record) { build(:charge, school: school) }
  let(:user) { create(:user) }

  after { Current.reset }

  describe "director with manage_billing" do
    let!(:membership) { create(:membership, :school_admin, user: user, school: school) }

    before do
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "permits billing actions" do
      expect(policy.index?).to be(true)
      expect(policy.create?).to be(true)
    end
  end

  describe "secretary without billing override" do
    let!(:membership) { create(:membership, :staff, user: user, school: school) }
    let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }

    before do
      create(:staff_profile, membership: membership, school: school, role_template: secretary_template)
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "denies billing actions" do
      expect(policy.index?).to be(false)
      expect(policy.create?).to be(false)
    end
  end

  describe "#boleto_pdf?" do
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

    it "permits the guardian who owns the charge" do
      expect(described_class.new(guardian_user, build(:charge, school: school, guardian: guardian)).boleto_pdf?)
        .to be(true)
    end

    it "denies another family's charge" do
      other = create(:guardian, school: school)

      expect(described_class.new(guardian_user, build(:charge, school: school, guardian: other)).boleto_pdf?)
        .to be(false)
    end

    it "denies a charge from another school" do
      other_school = create(:school)
      other_guardian = create(:guardian, school: other_school)

      expect(described_class.new(guardian_user, build(:charge, school: other_school, guardian: other_guardian))
               .boleto_pdf?).to be(false)
    end

    it "denies staff, even with billing permission" do
      staff = create(:user)
      staff_membership = create(:membership, :school_admin, user: staff, school: school)
      Current.user = staff
      Current.membership = staff_membership
      Current.guardian = nil
      Current.effective_permission_keys = nil

      expect(described_class.new(staff, build(:charge, school: school, guardian: guardian)).boleto_pdf?).to be(false)
    end
  end
end
