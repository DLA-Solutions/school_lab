# frozen_string_literal: true

module Api
  module V1
    module Schools
      module People
        class StudentsController < BaseController
          def index
            authorize Student

            students = policy_scope(Student)
                       .includes(:school_class, student_guardians: :guardian)
                       .search(params[:q])
                       .order(:name)
            students = filter_by_guardian(students)
            pagy, records = pagy(students)

            render json: {
              data: StudentBlueprint.render_as_hash(records),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def show
            student = policy_scope(Student).find(params[:id])
            authorize student

            render json: { data: StudentBlueprint.render_as_hash(student) }
          end

          def create
            authorize Student

            result = ::People::CreateStudentService.call(
              school: Current.school,
              params: student_params,
              guardian_cpfs: guardian_cpf_params
            )
            render_service_result(result, success_status: :created) do |student|
              render json: { data: StudentBlueprint.render_as_hash(student) }, status: :created
            end
          end

          def update
            student = policy_scope(Student).find(params[:id])
            authorize student

            result = ::People::UpdateStudentService.call(student: student, params: student_params)
            render_service_result(result) do |updated|
              render json: { data: StudentBlueprint.render_as_hash(updated) }
            end
          end

          def destroy
            student = policy_scope(Student).find(params[:id])
            authorize student

            result = ::People::DiscardStudentService.call(student: student, actor: Current.user)
            render_service_result(result, success_status: :no_content) do
              head :no_content
            end
          end

          private

          # Narrows the list to the children linked to one guardian — what a contract form needs
          # to offer, rather than every student in the school. Discarded links do not count.
          def filter_by_guardian(scope)
            guardian_id = params[:guardian_id]
            return scope if guardian_id.blank?

            scope.joins(:student_guardians)
                 .merge(StudentGuardian.kept)
                 .where(student_guardians: { guardian_id: guardian_id })
                 .distinct
          end

          def student_params
            params.require(:student).permit(:name, :cpf, :rg, :birth_date, :school_class_id, :status)
          end

          # The parents are identified by CPF rather than by id: the school knows the document,
          # not our primary keys. Either may be absent, but not both.
          def guardian_cpf_params
            {
              father: params.dig(:student, :father_cpf),
              mother: params.dig(:student, :mother_cpf)
            }
          end
        end
      end
    end
  end
end
