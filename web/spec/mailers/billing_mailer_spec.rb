# frozen_string_literal: true

require "rails_helper"

RSpec.describe BillingMailer do
  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school, name: "Maria Silva", email: "maria@example.com") }
  let(:student) { create(:student, school: school) }
  let(:billing_plan) { create(:billing_plan, school: school) }
  let(:contract) { create(:contract, school: school, student: student, billing_plan: billing_plan) }
  let(:charge) do
    create(
      :charge,
      school: school,
      contract: contract,
      guardian: guardian,
      due_date: Date.new(2026, 8, 15),
      total_amount_cents: 15_050,
      boleto_url: "https://boleto.example/123",
      pix_copy_paste: "00020126580014BR"
    )
  end

  describe "#collection_reminder" do
    subject(:mail) do
      described_class.with(charge: charge, rule_key: "days_after_due:3").collection_reminder
    end

    it "renders pt-BR content for the financially responsible guardian" do
      expect(mail.to).to eq([ "maria@example.com" ])
      expect(mail.subject).to include("R$ 150,50")
      expect(mail.body.encoded).to include("Maria Silva")
      expect(mail.body.encoded).to include("https://boleto.example/123")
      expect(mail.body.encoded).to include("00020126580014BR")
    end
  end
end
