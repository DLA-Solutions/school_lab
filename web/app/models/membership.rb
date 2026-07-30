# frozen_string_literal: true

class Membership < ApplicationRecord
  include Discard::Model

  ROLES = %w[backoffice school teacher guardian].freeze
  STATUSES = %w[active invited suspended].freeze

  belongs_to :user
  belongs_to :school, optional: true
  belongs_to :suspended_by, class_name: "User", optional: true

  validates :role, inclusion: { in: ROLES }
  validates :status, inclusion: { in: STATUSES }
  validates :user_id, uniqueness: { scope: :school_id, conditions: -> { kept } }

  scope :active, -> { kept.where(status: "active") }
end
