# frozen_string_literal: true

require "rails_helper"

RSpec.describe People::AcceptMembershipService do
  subject(:result) { described_class.call(membership: membership, user: user) }

  let(:school) { create(:school) }
  let(:user) { create(:user, email: "guardian@example.com") }
  let!(:guardian) { create(:guardian, school: school, email: "guardian@example.com", user: nil) }
  let(:membership) { create(:membership, :invited, user: user, school: school, role: "guardian") }

  it "activates membership and links guardian user_id" do
    expect(result).to be_success
    expect(membership.reload.status).to eq("active")
    expect(guardian.reload.user_id).to eq(user.id)
  end

  context "when membership is already active" do
    let(:membership) { create(:membership, user: user, school: school, role: "guardian", status: "active") }

    it "returns invalid_state_transition" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:invalid_state_transition)
    end
  end
end
