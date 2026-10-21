# frozen_string_literal: true

module Documents
  # Files the provider's signed copy of a contract into the student's documents, which is what
  # puts it in every linked guardian's "Meus documentos".
  #
  # It is safe to call as often as the signature paths happen to: the webhook, the nightly sweep
  # and a school marking the contract by hand all converge here, and only the first call that
  # finds the signed file on record does anything. Everything else is a successful no-op:
  #
  # - the contract is not signed yet, or the provider's file address is not recorded yet — a later
  #   call picks it up, because recording the address enqueues this again;
  # - the contract already has its document, including one staff later discarded (a discarded
  #   copy is a decision, not a gap to fill).
  #
  # The document is system-generated: no uploader and no review queue, so it is approved on the
  # spot. The bytes come from `Contracts::FetchSignedDocumentService` because the provider's URL
  # answers only to the school's API token.
  class AttachSignedContractService < ApplicationService
    PDF_MAGIC = "%PDF"

    def initialize(contract:)
      @contract = contract
    end

    def call
      return ResponseService.success unless fileable?
      return ResponseService.success(data: existing_document) if existing_document

      fetched = Contracts::FetchSignedDocumentService.call(contract: contract)
      return ResponseService.failure(code: fetched.error_code, details: fetched.details) if fetched.failure?

      pdf = fetched.data.fetch(:pdf)
      return not_a_pdf unless pdf.to_s.start_with?(PDF_MAGIC)

      create_document(pdf: pdf, filename: fetched.data.fetch(:filename))
    rescue ActiveRecord::RecordNotUnique
      # A concurrent run filed it between the check above and the insert. The index decided.
      ResponseService.success(data: existing_document)
    end

    private

    attr_reader :contract

    def fileable?
      contract.kept? && contract.signed? && contract.signed_document_url.present?
    end

    def existing_document
      contract.school.documents.find_by(contract_id: contract.id)
    end

    def create_document(pdf:, filename:)
      document = contract.school.documents.build(
        documentable: contract.student,
        contract: contract,
        document_type: Document::SIGNED_CONTRACT_TYPE,
        uploaded_by: nil,
        reviewed_at: Time.current
      )
      document.file.attach(io: StringIO.new(pdf), filename: filename, content_type: "application/pdf")

      ActiveRecord::Base.transaction do
        document.save!
        document.approve!
      end

      ResponseService.success(data: document)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    def not_a_pdf
      Rails.logger.error(
        {
          event: "contract.signed_document_not_pdf",
          contract_id: contract.id,
          school_id: contract.school_id
        }.to_json
      )
      ResponseService.failure(
        code: :provider_error,
        details: { base: [ I18n.t("api.errors.signed_document_unavailable") ] }
      )
    end
  end
end
