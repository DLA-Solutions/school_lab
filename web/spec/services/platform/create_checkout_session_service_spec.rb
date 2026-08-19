# frozen_string_literal: true

require "rails_helper"

RSpec.describe Platform::CreateCheckoutSessionService do
  let(:school) { create(:school, cnpj: "12.345.678/0001-90") }
  let(:director) { create(:user) }
  let!(:membership) { create_owner_membership(school, user: director) }
  let!(:plan) { PlatformPlan.find_or_create_by!(key: "pro") { |row| row.name = "Pro"; row.monthly_amount_cents = 59_900 } }
  let(:adapter) { Gateways::PlatformSubscription::Fake.new }
  let(:settings) { PlatformBillingSetting.instance }

  before do
    settings.update!(active_provider: "iugu")
    ensure_platform_plan_prices(plan)
  end

  it "returns checkout_url using the Fake adapter and does not read IUGU_API_TOKEN" do
    expect(ENV["IUGU_API_TOKEN"]).to be_blank

    result = described_class.call(
      school: school,
      actor: director,
      params: { plan_key: "pro", billing_interval: "month", school_scoped: true },
      adapter: adapter
    )

    expect(result).to be_success
    expect(result.data[:session].checkout_url).to be_present
    expect(result.data[:session].billing_portal_url).to be_nil
    expect(result.data[:subscription].provider).to eq("iugu")
    expect(result.data[:subscription].external_subscription_id).to be_present
  end

  it "returns validation_error when CNPJ is blank" do
    school.update!(cnpj: nil)

    result = described_class.call(
      school: school,
      actor: director,
      params: { plan_key: "pro", billing_interval: "month" },
      adapter: adapter
    )

    expect(result).to be_failure
    expect(result.error_code).to eq(:validation_error)
  end

  it "returns invalid_state_transition when a kept manual subscription exists" do
    create(:platform_subscription, school: school, platform_plan: plan, provider: "manual")

    result = described_class.call(
      school: school,
      actor: director,
      params: { plan_key: "pro", billing_interval: "month", school_scoped: true },
      adapter: adapter
    )

    expect(result.error_code).to eq(:invalid_state_transition)
  end

  it "returns not_implemented when the adapter cannot host checkout" do
    result = described_class.call(
      school: school,
      actor: director,
      params: { plan_key: "pro", billing_interval: "month" },
      adapter: Gateways::PlatformSubscription::Manual.new
    )

    expect(result.error_code).to eq(:not_implemented)
  end
end
