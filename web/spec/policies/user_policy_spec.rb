# frozen_string_literal: true

require "rails_helper"

RSpec.describe UserPolicy do
  subject(:policy) { described_class.new(user, record) }

  let(:record) { create(:user) }
  let(:school) { create(:school) }

  describe "backoffice user" do
    let(:user) { create(:user) }

    before { create(:membership, :backoffice, user: user) }

    it "permits disable and enable" do
      expect(policy.disable?).to be(true)
      expect(policy.enable?).to be(true)
    end
  end

  describe "school admin" do
    let(:user) { create(:user) }

    before { create(:membership, user: user, school: school, role: "school") }

    it "denies disable and enable" do
      expect(policy.disable?).to be(false)
      expect(policy.enable?).to be(false)
    end
  end
end
