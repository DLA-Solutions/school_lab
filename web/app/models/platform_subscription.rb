# frozen_string_literal: true

class PlatformSubscription < ApplicationRecord
  include Discard::Model

  STATUSES = %w[trialing active past_due canceled incomplete].freeze
  PROVIDERS = %w[asaas manual fake].freeze
  INTERVALS = %w[month year].freeze
  COLLECTION_METHODS = %w[automatic send_invoice manual].freeze
  BILLABLE_STATUSES = %w[active trialing].freeze
  MUTATABLE_STATUSES = %w[trialing active past_due incomplete].freeze

  belongs_to :school
  belongs_to :platform_plan
  has_many :platform_invoices, dependent: :restrict_with_error
  has_many :platform_plan_provider_prices, through: :platform_plan

  audited associated_with: :school

  before_validation :normalize_legacy_status

  validates :status, inclusion: { in: STATUSES }
  validates :provider, presence: true, inclusion: { in: PROVIDERS }
  validates :billing_interval, inclusion: { in: INTERVALS }, allow_nil: true
  validates :collection_method, presence: true, inclusion: { in: COLLECTION_METHODS }
  validates :school_id, uniqueness: { conditions: -> { kept } }

  scope :billable, -> { kept.where(status: BILLABLE_STATUSES) }
  scope :non_canceled, -> { kept.where.not(status: "canceled") }

  def manual?
    provider == "manual"
  end

  def collector?
    provider != "manual"
  end

  alias collected_by_gateway? collector?

  private

  def normalize_legacy_status
    self.status = "trialing" if status == "trial"
  end
end
