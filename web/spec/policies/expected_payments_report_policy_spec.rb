# frozen_string_literal: true

require "rails_helper"

RSpec.describe ExpectedPaymentsReportPolicy do
  subject(:policy) { described_class.new(user, :expected_payments_report) }

  let(:school) { create(:school) }
  let(:user) { create(:user) }

  before do
    Current.user = user
    Current.membership = membership
    Current.school = school
    Current.effective_permission_keys = nil
  end

  after { Current.reset }

  context "with a director (owns manage_billing)" do
    let!(:membership) { create(:membership, :school_admin, user: user, school: school) }

    it { expect(policy.show?).to be(true) }
  end

  context "with a secretary (people only, no billing)" do
    let!(:membership) { create(:membership, :staff, user: user, school: school) }
    let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }

    before do
      create(:staff_profile, membership: membership, school: school, role_template: secretary_template)
      Current.effective_permission_keys = nil
    end

    it { expect(policy.show?).to be(false) }
  end

  context "with staff holding only view_billing_summary" do
    let!(:membership) { create(:membership, :staff, user: user, school: school) }

    before { Current.effective_permission_keys = [ "view_billing_summary" ] }

    it "refuses: a total is not every family's figure" do
      expect(policy.show?).to be(false)
    end
  end

  context "with a guardian" do
    let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }

    it { expect(policy.show?).to be(false) }
  end
end
