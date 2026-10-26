# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolPaymentProviderPolicy do
  subject(:policy) { described_class.new(user, SchoolPaymentProvider) }

  let(:school) { create(:school) }
  let(:user) { create(:user) }

  before do
    Current.user = user
    Current.membership = membership
    Current.school = school
    Current.effective_permission_keys = nil
  end

  after { Current.reset }

  context "with the school owner" do
    let!(:membership) { create(:membership, :school_admin, user: user, school: school) }

    it { expect(policy.index?).to be(true) }
    it { expect(policy.create?).to be(true) }
  end

  context "with a director who is not the owner" do
    let!(:membership) { create(:membership, :director, user: user, school: school) }

    it { expect(policy.index?).to be(true) }
    it { expect(policy.create?).to be(true) }
  end

  context "with a secretary" do
    let!(:membership) { create(:membership, :staff, user: user, school: school) }

    before do
      template = create_system_templates_for(school).find { |t| t.system_key == "secretary" }
      create(:staff_profile, membership: membership, school: school, role_template: template)
    end

    it { expect(policy.index?).to be(false) }
    it { expect(policy.create?).to be(false) }
  end

  context "with a teacher" do
    let!(:membership) { create(:membership, user: user, school: school, role: "teacher") }

    it { expect(policy.create?).to be(false) }
  end

  context "with a guardian" do
    let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }

    it { expect(policy.index?).to be(false) }
    it { expect(policy.create?).to be(false) }
  end

  describe "Scope" do
    let!(:membership) { create(:membership, :director, user: user, school: school) }
    let!(:own) { create(:school_payment_provider, :inter, school: school) }
    let!(:foreign) { create(:school_payment_provider, :inter, school: create(:school)) }

    it "returns only the current school's configurations" do
      expect(described_class::Scope.new(user, SchoolPaymentProvider).resolve).to contain_exactly(own)
    end

    it "returns nothing to a guardian" do
      guardian = create(:user)
      Current.user = guardian
      Current.membership = create(:membership, user: guardian, school: school, role: "guardian")
      Current.effective_permission_keys = nil

      expect(described_class::Scope.new(guardian, SchoolPaymentProvider).resolve).to be_empty
    end
  end
end
