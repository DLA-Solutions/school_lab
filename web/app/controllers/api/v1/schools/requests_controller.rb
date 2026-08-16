# frozen_string_literal: true

module Api
  module V1
    module Schools
      # The Solicitações queue as the school works it.
      class RequestsController < BaseController
        # "open" is the one the screen lands on — the two working states read as one pile to
        # whoever has to clear them.
        STATUSES = %w[pending in_progress fulfilled rejected].freeze

        def index
          authorize GuardianRequest

          requests = policy_scope(GuardianRequest).includes(:guardian, :student, :subject, :resolved_by)
          requests = filter(requests).order(created_at: :desc)
          pagy, records = pagy(requests)

          render json: {
            data: GuardianRequestBlueprint.render_as_hash(records, view: :staff),
            meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
          }
        end

        def show
          request_record = find_request
          authorize request_record

          render json: { data: GuardianRequestBlueprint.render_as_hash(request_record, view: :staff) }
        end

        # Staff writing down what a guardian asked for over the telephone.
        def create
          authorize GuardianRequest

          guardian = Guardian.kept.find_by(school_id: Current.school.id, id: create_params[:guardian_id])

          result = ::GuardianRequests::CreateGuardianRequestService.call(
            school: Current.school,
            guardian: guardian,
            actor: Current.user,
            params: create_params.except(:guardian_id)
          )
          render_service_result(result, success_status: :created) do |created|
            render json: { data: GuardianRequestBlueprint.render_as_hash(created, view: :staff) },
                   status: :created
          end
        end

        def destroy
          request_record = find_request
          authorize request_record

          request_record.discard
          head :no_content
        end

        def start
          claim(:start)
        end

        def release
          claim(:release)
        end

        def fulfill
          resolve(:fulfill)
        end

        def reject
          resolve(:reject)
        end

        private

        def claim(event)
          request_record = find_request
          authorize request_record, :"#{event}?"

          result = ::GuardianRequests::ClaimGuardianRequestService.call(request: request_record, event: event)
          render_resolved(result)
        end

        def resolve(event)
          request_record = find_request
          authorize request_record, :"#{event}?"

          result = ::GuardianRequests::ResolveGuardianRequestService.call(
            request: request_record,
            event: event,
            actor: Current.user,
            resolution_note: resolution_params[:resolution_note]
          )
          render_resolved(result)
        end

        def render_resolved(result)
          render_service_result(result) do |updated|
            render json: { data: GuardianRequestBlueprint.render_as_hash(updated, view: :staff) }
          end
        end

        def find_request
          policy_scope(GuardianRequest).find(params[:id])
        end

        # The queue is worked a slice at a time: what is still open, or everything of one kind.
        def filter(scope)
          scope = scope.open if params[:status] == "open"
          scope = scope.where(status: params[:status]) if STATUSES.include?(params[:status])
          scope = scope.of_kind(params[:kind]) if GuardianRequest::KINDS.include?(params[:kind])
          scope
        end

        def create_params
          params.require(:guardian_request)
                .permit(:guardian_id, :student_id, :kind, :details, :subject_id, :reference_date)
        end

        def resolution_params
          params.permit(:resolution_note)
        end
      end
    end
  end
end
