# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::TaxDeclarations::EnsureGeneratedService do
  include ActiveSupport::Testing::TimeHelpers

  let(:school) { create(:school, cnpj: "66.154.330/0001-40") }
  let(:guardian) { create(:guardian, school: school) }
  let(:student) { create(:student, school: school) }
  let!(:signatory) { create(:document_signatory, school: school) }
  let!(:tuition_purpose) { create(:billing_purpose, :tuition, :eligible, school: school) }
  let(:calendar_year) { 2025 }

  before do
    BillingPurpose.provision_defaults!(school)
    digest = Billing::PurposeConfigurationDigest.compute(school.billing_purposes.kept.ordered)
    TaxDeclarationSetting.for(school).update!(
      legal_text: "Annual declaration.",
      legal_text_version: "2026-01",
      document_signatory: signatory,
      legal_accounting_approved_at: Time.current,
      approved_by: create(:user),
      approved_purpose_configuration_digest: digest
    )

    charge = create(:charge, school: school, guardian: guardian, contract: create(:contract, school: school, student: student))
    Billing::ApplyChargeClassificationService.call(charge: charge, billing_purpose: tuition_purpose)
    charge.save!
    create(
      :payment,
      school: school,
      charge: charge,
      paid_amount_cents: 100_000,
      paid_at: Time.zone.parse("2025-05-01 12:00:00")
    )
  end

  around do |example|
    travel_to Time.zone.parse("2026-02-01 12:00:00") do
      example.run
    end
  end

  it "creates aggregate, version, items, and PDF blob" do
    result = described_class.call(school: school, guardian: guardian, calendar_year: calendar_year)

    expect(result).to be_success
    expect(result.data.created).to be(true)
    declaration = result.data.declaration
    version = result.data.version
    expect(declaration.tax_declaration_versions.count).to eq(1)
    expect(version.tax_declaration_items.count).to eq(1)
    expect(ActiveStorage::Blob.find_by(key: version.pdf_storage_key)).to be_present
  end

  it "returns existing version when digest is unchanged" do
    first = described_class.call(school: school, guardian: guardian, calendar_year: calendar_year)
    second = described_class.call(school: school, guardian: guardian, calendar_year: calendar_year)

    expect(first.data.version.id).to eq(second.data.version.id)
    expect(second.data.created).to be(false)
    expect(TaxDeclarationVersion.count).to eq(1)
  end

  it "creates a superseding version when payment totals change" do
    described_class.call(school: school, guardian: guardian, calendar_year: calendar_year)

    charge = create(:charge, school: school, guardian: guardian, contract: create(:contract, school: school, student: student), billing_period: Date.new(2025, 7, 1))
    Billing::ApplyChargeClassificationService.call(charge: charge, billing_purpose: tuition_purpose)
    charge.save!
    create(:payment, school: school, charge: charge, paid_amount_cents: 50_000, paid_at: Time.zone.parse("2025-09-01 12:00:00"))

    second = described_class.call(school: school, guardian: guardian, calendar_year: calendar_year)

    expect(second.data.created).to be(true)
    expect(second.data.version.version).to eq(2)
    expect(second.data.version.supersedes_id).to be_present
    expect(second.data.version.lifecycle).to eq("active")
  end
end
