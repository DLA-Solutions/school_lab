# frozen_string_literal: true

# Autentique calls back here when a document changes. The path carries a per-school token so the
# event can be attributed without trusting its body, and the body itself is verified against the
# school's shared secret before anything is read from it.
class Webhooks::SignaturesController < ActionController::API
  def create
    config = SchoolSignatureProvider.active.find_by(webhook_endpoint_token: params[:token])
    return head :not_found unless config

    payload = request.body.read
    return head :unauthorized unless Signatures::VerifyWebhookSignature.call(
      payload: payload,
      signature: request.headers["X-Autentique-Signature"],
      secret: config.webhook_secret
    )

    result = Signatures::IngestWebhookService.call(config: config, payload: payload)

    # A 2xx has to come back promptly, and an event we do not act on is not an error — the
    # provider would otherwise retry a callback that will never be interesting.
    return head :ok if result.success?

    head :unprocessable_content
  end
end
