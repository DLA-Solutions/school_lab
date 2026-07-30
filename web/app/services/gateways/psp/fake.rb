# frozen_string_literal: true

module Gateways
  module Psp
    class Fake
      include Interface

      def issue(charge:)
        psp_charge_id = "fake-#{charge.school_id}-#{charge.id || SecureRandom.hex(4)}"

        IssueResult.new(
          psp_charge_id: psp_charge_id,
          boleto_url: "https://fake-psp.example/boleto/#{psp_charge_id}",
          pix_copy_paste: "00020126580014br.gov.bcb.pix#{psp_charge_id}"
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
