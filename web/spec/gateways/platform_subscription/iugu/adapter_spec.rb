# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::PlatformSubscription::Iugu::Adapter, :iugu do
  subject(:adapter) { described_class.new(client: client) }

  let(:client) do
    SchoolLab::Integrations::Iugu::Client.new(api_token: "test-token", api_base_url: IUGU_TEST_API_BASE_URL)
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

  it "maps create_checkout_session to customer + subscription and returns secure_url" do
    stub_iugu_api(:post, "/v1/customers", status: 200, body: {
      id: "CUST1", email: account.email, name: account.name, cpf_cnpj: "12345678000190"
    }.to_json, headers: { "Content-Type" => "application/json" })
    stub_iugu_api(:post, "/v1/subscriptions", status: 200, body: {
      id: "SUB1",
      customer_id: "CUST1",
      plan_identifier: "starter_monthly",
      suspended: false,
      recent_invoices: [ { id: "INV1", status: "pending", secure_url: "https://faturas.iugu.com/inv1" } ]
    }.to_json, headers: { "Content-Type" => "application/json" })

    session = adapter.create_checkout_session(
      Gateways::PlatformSubscription::ValueObjects::CheckoutRequest.new(
        account: account,
        catalog_ref: catalog_ref
      )
    )

    expect(session.checkout_url).to eq("https://faturas.iugu.com/inv1")
    expect(session.billing_portal_url).to be_nil
    expect(session.external_subscription_id).to eq("SUB1")
    expect(WebMock).to have_requested(:post, "#{IUGU_TEST_API_BASE_URL}/v1/customers")
    expect(WebMock).to have_requested(:post, "#{IUGU_TEST_API_BASE_URL}/v1/subscriptions")
  end

  it "maps change_plan to the Iugu change_plan path" do
    stub_iugu_api(:post, "/v1/subscriptions/SUB1/change_plan/enterprise_yearly", status: 200, body: {
      id: "SUB1", customer_id: "CUST1", plan_identifier: "enterprise_yearly", suspended: false
    }.to_json, headers: { "Content-Type" => "application/json" })

    remote = adapter.change_plan(
      external_subscription_id: "SUB1",
      catalog_ref: Gateways::PlatformSubscription::ValueObjects::CatalogRef.new(
        plan_key: "enterprise",
        billing_interval: "year",
        external_price_id: "enterprise_yearly"
      )
    )

    expect(remote.plan_identifier).to eq("enterprise_yearly")
  end
end
