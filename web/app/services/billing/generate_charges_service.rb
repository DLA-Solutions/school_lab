# frozen_string_literal: true

module Billing
  class GenerateChargesService < ApplicationService
    def initialize(school:, billing_period:, gateway: Gateways::Psp::Fake.new)
      @school = school
      @billing_period = billing_period
      @gateway = gateway
    end

    def call
      created = []

      ActiveRecord::Base.transaction do
        active_contracts.find_each do |contract|
          next if charge_exists?(contract)

          guardian = financial_guardian_for(contract)
          next unless guardian

          charge = build_charge(contract, guardian)
          charge.save!
          issue_result = gateway.issue(charge: charge)
          charge.update!(
            provider_invoice_id: issue_result.provider_invoice_id,
            boleto_url: issue_result.boleto_url,
            pix_copy_paste: issue_result.pix_copy_paste
          )
          created << charge
        end
      end

      ResponseService.success(data: created)
    end

    private

    attr_reader :school, :billing_period, :gateway

    def active_contracts
      school.contracts.active.includes(:student, :billing_plan)
    end

    def charge_exists?(contract)
      contract.charges.kept.exists?(billing_period: billing_period)
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
        billing_period: billing_period,
        original_amount_cents: original_amount_cents,
        discount_amount_cents: discount_amount_cents,
        late_fee_amount_cents: 0,
        total_amount_cents: total_amount_cents,
        due_date: due_date_for(contract)
      )
    end

    def due_date_for(contract)
      year, month = billing_period.split("-").map(&:to_i)
      day = contract.due_day || 10
      Date.new(year, month, day)
    end
  end
end
