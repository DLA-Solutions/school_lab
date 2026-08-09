# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Academics
        class TeachersController < BaseController
          def index
            authorize Teacher

            teachers = policy_scope(Teacher)
                       .includes(:job_position, teaching_assignments: %i[school_class subject])
                       .search(params[:q])
                       .order(:name)
            teachers = filter_by_class(teachers)

            pagy, records = pagy(teachers)

            render json: {
              data: TeacherBlueprint.render_as_hash(records, view: :with_assignments),
              meta: { page: pagy.page, per_page: pagy.limit, total: pagy.count }
            }
          end

          def show
            teacher = policy_scope(Teacher).find(params[:id])
            authorize teacher

            render json: { data: TeacherBlueprint.render_as_hash(teacher, view: :with_assignments) }
          end

          def create
            authorize Teacher

            teacher = Current.school.teachers.build(teacher_params)
            save_and_render(teacher, status: :created)
          end

          def update
            teacher = policy_scope(Teacher).find(params[:id])
            authorize teacher

            teacher.assign_attributes(teacher_params)
            save_and_render(teacher)
          end

          def destroy
            teacher = policy_scope(Teacher).find(params[:id])
            authorize teacher

            teacher.discard
            head :no_content
          end

          private

          # "Who teaches in this class?" — the same listing read from the cohort's side.
          def filter_by_class(scope)
            return scope if params[:school_class_id].blank?

            scope.joins(:teaching_assignments)
                 .merge(TeachingAssignment.kept)
                 .where(teaching_assignments: { school_class_id: params[:school_class_id] })
                 .distinct
          end

          def save_and_render(teacher, status: :ok)
            if teacher.save
              render json: {
                data: TeacherBlueprint.render_as_hash(teacher, view: :with_assignments)
              }, status: status
            else
              render_error(:validation_error, status: :unprocessable_content,
                                              details: teacher.errors.to_hash)
            end
          end

          def teacher_params
            params.require(:teacher).permit(:name, :cpf, :email, :phone, :job_position_id, :hired_on)
          end
        end
      end
    end
  end
end
