# frozen_string_literal: true

module Billing
  class GenerateChargesService < ApplicationService
    def initialize(school:, billing_period:, adapter: nil)
      @school = school
      @billing_period = billing_period
      @adapter = adapter
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

    def adapter
      @adapter ||= Gateways::BankSlip::Registry.resolve(school: school)
    end

    def active_contracts
      school.contracts.active.includes(:student, :billing_plan)
    end

    def create_charge_for(contract, guardian, created, skipped_contract_ids)
      charge = build_charge(contract, guardian)
      charge.save!
      request = Gateways::BankSlip::IssueRequestBuilder.from_charge(charge)
      issue_result = adapter.issue(request)
      charge.update!(
        provider_invoice_id: issue_result.provider_invoice_id,
        boleto_url: issue_result.boleto_url,
        pix_copy_paste: issue_result.pix_emv
      )
      created << charge
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
      original_amount_cents = contract.negotiated_amount_cents || contract.billing_plan.base_amount_cents || 0
      discount_amount_cents = 0
      total_amount_cents = original_amount_cents - discount_amount_cents

      school.charges.build(
        contract: contract,
        guardian: guardian,
        billing_period: normalized_billing_period,
        original_amount_cents: original_amount_cents,
        discount_amount_cents: discount_amount_cents,
        late_fee_amount_cents: 0,
        total_amount_cents: total_amount_cents,
        due_date: due_date_for(contract)
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
  end
end
