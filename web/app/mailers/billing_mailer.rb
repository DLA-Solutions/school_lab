# frozen_string_literal: true

class BillingMailer < ApplicationMailer
  def collection_reminder
    charge = params[:charge]
    guardian = charge.guardian
    boleto_url = charge.boleto_url
    pix_copy_paste = charge.pix_copy_paste
    amount = format_amount(charge.total_amount_cents)
    due_date = I18n.l(charge.due_date, format: "%d/%m/%Y")

    template_mail(
      template_alias: Gateways::Email::Templates::COLLECTION_REMINDER,
      to: guardian.email,
      subject: I18n.t("billing.mailer.collection_reminder.subject", amount: amount),
      tag: "billing-collection-reminder",
      template_model: {
        guardian_name: guardian.name,
        amount: amount,
        due_date: due_date,
        boleto_url: boleto_url.to_s,
        pix_code: pix_copy_paste.to_s,
        has_boleto: boleto_url.present?,
        has_pix: pix_copy_paste.present?
      }
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
