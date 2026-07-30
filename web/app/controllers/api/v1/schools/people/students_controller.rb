# frozen_string_literal: true

module Api
  module V1
    module Schools
      module People
        class StudentsController < BaseController
          def index
            authorize Student

            students = policy_scope(Student).order(:name)
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

            result = ::People::CreateStudentService.call(school: Current.school, params: student_params)
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

          def student_params
            params.require(:student).permit(:name, :birth_date, :status)
          end
        end
      end
    end
  end
end
