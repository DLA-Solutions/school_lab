# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        class ReportCardSnapshotsController < BaseController
          include ReportCardPdfDelivery

          def show
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

          def find_snapshot
            publication = policy_scope(ReportCardPublication).find(params[:report_card_publication_id])
            policy_scope(ReportCardSnapshot).find_by!(
              id: params[:id],
              report_card_publication_id: publication.id
            )
          end
        end
      end
    end
  end
end
