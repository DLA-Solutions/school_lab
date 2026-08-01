# frozen_string_literal: true

class Webhooks::ProvidersController < ActionController::API
  def create
    config = SchoolPaymentProvider.active.find_by(
      provider: params[:provider],
      webhook_endpoint_token: params[:token]
    )
    return head :not_found unless config

    parser = Webhooks::Parsers::Registry.for(params[:provider])
    parse_result = parser.parse(request)
    return head :bad_request if parse_result.failure?

    result = Billing::IngestProviderWebhookService.call(config: config, event: parse_result.data)
    return head :ok if result.success?

    head :unprocessable_content
  end
end
