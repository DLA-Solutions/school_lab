# frozen_string_literal: true

module Billing
  # Raises a charge outside the monthly schedule — a trip, a replacement uniform — against the
  # contract's payer, so the boleto goes out on the CPF that already answers for that contract.
  class CreateOneOffChargeService < ApplicationService
    def initialize(contract:, params:, actor: nil)
      @contract = contract
      @params = params
      @actor = actor
    end

    def call
      payer = contract.payer
      return no_payer if payer.blank?

      amount = params[:total_amount_cents].to_i
      return invalid_amount if amount <= 0

      due_date = parse_date(params[:due_date])
      return invalid_due_date if due_date.blank?

      charge = contract.school.charges.build(
        contract: contract,
        guardian: payer,
        kind: "one_off",
        description: params[:description].presence,
        # A one-off belongs to the month it falls due; the schedule's uniqueness rule no longer
        # applies to it, so this is a label rather than a slot.
        billing_period: due_date.beginning_of_month,
        due_date: due_date,
        original_amount_cents: amount,
        discount_amount_cents: 0,
        late_fee_amount_cents: 0,
        total_amount_cents: amount
      )

      return ResponseService.failure(code: :validation_error, details: charge.errors.to_hash) unless charge.save

      Rails.logger.info(
        {
          event: "charge.one_off_created",
          charge_id: charge.id,
          contract_id: contract.id,
          guardian_id: payer.id,
          actor_id: actor&.id
        }.to_json
      )

      ResponseService.success(data: charge)
    end

    private

    attr_reader :contract, :params, :actor

    def parse_date(value)
      value.is_a?(Date) ? value : Date.parse(value.to_s)
    rescue ArgumentError, TypeError
      nil
    end

    def no_payer
      failure(I18n.t("api.errors.charge_without_payer"))
    end

    def invalid_amount
      failure(I18n.t("api.errors.charge_amount_required"))
    end

    def invalid_due_date
      failure(I18n.t("api.errors.charge_due_date_required"))
    end

    def failure(message)
      ResponseService.failure(code: :validation_error, details: { base: [message] })
    end
  end
end
