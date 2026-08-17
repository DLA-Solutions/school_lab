# frozen_string_literal: true

module TaxDeclarationPdfDelivery
  extend ActiveSupport::Concern

  private

  def send_version_pdf(version)
    blob = ActiveStorage::Blob.find_by(key: version.pdf_storage_key)
    return render_error(:not_found, status: :not_found) unless blob

    request_uuid = request.headers["X-Request-UUID"].presence || SecureRandom.uuid
    audit = Billing::TaxDeclarations::RecordPdfDownloadService.call(
      version: version,
      guardian: Current.guardian,
      actor: Current.user,
      request_uuid: request_uuid
    )
    return render_service_result(audit) if audit.failure?

    send_data blob.download,
              filename: "tax-declaration-#{version.tax_declaration.calendar_year}-v#{version.version}.pdf",
              type: "application/pdf",
              disposition: "attachment"
  end
end
