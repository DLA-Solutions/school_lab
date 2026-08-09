# frozen_string_literal: true

module Billing
  # Raises a charge outside the monthly schedule — a trip, a replacement uniform, a room rented
  # for a weekend. What it always needs is a payer, so the boleto goes out on a CPF that answers
  # for it. A contract is optional: plenty of what a school bills for was never signed for, and
  # when one is given the payer defaults to whoever answers for it.
  class CreateOneOffChargeService < ApplicationService
    def initialize(school:, params:, contract: nil, guardian: nil, actor: nil)
      @school = school
      @contract = contract
      @guardian = guardian
      @params = params
      @actor = actor
    end

    def call
      payer = guardian || contract&.payer
      return no_payer if payer.blank?

      amount = params[:total_amount_cents].to_i
      return invalid_amount if amount <= 0

      due_date = parse_date(params[:due_date])
      return invalid_due_date if due_date.blank?

      charge = school.charges.build(
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
          contract_id: contract&.id,
          guardian_id: payer.id,
          actor_id: actor&.id
        }.to_json
      )

      ResponseService.success(data: charge)
    end

    private

    attr_reader :school, :contract, :guardian, :params, :actor

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
      ResponseService.failure(code: :validation_error, details: { base: [ message ] })
    end
  end
end
