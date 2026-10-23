# frozen_string_literal: true

module Documents
  # Downloads the signed contract from the provider and files it into the student's documents.
  # Enqueued the moment the contract becomes signed and again whenever the signed file's address is
  # recorded. The service no-ops until the contract is signed with an address on record and once
  # the document exists, so extra enqueues cost nothing.
  #
  # Self-healing: a contract can be signed with no address on record yet — the provider builds the
  # signed PDF asynchronously, and the webhook's `document.finished` fallback marks the contract
  # signed without reading one. In that case the job asks the provider again through
  # `Contracts::ReconcileSignatureService` (which records the address) and, while it is still
  # missing, retries with a polynomial backoff for a bounded number of attempts. The nightly sweep
  # is the backstop after the attempts run out.
  class AttachSignedContractJob < ApplicationJob
    queue_as :default

    # The provider's file was not served (timeout, 5xx, token problem). Worth retrying; the nightly
    # sweep is the backstop after the attempts run out.
    class ProviderUnavailable < StandardError; end

    # The contract is signed but the provider has not published the signed file yet.
    class SignedFileNotReady < StandardError; end

    MAX_ATTEMPTS = 5

    # Waits grow as executions**4 + 2 seconds (3s, 18s, 83s, 258s, ...), so eight attempts span a
    # little over an hour, enough for the provider to finish building the signed PDF.
    SIGNED_FILE_MAX_ATTEMPTS = 8

    discard_on ActiveRecord::RecordNotFound
    retry_on ProviderUnavailable, wait: :polynomially_longer, attempts: MAX_ATTEMPTS
    retry_on SignedFileNotReady, wait: :polynomially_longer, attempts: SIGNED_FILE_MAX_ATTEMPTS do |job, error|
      Rails.logger.warn(
        { event: "contract.signed_file_never_ready", job_arguments: job.arguments, error: error.message }.to_json
      )
    end

    def perform(contract_id, school_id)
      school = School.kept.find(school_id)
      contract = school.contracts.kept.find(contract_id)

      learn_signed_file_address(contract)

      result = Documents::AttachSignedContractService.call(contract: contract)
      return if result.success?

      raise ProviderUnavailable, "contract #{contract.id}: #{result.error_code}" if result.error_code == :provider_error

      log_failure(contract, result)
    end

    private

    # Signed, but the address is not on record: ask the provider (which records it and enqueues the
    # filing again, harmlessly). Still nothing afterwards means "not yet" — retry.
    def learn_signed_file_address(contract)
      return unless contract.signed? && contract.signed_document_url.blank?

      result = ::Contracts::ReconcileSignatureService.call(contract: contract)
      if result.failure?
        raise ProviderUnavailable, "contract #{contract.id}: #{result.error_code}" if result.error_code == :provider_error

        return log_failure(contract, result)
      end

      contract.reload
      raise SignedFileNotReady, "contract #{contract.id}" if contract.signed_document_url.blank?
    end

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
