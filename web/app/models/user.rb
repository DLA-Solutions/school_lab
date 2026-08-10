# frozen_string_literal: true

class User < ApplicationRecord
  include Discard::Model

  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :confirmable, :lockable, :trackable

  STATUSES = %w[active disabled].freeze

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
end
