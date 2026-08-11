# frozen_string_literal: true

require "rails_helper"

RSpec.describe UserPolicy do
  subject(:policy) { described_class.new(user, record) }

  let(:record) { create(:user) }
  let(:school) { create(:school) }

  describe "backoffice user" do
    let(:user) { create(:user) }

    before { create(:membership, :backoffice, user: user) }

    it "permits index, disable, and enable" do
      expect(policy.index?).to be(true)
      expect(policy.disable?).to be(true)
      expect(policy.enable?).to be(true)
    end

    it "scopes to all users" do
      listed = create(:user)
      scope = described_class::Scope.new(user, User.kept).resolve

      expect(scope).to include(listed)
    end
  end

  describe "school admin" do
    let(:user) { create(:user) }

    before { create(:membership, user: user, school: school, role: "school") }

    it "denies index, disable, and enable" do
      expect(policy.index?).to be(false)
      expect(policy.disable?).to be(false)
      expect(policy.enable?).to be(false)
    end

    it "scopes to none" do
      create(:user)
      scope = described_class::Scope.new(user, User.kept).resolve

      expect(scope).to be_empty
    end
  end
end
