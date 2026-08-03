# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolBillingSettings, type: :model do
  subject(:settings) { build(:school_billing_settings, school: school) }

  let(:school) { create(:school) }

  it "requires a school" do
    settings.school = nil
    expect(settings).not_to be_valid
  end

  it "rejects overdue_grace_days above the maximum" do
    settings.overdue_grace_days = 31

    expect(settings).not_to be_valid
    expect(settings.errors[:overdue_grace_days]).to be_present
  end

  it "rejects duplicate school_id" do
    create(:school_billing_settings, school: school)
    duplicate = build(:school_billing_settings, school: school)

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:school_id]).to be_present
  end

  it "rejects service descriptions longer than 100 characters" do
    settings.service_description = "a" * 101

    expect(settings).not_to be_valid
    expect(settings.errors[:service_description]).to be_present
  end

  it "accepts a service description within the limit" do
    settings.service_description = "Mensalidade"

    expect(settings).to be_valid
  end

  it "rejects interest_rate_percent above the maximum" do
    settings.interest_rate_percent = 100.01

    expect(settings).not_to be_valid
    expect(settings.errors[:interest_rate_percent]).to be_present
  end

  it "rejects zero interest_rate_percent" do
    settings.interest_rate_percent = 0

    expect(settings).not_to be_valid
    expect(settings.errors[:interest_rate_percent]).to be_present
  end

  it "allows nil interest_rate_percent" do
    settings.interest_rate_percent = nil

    expect(settings).to be_valid
  end
end

RSpec.describe Billing::SchoolSettings do
  let(:school) { create(:school) }

  it "returns defaults when no row exists" do
    settings = described_class.for(school)

    expect(settings.overdue_grace_days).to eq(3)
    expect(settings.service_description).to eq(I18n.t("billing.settings.default_service_description"))
    expect(settings.notification_schedule["reminders"]).to be_present
    expect(settings.persisted).to be(false)
  end

  it "computes grace cutoff from settings" do
    settings = described_class.for(school)

    expect(settings.overdue_grace_cutoff(as_of: Date.new(2026, 8, 10))).to eq(Date.new(2026, 8, 7))
  end

  it "reports when interest rate is not configured" do
    settings = described_class.for(school)

    expect(settings.interest_rate_percent).to be_nil
    expect(settings.interest_rate_configured?).to be(false)
  end

  it "reports configured interest rate from persisted settings" do
    create(:school_billing_settings, :issuance_ready, school: school)
    settings = described_class.for(school)

    expect(settings.interest_rate_percent).to eq(BigDecimal("1.0"))
    expect(settings.interest_rate_configured?).to be(true)
  end
end
