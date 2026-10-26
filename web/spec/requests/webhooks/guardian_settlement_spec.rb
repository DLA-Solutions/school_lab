# frozen_string_literal: true

require "rails_helper"

# Closes the loop the guardian cares about: the bank confirms a boleto, the webhook settles it,
# and "Meus boletos" shows it as paid ("dar baixa") without any manual step.
RSpec.describe "Webhook settlement as seen by the guardian", type: :request do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let(:pair) { OpensslCertificateHelper.generate_certificate_pair }
  let!(:config) do
    create(:school_payment_provider, school: school, provider: "fake",
                                     certificate_pem: pair[:certificate_pem],
                                     private_key_pem: pair[:private_key_pem])
  end
  let(:guardian_user) { create(:user) }
  let!(:membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:guardian) { create(:guardian, school: school, user: guardian_user) }
  let(:student) { create(:student, school: school) }
  let!(:link) { create(:student_guardian, school: school, student: student, guardian: guardian) }
  let(:contract) { create(:contract, school: school, student: student, billing_plan: create(:billing_plan, school: school)) }
  let!(:charge) { create(:charge, :issued, school: school, contract: contract, guardian: guardian) }
  let(:issuance) { charge.current_issuance }
  let(:adapter) { Gateways::BankSlip::Fake.new(school: school) }
  let(:charges_path) { "/api/v1/schools/#{school.id}/me/charges" }
  let(:headers) { auth_headers_for(guardian_user) }
  let(:bank_paid_at) { 3.hours.ago.change(usec: 0) }

  before do
    # The fake adapter keeps invoices in memory, so the registry hands back one we control.
    adapter.seed_open_invoice!(issuance: issuance, charge: charge)
    allow(Gateways::BankSlip::Registry).to receive(:resolve).and_return(adapter)
  end

  def post_payment_event(event_id)
    post "/webhooks/fake/#{config.webhook_endpoint_token}",
         params: { event_id: event_id, event_type: "payment.confirmed",
                   provider_invoice_id: issuance.provider_invoice_id }.to_json,
         headers: { "CONTENT_TYPE" => "application/json" }
    expect(response).to have_http_status(:ok)
    perform_enqueued_jobs
  end

  def listed(status: "all")
    get charges_path, params: { status: status }, headers: headers
    JSON.parse(response.body).fetch("data").find { |row| row["id"] == charge.id }
  end

  it "flips a pending boleto to paid in the unified list with the bank's payment time" do
    expect(listed).to include("status" => "pending", "paid_at" => nil)

    adapter.settle_invoice!(provider_invoice_id: issuance.provider_invoice_id, paid_at: bank_paid_at)
    post_payment_event("evt-settle-1")

    row = listed
    expect(row["status"]).to eq("paid")
    expect(Time.zone.parse(row["paid_at"])).to eq(bank_paid_at)
    expect(Payment.where(charge: charge).count).to eq(1)

    get charges_path, headers: headers
    expect(JSON.parse(response.body).fetch("data")).to be_empty
  end

  it "settles an overdue boleto too" do
    charge.update!(due_date: Date.new(2020, 1, 10))
    charge.mark_overdue!
    expect(listed["status"]).to eq("overdue")

    adapter.settle_invoice!(provider_invoice_id: issuance.provider_invoice_id, paid_at: bank_paid_at)
    post_payment_event("evt-settle-overdue")

    expect(listed["status"]).to eq("paid")
  end

  it "stays paid and unchanged when the bank repeats the notification" do
    adapter.settle_invoice!(provider_invoice_id: issuance.provider_invoice_id, paid_at: bank_paid_at)
    post_payment_event("evt-settle-1")
    first_paid_at = listed["paid_at"]

    post_payment_event("evt-settle-1")
    post_payment_event("evt-settle-2")

    expect(listed).to include("status" => "paid", "paid_at" => first_paid_at)
    expect(Payment.where(charge: charge).count).to eq(1)
  end

  it "does not let the daily overdue sweep touch a settled boleto" do
    charge.update!(due_date: Date.new(2020, 1, 10))
    adapter.settle_invoice!(provider_invoice_id: issuance.provider_invoice_id, paid_at: bank_paid_at)
    post_payment_event("evt-settle-1")

    Billing::MarkOverdueChargesService.call(school: school, as_of: Date.new(2026, 1, 1))

    expect(listed["status"]).to eq("paid")
  end
end
