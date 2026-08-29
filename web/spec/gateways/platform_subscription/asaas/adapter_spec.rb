# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::PlatformSubscription::Asaas::Adapter, :asaas do
  subject(:adapter) { described_class.new(client: client) }

  let(:client) do
    SchoolLab::Integrations::Asaas::Client.new(api_token: "test-token", api_base_url: ASAAS_TEST_API_BASE_URL)
  end

  it_behaves_like "a platform subscription adapter"

  let(:account) do
    Gateways::PlatformSubscription::ValueObjects::BillingAccount.new(
      name: "Escola Exemplo",
      email: "diretor@example.com",
      document_number: "12.345.678/0001-90"
    )
  end

  let(:catalog_ref) do
    Gateways::PlatformSubscription::ValueObjects::CatalogRef.new(
      plan_key: "starter",
      billing_interval: "month",
      external_price_id: "starter_monthly",
      amount_cents: 29_900
    )
  end

  it "maps create_checkout_session to customer + subscription and returns invoiceUrl" do
    stub_asaas_api(:post, "/v3/customers", status: 200, body: {
      id: "cus_1", email: account.email, name: account.name, cpfCnpj: "12345678000190"
    }.to_json, headers: { "Content-Type" => "application/json" })
    stub_asaas_api(:post, "/v3/subscriptions", status: 200, body: {
      id: "sub_1",
      customer: "cus_1",
      externalReference: "starter_monthly",
      status: "ACTIVE",
      dateCreated: "2026-08-19",
      nextDueDate: "2026-09-19"
    }.to_json, headers: { "Content-Type" => "application/json" })
    stub_asaas_api(:get, "/v3/subscriptions/sub_1/payments", query: { limit: "1" }, status: 200, body: {
      data: [
        {
          id: "pay_1",
          subscription: "sub_1",
          status: "PENDING",
          value: 299.0,
          dueDate: "2026-09-19",
          invoiceUrl: "https://asaas.test/i/pay_1"
        }
      ]
    }.to_json, headers: { "Content-Type" => "application/json" })

    session = adapter.create_checkout_session(
      Gateways::PlatformSubscription::ValueObjects::CheckoutRequest.new(
        account: account,
        catalog_ref: catalog_ref
      )
    )

    expect(session.checkout_url).to eq("https://asaas.test/i/pay_1")
    expect(session.billing_portal_url).to be_nil
    expect(session.external_subscription_id).to eq("sub_1")
    expect(WebMock).to have_requested(:post, "#{ASAAS_TEST_API_BASE_URL}/v3/customers")
    expect(WebMock).to have_requested(:post, "#{ASAAS_TEST_API_BASE_URL}/v3/subscriptions")
  end

  it "maps change_plan to the Asaas update subscription endpoint" do
    stub_asaas_api(:put, "/v3/subscriptions/sub_1", status: 200, body: {
      id: "sub_1", customer: "cus_1", externalReference: "enterprise_yearly", status: "ACTIVE"
    }.to_json, headers: { "Content-Type" => "application/json" })
    stub_asaas_api(:get, "/v3/subscriptions/sub_1/payments", query: { limit: "1" }, status: 200, body: { data: [] }.to_json,
                   headers: { "Content-Type" => "application/json" })

    remote = adapter.change_plan(
      external_subscription_id: "sub_1",
      catalog_ref: Gateways::PlatformSubscription::ValueObjects::CatalogRef.new(
        plan_key: "enterprise",
        billing_interval: "year",
        external_price_id: "enterprise_yearly",
        amount_cents: 1_234_500
      )
    )

    expect(remote.plan_identifier).to eq("enterprise_yearly")
  end
end
