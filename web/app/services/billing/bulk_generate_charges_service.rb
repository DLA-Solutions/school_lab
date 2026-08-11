# frozen_string_literal: true

module Billing
  # Raises the month's tuition for a set of contracts the school picked by hand, at each
  # contract's own monthly amount, and hands every one of them to the bank in the same pass.
  #
  # `GenerateChargesService` sweeps every active contract on a schedule. This is the same work
  # driven from a screen: the school selects the contracts, names the period, and optionally
  # overrides the due date so a whole batch falls on one day regardless of each contract's
  # `due_day`. A contract that already has a charge for the period is reported as skipped rather
  # than billed twice — the partial unique index is what enforces it, so two operators pressing
  # the button at once still cannot double-charge a family.
  class BulkGenerateChargesService < ApplicationService
    def initialize(school:, contract_ids:, billing_period:, due_date: nil, actor: nil)
      @school = school
      @contract_ids = Array(contract_ids).map(&:to_i).uniq
      @billing_period = billing_period
      @due_date = due_date
      @actor = actor
    end

    def call
      return no_contracts if contract_ids.empty?
      return invalid_period if period.blank?

      created = []
      skipped = []
      without_payer = []

      contracts.each do |contract|
        payer = payer_for(contract)
        next without_payer << contract.id if payer.blank?

        charge = persist_charge(contract, payer)
        charge ? created << charge : skipped << contract.id
      end

      Rails.logger.info(
        {
          event: "charge.bulk_generated",
          school_id: school.id,
          billing_period: period.to_s,
          requested: contract_ids.size,
          created: created.size,
          skipped: skipped.size,
          without_payer: without_payer.size,
          actor_id: actor&.id
        }.to_json
      )

      ResponseService.success(
        data: {
          created_charges: created,
          skipped_contract_ids: skipped,
          contract_ids_without_payer: without_payer
        }
      )
    end

    private

    attr_reader :school, :contract_ids, :billing_period, :due_date, :actor

    def contracts
      # `payer` walks the student's guardians, so they are preloaded rather than fetched per row.
      @contracts ||= school.contracts.active
                           .where(id: contract_ids)
                           .includes(:billing_plan, :plan_discount, :payer_guardian,
                                     student: { student_guardians: :guardian })
    end

    # The charge and its hand-off to the bank go together: a charge saved without an issuance
    # queued is a boleto the family never receives.
    def persist_charge(contract, payer)
      charge = nil

      ActiveRecord::Base.transaction do
        charge = build_charge(contract, payer)
        charge.save!
        record_plan_discount!(charge, contract)
        Billing::IssueChargeJob.perform_later(charge.id, school.id)
      end

      charge
    rescue ActiveRecord::RecordNotUnique
      nil
    end

    def build_charge(contract, payer)
      amounts = tuition_amounts_for(contract)

      school.charges.build(
        contract: contract,
        guardian: payer,
        kind: "tuition",
        billing_period: period,
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

    # Whoever the contract names as payer; the boleto carries that person's CPF.
    def payer_for(contract)
      contract.payer
    end

    def period
      @period ||= normalize_period(billing_period)
    end

    def due_date_override
      return @due_date_override if defined?(@due_date_override)

      @due_date_override = parse_date(due_date)
    end

    def due_date_for(contract)
      # Without an override each contract falls on the day the family agreed to.
      due_date_override || Date.new(period.year, period.month, contract.due_day || 10)
    end

    def normalize_period(value)
      return value.beginning_of_month if value.is_a?(Date)
      return nil if value.blank?

      string = value.to_s
      date = string.match?(/\A\d{4}-\d{2}\z/) ? Date.strptime(string, "%Y-%m") : Date.parse(string)
      date.beginning_of_month
    rescue ArgumentError, TypeError
      nil
    end

    def parse_date(value)
      return nil if value.blank?

      value.is_a?(Date) ? value : Date.parse(value.to_s)
    rescue ArgumentError, TypeError
      nil
    end

    def no_contracts
      failure(I18n.t("api.errors.charge_batch_no_contracts"))
    end

    def invalid_period
      failure(I18n.t("api.errors.charge_batch_invalid_period"))
    end

    def failure(message)
      ResponseService.failure(code: :validation_error, details: { base: [ message ] })
    end
  end
end
