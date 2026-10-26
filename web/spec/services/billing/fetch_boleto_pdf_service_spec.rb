# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::FetchBoletoPdfService do
  subject(:result) { described_class.call(charge: charge, adapter: adapter) }

  let(:school) { create(:school) }
  let(:charge) { create(:charge, school: school) }
  let!(:issuance) do
    create(:charge_issuance, :issued, charge: charge, school: school, provider: "inter",
                                      provider_invoice_id: "inter-req-1")
  end
  let(:pdf_bytes) { "%PDF-1.4\nfake".b }
  let(:adapter) { instance_double(Gateways::BankSlip::Inter::Adapter) }

  before do
    allow(adapter).to receive(:boleto_pdf).with(provider_invoice_id: "inter-req-1").and_return(pdf_bytes)
  end

  it "returns the PDF bytes and a stable filename" do
    expect(result).to be_success
    expect(result.data.content).to eq(pdf_bytes)
    expect(result.data.filename).to eq("boleto-#{charge.id}.pdf")
  end

  it "does not persist the PDF anywhere" do
    expect { result }.not_to(change { [ ActiveStorage::Blob.count, ActiveStorage::Attachment.count ] })
  end

  it "is unavailable while the boleto is not registered at the provider yet" do
    issuance.update!(digitable_line: nil, pix_emv: nil)

    expect(result).to be_failure
    expect(result.error_code).to eq(:boleto_pdf_unavailable)
    expect(adapter).not_to have_received(:boleto_pdf)
  end

  it "is unavailable for a provider that serves a hosted boleto_url (Cora)" do
    issuance.update!(provider: "cora")

    expect(result.error_code).to eq(:boleto_pdf_unavailable)
  end

  it "is unavailable for a paid charge" do
    charge.pay!

    expect(result.error_code).to eq(:boleto_pdf_unavailable)
  end

  it "is unavailable for a cancelled charge" do
    charge.cancel!

    expect(result.error_code).to eq(:boleto_pdf_unavailable)
  end

  it "is unavailable for a discarded charge" do
    charge.discard

    expect(result.error_code).to eq(:boleto_pdf_unavailable)
  end

  it "maps a transient provider failure to boleto_pdf_provider_unavailable" do
    allow(adapter).to receive(:boleto_pdf).and_raise(Gateways::BankSlip::TransientError, "timeout")

    expect(result.error_code).to eq(:boleto_pdf_provider_unavailable)
  end

  it "maps any other provider failure to boleto_pdf_provider_error without leaking details" do
    allow(adapter).to receive(:boleto_pdf)
      .and_raise(Gateways::BankSlip::ProviderError, "Invalid boleto PDF response for 123.456.789-00")

    expect(result.error_code).to eq(:boleto_pdf_provider_error)
    expect(result.details).to be_nil
  end

  context "without an injected adapter" do
    subject(:result) { described_class.call(charge: charge) }

    it "refuses when the school's active provider is not the one that issued the boleto" do
      create(:school_payment_provider, :cora, school: school)

      expect(result.error_code).to eq(:boleto_pdf_unavailable)
    end

    it "refuses when the school has no active provider configuration" do
      expect(result.error_code).to eq(:boleto_pdf_unavailable)
    end

    it "fetches through the issuing provider's adapter when it is still active" do
      create(:school_payment_provider, :inter, school: school)
      allow(Gateways::BankSlip::Registry).to receive(:resolve).with(school: school, provider: "inter")
                                                              .and_return(adapter)

      expect(result).to be_success
    end
  end
end
