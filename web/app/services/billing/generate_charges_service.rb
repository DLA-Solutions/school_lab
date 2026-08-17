# frozen_string_literal: true

module Billing
  class GenerateChargesService < ApplicationService
    def initialize(school:, billing_period:)
      @school = school
      @billing_period = billing_period
    end

    def call
      created = []
      skipped_contract_ids = []

      active_contracts.find_each do |contract|
        guardian = financial_guardian_for(contract)
        next unless guardian

        create_charge_for(contract, guardian, created, skipped_contract_ids)
      end

      ResponseService.success(
        data: {
          created_charges: created,
          skipped_contract_ids: skipped_contract_ids
        }
      )
    end

    private

    attr_reader :school, :billing_period

    def active_contracts
      school.contracts.active.includes(:student, :billing_plan, :plan_discount)
    end

    def create_charge_for(contract, guardian, created, skipped_contract_ids)
      ActiveRecord::Base.transaction do
        charge = build_charge(contract, guardian)
        classification = classify_charge!(charge, code: "tuition")
        raise ActiveRecord::Rollback unless classification.success?

        charge.save!
        record_plan_discount!(charge, contract)
        Billing::IssueChargeJob.perform_later(charge.id, school.id)
        created << charge
      end
    rescue ActiveRecord::RecordNotUnique
      skipped_contract_ids << contract.id
    end

    def financial_guardian_for(contract)
      link = StudentGuardian.kept.find_by(student_id: contract.student_id, school_id: school.id,
                                          primary_guardian: true)
      link ||= StudentGuardian.kept.find_by(student_id: contract.student_id, school_id: school.id)
      link&.guardian
    end

    def build_charge(contract, guardian)
      amounts = tuition_amounts_for(contract)

      school.charges.build(
        contract: contract,
        guardian: guardian,
        billing_period: normalized_billing_period,
        original_amount_cents: amounts.original_amount_cents,
        discount_amount_cents: amounts.discount_amount_cents,
        late_fee_amount_cents: 0,
        total_amount_cents: amounts.total_amount_cents,
        due_date: due_date_for(contract)
      )
    end

    def tuition_amounts_for(contract)
      Billing::ContractTuitionAmounts.for(contract)
    end

    def record_plan_discount!(charge, contract)
      amounts = tuition_amounts_for(contract)
      return unless amounts.plan_discount_applied

      charge.applied_discounts.create!(
        discount_type: "plan_discount",
        amount_cents: amounts.discount_amount_cents,
        school_id: school.id
      )
    end

    def normalized_billing_period
      @normalized_billing_period ||= begin
        value = billing_period
        value = Date.strptime(value, "%Y-%m") if value.is_a?(String) && value.match?(/\A\d{4}-\d{2}\z/)
        value = value.to_date unless value.is_a?(Date)

        value.beginning_of_month
      end
    end

    def due_date_for(contract)
      day = contract.due_day || 10
      Date.new(normalized_billing_period.year, normalized_billing_period.month, day)
    end

    def classify_charge!(charge, code:)
      purpose = BillingPurpose.find_or_provision!(school, code: code)
      Billing::ApplyChargeClassificationService.call(charge: charge, billing_purpose: purpose)
    end
  end
end
