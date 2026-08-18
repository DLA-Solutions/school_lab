# frozen_string_literal: true

module Billing
  class ReconcileFiscalDocumentService < ApplicationService
    def initialize(service_invoice:, adapter: nil, fetch_status: true)
      @service_invoice = service_invoice
      @adapter = adapter
      @fetch_status = fetch_status
    end

    def call
      return ResponseService.success(data: service_invoice) unless service_invoice.provider_document_id.present?

      remote = fetch_status ? adapter.check_status(provider_document_id: service_invoice.provider_document_id) :
                              adapter.fetch(provider_document_id: service_invoice.provider_document_id)

      apply_remote_status!(remote)
      attach_artifacts! if service_invoice.authorized?

      ResponseService.success(data: service_invoice.reload)
    rescue Gateways::ServiceInvoice::TransientError
      raise
    rescue Gateways::ServiceInvoice::Error => e
      ResponseService.failure(code: :provider_error, details: { message: e.message })
    end

    private

    attr_reader :service_invoice, :fetch_status

    def adapter
      @adapter ||= Gateways::ServiceInvoice::Registry.resolve(
        school: service_invoice.school,
        provider: service_invoice.provider
      )
    end

    def apply_remote_status!(remote)
      ActiveRecord::Base.transaction do
        service_invoice.update!(
          invoice_number: remote.invoice_number.presence || service_invoice.invoice_number,
          verification_code: remote.verification_code.presence || service_invoice.verification_code,
          access_key: remote.access_key.presence || service_invoice.access_key
        )

        case remote.status
        when "authorized"
          service_invoice.authorize! if service_invoice.may_authorize?
        when "rejected"
          service_invoice.reject! if service_invoice.may_reject?
        when "canceled"
          service_invoice.cancel! if service_invoice.may_cancel?
        when "failed"
          service_invoice.mark_failed! if service_invoice.may_mark_failed?
        when "enqueued"
          service_invoice.enqueue! if service_invoice.may_enqueue?
        end
      end
    end

    def attach_artifacts!
      return if service_invoice.pdf.attached? && service_invoice.xml.attached?

      artifacts = adapter.download_artifacts(provider_document_id: service_invoice.provider_document_id)
      service_invoice.pdf.attach(io: StringIO.new(artifacts.pdf_bytes), filename: "nfse-#{service_invoice.id}.pdf",
                                 content_type: "application/pdf") unless service_invoice.pdf.attached?
      service_invoice.xml.attach(io: StringIO.new(artifacts.xml_bytes), filename: "nfse-#{service_invoice.id}.xml",
                                 content_type: "application/xml") unless service_invoice.xml.attached?
    end
  end
end
