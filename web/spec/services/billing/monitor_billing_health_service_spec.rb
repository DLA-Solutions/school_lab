# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::MonitorBillingHealthService do
  include ActiveSupport::Testing::TimeHelpers

  let(:school) { create(:school) }
  let(:pair) { OpensslCertificateHelper.generate_certificate_pair(not_after: 30.days.from_now) }
  let!(:config) do
    create(:school_payment_provider,
           school: school,
           provider: "cora",
           certificate_pem: pair[:certificate_pem],
           private_key_pem: pair[:private_key_pem])
  end

  it "alerts at the 30-day certificate threshold" do
    expect(Rails.logger).to receive(:warn).with(include("billing.alert.certificate_expiry"))

    described_class.call(school: school, as_of: Time.current)
  end

  it "does not alert when the certificate is far from expiry" do
    long_lived = OpensslCertificateHelper.generate_certificate_pair(not_after: 45.days.from_now)
    config.update!(
      certificate_pem: long_lived[:certificate_pem],
      private_key_pem: long_lived[:private_key_pem]
    )

    expect(Rails.logger).not_to receive(:warn).with(include("billing.alert.certificate_expiry"))

    described_class.call(school: school, as_of: Time.current)
  end

  it "does not repeat alerts for thresholds already crossed" do
    config.update!(settings: { "certificate_alert_thresholds_sent" => [ 30 ] })

    expect(Rails.logger).not_to receive(:warn).with(include("billing.alert.certificate_expiry"))

    described_class.call(school: school, as_of: Time.current)
  end

  it "alerts again when the next threshold is crossed" do
    seven_day_pair = OpensslCertificateHelper.generate_certificate_pair(not_after: 7.days.from_now)
    config.update!(
      certificate_pem: seven_day_pair[:certificate_pem],
      private_key_pem: seven_day_pair[:private_key_pem],
      settings: { "certificate_alert_thresholds_sent" => [ 30 ] }
    )

    expect(Rails.logger).to receive(:warn).with(include("billing.alert.certificate_expiry"))

    described_class.call(school: school, as_of: Time.current)
  end

  it "marks expired certificates as an outage" do
    config.update_columns(certificate_expires_at: 1.day.ago)

    expect(Rails.logger).to receive(:error).with(include('"severity":"outage"'))

    described_class.call(school: school, as_of: Time.current)
  end

  it "alerts on permanent issuance failures without personal data" do
    config.update!(settings: { "certificate_alert_thresholds_sent" => [ 30 ] })
    charge = create(:charge, school: school)
    create(:charge_issuance, :failed, charge: charge, school: school, last_error: "CPF 123.456.789-00 invalid")

    expect(Rails.logger).to receive(:warn).with(include("billing.alert.issuance_failure").and(include("[CPF]")))

    described_class.call(school: school)
  end

  it "reports unissued charges using the shared detection helper" do
    config.update!(settings: { "certificate_alert_thresholds_sent" => [ 30 ] })
    failed_charge = create(:charge, school: school, due_date: 3.days.from_now.to_date)
    create(:charge_issuance, :failed, charge: failed_charge, school: school)
    create(:charge, school: school, due_date: 2.days.from_now.to_date)

    expect(Billing::UnissuedCharges.for(school, due_within: 3.days).fetch(:never_attempted).size).to eq(1)

    allow(Rails.logger).to receive(:warn)

    described_class.call(school: school)

    expect(Rails.logger).to have_received(:warn).with(include("billing.alert.unissued_charges"))
  end

  it "alerts on charges whose issuance is stuck pending" do
    config.update!(settings: { "certificate_alert_thresholds_sent" => [ 30 ] })
    stuck_charge = create(:charge, school: school, due_date: 2.days.from_now.to_date)
    create(:charge_issuance, charge: stuck_charge, school: school)

    allow(Rails.logger).to receive(:warn)

    described_class.call(school: school)

    expect(Rails.logger).to have_received(:warn)
      .with(include("billing.alert.unissued_charges").and(include('"stuck_pending_count":1')))
  end

  it "continues evaluating other schools when one raises" do
    config.update!(settings: { "certificate_alert_thresholds_sent" => [ 30, 7, 1, 0 ] })
    school_two = create(:school)
    seven_day_pair = OpensslCertificateHelper.generate_certificate_pair(not_after: 7.days.from_now)
    create(:school_payment_provider,
           school: school_two,
           provider: "cora",
           certificate_pem: seven_day_pair[:certificate_pem],
           private_key_pem: seven_day_pair[:private_key_pem])

    allow(Billing::UnissuedCharges).to receive(:for).and_wrap_original do |method, current_school, **kwargs|
      raise StandardError, "boom" if current_school.id == school.id

      method.call(current_school, **kwargs)
    end

    allow(Rails.logger).to receive(:warn)
    allow(Rails.logger).to receive(:error)

    described_class.call(as_of: Time.current)

    expect(Rails.logger).to have_received(:error).with(include("billing.alert.evaluation_failure")).once
    expect(Rails.logger).to have_received(:warn).with(include("billing.alert.certificate_expiry")).once
  end
end
