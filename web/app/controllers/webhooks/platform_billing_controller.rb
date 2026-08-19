# frozen_string_literal: true

class Webhooks::PlatformBillingController < ActionController::API
  def create
    settings = PlatformBillingSetting.instance
    return head :not_found unless valid_token?(settings)
    return head :not_found unless %w[iugu fake].include?(params[:provider].to_s)

    parse_result = parser.parse(request)
    return head :bad_request if parse_result.failure?

    result = Platform::IngestBillingWebhookService.call(
      event: parse_result.data,
      provider: params[:provider],
      token: params[:token]
    )
    return head :not_found if result.failure? && result.error_code == :not_found
    return head :ok if result.success? && result.data == :duplicate
    return head :accepted if result.success?

    head :unprocessable_content
  end

  private

  def valid_token?(settings)
    ActiveSupport::SecurityUtils.secure_compare(
      settings.webhook_endpoint_token.to_s,
      params[:token].to_s
    )
  end

  def parser
    case params[:provider].to_s
    when "fake" then Webhooks::Parsers::FakePlatformBilling
    else Webhooks::Parsers::IuguPlatformBilling
    end
  end
end
