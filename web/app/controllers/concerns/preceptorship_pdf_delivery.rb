# frozen_string_literal: true

# Sending a preceptoria report as a PDF.
#
# Shared because the teacher and the family must be handed the same bytes: a teacher who could not
# see exactly what was sent home would be answering questions about a document they had never
# read.
module PreceptorshipPdfDelivery
  extend ActiveSupport::Concern

  private

  def send_report_pdf(report)
    result = ::Preceptorship::RenderReportPdfService.call(report: report)

    # A sentence Prawn's built-in fonts cannot draw comes back as a refusal, not a 500.
    if result.failure?
      return render_error(:validation_error, status: :unprocessable_content,
                                             details: result.details)
    end

    send_data result.data.fetch(:pdf),
              filename: result.data.fetch(:filename),
              type: "application/pdf",
              disposition: "attachment"
  end
end
