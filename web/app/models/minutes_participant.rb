# frozen_string_literal: true

# A person involved in an ata (BR-LA04), recorded as a snapshot so the minutes survive later
# changes to the person. The membership / guardian / student links are informational only.
#
# Participants flagged `signs` become signers at the e-signature provider; their e-mail and CPF are
# checked when the entry is sent (naming the person), not here, so a draft can be saved
# incomplete. Students never sign. `cpf` is LGPD-sensitive (BR-LA09): redacted from audits and
# masked in API output.
class MinutesParticipant < ApplicationRecord
  AUDIT_REDACTED = %w[cpf].freeze

  include SchoolAuditable

  belongs_to :school
  belongs_to :minutes_entry
  belongs_to :membership, optional: true
  belongs_to :guardian, optional: true
  belongs_to :student, optional: true

  before_validation :normalize_fields

  validates :name, presence: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, allow_blank: true
  validate :cpf_is_valid
  validate :students_never_sign
  validate :links_belong_to_school

  # "123.456.789-09" => "***.456.789-**": enough to recognise the document, not to use it.
  def masked_cpf
    return if cpf.blank?

    "***.#{cpf[3, 3]}.#{cpf[6, 3]}-**"
  end

  # Whether this person can be handed to the provider as a signer.
  def signer_ready?
    email.present? && cpf.present?
  end

  private

  def normalize_fields
    self.name = name.to_s.squish.presence
    self.role_label = role_label.to_s.squish.presence
    self.email = email.to_s.strip.downcase.presence
    self.cpf = Cpf.normalize(cpf)
  end

  def cpf_is_valid
    return if cpf.blank?

    errors.add(:cpf, :invalid) unless Cpf.valid?(cpf)
  end

  def students_never_sign
    errors.add(:signs, :invalid) if signs && student_id.present?
  end

  def links_belong_to_school
    return if school_id.blank?

    { membership: membership, guardian: guardian, student: student }.each do |name, record|
      next if record.blank? || record.school_id == school_id

      errors.add(name, :invalid)
    end
  end
end
