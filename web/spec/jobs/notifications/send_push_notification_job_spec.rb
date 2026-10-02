# frozen_string_literal: true

require "rails_helper"

RSpec.describe Notifications::SendPushNotificationJob, type: :job do
  let(:school) { create(:school) }
  let(:user) { create(:user) }
  let(:intent) do
    create(:notification_intent, school: school, payload: { "title" => "Boletim disponível", "body" => "Confira agora" })
  end
  let(:delivery) { create(:notification_delivery, school: school, notification_intent: intent, user: user) }
  let(:gateway) { instance_spy(Gateways::Push::Fake) }

  before do
    allow(Gateways::Push::Registry).to receive(:current).and_return(gateway)
  end

  def device_token_for(user, token: "device-token-1")
    create(:device_token, user: user, token: token)
  end

  it "sends via the gateway to every active device token and marks the delivery sent" do
    device_token_for(user, token: "token-1")
    device_token_for(user, token: "token-2")
    allow(gateway).to receive(:deliver).and_return(Gateways::Push::ValueObjects::DeliveryResult.new(message_id: "m1"))

    described_class.perform_now(delivery.id, school.id)

    expect(delivery.reload).to be_sent
    expect(gateway).to have_received(:deliver)
      .with(token: "token-1", title: "Boletim disponível", body: "Confira agora", data: {}).once
    expect(gateway).to have_received(:deliver)
      .with(token: "token-2", title: "Boletim disponível", body: "Confira agora", data: {}).once
  end

  it "fails the delivery with no_active_device_token when the user has no active device tokens" do
    described_class.perform_now(delivery.id, school.id)

    delivery.reload
    expect(delivery).to be_failed
    expect(delivery.error_code).to eq("no_active_device_token")
    expect(gateway).not_to have_received(:deliver)
  end

  it "discards a token FCM reports as unregistered without aborting the user's other tokens (BR-N09)" do
    dead_token = device_token_for(user, token: "dead-token")
    live_token = device_token_for(user, token: "live-token")

    allow(gateway).to receive(:deliver).with(hash_including(token: "dead-token"))
                                       .and_raise(Gateways::Push::InvalidTokenError, "gone")
    allow(gateway).to receive(:deliver).with(hash_including(token: "live-token"))
                                       .and_return(Gateways::Push::ValueObjects::DeliveryResult.new(message_id: "m1"))

    described_class.perform_now(delivery.id, school.id)

    expect(dead_token.reload).to be_discarded
    expect(live_token.reload).not_to be_discarded
    expect(delivery.reload).to be_sent
  end

  it "fails the delivery when every token turns out to be unregistered" do
    only_token = device_token_for(user, token: "only-token")

    allow(gateway).to receive(:deliver).and_raise(Gateways::Push::InvalidTokenError, "gone")

    described_class.perform_now(delivery.id, school.id)

    expect(only_token.reload).to be_discarded
    delivery.reload
    expect(delivery).to be_failed
    expect(delivery.error_code).to eq("delivery_failed")
  end

  it "is a no-op on a delivery that already resolved (idempotent retry/replay)" do
    device_token_for(user, token: "token-1")
    delivery.deliver!

    described_class.perform_now(delivery.id, school.id)

    expect(gateway).not_to have_received(:deliver)
  end

  it "retries transient gateway failures, leaving the delivery queued for the retry" do
    device_token_for(user, token: "token-1")
    allow(gateway).to receive(:deliver).and_raise(Gateways::Push::TransientError, "provider down")

    expect { described_class.perform_now(delivery.id, school.id) }
      .to have_enqueued_job(described_class)

    expect(delivery.reload).to be_queued
  end
end
