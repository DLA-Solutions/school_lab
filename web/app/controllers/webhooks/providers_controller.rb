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

    # Cora/Spedy/Fake each return a single Event; Inter's body is itself an array of
    # status-transition entries. Array() wraps a lone Event (a plain Data.define with no
    # #to_a/#to_ary) as a one-element array instead of exploding its fields, so this loop
    # normalizes both shapes without changing behavior for the single-event providers.
    events = Array(parse_result.data)
    return head :bad_request if events.empty?

    results = events.map { |event| Billing::IngestProviderWebhookService.call(config: config, event: event) }
    return head :unprocessable_content if results.any?(&:failure?)

    head :ok
  end
end
