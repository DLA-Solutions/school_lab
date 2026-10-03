# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolInstructionalDayPolicy do
  include PermissionsFactoryHelpers

  subject(:policy) { described_class.new(user, record) }

  let(:school) { create(:school) }
  let(:school_year) { create(:school_year, school: school) }
  let(:record) { build(:school_instructional_day, school: school, school_year: school_year) }
  let(:user) { create(:user) }

  after { Current.reset }

  describe "owner with manage_school_settings" do
    let!(:owner) { create_owner_membership(school, user: user) }
    let(:membership) { owner.last }

    before do
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "permits read and write" do
      expect(policy.show?).to be(true)
      expect(policy.update?).to be(true)
    end
  end

  describe "plain teacher membership" do
    let!(:membership) { create(:membership, user: user, school: school, role: "teacher") }

    before do
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "permits read but denies write" do
      expect(policy.show?).to be(true)
      expect(policy.update?).to be(false)
    end
  end

  describe "inactive membership" do
    let!(:membership) { create(:membership, user: user, school: school, role: "teacher", status: "suspended") }

    before do
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "denies read and write" do
      expect(policy.show?).to be(false)
      expect(policy.update?).to be(false)
    end
  end

  describe "non-staff role" do
    let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }

    before do
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "denies read and write" do
      expect(policy.show?).to be(false)
      expect(policy.update?).to be(false)
    end
  end

  describe "Scope" do
    let!(:membership) { create(:membership, user: user, school: school, role: "teacher") }

    before do
      Current.user = user
      Current.membership = membership
      Current.school = school
      Current.effective_permission_keys = nil
    end

    it "returns only same-school rows" do
      same_school_day = create(:school_instructional_day, school: school, school_year: school_year)

      other_school = create(:school)
      other_school_year = create(:school_year, school: other_school)
      create(:school_instructional_day, school: other_school, school_year: other_school_year)

      resolved = described_class::Scope.new(user, SchoolInstructionalDay.all).resolve

      expect(resolved).to contain_exactly(same_school_day)
    end

    it "returns scope.none without a current school" do
      Current.school = nil

      resolved = described_class::Scope.new(user, SchoolInstructionalDay.all).resolve

      expect(resolved).to be_empty
    end
  end
end
