# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Me
        # What a guardian asked the school for, and where each request has got to.
        class RequestsController < BaseController
          def index
            authorize GuardianRequest

            requests = policy_scope(GuardianRequest)
                       .includes(:student, :subject)
                       .order(created_at: :desc)
            pagy, records = pagy(requests)

            render json: {
              data: GuardianRequestBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def show
            request_record = policy_scope(GuardianRequest).find(params[:id])
            authorize request_record

            render json: { data: GuardianRequestBlueprint.render_as_hash(request_record) }
          end

          def create
            authorize GuardianRequest

            result = ::GuardianRequests::CreateGuardianRequestService.call(
              school: Current.school,
              guardian: Current.guardian,
              actor: Current.user,
              params: create_params
            )
            render_service_result(result, success_status: :created) do |created|
              render json: { data: GuardianRequestBlueprint.render_as_hash(created) }, status: :created
            end
          end

          private

          # The guardian is taken from the session, never from the body: whose request it is
          # is not something the asker gets to state.
          def create_params
            params.require(:guardian_request).permit(:student_id, :kind, :details, :subject_id, :reference_date)
          end
        end
      end
    end
  end
end
