# frozen_string_literal: true

require "rails_helper"

RSpec.describe People::InviteMembershipNotificationJob do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let(:user) { create(:user, email: "invite@example.com") }
  let(:membership) { create(:membership, :invited, user: user, school: school) }
  let(:raw_token) { "raw-invite-token" }

  around do |example|
    original_token = ENV["POSTMARK_API_TOKEN"]
    ENV["POSTMARK_API_TOKEN"] = "test-token"
    example.run
  ensure
    ENV["POSTMARK_API_TOKEN"] = original_token
  end

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

  it "skips delivery when Postmark is not configured" do
    ENV.delete("POSTMARK_API_TOKEN")

    expect do
      described_class.perform_now(membership.id, raw_token)
    end.not_to have_enqueued_job(ActionMailer::MailDeliveryJob)
  end
end
