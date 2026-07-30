# frozen_string_literal: true

module Api
  module V1
    module Schools
      module People
        class StudentGuardiansController < BaseController
          def index
            student = policy_scope(Student).find(params[:student_id])
            authorize StudentGuardian

            links = policy_scope(StudentGuardian).where(student: student).includes(:guardian).order(:id)

            render json: { data: StudentGuardianBlueprint.render_as_hash(links) }
          end

          def create
            student = policy_scope(Student).find(params[:student_id])
            authorize StudentGuardian

            result = ::People::LinkStudentGuardianService.call(
              school: Current.school,
              student: student,
              params: link_params
            )
            render_service_result(result, success_status: :created) do |link|
              render json: {
                data: StudentGuardianBlueprint.render_as_hash(link.reload)
              }, status: :created
            end
          end

          def destroy
            link = policy_scope(StudentGuardian).find(params[:id])
            authorize link

            result = ::People::DiscardStudentGuardianService.call(link: link)
            render_service_result(result, success_status: :no_content) do
              head :no_content
            end
          end

          private

          def link_params
            params.require(:student_guardian).permit(:guardian_id, :financial_percentage, :primary_guardian)
          end
        end
      end
    end
  end
end
