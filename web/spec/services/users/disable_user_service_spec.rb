# frozen_string_literal: true

require "rails_helper"

RSpec.describe Users::DisableUserService do
  subject(:result) { described_class.call(user: target_user, actor: backoffice_user) }

  let(:backoffice_user) { create(:user) }
  let(:target_user) { create(:user) }
  let!(:refresh_token) { create(:refresh_token, user: target_user) }

  it "disables the user and revokes refresh tokens" do
    expect(result.success?).to be(true)
    expect(target_user.reload).to have_attributes(
      status: "disabled",
      disabled_by: backoffice_user
    )
    expect(refresh_token.reload.revoked_at).to be_present
  end

  context "when user is already disabled" do
    let(:target_user) { create(:user, :disabled) }

    it "returns invalid_state_transition" do
      expect(result.success?).to be(false)
      expect(result.error_code).to eq(:invalid_state_transition)
    end
  end
end
