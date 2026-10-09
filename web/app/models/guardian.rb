# frozen_string_literal: true

class Guardian < ApplicationRecord
  include Discard::Model
  include SchoolAuditable
  include PersonSearchable

  attr_accessor :provisioning_import

  # A school putting its existing families on file brings the list it already has, and that list
  # has holes: a guardian with no e-mail, a household whose address was never written down past
  # the street. Set on that import alone — the form the secretary fills in and the white-glove
  # provisioning CSV still ask for all of it, because a contract has to be mailed somewhere.
  attr_accessor :partial_import

  ADDRESS_FIELDS = %i[zip_code street number complement neighborhood city state].freeze

  belongs_to :school
  belongs_to :user, optional: true
  belongs_to :discarded_by, class_name: "User", optional: true

  has_many :student_guardians, dependent: :destroy
  # Portal access follows a live link. Discarded rows stay on `student_guardians` — that
  # association owns `dependent: :destroy` — and staff lists filter kept links on their own query.
  has_many :kept_student_guardians, -> { kept }, class_name: "StudentGuardian", inverse_of: :guardian
  has_many :students, through: :kept_student_guardians, source: :student
  has_many :charges, dependent: :destroy
  has_many :documents, as: :documentable, dependent: :destroy
  has_many :guardian_requests, dependent: :destroy
  has_many :tax_declarations, dependent: :destroy
  has_many :tax_declaration_access_events, dependent: :destroy

  # Normalisation runs before validation so uniqueness compares the canonical form, and so a
  # guardian saved through the console or a seed is stored exactly like one saved through the API.
  before_validation :normalize_cpf
  before_validation :normalize_zip_code
  before_validation :normalize_state

  validates :name, presence: true
  # The format always holds; only the demand that there be one at all gives way on a partial
  # import. An address nobody can write to is a gap; a malformed one is a mistake.
  validates :email, presence: true, unless: -> { skip_presence_of?(:email) }
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP, allow_blank: true }
  validates :phone, presence: true, unless: -> { skip_presence_of?(:phone) }

  validates :cpf, presence: true, unless: :provisioning_import
  validate :cpf_is_a_valid_document, if: -> { cpf.present? }
  # Scoped to the school: the same person can be a guardian at two schools, and a discarded record
  # must not block re-registering. Mirrors `index_guardians_on_school_id_and_cpf_kept`.
  validates :cpf,
            uniqueness: { scope: :school_id, conditions: -> { kept } },
            allow_blank: true,
            if: :kept?

  # The address is required in full — it is what a contract is mailed to and what a bank
  # registration asks for. `complement` stays optional: plenty of addresses have no apartment.
  (ADDRESS_FIELDS - %i[complement]).each do |field|
    validates field, presence: true, unless: -> { skip_presence_of?(field) }
  end
  validates :state, format: { with: /\A[A-Z]{2}\z/, allow_blank: true }
  validates :zip_code, format: { with: /\A\d{8}\z/, allow_blank: true }

  def formatted_cpf
    Cpf.format(cpf)
  end

  private

  # Two ways a required field may legitimately be empty.
  #
  # The first is the import itself: the school's old list has holes, and refusing it would only
  # mean the families stay in the old system.
  #
  # The second is everything afterwards. A guardian who arrived without an address must not become
  # a record nobody can touch — a secretary correcting a phone number would be met with six errors
  # about an address the school never had. So the demand is made of fields that were filled and of
  # records that arrive complete; a gap that was already there stays allowed until somebody fills
  # it, and once filled it can no longer be emptied.
  def skip_presence_of?(field)
    return true if partial_import

    persisted? && attribute_in_database(field.to_s).blank?
  end

  def normalize_cpf
    self.cpf = Cpf.normalize(cpf)
  end

  def normalize_zip_code
    self.zip_code = zip_code.to_s.gsub(/\D/, "").presence if zip_code.present?
  end

  def normalize_state
    self.state = state.to_s.strip.upcase.presence if state.present?
  end

  def cpf_is_a_valid_document
    return if cpf.blank?
    return if Cpf.valid?(cpf)

    errors.add(:cpf, :invalid_cpf)
  end
end
