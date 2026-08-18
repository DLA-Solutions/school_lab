# frozen_string_literal: true

# Where a collaborator's salary is sent: a pix key, or a branch and account at a named bank.
#
# One standing record per collaborator rather than a history — the school pays into the account
# that is current, and a ledger of every account somebody ever gave would only make it harder to
# see which one that is.
#
# Deliberately not `SchoolAuditable`: the audit trail keeps a copy of every value it sees, and a
# table of past pix keys and account numbers is exactly the thing this record encrypts to avoid.
# `updated_by` carries the attribution the audit would otherwise have given.
class TeacherBankAccount < ApplicationRecord
  # A pix key and an account number identify a person to a bank; they are read back only to the
  # few people who send the money.
  encrypts :pix_key, :account_number

  MAX_PIX_KEY_LENGTH = 140
  MAX_BANK_NAME_LENGTH = 120
  MAX_AGENCY_LENGTH = 20
  MAX_ACCOUNT_NUMBER_LENGTH = 30

  belongs_to :school
  belongs_to :teacher
  belongs_to :updated_by, class_name: "User", optional: true

  before_validation :normalize

  validates :teacher_id, uniqueness: true
  validates :pix_key, length: { maximum: MAX_PIX_KEY_LENGTH }
  validates :bank_name, length: { maximum: MAX_BANK_NAME_LENGTH }
  validates :agency, length: { maximum: MAX_AGENCY_LENGTH }
  validates :account_number, length: { maximum: MAX_ACCOUNT_NUMBER_LENGTH }
  validate :one_route_at_least
  validate :account_is_complete

  # The account details are optional next to the pix key, but half of them is not a route to
  # anywhere: a payer given a branch and no account number cannot send anything.
  def account?
    agency.present? || account_number.present?
  end

  # Blank until somebody fills it in, which is the state the school most needs to see: an
  # unfilled record is a collaborator who cannot be paid yet.
  def filled?
    pix_key.present? || account?
  end

  def write!(attributes, actor:)
    assign_attributes(attributes)
    self.updated_by = actor
    save!
  end

  private

  def normalize
    self.pix_key = pix_key.to_s.strip.presence
    self.bank_name = bank_name.to_s.strip.presence
    self.agency = agency.to_s.strip.presence
    self.account_number = account_number.to_s.strip.presence
  end

  # An empty record is how one starts, so emptiness is only refused once somebody tries to save a
  # form with nothing in it — otherwise the school would be told it must pay a collaborator it
  # has not decided how to pay yet.
  def one_route_at_least
    return if filled?

    errors.add(:base, :no_payment_route)
  end

  def account_is_complete
    return unless account?

    errors.add(:agency, :blank) if agency.blank?
    errors.add(:account_number, :blank) if account_number.blank?
    # Two accounts of the same digits at different banks are different accounts; without the bank
    # the transfer has nowhere to go.
    errors.add(:bank_name, :blank) if bank_name.blank?
  end
end
