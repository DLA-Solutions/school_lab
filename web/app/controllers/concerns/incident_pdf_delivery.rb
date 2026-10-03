# frozen_string_literal: true

# Sending an "Ata" (BC7) as a PDF. Shared between the staff-facing controller and the guardian
# `me` one so a teacher/coordinator and a family looking at the same incident are always looking
# at the same bytes.
#
# `disposition: "inline"` -- this is shown inside an iframe in a popup, not downloaded, unlike the
# preceptoria/report-card "attachment" deliveries.
module IncidentPdfDelivery
  extend ActiveSupport::Concern

  private

  def send_incident_pdf(incident)
    result = ::Academic::RenderIncidentPdfService.call(incident: incident)

    if result.failure?
      return render_error(result.error_code, status: :unprocessable_content, details: result.details)
    end

    send_data result.data.fetch(:pdf),
              filename: result.data.fetch(:filename),
              type: "application/pdf",
              disposition: "inline"
  end
end
