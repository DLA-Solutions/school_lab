# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        class ReportCardPublicationsController < BaseController
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

          def republish_params
            params.require(:report_card_publication).permit(:correction_reason)
          end
        end
      end
    end
  end
end
