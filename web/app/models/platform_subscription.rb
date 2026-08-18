# frozen_string_literal: true

class PlatformSubscription < ApplicationRecord
  include Discard::Model

  STATUSES = %w[active trial past_due].freeze

  belongs_to :school
  belongs_to :platform_plan

  audited associated_with: :school

  validates :status, inclusion: { in: STATUSES }
  validates :school_id, uniqueness: { conditions: -> { kept } }

  scope :billable, -> { kept.where(status: %w[active trial]) }
end
