# frozen_string_literal: true

class Webhooks::PspController < ActionController::API
  def create
    payload = request.raw_post

    result = Billing::ProcessProviderWebhookService.call(payload: payload)
    if result.success?
      head :ok
    else
      render json: {
        error: {
          code: result.error_code.to_s,
          message: I18n.t("api.errors.#{result.error_code}", default: result.error_code.to_s.humanize),
          details: result.details || {}
        }
      }, status: :unprocessable_content
    end
  end
end
