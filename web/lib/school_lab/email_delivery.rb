# frozen_string_literal: true

module SchoolLab
  module EmailDelivery
    module_function

    def configured?
      return true if local_delivery_enabled?
      return false if delivery_disabled?

      provider_configured?
    end

    def local_delivery_enabled?
      Rails.env.development? || Rails.env.test? || rspec_cli?
    end

    def rspec_cli?
      File.basename($PROGRAM_NAME).start_with?("rspec")
    end

    def delivery_disabled?
      value = ENV["DISABLE_EMAIL_DELIVERY"].to_s.downcase
      value.present? && !%w[0 false no].include?(value)
    end

    def provider_configured?
      ENV["POSTMARK_API_TOKEN"].present?
    end

    def from_address
      ENV.fetch("MAIL_FROM", "contato@scholarpremium.com.br")
    end
  end
end
