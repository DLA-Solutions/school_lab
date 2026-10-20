# frozen_string_literal: true

require "rails_helper"

RSpec.describe DocumentPolicy do
  subject(:policy) { described_class.new(user, Document) }

  let(:school) { create(:school) }
  let(:user) { create(:user) }

  before do
    Current.user = user
    Current.school = school
    Current.membership = membership
    Current.guardian = guardian
  end

  after { Current.reset }

  context "with a guardian" do
    let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }
    let!(:guardian) { create(:guardian, school: school, user: user) }

    it "may send family documents and list them, but not use the staff create" do
      expect(policy.create_family_document?).to be(true)
      expect(policy.index?).to be(true)
      expect(policy.create?).to be(false)
    end
  end

  context "with a school admin" do
    let!(:membership) { create(:membership, :school_admin, user: user, school: school) }
    let(:guardian) { nil }

    it "keeps the staff create and has no guardian upload" do
      expect(policy.create?).to be(true)
      expect(policy.create_family_document?).to be(false)
    end
  end
end
