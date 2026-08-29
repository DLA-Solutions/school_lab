# frozen_string_literal: true

module Api
  module V1
    module Schools
      # A school's Autentique registration, from the backoffice rather than from a terminal.
      #
      # The token is write-only: it goes in here and is never returned by any action. What comes
      # back is what an operator needs to finish the job in Autentique's own settings — the
      # webhook URL, and the secret, the once.
      class SignatureCredentialsController < Api::V1::BaseController
        before_action :set_signature_context!

        def index
          authorize SchoolSignatureProvider

          configs = policy_scope(SchoolSignatureProvider)
          render json: { data: SchoolSignatureProviderBlueprint.render_as_hash(configs) }
        end

        def create
          authorize SchoolSignatureProvider

          result = Backoffice::RegisterSignatureCredentialsService.call(
            school: Current.school,
            actor: Current.user,
            provider: register_params[:provider].presence || "autentique",
            api_token: register_params[:api_token],
            webhook_secret: register_params[:webhook_secret]
          )

          render_service_result(result, success_status: :created) do |record|
            # `with_secret` only here: this is the one response that carries it, because it has to
            # be pasted into Autentique and cannot be read back afterwards.
            render json: {
              data: SchoolSignatureProviderBlueprint.render_as_hash(record, view: :with_secret)
            }, status: :created
          end
        end

        private

        # Establishes the context and nothing more; who may do what is the policy's decision.
        # Mirrors `BankCredentialsController` — the shared `set_school_context!` asks about
        # provisioning, which is the wrong question for a registration that happens whenever a
        # school arranges its Autentique account.
        def set_signature_context!
          school = School.kept.find(params[:school_id])
          membership = Current.user.memberships.kept.find_by(school: school)

          return render_error(:membership_suspended, status: :forbidden) if membership&.suspended?
          return render_error(:membership_invited, status: :forbidden) if membership&.invited?

          Current.school = school
          Current.membership = membership
        end

        def register_params
          params.permit(:provider, :api_token, :webhook_secret)
        end
      end
    end
  end
end
