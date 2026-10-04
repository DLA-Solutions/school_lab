# frozen_string_literal: true

module Api
  module V1
    module Schools
      module People
        class GuardiansController < BaseController
          def index
            authorize Guardian

            guardians = by_activation(policy_scope(Guardian)).search(params[:q]).order(:name)
            guardians = filter_by_student(guardians)
            pagy, records = pagy(guardians)

            render json: {
              data: GuardianBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def show
            guardian = policy_scope(Guardian).find(params[:id])
            authorize guardian

            render json: { data: GuardianBlueprint.render_as_hash(guardian) }
          end

          def create
            authorize Guardian

            result = ::People::CreateGuardianService.call(school: Current.school, params: guardian_params)
            render_service_result(result, success_status: :created) do |guardian|
              render json: { data: GuardianBlueprint.render_as_hash(guardian) }, status: :created
            end
          end

          def update
            guardian = policy_scope(Guardian).find(params[:id])
            authorize guardian

            result = ::People::UpdateGuardianService.call(guardian: guardian, params: guardian_params)
            render_service_result(result) do |updated|
              render json: { data: GuardianBlueprint.render_as_hash(updated) }
            end
          end

          def destroy
            guardian = policy_scope(Guardian).find(params[:id])
            authorize guardian

            result = ::People::DiscardGuardianService.call(guardian: guardian, actor: Current.user)
            render_service_result(result, success_status: :no_content) do
              head :no_content
            end
          end

          # Brings a record back. Looked up outside the policy scope on purpose: that scope is
          # `kept`, and an inactive record is precisely what this action operates on.
          def activate
            record = Current.school.guardians.find(params[:id])
            authorize record, :update?

            result = ::People::ActivateGuardianService.call(guardian: record, actor: Current.user)
            render_service_result(result) do |updated|
              render json: { data: GuardianBlueprint.render_as_hash(updated) }
            end
          end

          # Provisions whatever the guardian is missing — a user, a membership — and mails them
          # the link that sets their password. Safe to press twice: someone who already has an
          # account is sent a reset rather than a second invitation.
          # The register as a printable table, narrowed by whatever the listing was narrowed by:
          # a report that ignored the search term would disagree with the screen it was asked for
          # from. Not paginated — the point is the whole set the filters describe.
          def report
            authorize Guardian, :index?

            guardians = by_activation(policy_scope(Guardian))
                        .search(params[:q])
                        .includes(students: :school_class)
                        .order(:name)

            result = ::People::RenderGuardiansReportService.call(
              school: Current.school,
              guardians: guardians,
              columns: params[:columns].to_s.split(",")
            )

            # A name Prawn's built-in fonts cannot draw comes back as a refusal, not a 500.
            if result.failure?
              return render_error(:validation_error, status: :unprocessable_content,
                                                     details: result.details)
            end

            send_data result.data.fetch(:pdf),
                      filename: result.data.fetch(:filename),
                      type: "application/pdf",
                      disposition: "attachment"
          end

          def access
            record = Current.school.guardians.find(params[:id])
            authorize record, :update?

            result = ::People::SendGuardianAccessService.call(guardian: record, actor: Current.user)
            render_service_result(result) do |data|
              render json: { data: GuardianBlueprint.render_as_hash(data[:guardian]) }
            end
          end

          private

          # `active` (the default), `inactive` or `all`. Built from the school association rather
          # than the policy scope because that scope hides discarded rows, which is the whole
          # point of asking for the inactive ones.
          def by_activation(scope)
            case params[:status]
            when "inactive" then Current.school.guardians.discarded
            when "all" then Current.school.guardians.all
            else scope
            end
          end

          def guardian_params
            params.require(:guardian).permit(
              :name, :cpf, :email, :phone, :user_id, *Guardian::ADDRESS_FIELDS
            )
          end

          # BR-IN11/UC-IN06: the reverse of StudentsController#filter_by_guardian — narrows to the
          # guardians linked to one student, what the ata's guardian picker needs to pre-fill
          # before an incident is even saved. Discarded links do not count.
          def filter_by_student(scope)
            student_id = params[:student_id]
            return scope if student_id.blank?

            scope.joins(:student_guardians)
                 .merge(StudentGuardian.kept)
                 .where(student_guardians: { student_id: student_id })
                 .distinct
          end
        end
      end
    end
  end
end
