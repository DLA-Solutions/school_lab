# frozen_string_literal: true

require "rails_helper"

RSpec.describe PlatformPlanPolicy do
  let(:school) { create(:school) }
  let(:operator) { create(:user) }
  let!(:operator_membership) { create(:membership, :with_manage_platform_billing, user: operator) }

  after { Current.reset }

  it "allows backoffice with manage_platform_billing to list the operator catalog" do
    Current.user = operator
    policy = described_class.new(operator, :platform_plan)

    expect(policy.index?).to eq(true)
    expect(policy.index_own?).to eq(false)
  end

  it "allows a director with manage_school_settings to list the school catalog" do
    director = create(:user)
    create_owner_membership(school, user: director)
    Current.user = director
    Current.school = school
    Current.membership = director.memberships.find_by(school: school)

    policy = described_class.new(director, :platform_plan)
    expect(policy.index_own?).to eq(true)
    expect(policy.index?).to eq(false)
  end

  it "denies a guardian" do
    guardian = create(:user)
    membership = create(:membership, user: guardian, school: school, role: "guardian")
    Current.user = guardian
    Current.school = school
    Current.membership = membership

    policy = described_class.new(guardian, :platform_plan)
    expect(policy.index_own?).to eq(false)
    expect(policy.index?).to eq(false)
  end

  it "denies a teacher without manage_school_settings" do
    teacher_user = create(:user)
    membership = create(:membership, user: teacher_user, school: school, role: "teacher")
    Current.reset
    Current.user = teacher_user
    Current.school = school
    Current.membership = membership
    Current.effective_permission_keys = nil

    policy = described_class.new(teacher_user, :platform_plan)
    expect(policy.index_own?).to eq(false)
  end

  describe PlatformPlanPolicy::Scope do
    let!(:plan) { PlatformPlan.find_by(key: "starter") || create(:platform_plan, :starter) }

    it "returns kept plans for a director with manage_school_settings" do
      director = create(:user)
      create_owner_membership(school, user: director)
      Current.user = director
      Current.school = school
      Current.membership = director.memberships.find_by(school: school)

      expect(described_class.new(director, PlatformPlan).resolve).to include(plan)
    end

    it "returns none for a guardian" do
      guardian = create(:user)
      membership = create(:membership, user: guardian, school: school, role: "guardian")
      Current.user = guardian
      Current.school = school
      Current.membership = membership

      expect(described_class.new(guardian, PlatformPlan).resolve).to be_empty
    end
  end
end
