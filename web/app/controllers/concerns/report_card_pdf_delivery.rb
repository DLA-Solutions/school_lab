# frozen_string_literal: true

module ReportCardPdfDelivery
  extend ActiveSupport::Concern

  private

  def send_snapshot_pdf(snapshot)
    blob = ActiveStorage::Blob.find_by(key: snapshot.pdf_storage_key)
    return render_error(:not_found, status: :not_found) unless blob

    send_data blob.download,
              filename: "report-card-#{snapshot.version}.pdf",
              type: "application/pdf",
              disposition: "attachment"
  end
end
