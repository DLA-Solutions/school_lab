# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolPaymentProvider, type: :model do
  let(:school) { create(:school) }
  let(:pair) { OpensslCertificateHelper.generate_certificate_pair }

  def build_provider(overrides = {})
    build(:school_payment_provider, school: school,
                                    certificate_pem: pair[:certificate_pem],
                                    private_key_pem: pair[:private_key_pem],
                                    **overrides)
  end

  it "encrypts certificate and private key at rest" do
    provider = build_provider
    provider.save!

    raw = ActiveRecord::Base.connection.select_value(
      "SELECT certificate_pem FROM school_payment_providers WHERE id = #{provider.id}"
    )
    expect(raw).not_to include("BEGIN CERTIFICATE")
    expect(provider.reload.certificate_pem).to include("BEGIN CERTIFICATE")
  end

  it "derives certificate fingerprint from the certificate" do
    provider = build_provider(certificate_fingerprint: "ignored")
    provider.save!

    expected = OpenSSL::Digest::SHA256.hexdigest(pair[:certificate].to_der)
    expect(provider.reload.certificate_fingerprint).to eq(expected)
  end

  it "rejects an expired certificate" do
    expired = OpensslCertificateHelper.expired_certificate_pair
    provider = build_provider(certificate_pem: expired[:certificate_pem],
                                private_key_pem: expired[:private_key_pem])

    expect(provider).not_to be_valid
    expect(provider.errors[:certificate_pem]).to be_present
  end

  it "rejects a private key that does not match the certificate" do
    mismatched = OpensslCertificateHelper.mismatched_key_pair
    provider = build_provider(certificate_pem: mismatched[:certificate_pem],
                              private_key_pem: mismatched[:private_key_pem])

    expect(provider).not_to be_valid
    expect(provider.errors[:private_key_pem]).to be_present
  end

  it "does not store PEM content in audits" do
    provider = build_provider
    provider.save!

    audit_values = provider.audits.flat_map { |audit| audit.audited_changes.values.flatten.compact.join }
    expect(audit_values).not_to include("BEGIN CERTIFICATE")
    expect(audit_values).not_to include("BEGIN RSA PRIVATE KEY")
  end

  it "enforces one active row per school, instrument and environment" do
    create(:school_payment_provider, :active, school: school, environment: "stage",
                                              certificate_pem: pair[:certificate_pem],
                                              private_key_pem: pair[:private_key_pem])
    duplicate = build(:school_payment_provider, :active, school: school, environment: "stage",
                                                           certificate_pem: pair[:certificate_pem],
                                                           private_key_pem: pair[:private_key_pem])

    expect { duplicate.save! }.to raise_error(ActiveRecord::RecordNotUnique)
  end
end
