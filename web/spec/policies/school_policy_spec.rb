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

    # School admins may open a school and manage the ones they administer.
    it "allows listing and creating" do
      expect(policy.index?).to be(true)
      expect(policy.create?).to be(true)
    end

    it "allows managing a school they administer" do
      # `record` above is an unrelated school; this is the one the membership points at.
      own = described_class.new(user, school)

      expect(own.show?).to be(true)
      expect(own.update?).to be(true)
      expect(own.destroy?).to be(true)
    end

    # Opening the register to school admins must not let one school's administrator rename or
    # discard another school.
    it "denies managing a school they do not administer" do
      expect(policy.show?).to be(false)
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

      it "returns only the schools they administer" do
        scope = described_class::Scope.new(user, School.all).resolve

        expect(scope).to include(school)
        expect(scope).not_to include(kept_school, discarded_school)
      end
    end
  end
end
