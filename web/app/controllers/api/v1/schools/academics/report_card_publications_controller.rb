# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        class ReportCardPublicationsController < BaseController
          # One student's published report cards, so the school can read a child's marks from the
          # register rather than hunting for the batch a boletim happened to go out in.
          #
          # Filtered rather than paged through: the caller already knows which child, and which
          # term, it is asking about.
          def index
            authorize ReportCardPublication

            publications = policy_scope(ReportCardPublication)
                           .includes(:active_snapshot, :academic_period)
            publications = filter_publications(publications)
            pagy, records = pagy(publications.order(updated_at: :desc))

            render json: {
              data: records.map { |publication| list_payload(publication) },
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def show
            publication = policy_scope(ReportCardPublication).includes(:active_snapshot).find(params[:id])
            authorize publication

            render json: {
              data: ReportCardPublicationBlueprint.render_as_hash(publication, school_id: Current.school.id)
            }
          end

          def republish
            publication = policy_scope(ReportCardPublication).find(params[:id])
            authorize publication, :republish?

            result = ::ReportCards::RepublishService.call(
              publication: publication,
              requested_by_membership: Current.membership,
              correction_reason: republish_params[:correction_reason]
            )

            render_service_result(result, success_status: :created) do |data|
              render json: { data: data }, status: :created
            end
          end

          private

          def filter_publications(scope)
            scope = scope.where(student_id: params[:student_id]) if params[:student_id].present?
            if params[:academic_period_id].present?
              scope = scope.where(academic_period_id: params[:academic_period_id])
            elsif params[:school_year_id].present?
              # Every term of one year — what "all terms" means once a year has been chosen.
              scope = scope.joins(:academic_period)
                           .where(academic_periods: { school_year_id: params[:school_year_id] })
            end
            scope
          end

          # The listing answers "is there a boletim, and where is the PDF" — the marks themselves
          # live in the snapshot, which is a second call the screen only makes when asked.
          def list_payload(publication)
            snapshot = publication.active_snapshot

            {
              publication_id: publication.id,
              student_id: publication.student_id,
              academic_period_id: publication.academic_period_id,
              academic_period_name: publication.academic_period&.name,
              snapshot_id: snapshot&.id,
              version: snapshot&.version,
              released_at: snapshot&.released_at&.iso8601,
              pdf_url: snapshot && pdf_url_for(publication.id, snapshot.id)
            }
          end

          def pdf_url_for(publication_id, snapshot_id)
            "/api/v1/schools/#{Current.school.id}/academics/report_card_publications/" \
              "#{publication_id}/snapshots/#{snapshot_id}/pdf"
          end

          def republish_params
            params.require(:report_card_publication).permit(:correction_reason)
          end
        end
      end
    end
  end
end
