# frozen_string_literal: true

require "rails_helper"

RSpec.describe TaxDeclarationPolicy do
  subject(:policy) { described_class.new(user, record) }

  let(:school) { create(:school) }
  let(:user) { create(:user) }
  let!(:membership) { create(:membership, user: user, school: school, role: "guardian") }
  let!(:guardian) { create(:guardian, school: school, user: user) }
  let(:record) { create(:tax_declaration, school: school, guardian: guardian) }

  before do
    Current.user = user
    Current.school = school
    Current.membership = membership
    Current.guardian = guardian
  end

  after { Current.reset }

  it "permits guardian self-service actions" do
    expect(policy.show?).to be(true)
    expect(policy.create?).to be(true)
    expect(policy.index?).to be(true)
  end

  context "when another guardian owns the declaration" do
    let(:record) { create(:tax_declaration, school: school, guardian: create(:guardian, school: school)) }

    it "denies show" do
      expect(policy.show?).to be(false)
    end
  end
end
