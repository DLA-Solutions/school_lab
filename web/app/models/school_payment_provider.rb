# frozen_string_literal: true

class SchoolPaymentProvider < ApplicationRecord
  INSTRUMENTS = %w[bank_slip service_invoice].freeze

  # What each provider needs before its configuration may be used to issue. A row that is not
  # complete is not selectable at all: the missing piece would otherwise surface as a failure
  # against the bank with a real family's charge in flight. Keys are the registered providers —
  # `fake` legitimately has no credentials.
  REQUIRED_CREDENTIALS = {
    "cora" => %i[client_id certificate_pem private_key_pem],
    "fake" => [],
    "spedy" => %i[api_key],
    "inter" => %i[client_id client_secret certificate_pem private_key_pem]
  }.freeze

  belongs_to :school
  belongs_to :uploaded_by, class_name: "User", optional: true

  encrypts :certificate_pem, :private_key_pem, :api_key, :client_secret

  audited associated_with: :school,
          except: SchoolAuditable::AUDITED_EXCEPT + %w[certificate_pem private_key_pem api_key client_secret settings]

  validates :instrument, inclusion: { in: INSTRUMENTS }
  validates :provider, presence: true, inclusion: { in: REQUIRED_CREDENTIALS.keys }
  validate :required_credentials_present
  validate :certificate_and_key_valid, if: -> { certificate_pem.present? || private_key_pem.present? }

  before_validation :derive_certificate_metadata, if: -> { certificate_pem.present? }

  scope :active, -> { where(active: true) }

  store_accessor :settings, :spedy_company_id

  before_validation :ensure_webhook_endpoint_token, on: :create

  def self.find_by_webhook_token!(provider:, token:)
    active.find_by!(provider: provider, webhook_endpoint_token: token)
  end

  private

  def ensure_webhook_endpoint_token
    self.webhook_endpoint_token ||= SecureRandom.urlsafe_base64(32)
  end

  def required_credentials_present
    REQUIRED_CREDENTIALS.fetch(provider, []).each do |field|
      errors.add(field, :blank) if public_send(field).blank?
    end
  end

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
