# frozen_string_literal: true

class Webhooks::PspController < ActionController::API
  def create
    payload = request.raw_post
    signature = request.headers["X-Psp-Signature"]

    result = Billing::ProcessPspWebhookService.call(payload: payload, signature: signature)
    if result.success?
      head :ok
    else
      status = result.error_code == :forbidden ? :forbidden : :unprocessable_content
      render json: {
        error: {
          code: result.error_code.to_s,
          message: I18n.t("api.errors.#{result.error_code}", default: result.error_code.to_s.humanize),
          details: result.details || {}
        }
      }, status: status
    end
  end
end
