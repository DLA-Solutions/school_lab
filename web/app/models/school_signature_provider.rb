# frozen_string_literal: true

# Where a school's e-signature credentials live. Mirrors `SchoolPaymentProvider`: one active row
# per school, credentials encrypted, and a per-school webhook token so an inbound callback can be
# attributed without trusting its body.
class SchoolSignatureProvider < ApplicationRecord
  # What each provider needs before its configuration may be used. A row that is not complete is
  # not usable at all: the missing piece would otherwise surface as a failure with a real family's
  # contract in flight.
  REQUIRED_CREDENTIALS = {
    "autentique" => %i[api_token],
    "fake" => []
  }.freeze

  belongs_to :school
  belongs_to :uploaded_by, class_name: "User", optional: true

  encrypts :api_token, :webhook_secret

  audited associated_with: :school,
          except: SchoolAuditable::AUDITED_EXCEPT + %w[api_token webhook_secret settings]

  validates :provider, presence: true, inclusion: { in: REQUIRED_CREDENTIALS.keys }
  validate :required_credentials_present

  scope :active, -> { where(active: true) }

  before_validation :ensure_webhook_endpoint_token, on: :create

  def self.find_by_webhook_token!(token)
    active.find_by!(webhook_endpoint_token: token)
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
end
