# frozen_string_literal: true

module SchoolLab
  module EmailDelivery
    module_function

    def configured?
      ENV["POSTMARK_API_TOKEN"].present?
    end

    def from_address
      ENV.fetch("MAIL_FROM", "contato@scholarpremium.com.br")
    end
  end
end
