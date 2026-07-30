# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolPolicy do
  subject(:policy) { described_class.new(user, record) }

  let(:record) { build(:school) }
  let(:school) { create(:school) }

  describe "backoffice user" do
    let(:user) { create(:user) }

    before { create(:membership, :backoffice, user: user) }

    it "permits all school actions" do
      expect(policy.index?).to be(true)
      expect(policy.show?).to be(true)
      expect(policy.create?).to be(true)
      expect(policy.update?).to be(true)
      expect(policy.destroy?).to be(true)
    end
  end

  describe "school admin" do
    let(:user) { create(:user) }

    before { create(:membership, user: user, school: school, role: "school") }

    it "denies all school actions" do
      expect(policy.index?).to be(false)
      expect(policy.show?).to be(false)
      expect(policy.create?).to be(false)
      expect(policy.update?).to be(false)
      expect(policy.destroy?).to be(false)
    end
  end

  describe "Scope" do
    let!(:kept_school) { create(:school) }
    let!(:discarded_school) { create(:school).tap(&:discard) }

    context "when backoffice" do
      let(:user) { create(:user) }

      before { create(:membership, :backoffice, user: user) }

      it "includes all schools" do
        scope = described_class::Scope.new(user, School.all).resolve
        expect(scope).to include(kept_school, discarded_school)
      end
    end

    context "when school admin" do
      let(:user) { create(:user) }

      before { create(:membership, user: user, school: school, role: "school") }

      it "returns no schools" do
        scope = described_class::Scope.new(user, School.all).resolve
        expect(scope).to be_empty
      end
    end
  end
end
