# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Provisioning
        class ImportsController < Schools::BaseController
          def create
            authorize :provisioning_import, :create?, policy_class: ProvisioningImportPolicy

            result = ::Provisioning::ImportFamiliesCsvService.call(
              school: Current.school,
              actor: Current.user,
              file_io: params[:file]&.tempfile,
              dry_run: params[:dry_run]
            )

            render_service_result(result) do |payload|
              render json: {
                data: {
                  import: ProvisioningImportBlueprint.render_as_hash(payload.fetch(:import)),
                  summary: payload.fetch(:summary)
                }
              }
            end
          end
        end
      end
    end
  end
end
