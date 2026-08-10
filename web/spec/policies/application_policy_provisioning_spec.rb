# frozen_string_literal: true

require "rails_helper"

RSpec.describe ApplicationPolicy, "provisioning access" do
  let(:school) { create(:school, :provisioning) }
  let(:user) { create(:user) }
  let(:policy) { MembershipPolicy.new(user, Membership) }

  before do
    Current.user = user
    Current.school = school
    Current.membership = nil
    Current.effective_permission_keys = nil
  end

  after { Current.reset }

  context "when backoffice has provision_school during provisioning" do
    before { create(:membership, :with_provision_school, user: user) }

    it "allows manage_people via staff_with?" do
      expect(policy.create?).to be(true)
    end
  end

  context "when backoffice lacks provision_school" do
    before { create(:membership, :backoffice, user: user) }

    it "denies manage_people" do
      expect(policy.create?).to be(false)
    end
  end

  context "when school is active" do
    let(:school) { create(:school, onboarding_status: "active") }

    before { create(:membership, :with_provision_school, user: user) }

    it "denies manage_people without staff membership" do
      expect(policy.create?).to be(false)
    end
  end

  context "when school is pending_handoff" do
    let(:school) { create(:school, :pending_handoff) }

    before { create(:membership, :with_provision_school, user: user) }

    it "denies manage_people after provisioning phase" do
      expect(policy.create?).to be(false)
    end
  end
end

RSpec.describe ProvisioningImportPolicy, "provisioning-only access" do
  let(:school) { create(:school, :provisioning) }
  let(:user) { create(:user) }
  let(:policy) { described_class.new(user, :provisioning_import) }

  before do
    Current.user = user
    Current.school = school
    Current.membership = nil
  end

  after { Current.reset }

  context "when backoffice has provision_school during provisioning" do
    before { create(:membership, :with_provision_school, user: user) }

    it "allows CSV import" do
      expect(policy.create?).to be(true)
    end
  end

  context "when school is pending_handoff" do
    let(:school) { create(:school, :pending_handoff) }

    before { create(:membership, :with_provision_school, user: user) }

    it "denies CSV import" do
      expect(policy.create?).to be(false)
    end
  end
end
