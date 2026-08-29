# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolPlatformSubscriptionPolicy do
  let(:school) { create(:school) }
  let(:plan) { PlatformPlan.find_by(key: "starter") || create(:platform_plan, :starter) }
  let(:subscription) { create(:platform_subscription, school: school, platform_plan: plan) }

  after { Current.reset }

  it "allows a director with manage_school_settings" do
    director = create(:user)
    create_owner_membership(school, user: director)
    Current.user = director
    Current.school = school
    Current.membership = director.memberships.find_by(school: school)

    policy = described_class.new(director, subscription)
    expect(policy.show?).to eq(true)
    expect(policy.checkout?).to eq(true)
  end

  it "denies a guardian" do
    guardian = create(:user)
    membership = create(:membership, user: guardian, school: school, role: "guardian")
    Current.user = guardian
    Current.school = school
    Current.membership = membership

    policy = described_class.new(guardian, subscription)
    expect(policy.show?).to eq(false)
  end

  it "denies a teacher" do
    teacher_user = create(:user)
    membership = create(:membership, :staff, user: teacher_user, school: school)
    Current.reset
    Current.user = teacher_user
    Current.school = school
    Current.membership = membership
    Current.effective_permission_keys = nil

    policy = described_class.new(teacher_user, subscription)
    expect(policy.show?).to eq(false)
  end
end
