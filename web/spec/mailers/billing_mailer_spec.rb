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

    it "targets the financially responsible guardian with the Postmark template payload" do
      model = template_model_for(mail)

      expect(mail.to).to eq([ "maria@example.com" ])
      expect(mail.subject).to include("R$ 150,50")
      expect(template_alias_for(mail)).to eq(Gateways::Email::Templates::COLLECTION_REMINDER)
      expect(template_tag_for(mail)).to eq("billing-collection-reminder")
      expect(model).to include(
        guardian_name: "Maria Silva",
        amount: "R$ 150,50",
        due_date: "15/08/2026",
        boleto_url: "https://boleto.example/123",
        pix_code: "00020126580014BR",
        has_boleto: true,
        has_pix: true
      )
    end
  end
end
