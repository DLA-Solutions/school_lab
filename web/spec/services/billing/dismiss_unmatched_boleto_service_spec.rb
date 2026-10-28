# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::DismissUnmatchedBoletoService do
  let(:school) { create(:school) }
  let(:actor) { create(:user) }

  it "marks the boleto dismissed and creates no charge" do
    boleto = create(:unmatched_boleto, school: school)

    result = described_class.call(unmatched_boleto: boleto, actor: actor)

    expect(result).to be_success
    expect(result.data.status).to eq("dismissed")
    expect(result.data.resolved_at).to be_present
    expect(result.data.resolved_by).to eq(actor)
    expect(result.data.charge).to be_nil
    expect(Charge.count).to eq(0)
  end

  it "fails with invalid_state_transition when the boleto is already resolved" do
    boleto = create(:unmatched_boleto, :resolved, school: school)

    result = described_class.call(unmatched_boleto: boleto, actor: actor)

    expect(result).to be_failure
    expect(result.error_code).to eq(:invalid_state_transition)
  end

  it "fails with invalid_state_transition when the boleto is already dismissed" do
    boleto = create(:unmatched_boleto, :dismissed, school: school)

    result = described_class.call(unmatched_boleto: boleto, actor: actor)

    expect(result).to be_failure
    expect(result.error_code).to eq(:invalid_state_transition)
  end
end
