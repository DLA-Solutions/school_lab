# frozen_string_literal: true

require "rails_helper"

RSpec.describe People::InviteMembershipNotificationJob do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let(:user) { create(:user, email: "invite@example.com") }
  let(:membership) { create(:membership, :invited, user: user, school: school) }
  let(:raw_token) { "raw-invite-token" }

  it "queues the membership invite mail when e-mail delivery is configured" do
    expect do
      described_class.perform_now(membership.id, raw_token)
    end.to have_enqueued_job(ActionMailer::MailDeliveryJob)
  end

  it "does nothing when the token is blank" do
    expect do
      described_class.perform_now(membership.id, nil)
    end.not_to have_enqueued_job(ActionMailer::MailDeliveryJob)
  end

  it "skips delivery when e-mail delivery is not configured" do
    allow(SchoolLab::EmailDelivery).to receive(:configured?).and_return(false)

    expect do
      described_class.perform_now(membership.id, raw_token)
    end.not_to have_enqueued_job(ActionMailer::MailDeliveryJob)
  end
end
