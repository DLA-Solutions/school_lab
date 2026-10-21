# frozen_string_literal: true

module Documents
  # Downloads the signed contract from the provider and files it into the student's documents.
  # Enqueued from the moment the contract is signed and again from the moment the signed file's
  # address is recorded, whichever happens second — the service no-ops until both are true and
  # once the document exists, so extra enqueues cost nothing.
  class AttachSignedContractJob < ApplicationJob
    queue_as :default

    # The provider's file was not served (timeout, 5xx, token problem). Worth retrying; the nightly
    # sweep is the backstop after the attempts run out.
    class ProviderUnavailable < StandardError; end

    MAX_ATTEMPTS = 5

    discard_on ActiveRecord::RecordNotFound
    retry_on ProviderUnavailable, wait: :polynomially_longer, attempts: MAX_ATTEMPTS

    def perform(contract_id, school_id)
      school = School.kept.find(school_id)
      contract = school.contracts.kept.find(contract_id)

      result = Documents::AttachSignedContractService.call(contract: contract)
      return if result.success?

      raise ProviderUnavailable, "contract #{contract.id}: #{result.error_code}" if result.error_code == :provider_error

      log_failure(contract, result)
    end

    private

    def log_failure(contract, result)
      Rails.logger.warn(
        {
          event: "contract.signed_document_attach_failed",
          contract_id: contract.id,
          school_id: contract.school_id,
          error_code: result.error_code
        }.to_json
      )
    end
  end
end
