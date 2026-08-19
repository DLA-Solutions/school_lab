# frozen_string_literal: true

require "rails_helper"

RSpec.describe PlatformSubscriptionPolicy do
  let(:school) { create(:school) }
  let(:plan) { PlatformPlan.find_by(key: "starter") || create(:platform_plan, :starter) }
  let(:subscription) { create(:platform_subscription, school: school, platform_plan: plan) }
  let(:operator) { create(:user) }
  let!(:operator_membership) { create(:membership, :with_manage_platform_billing, user: operator) }

  after { Current.reset }

  it "allows backoffice with manage_platform_billing" do
    Current.user = operator
    policy = described_class.new(operator, subscription)

    expect(policy.index?).to eq(true)
    expect(policy.checkout?).to eq(true)
  end

  it "denies school staff" do
    staff = create(:user)
    create(:membership, :staff, user: staff, school: school)
    Current.user = staff
    Current.school = school
    Current.membership = staff.memberships.find_by(school: school)

    policy = described_class.new(staff, subscription)
    expect(policy.index?).to eq(false)
  end

  it "allows a director with manage_school_settings on school-scoped actions" do
    director = create(:user)
    create_owner_membership(school, user: director)
    Current.user = director
    Current.school = school
    Current.membership = director.memberships.find_by(school: school)

    policy = described_class.new(director, subscription)
    expect(policy.show_own?).to eq(true)
    expect(policy.checkout_own?).to eq(true)
    expect(policy.index?).to eq(false)
  end
end
