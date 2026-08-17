# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        class ReportCardConfigsController < BaseController
          def show
            authorize ReportCardConfig

            config = ReportCardConfig.current_for(Current.school)
            return render_error(:not_found, status: :not_found) unless config

            render json: { data: ReportCardConfigBlueprint.render_as_hash(config) }
          end

          def update
            authorize ReportCardConfig

            result = ::ReportCards::UpsertConfigService.call(
              school: Current.school,
              created_by_membership: Current.membership,
              params: config_params
            )

            render_service_result(result, success_status: :ok) do |config|
              render json: { data: ReportCardConfigBlueprint.render_as_hash(config) }
            end
          end

          private

          def config_params
            params.require(:report_card_config).permit(
              :template_key, :header_text, :footer_text, :document_signatory_id,
              display_config: {}
            )
          end
        end
      end
    end
  end
end
