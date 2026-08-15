# frozen_string_literal: true

require "rails_helper"

RSpec.describe People::SendGuardianAccessService do
  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school, email: "mae@example.com") }

  def deliveries
    ActionMailer::Base.deliveries
  end

  before { deliveries.clear }

  # The rows a school types in carry no account at all, which is why the button has to provision
  # one rather than assume it is there.
  describe "a guardian who has never been here" do
    it "gives them a user, a guardian membership and an invitation" do
      expect { described_class.call(guardian: guardian) }
        .to change(User, :count).by(1)
        .and change(Membership, :count).by(1)

      membership = school.memberships.last
      expect(membership.role).to eq("guardian")
      expect(membership.status).to eq("invited")
      expect(membership.user.email).to eq("mae@example.com")
    end

    it "links the account back to the guardian record" do
      described_class.call(guardian: guardian)

      expect(guardian.reload.user.email).to eq("mae@example.com")
    end

    # Devise's `confirmable` is on: an unconfirmed account cannot sign in, and reaching the link
    # in their inbox already proves the address.
    it "leaves the account able to sign in once a password is set" do
      described_class.call(guardian: guardian)

      expect(User.find_by(email: "mae@example.com").confirmed_at).to be_present
    end

    it "issues an invite token that the accept flow will honour" do
      described_class.call(guardian: guardian)

      expect(MembershipInviteToken.active.count).to eq(1)
    end
  end

  describe "pressing the button twice" do
    it "does not create a second user or membership" do
      described_class.call(guardian: guardian)

      expect { described_class.call(guardian: guardian) }.not_to change(User, :count)
      expect { described_class.call(guardian: guardian) }.not_to change(Membership, :count)
    end

    # Asking someone who already has an account to "accept an invitation" reads as a mistake, and
    # the invite token would activate a membership that is already active.
    it "sends a reset once the guardian has an account in use" do
      described_class.call(guardian: guardian)
      membership = school.memberships.last
      membership.user.update!(password: "SenhaAtual123!", password_confirmation: "SenhaAtual123!")
      membership.update!(status: "active")

      described_class.call(guardian: guardian)

      expect(membership.user.reload.reset_password_token).to be_present
    end
  end

  # A parent who is also a member of staff is one person with one way in.
  it "joins an address that already belongs to somebody rather than shadowing it" do
    existing = create(:user, email: "mae@example.com")

    expect { described_class.call(guardian: guardian) }.not_to change(User, :count)
    expect(guardian.reload.user_id).to eq(existing.id)
  end

  describe "when it cannot be sent" do
    it "says so for a guardian with no address" do
      # The column allows it even though the form does not, and rows imported before the rule
      # still have to reach this refusal rather than a crash.
      guardian.update_column(:email, nil)

      result = described_class.call(guardian: guardian.reload)

      expect(result).to be_failure
      expect(result.details[:email]).to be_present
    end

    it "refuses a guardian who is no longer active" do
      guardian.discard

      result = described_class.call(guardian: guardian)

      expect(result).to be_failure
      expect(User.count).to eq(0)
    end
  end
end
