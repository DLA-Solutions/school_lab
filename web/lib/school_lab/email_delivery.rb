# frozen_string_literal: true

module SchoolLab
  module EmailDelivery
    module_function

    def configured?
      local_delivery_enabled? || provider_configured?
    end

    def local_delivery_enabled?
      Rails.env.development? || Rails.env.test?
    end

    def provider_configured?
      ENV["POSTMARK_API_TOKEN"].present?
    end

    def from_address
      ENV.fetch("MAIL_FROM", "contato@scholarpremium.com.br")
    end
  end
end
