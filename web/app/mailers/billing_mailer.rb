# frozen_string_literal: true

class BillingMailer < ApplicationMailer
  def collection_reminder
    @charge = params[:charge]
    @guardian = @charge.guardian
    @rule_key = params[:rule_key]
    @boleto_url = @charge.boleto_url
    @pix_copy_paste = @charge.pix_copy_paste
    @amount = format_amount(@charge.total_amount_cents)
    @due_date = I18n.l(@charge.due_date, format: "%d/%m/%Y")

    mail(
      to: @guardian.email,
      subject: I18n.t("billing.mailer.collection_reminder.subject", amount: @amount)
    )
  end

  private

  def format_amount(cents)
    ActiveSupport::NumberHelper.number_to_currency(
      cents / 100.0,
      unit: "R$ ",
      separator: ",",
      delimiter: ".",
      format: "%u%n"
    )
  end
end
