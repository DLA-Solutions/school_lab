# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        class ReportCardsController < BaseController
          include ReportCardPdfDelivery

          def index
            authorize ReportCardPublication

            publications = policy_scope(ReportCardPublication)
                           .includes(:active_snapshot, :student, :academic_period)
            publications = filter_publications(publications)
            pagy, records = pagy(publications.order(updated_at: :desc))

            render json: {
              data: records.map { |publication| list_payload(publication) },
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def show
            publication = find_publication
            authorize publication

            render json: {
              data: ReportCardPublicationBlueprint.render_as_hash(publication, school_id: Current.school.id)
            }
          end

          def snapshot
            snapshot = find_snapshot
            authorize snapshot

            render json: {
              data: ReportCardSnapshotBlueprint.render_as_hash(snapshot, school_id: Current.school.id)
            }
          end

          def pdf
            snapshot = find_snapshot
            authorize snapshot, :pdf?

            send_snapshot_pdf(snapshot)
          end

          private

          def filter_publications(scope)
            scope = scope.where(student_id: params[:student_id]) if params[:student_id].present?
            scope = scope.where(academic_period_id: params[:academic_period_id]) if params[:academic_period_id].present?
            scope
          end

          def find_publication
            policy_scope(ReportCardPublication).includes(:active_snapshot).find(params[:id])
          end

          def find_snapshot
            publication = find_publication
            policy_scope(ReportCardSnapshot).find_by!(
              id: params[:snapshot_id],
              report_card_publication_id: publication.id
            )
          end

          def list_payload(publication)
            snapshot = publication.active_snapshot
            {
              publication_id: publication.id,
              student_id: publication.student_id,
              academic_period_id: publication.academic_period_id,
              snapshot_id: snapshot&.id,
              version: snapshot&.version,
              released_at: snapshot&.released_at&.iso8601,
              pdf_url: snapshot && pdf_url_for(publication.id, snapshot.id)
            }
          end

          def pdf_url_for(publication_id, snapshot_id)
            "/api/v1/schools/#{Current.school.id}/me/report_cards/#{publication_id}/snapshots/#{snapshot_id}/pdf"
          end
        end
      end
    end
  end
end
