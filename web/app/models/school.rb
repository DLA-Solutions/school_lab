# frozen_string_literal: true

class School < ApplicationRecord
  include Discard::Model

  belongs_to :school_group, optional: true
  belongs_to :discarded_by, class_name: "User", optional: true

  has_many :memberships, dependent: :destroy
  has_many :guardians, dependent: :destroy
  has_many :students, dependent: :destroy
  has_many :student_guardians, dependent: :destroy
  has_many :school_classes, dependent: :destroy
  has_many :subjects, dependent: :destroy
  has_many :teachers, dependent: :destroy
  has_many :job_positions, dependent: :destroy
  has_many :teaching_assignments, dependent: :destroy
  has_many :billing_plans, dependent: :destroy
  has_many :plan_discounts, dependent: :destroy
  has_one :school_billing_settings, dependent: :destroy
  has_many :contracts, dependent: :destroy
  has_many :charges, dependent: :destroy
  has_many :charge_issuances, dependent: :destroy
  has_many :payments, dependent: :destroy
  has_many :documents, dependent: :destroy
  has_many :school_payment_providers, dependent: :destroy
  has_one :school_signature_provider, dependent: :destroy
  has_one :contract_template, dependent: :destroy
  has_many :school_role_templates, dependent: :destroy
  has_many :segments, dependent: :destroy
  has_many :staff_profiles, dependent: :destroy
  has_many :membership_permissions, dependent: :destroy

  validates :name, presence: true

  def system_role_template(system_key)
    school_role_templates.kept.find_by(system_key: system_key.to_s)
  end
end
