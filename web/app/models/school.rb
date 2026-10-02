# frozen_string_literal: true

class School < ApplicationRecord
  include Discard::Model

  ONBOARDING_STATUSES = %w[provisioning pending_handoff active].freeze
  ONBOARDING_MODES = %w[self_serve white_glove].freeze

  belongs_to :school_group, optional: true
  belongs_to :discarded_by, class_name: "User", optional: true

  has_many :memberships, dependent: :destroy
  has_many :guardians, dependent: :destroy
  has_many :students, dependent: :destroy
  has_many :student_guardians, dependent: :destroy
  has_many :school_classes, dependent: :destroy
  has_many :subjects, dependent: :destroy
  has_many :class_disciplines, dependent: :destroy
  has_many :teachers, dependent: :destroy
  has_many :job_positions, dependent: :destroy
  has_many :teaching_assignments, dependent: :destroy
  has_many :billing_plans, dependent: :destroy
  has_many :billing_purposes, dependent: :destroy
  has_many :plan_discounts, dependent: :destroy
  has_one :school_billing_settings, dependent: :destroy
  has_one :school_fiscal_setting, dependent: :destroy
  has_one :tax_declaration_setting, dependent: :destroy
  has_many :contracts, dependent: :destroy
  has_many :charges, dependent: :destroy
  has_many :charge_issuances, dependent: :destroy
  has_many :service_invoices, dependent: :destroy
  has_many :payments, dependent: :destroy
  has_many :school_transactions, dependent: :destroy
  has_many :documents, dependent: :destroy
  has_many :school_payment_providers, dependent: :destroy
  has_one :school_signature_provider, dependent: :destroy
  has_one :contract_template, dependent: :destroy
  has_many :school_role_templates, dependent: :destroy
  has_many :segments, dependent: :destroy
  has_many :staff_profiles, dependent: :destroy
  has_many :membership_permissions, dependent: :destroy
  has_many :membership_invite_tokens, dependent: :destroy
  has_many :provisioning_imports, dependent: :destroy
  has_many :school_years, dependent: :destroy
  has_many :academic_periods, dependent: :destroy
  has_many :school_modules, dependent: :destroy
  has_one :platform_subscription, -> { kept }, dependent: :destroy
  has_many :platform_invoices, dependent: :destroy
  has_many :document_signatories, dependent: :destroy
  has_many :report_card_configs, dependent: :destroy
  has_many :report_card_publish_batches, dependent: :destroy
  has_many :report_card_publish_schedules, dependent: :destroy
  has_many :report_card_publications, dependent: :destroy
  has_many :report_card_snapshots, dependent: :destroy
  has_many :tax_declarations, dependent: :destroy
  has_many :tax_declaration_versions, dependent: :destroy
  has_many :tax_declaration_items, dependent: :destroy
  has_many :tax_declaration_access_events, dependent: :destroy
  has_many :notification_policies, dependent: :destroy
  has_many :notification_intents, dependent: :destroy
  has_many :notification_deliveries, dependent: :destroy

  DEFAULT_TIMEZONE = "America/Sao_Paulo"

  # Loose on purpose, like the template's copy addresses: a hint that someone mistyped, not an
  # attempt to decide what the RFC allows.
  EMAIL_FORMAT = /\A[^@\s]+@[^@\s]+\.[^@\s]+\z/

  before_validation :normalize_signature_email

  validates :name, presence: true
  validates :onboarding_status, inclusion: { in: ONBOARDING_STATUSES }
  validates :onboarding_mode, inclusion: { in: ONBOARDING_MODES }
  validates :signature_email, format: { with: EMAIL_FORMAT }, allow_blank: true
  validate :signature_email_requires_a_cnpj

  # Whether the school is itself a party to the contracts it sends. The provider identifies a
  # signer by e-mail and demands a document from whoever opens the link, so the school can only
  # sign once both are on file — its own address, and the CNPJ it signs under.
  def signs_contracts?
    signature_email.present? && Cnpj.valid?(cnpj)
  end

  def formatted_cnpj
    Cnpj.format(cnpj)
  end

  def provisioning?
    onboarding_status == "provisioning"
  end

  def pending_handoff?
    onboarding_status == "pending_handoff"
  end

  def onboarding_active?
    onboarding_status == "active"
  end

  def white_glove?
    onboarding_mode == "white_glove"
  end

  def self_serve?
    onboarding_mode == "self_serve"
  end

  def owner_membership
    memberships.kept
               .joins(:staff_profile)
               .find_by(staff_profiles: { is_owner: true, discarded_at: nil })
  end

  def system_role_template(system_key)
    school_role_templates.kept.find_by(system_key: system_key.to_s)
  end

  def timezone
    DEFAULT_TIMEZONE
  end

  private

  def normalize_signature_email
    self.signature_email = signature_email.to_s.strip.downcase.presence
  end

  # An address with no valid CNPJ behind it would be sent to the provider as a signer it cannot
  # identify, and the whole contract would be rejected with a family already expecting it.
  def signature_email_requires_a_cnpj
    return if signature_email.blank?
    return if Cnpj.valid?(cnpj)

    errors.add(:signature_email, :requires_valid_cnpj)
  end
end
