# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        # LUI-6: the full collaborator roster as one PDF, for a backoffice/school user to export
        # instead of opening each collaborator's dialogs one at a time. A singular resource --
        # there is one dossier per school, not a collection to index into.
        class TeachersDossierController < BaseController
          def show
            authorize Teacher, :dossier?

            result = ::Academic::RenderTeachersDossierPdfService.call(school: Current.school)

            if result.failure?
              return render_error(result.error_code, status: :unprocessable_content, details: result.details)
            end

            send_data result.data.fetch(:pdf),
                      filename: result.data.fetch(:filename),
                      type: "application/pdf",
                      disposition: "attachment"
          end
        end
      end
    end
  end
end
