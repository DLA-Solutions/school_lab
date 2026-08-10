# frozen_string_literal: true

require "rails_helper"

RSpec.describe ApplicationPolicy, "#staff_with?" do
  subject(:policy) { test_policy.new(user, nil) }

  let(:test_policy) do
    Class.new(ApplicationPolicy) do
      def manage_billing?
        staff_with?(:manage_billing)
      end
    end
  end

  let(:user) { create(:user) }
  let(:school) { create(:school) }
  let(:membership) { create(:membership, :staff, user: user, school: school) }
  let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }

  before do
    create(:staff_profile, membership: membership, school: school, role_template: secretary_template)
    create(
      :membership_permission,
      membership: membership,
      school: school,
      permission_key: "manage_billing",
      effect: "grant"
    )

    Current.user = user
    Current.membership = membership
    Current.effective_permission_keys = nil
  end

  after do
    Current.reset
  end

  it "returns true when the membership has the permission" do
    expect(policy.manage_billing?).to be(true)
  end

  it "returns false for inactive memberships" do
    membership.update!(status: "invited")

    expect(policy.manage_billing?).to be(false)
  end

  it "returns false for guardian memberships" do
    membership.update!(role: "guardian")

    expect(policy.manage_billing?).to be(false)
  end

  it "caches effective permission keys for the request" do
    expect(policy.manage_billing?).to be(true)

    create(
      :membership_permission,
      membership: membership,
      school: school,
      permission_key: "manage_school_settings",
      effect: "grant"
    )

    expect(policy.manage_billing?).to be(true)
    expect(Current.effective_permission_keys).to include("manage_billing")
    expect(Current.effective_permission_keys).not_to include("manage_school_settings")
  end
end
