# frozen_string_literal: true

module Api
  module V1
    module Schools
      class BankCredentialsController < Api::V1::BaseController
        before_action :set_credentials_context!

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
            client_secret: upload_params[:client_secret],
            certificate_io: params[:certificate],
            private_key_io: params[:private_key]
          )

          render_service_result(result, success_status: :created) do |record|
            render json: { data: SchoolPaymentProviderBlueprint.render_as_hash(record) }, status: :created
          end
        end

        private

        # Establishes the context and nothing more; who may do what is the policy's decision.
        #
        # The shared `set_school_context!` refuses a backoffice operator who lacks
        # `provision_school`, which is the wrong question here — this endpoint is not part of
        # provisioning. The previous `set_school!` had the opposite problem: it never resolved a
        # membership, so a school's own billing staff arrived indistinguishable from a stranger and
        # the policy could only ever recognise the platform's operators.
        def set_credentials_context!
          school = School.kept.find(params[:school_id])
          membership = Current.user.memberships.kept.find_by(school: school)

          return render_error(:membership_suspended, status: :forbidden) if membership&.suspended?
          return render_error(:membership_invited, status: :forbidden) if membership&.invited?

          Current.school = school
          Current.membership = membership
        end

        def upload_params
          params.permit(:provider, :instrument, :client_id, :client_secret)
        end
      end
    end
  end
end
