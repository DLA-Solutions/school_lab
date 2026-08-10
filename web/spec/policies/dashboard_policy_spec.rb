# frozen_string_literal: true

require "rails_helper"

RSpec.describe DashboardPolicy do
  subject(:policy) { described_class.new(user, :dashboard) }

  let(:school) { create(:school) }
  let(:user) { create(:user) }

  after { Current.reset }

  describe "director" do
    let!(:membership) { create(:membership, :school_admin, user: user, school: school) }

    before do
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "permits show" do
      expect(policy.show?).to be(true)
    end
  end

  describe "secretary" do
    let!(:membership) { create(:membership, :staff, user: user, school: school) }
    let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }

    before do
      create(:staff_profile, membership: membership, school: school, role_template: secretary_template)
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "denies show" do
      expect(policy.show?).to be(false)
    end
  end
end
