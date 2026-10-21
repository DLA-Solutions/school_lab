# frozen_string_literal: true

require "rails_helper"

RSpec.describe Minutes::CancelService do
  let(:school) { create(:school) }
  let!(:config) { create(:school_signature_provider, school: school) }
  let(:actor) { create(:user) }

  it "cancels a draft locally, without asking the provider" do
    entry = create(:minutes_entry, school: school)
    allow(Gateways::Signature::Registry).to receive(:resolve)

    result = described_class.call(entry: entry, actor: actor)

    expect(result).to be_success
    expect(entry.reload).to be_cancelled
    expect(Gateways::Signature::Registry).not_to have_received(:resolve)
  end

  it "withdraws a pending entry from the provider first" do
    entry = create(:minutes_entry, :pending_signature, school: school)
    adapter = instance_double(Gateways::Signature::Fake, cancel_document: true)
    allow(Gateways::Signature::Registry).to receive(:resolve).and_return(adapter)

    result = described_class.call(entry: entry)

    expect(result).to be_success
    expect(adapter).to have_received(:cancel_document).with(provider_document_id: entry.provider_document_id)
    expect(entry.reload).to be_cancelled
  end

  it "leaves a pending entry pending when the provider cannot cancel" do
    entry = create(:minutes_entry, :pending_signature, school: school)
    adapter = instance_double(Gateways::Signature::Fake)
    allow(adapter).to receive(:cancel_document).and_raise(Gateways::Signature::ValidationError, "no")
    allow(Gateways::Signature::Registry).to receive(:resolve).and_return(adapter)

    result = described_class.call(entry: entry)

    expect(result.error_code).to eq(:provider_error)
    expect(entry.reload).to be_pending_signature
  end

  it "leaves a pending entry pending when the school has no active configuration" do
    entry = create(:minutes_entry, :pending_signature, school: school)
    config.update!(active: false)

    result = described_class.call(entry: entry)

    expect(result.error_code).to eq(:provider_error)
    expect(entry.reload).to be_pending_signature
  end

  %i[signed cancelled].each do |state|
    it "refuses a #{state} entry" do
      entry = create(:minutes_entry, state, school: school)

      expect(described_class.call(entry: entry).error_code).to eq(:invalid_state_transition)
    end
  end
end
