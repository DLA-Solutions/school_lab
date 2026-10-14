# frozen_string_literal: true

# A prospect (lead) the school is tracking before any enrollment exists. Deliberately separate from
# `Guardian`/`Student`: a prospect has no consent record and no child record, so it must never be
# read as, or promoted silently into, either of them.
#
# Contact details and notes are personal data (LGPD) — see docs/open-questions.md ("CRM contacts").
class CrmContact < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  # How warm the lead is. A plain classification with no transition rules, so no state machine.
  TEMPERATURES = %w[cold warm hot].freeze

  belongs_to :school

  validates :name, presence: true
  validates :temperature, inclusion: { in: TEMPERATURES }
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, allow_blank: true

  before_validation :normalize_blank_contact_fields

  scope :ordered, -> { order(:name, :id) }
  scope :with_temperature, ->(value) { where(temperature: value) }

  # Case-insensitive match over name, email and phone.
  scope :search, lambda { |term|
    pattern = "%#{sanitize_sql_like(term.to_s.strip)}%"
    where("crm_contacts.name ILIKE :q OR crm_contacts.email ILIKE :q OR crm_contacts.phone ILIKE :q", q: pattern)
  }

  private

  def normalize_blank_contact_fields
    self.name = name.to_s.strip.presence
    self.email = email.to_s.strip.downcase.presence
    self.phone = phone.to_s.strip.presence
    self.notes = notes.to_s.strip.presence
  end
end
