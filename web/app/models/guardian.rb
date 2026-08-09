# frozen_string_literal: true

class Guardian < ApplicationRecord
  include Discard::Model
  include SchoolAuditable
  include PersonSearchable

  ADDRESS_FIELDS = %i[zip_code street number complement neighborhood city state].freeze

  belongs_to :school
  belongs_to :user, optional: true
  belongs_to :discarded_by, class_name: "User", optional: true

  has_many :student_guardians, dependent: :destroy
  has_many :students, through: :student_guardians
  has_many :charges, dependent: :destroy
  has_many :documents, as: :documentable, dependent: :destroy

  # Normalisation runs before validation so uniqueness compares the canonical form, and so a
  # guardian saved through the console or a seed is stored exactly like one saved through the API.
  before_validation :normalize_cpf
  before_validation :normalize_zip_code
  before_validation :normalize_state

  validates :name, presence: true
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP, allow_blank: true }
  validates :phone, presence: true

  validates :cpf, presence: true
  validate :cpf_is_a_valid_document
  # Scoped to the school: the same person can be a guardian at two schools, and a discarded record
  # must not block re-registering. Mirrors `index_guardians_on_school_id_and_cpf_kept`.
  validates :cpf,
            uniqueness: { scope: :school_id, conditions: -> { kept } },
            allow_blank: true,
            if: :kept?

  # The address is required in full — it is what a contract is mailed to and what a bank
  # registration asks for. `complement` stays optional: plenty of addresses have no apartment.
  validates(*(ADDRESS_FIELDS - %i[complement]), presence: true)
  validates :state, format: { with: /\A[A-Z]{2}\z/, allow_blank: true }
  validates :zip_code, format: { with: /\A\d{8}\z/, allow_blank: true }

  def formatted_cpf
    Cpf.format(cpf)
  end

  private

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
