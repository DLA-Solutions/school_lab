# frozen_string_literal: true

module Api
  module V1
    module Schools
      class BankCredentialsController < Api::V1::BaseController
        before_action :set_school!

        def index
          authorize SchoolPaymentProvider

          configs = policy_scope(SchoolPaymentProvider)
          render json: { data: SchoolPaymentProviderBlueprint.render_as_hash(configs) }
        end

        def create
          authorize SchoolPaymentProvider

          result = Backoffice::UploadBankCredentialsService.call(
            school: Current.school,
            actor: Current.user,
            provider: upload_params[:provider],
            instrument: upload_params[:instrument],
            client_id: upload_params[:client_id],
            certificate_io: params[:certificate],
            private_key_io: params[:private_key]
          )

          render_service_result(result, success_status: :created) do |record|
            render json: { data: SchoolPaymentProviderBlueprint.render_as_hash(record) }, status: :created
          end
        end

        private

        def set_school!
          Current.school = School.kept.find(params[:school_id])
        end

        def upload_params
          params.permit(:provider, :instrument, :client_id)
        end
      end
    end
  end
end
