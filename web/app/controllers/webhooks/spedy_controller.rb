# frozen_string_literal: true

class Webhooks::SpedyController < ActionController::API
  def create
    expected = SchoolLab::Integrations::Spedy::Configuration.webhook_token
    return head :not_found if expected.blank? || params[:token] != expected

    parser = Webhooks::Parsers::Registry.for("spedy")
    parse_result = parser.parse(request)
    return head :bad_request if parse_result.failure?

    result = Billing::IngestSpedyWebhookService.call(event: parse_result.data)
    return head :ok if result.success?

    head :unprocessable_content
  end
end
