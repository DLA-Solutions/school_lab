# frozen_string_literal: true

class User < ApplicationRecord
  include Discard::Model

  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :confirmable, :lockable, :trackable

  STATUSES = %w[active disabled].freeze

  # A password a family sets themselves, from a link in their inbox, is the only thing standing
  # between a stranger and a child's records — so length alone is not enough. Devise's
  # `password_length` still bounds it; this adds the make-up of the characters.
  PASSWORD_MIN_LENGTH = 10
  PASSWORD_RULES = {
    too_short: ->(value) { value.length >= PASSWORD_MIN_LENGTH },
    needs_lowercase: ->(value) { value.match?(/[a-z]/) },
    needs_uppercase: ->(value) { value.match?(/[A-Z]/) },
    needs_digit: ->(value) { value.match?(/\d/) },
    needs_symbol: ->(value) { value.match?(/[^A-Za-z0-9]/) }
  }.freeze

  validate :password_is_strong_enough, if: -> { password.present? }

  has_many :memberships, dependent: :destroy
  has_many :schools, through: :memberships
  has_many :guardians, dependent: :nullify
  has_many :refresh_tokens, dependent: :destroy
  has_many :device_tokens, dependent: :destroy

  belongs_to :disabled_by, class_name: "User", optional: true

  validates :email, presence: true, uniqueness: { conditions: -> { kept } }
  validates :status, inclusion: { in: STATUSES }

  scope :active, -> { kept.where(status: "active") }

  def backoffice?
    backoffice_membership.present?
  end

  def backoffice_membership
    memberships.kept.active.find_by(role: "backoffice", school_id: nil)
  end

  def platform_permission?(key)
    backoffice_membership&.platform_permission?(key) == true
  end

  def disabled?
    status == "disabled"
  end

  def active_for_authentication?
    super && kept? && !disabled?
  end

  def inactive_message
    return :disabled if disabled?

    super
  end

  private

  # Reported rule by rule rather than as one verdict: "a senha é fraca" leaves someone guessing
  # which part to change.
  def password_is_strong_enough
    PASSWORD_RULES.each do |rule, satisfied|
      errors.add(:password, rule) unless satisfied.call(password)
    end
  end
end
