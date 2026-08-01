# frozen_string_literal: true

class SchoolPaymentProvider < ApplicationRecord
  INSTRUMENTS = %w[bank_slip].freeze
  ENVIRONMENTS = %w[stage production].freeze

  belongs_to :school
  belongs_to :uploaded_by, class_name: "User", optional: true

  encrypts :certificate_pem, :private_key_pem

  audited associated_with: :school,
          except: SchoolAuditable::AUDITED_EXCEPT + %w[certificate_pem private_key_pem settings]

  validates :instrument, inclusion: { in: INSTRUMENTS }
  validates :provider, :environment, presence: true
  validates :environment, inclusion: { in: ENVIRONMENTS }
  validate :certificate_and_key_valid, if: -> { certificate_pem.present? || private_key_pem.present? }

  before_validation :derive_certificate_metadata, if: -> { certificate_pem.present? }

  scope :active, -> { where(active: true) }

  private

  def derive_certificate_metadata
    cert = parsed_certificate
    return unless cert

    self.certificate_fingerprint = OpenSSL::Digest::SHA256.hexdigest(cert.to_der)
    self.certificate_expires_at = cert.not_after
  end

  def certificate_and_key_valid
    cert = parsed_certificate
    if cert.nil?
      errors.add(:certificate_pem, :invalid)
      return
    end

    if cert.not_after <= Time.current
      errors.add(:certificate_pem, :expired)
      return
    end

    key = parsed_private_key
    if key.nil?
      errors.add(:private_key_pem, :invalid)
      return
    end

    return if cert.check_private_key(key)

    errors.add(:private_key_pem, :mismatch)
  end

  def parsed_certificate
    OpenSSL::X509::Certificate.new(certificate_pem)
  rescue OpenSSL::X509::CertificateError
    nil
  end

  def parsed_private_key
    OpenSSL::PKey.read(private_key_pem)
  rescue OpenSSL::PKey::PKeyError
    nil
  end
end
