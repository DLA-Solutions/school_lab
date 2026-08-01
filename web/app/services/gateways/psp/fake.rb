# frozen_string_literal: true

module Gateways
  module Psp
    class Fake
      include Interface

      PROVIDER = "fake"

      def issue(charge:)
        provider_invoice_id = "fake-#{charge.school_id}-#{charge.id || SecureRandom.hex(4)}"

        IssueResult.new(
          provider_invoice_id: provider_invoice_id,
          boleto_url: "https://fake-psp.example/boleto/#{provider_invoice_id}",
          pix_copy_paste: "00020126580014br.gov.bcb.pix#{provider_invoice_id}"
        )
      end

      def verify_signature(payload:, signature:)
        return false if signature.blank?

        ActiveSupport::SecurityUtils.secure_compare(sign_payload(payload: payload), signature.to_s)
      end

      def sign_payload(payload:)
        OpenSSL::HMAC.hexdigest("SHA256", secret, payload)
      end

      private

      def secret
        ENV.fetch("FAKE_PSP_WEBHOOK_SECRET", "fake-psp-secret")
      end
    end
  end
end
